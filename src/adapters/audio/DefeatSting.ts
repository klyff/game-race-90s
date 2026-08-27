import { isAudioMuted } from './AudioPrefs.ts';
import { registerScreenAudio } from './AudioSession.ts';
import { noteFrequency } from './MusicScore.ts';

/** Descending arcade lose sting. Short enough that the pose does the talking. */
export const DEFEAT_STING_DURATION_SECONDS = 2.1;

const NOTES: readonly { readonly at: number; readonly note: string; readonly hold: number }[] = [
  { at: 0.0, note: 'E4', hold: 0.16 },
  { at: 0.16, note: 'C4', hold: 0.16 },
  { at: 0.32, note: 'A3', hold: 0.2 },
  { at: 0.54, note: 'E3', hold: 0.26 },
  { at: 0.84, note: 'A2', hold: 0.95 },
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

let activeContext: AudioContext | null = null;
let unregisterSting: (() => void) | undefined;

export function stopDefeatSting(): void {
  unregisterSting?.();
  unregisterSting = undefined;
  if (activeContext === null) {
    return;
  }
  const context = activeContext;
  activeContext = null;
  void context.close().catch(() => {
    /* Already closed. */
  });
}

/**
 * One-shot lose sting. Own AudioContext so a scene swap cannot cut it short.
 * Missing Web Audio is silent, not fatal.
 */
export function playDefeatSting(): number {
  stopDefeatSting();
  if (isAudioMuted()) {
    return DEFEAT_STING_DURATION_SECONDS;
  }
  const ctx = createContext();
  if (ctx === null) {
    return DEFEAT_STING_DURATION_SECONDS;
  }
  activeContext = ctx;
  unregisterSting = registerScreenAudio(stopDefeatSting);
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {
      /* Autoplay policy: stay silent rather than break the screen. */
    });
  }

  const master = ctx.createGain();
  master.gain.value = 0.24;
  master.connect(ctx.destination);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  filter.Q.value = 0.7;
  filter.connect(master);

  const now = ctx.currentTime;
  for (const beat of NOTES) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = noteFrequency(beat.note);
    gain.gain.setValueAtTime(0.0001, now + beat.at);
    gain.gain.exponentialRampToValueAtTime(0.42, now + beat.at + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + beat.at + beat.hold);
    osc.connect(gain);
    gain.connect(filter);
    osc.start(now + beat.at);
    osc.stop(now + beat.at + beat.hold + 0.04);
  }

  const thud = ctx.createOscillator();
  const thudGain = ctx.createGain();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(90, now);
  thud.frequency.exponentialRampToValueAtTime(38, now + 0.28);
  thudGain.gain.setValueAtTime(0.0001, now);
  thudGain.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
  thud.connect(thudGain);
  thudGain.connect(master);
  thud.start(now);
  thud.stop(now + 0.46);

  window.setTimeout(() => {
    void ctx.close();
  }, DEFEAT_STING_DURATION_SECONDS * 1000 + 80);
  return DEFEAT_STING_DURATION_SECONDS;
}
