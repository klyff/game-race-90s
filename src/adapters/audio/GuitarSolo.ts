import { isAudioMuted } from './AudioPrefs.ts';
import { registerScreenAudio } from './AudioSession.ts';
import { noteFrequency } from './MusicScore.ts';

/** How long the transition solo rings, seconds. Owner: ~3s guitar shred. */
export const GUITAR_SOLO_DURATION_SECONDS = 3;

/**
 * E-minor pentatonic shred, timed in seconds from the downbeat.
 * A descending-then-climbing run with a couple of held scream notes so it
 * reads as a solo, not the four-note title lick.
 */
export const SOLO_NOTES: readonly { readonly at: number; readonly note: string; readonly hold: number }[] = [
  { at: 0.0, note: 'E5', hold: 0.1 },
  { at: 0.1, note: 'G5', hold: 0.1 },
  { at: 0.2, note: 'A5', hold: 0.1 },
  { at: 0.3, note: 'B5', hold: 0.14 },
  { at: 0.44, note: 'E6', hold: 0.22 },
  { at: 0.68, note: 'D6', hold: 0.1 },
  { at: 0.78, note: 'B5', hold: 0.1 },
  { at: 0.88, note: 'A5', hold: 0.1 },
  { at: 0.98, note: 'G5', hold: 0.1 },
  { at: 1.08, note: 'E5', hold: 0.12 },
  { at: 1.22, note: 'G5', hold: 0.1 },
  { at: 1.32, note: 'B5', hold: 0.1 },
  { at: 1.42, note: 'D6', hold: 0.12 },
  { at: 1.56, note: 'E6', hold: 0.28 },
  { at: 1.88, note: 'B5', hold: 0.12 },
  { at: 2.02, note: 'G5', hold: 0.1 },
  { at: 2.12, note: 'A5', hold: 0.1 },
  { at: 2.22, note: 'B5', hold: 0.14 },
  { at: 2.38, note: 'E6', hold: 0.42 },
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
 * Plays a one-shot ~3s lead-guitar solo on its own AudioContext so it survives
 * a Phaser scene swap (the title/results graphs are torn down on SHUTDOWN).
 *
 * Must be called from a user gesture. Returns how long the caller should wait
 * before changing scene; 0 when Web Audio is missing.
 */
let activeContext: AudioContext | null = null;
let unregisterSolo: (() => void) | undefined;

export function stopGuitarSolo(): void {
  unregisterSolo?.();
  unregisterSolo = undefined;
  if (activeContext === null) {
    return;
  }
  const context = activeContext;
  activeContext = null;
  void context.close().catch(() => {
    /* Already closed. */
  });
}

export function playGuitarSolo(): number {
  stopGuitarSolo();
  if (isAudioMuted()) {
    return 0;
  }
  const context = createContext();
  if (context === null) {
    return 0;
  }
  activeContext = context;
  unregisterSolo = registerScreenAudio(stopGuitarSolo);
  if (context.state === 'suspended') {
    void context.resume().catch(() => {
      /* Autoplay policy: stay silent rather than break the transition. */
    });
  }

  const master = context.createGain();
  master.gain.value = 0.22;
  master.connect(context.destination);

  const osc = context.createOscillator();
  osc.type = 'sawtooth';
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 4200;
  filter.Q.value = 0.9;
  const shaper = context.createWaveShaper();
  shaper.curve = distortionCurve(4) as Float32Array<ArrayBuffer>;
  const gain = context.createGain();
  gain.gain.value = 0.0001;

  osc.connect(shaper);
  shaper.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  osc.start();

  const now = context.currentTime;
  for (const note of SOLO_NOTES) {
    const t = now + note.at;
    const freq = noteFrequency(note.note);
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.55, t + 0.018);
    gain.gain.setTargetAtTime(0.0001, t + note.hold * 0.45, 0.06);
  }

  const end = now + GUITAR_SOLO_DURATION_SECONDS;
  master.gain.setTargetAtTime(0, end - 0.18, 0.05);
  osc.stop(end + 0.2);
  setTimeout(() => {
    void context.close().catch(() => {
      /* Already closed. */
    });
  }, (GUITAR_SOLO_DURATION_SECONDS + 0.4) * 1000);

  return GUITAR_SOLO_DURATION_SECONDS;
}

function distortionCurve(drive: number): Float32Array {
  const length = 2048;
  const curve = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const x = (i / (length - 1)) * 2 - 1;
    curve[i] = Math.tanh(drive * x);
  }
  return curve;
}
