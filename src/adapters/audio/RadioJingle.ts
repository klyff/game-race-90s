import { isAudioMuted } from './AudioPrefs.ts';
import { registerScreenAudio } from './AudioSession.ts';
import { noteFrequency } from './MusicScore.ts';

/** Short radio sting when the last car takes the flag. */
export const RADIO_JINGLE_DURATION_SECONDS = 2.4;

const NOTES: readonly { readonly at: number; readonly note: string; readonly hold: number }[] = [
  { at: 0.0, note: 'A4', hold: 0.12 },
  { at: 0.12, note: 'C5', hold: 0.12 },
  { at: 0.24, note: 'E5', hold: 0.16 },
  { at: 0.42, note: 'A5', hold: 0.28 },
  { at: 0.74, note: 'E5', hold: 0.12 },
  { at: 0.88, note: 'C5', hold: 0.12 },
  { at: 1.02, note: 'A4', hold: 0.14 },
  { at: 1.18, note: 'E5', hold: 0.18 },
  { at: 1.4, note: 'A5', hold: 0.55 },
];

function createContext(): AudioContext | null {
  try {
    if (typeof AudioContext === 'undefined') {
      return null;
    }
    return new AudioContext();
  } catch {
    return null;
  }
}

/**
 * Plays a radio-station sting. Returns how long to wait before the pub art.
 * Missing Web Audio is silent, not fatal.
 */
let activeContext: AudioContext | null = null;
let unregisterJingle: (() => void) | undefined;

export function stopRadioJingle(): void {
  unregisterJingle?.();
  unregisterJingle = undefined;
  if (activeContext === null) {
    return;
  }
  const context = activeContext;
  activeContext = null;
  void context.close().catch(() => {
    /* Already closed. */
  });
}

export function playRadioJingle(): number {
  stopRadioJingle();
  if (isAudioMuted()) {
    return RADIO_JINGLE_DURATION_SECONDS;
  }
  const ctx = createContext();
  if (ctx === null) {
    return RADIO_JINGLE_DURATION_SECONDS;
  }
  activeContext = ctx;
  unregisterJingle = registerScreenAudio(stopRadioJingle);
  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);
  const now = ctx.currentTime;
  for (const beat of NOTES) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = noteFrequency(beat.note);
    gain.gain.setValueAtTime(0.0001, now + beat.at);
    gain.gain.exponentialRampToValueAtTime(0.35, now + beat.at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + beat.at + beat.hold);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now + beat.at);
    osc.stop(now + beat.at + beat.hold + 0.02);
  }
  window.setTimeout(() => {
    void ctx.close();
  }, RADIO_JINGLE_DURATION_SECONDS * 1000 + 80);
  return RADIO_JINGLE_DURATION_SECONDS;
}
