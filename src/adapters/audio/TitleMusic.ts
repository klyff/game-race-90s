import type { NoiseSource } from './NoiseSource.ts';

// ---------------------------------------------------------------------------
// Composition: pure data tables and pure functions. No AudioContext, no Web
// Audio types below this line — everything here is plain arithmetic so it can
// be unit-tested without a browser.
// ---------------------------------------------------------------------------

/** One bar's worth of chord root for the rhythm-guitar/bass progression. */
export interface ChordStep {
  readonly note: string;
  readonly beats: number;
  readonly accent: boolean;
}

/** One eighth-note slot within a bar: how long it rings and whether it is an
 * accented stab rather than a palm-muted chug. */
export interface StrumStep {
  readonly beats: number;
  readonly accent: boolean;
}

/** One eighth-note slot of the drum pattern. */
export interface DrumStep {
  readonly kick: boolean;
  readonly snare: boolean;
  readonly hat: boolean;
}

/** A single note of the lead flourish, positioned by eighth-note slot within
 * whichever bar the lick plays on. */
export interface LeadNote {
  readonly eighthInBar: number;
  readonly note: string;
  readonly beats: number;
}

export const BPM = 172;
export const BEATS_PER_BAR = 4;
export const STEPS_PER_BAR = 8;
/** Duration, in beats, of one eighth-note step: BEATS_PER_BAR / STEPS_PER_BAR. */
export const STEP_BEATS = BEATS_PER_BAR / STEPS_PER_BAR;
/** Every 4th bar carries the lead lick, so the loop is not static. */
export const LICK_INTERVAL_BARS = 4;

/**
 * 16-bar chord progression in E minor, two 8-bar halves.
 * Half 1: Em - Em - G - D - Em - C - D - D  (the "Em-Em-G-D" hook, twice).
 * Half 2: Em - Em - G - D - Em - C - A#(b5) - Em  — the last four bars swap
 * the plain D-D turnaround for a tritone (A#, the flatted fifth of E) before
 * resolving to Em, the metal "devil's interval" flourish, then straight back
 * into bar 1's Em so the loop seam is inaudible.
 */
export const RIFF: readonly ChordStep[] = [
  { note: 'E3', beats: BEATS_PER_BAR, accent: false },
  { note: 'E3', beats: BEATS_PER_BAR, accent: true },
  { note: 'G3', beats: BEATS_PER_BAR, accent: false },
  { note: 'D3', beats: BEATS_PER_BAR, accent: false },
  { note: 'E3', beats: BEATS_PER_BAR, accent: true },
  { note: 'C3', beats: BEATS_PER_BAR, accent: false },
  { note: 'D3', beats: BEATS_PER_BAR, accent: false },
  { note: 'D3', beats: BEATS_PER_BAR, accent: false },
  { note: 'E3', beats: BEATS_PER_BAR, accent: false },
  { note: 'E3', beats: BEATS_PER_BAR, accent: true },
  { note: 'G3', beats: BEATS_PER_BAR, accent: false },
  { note: 'D3', beats: BEATS_PER_BAR, accent: false },
  { note: 'E3', beats: BEATS_PER_BAR, accent: true },
  { note: 'C3', beats: BEATS_PER_BAR, accent: false },
  { note: 'A#2', beats: BEATS_PER_BAR, accent: true },
  { note: 'E3', beats: BEATS_PER_BAR, accent: false },
];

export const BAR_COUNT = RIFF.length;
export const TOTAL_STEPS = BAR_COUNT * STEPS_PER_BAR;

/**
 * One bar of eighth-note guitar strumming: accented stabs on beats 1 and 3,
 * palm-muted chugs everywhere else. Reused for every bar — the chord changes
 * (from `RIFF`), the strum feel does not, which is exactly how a punk/metal
 * rhythm guitarist plays a progression.
 */
export const GUITAR_STRUM_PATTERN: readonly StrumStep[] = [
  { beats: STEP_BEATS, accent: true },
  { beats: STEP_BEATS, accent: false },
  { beats: STEP_BEATS, accent: false },
  { beats: STEP_BEATS, accent: false },
  { beats: STEP_BEATS, accent: true },
  { beats: STEP_BEATS, accent: false },
  { beats: STEP_BEATS, accent: false },
  { beats: STEP_BEATS, accent: false },
];

/** One bar of eighth-note drums: straight hats, snare on 2 and 4, a
 * syncopated kick that pushes ahead of the beat for drive. */
export const DRUM_PATTERN: readonly DrumStep[] = [
  { kick: true, snare: false, hat: true },
  { kick: false, snare: false, hat: true },
  { kick: false, snare: true, hat: true },
  { kick: false, snare: false, hat: true },
  { kick: true, snare: false, hat: true },
  { kick: true, snare: false, hat: true },
  { kick: false, snare: true, hat: true },
  { kick: false, snare: false, hat: true },
];

/** A short E-minor-pentatonic descending lick that fills the back half of
 * every 4th bar (see `LICK_INTERVAL_BARS`) so the loop has a hook, not just a
 * repeating chug. */
export const LEAD_LICK: readonly LeadNote[] = [
  { eighthInBar: 4, note: 'E5', beats: STEP_BEATS },
  { eighthInBar: 5, note: 'D5', beats: STEP_BEATS },
  { eighthInBar: 6, note: 'B4', beats: STEP_BEATS },
  { eighthInBar: 7, note: 'G4', beats: STEP_BEATS },
];

/** True on the bars where `LEAD_LICK` should play: every `LICK_INTERVAL_BARS`th
 * bar (0-indexed), i.e. the last bar of each phrase. */
export function barHasLick(barIndex: number): boolean {
  return (barIndex + 1) % LICK_INTERVAL_BARS === 0;
}

/** Wraps a step counter into `[0, totalSteps)`. Handles negative input too,
 * since JavaScript's `%` keeps the sign of the dividend. */
export function wrapStepIndex(index: number, totalSteps: number): number {
  return ((index % totalSteps) + totalSteps) % totalSteps;
}

/** Which bar a global step index falls in. */
export function barIndexForStep(stepIndex: number): number {
  return Math.floor(stepIndex / STEPS_PER_BAR) % BAR_COUNT;
}

/** Which eighth-note slot within its bar a global step index falls in. */
export function eighthInBarForStep(stepIndex: number): number {
  return stepIndex % STEPS_PER_BAR;
}

/** Convert a note name (e.g. 'E3', 'A#4', 'Bb2') to frequency in Hz using
 * equal temperament with A4 = 440 Hz as reference. Throws on invalid input. */
export function noteFrequency(name: string): number {
  const match = name.match(/^([A-G])([#b]?)(-?\d+)$/);
  if (!match) throw new Error(`Invalid note: ${name}`);

  const [, noteLetter, accidental, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);

  const noteValues: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };

  let value = noteValues[noteLetter];
  if (accidental === '#') value += 1;
  else if (accidental === 'b') value -= 1;

  const midi = octave * 12 + 12 + value;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Convert a number of beats to seconds at the given tempo in BPM. */
export function beatsToSeconds(beats: number, bpm: number): number {
  return (beats * 60) / bpm;
}

/** Sum all beats across a sequence of steps — used both to check a single
 * bar's steps add up and to size the whole loop. */
export function totalBeats(steps: readonly { readonly beats: number }[]): number {
  return steps.reduce((sum, step) => sum + step.beats, 0);
}

// ---------------------------------------------------------------------------
// Node graph: everything below touches AudioContext / AudioNode. Kept
// separate from the composition data above so the composition can be tested
// without a browser (see tests/adapters/TitleMusic.test.ts).
// ---------------------------------------------------------------------------

/** Clamps to 0..1 and folds NaN to 0, matching the convention used by the
 * other voices in this package. */
function clampUnit(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Looping 80s punk/metal title-screen instrumental, synthesised entirely with
 * the Web Audio API — no audio asset files, per this project's locked
 * decision that every sound is procedural.
 *
 * Voices, all summed into one owned `masterGain`:
 * - Rhythm guitar: two detuned sawtooths through a `WaveShaperNode` (hard-clip
 *   distortion) and a lowpass, re-triggered every eighth note by
 *   `GUITAR_STRUM_PATTERN` for a palm-muted chug with accented stabs.
 * - Bass: one sawtooth an octave below the chord root, through a lowpass,
 *   pulsed on the quarter notes.
 * - Drums: a pooled sine kick sweep, and a snare/hi-hat pair both filtered
 *   from the single shared `NoiseSource` buffer (never a second noise buffer).
 * - Lead: one square-wave voice playing `LEAD_LICK` every `LICK_INTERVAL_BARS`th bar.
 *
 * Scheduling uses a **look-ahead scheduler driven by `context.currentTime`**:
 * an internal `setInterval` wakes up roughly every `SCHEDULER_INTERVAL_MS`
 * and schedules any eighth-note steps that fall within the next
 * `LOOK_AHEAD_MS`, using precise `AudioParam` times rather than firing nodes
 * at the moment the interval callback runs (which would jitter). `stop()` and
 * `destroy()` clear the interval, so nothing keeps ticking after teardown.
 */
export class TitleMusic {
  private readonly context: AudioContext;
  private readonly noise: NoiseSource;

  private readonly masterGain: GainNode;

  private readonly rhythmOsc1: OscillatorNode;
  private readonly rhythmOsc2: OscillatorNode;
  private readonly rhythmWaveshaper: WaveShaperNode;
  private readonly rhythmFilter: BiquadFilterNode;
  private readonly rhythmGain: GainNode;

  private readonly bassOsc: OscillatorNode;
  private readonly bassFilter: BiquadFilterNode;
  private readonly bassGain: GainNode;

  private readonly snareFilter: BiquadFilterNode;
  private readonly snareGain: GainNode;
  private readonly hatFilter: BiquadFilterNode;
  private readonly hatGain: GainNode;
  private readonly kickPool: readonly { readonly osc: OscillatorNode; readonly gain: GainNode }[];
  private kickPoolCursor = 0;

  private readonly leadOsc: OscillatorNode;
  private readonly leadGain: GainNode;

  private started = false;
  private stopped = false;
  private schedulerId: ReturnType<typeof setInterval> | null = null;

  /** Global eighth-note counter for the next step still to be scheduled. */
  private stepCursor = 0;
  /** `context.currentTime` at which `stepCursor` should sound. */
  private nextStepTime = 0;

  private static readonly SCHEDULER_INTERVAL_MS = 50;
  private static readonly LOOK_AHEAD_SECONDS = 0.2;

  private static readonly RHYTHM_DETUNE_CENTS = 8;
  private static readonly RHYTHM_FILTER_HZ = 3000;
  private static readonly RHYTHM_FILTER_Q = 0.8;
  private static readonly RHYTHM_CHUG_GAIN = 0.22;
  private static readonly RHYTHM_ACCENT_GAIN = 0.38;
  private static readonly RHYTHM_ATTACK_SECONDS = 0.004;
  private static readonly RHYTHM_DECAY_TIME_CONSTANT = 0.05;

  private static readonly BASS_FILTER_HZ = 500;
  private static readonly BASS_FILTER_Q = 0.9;
  private static readonly BASS_GAIN = 0.32;
  private static readonly BASS_ATTACK_SECONDS = 0.005;
  private static readonly BASS_DECAY_TIME_CONSTANT = 0.09;

  private static readonly SNARE_CENTER_HZ = 1800;
  private static readonly SNARE_Q = 1.6;
  private static readonly SNARE_GAIN = 0.5;
  private static readonly SNARE_DECAY_TIME_CONSTANT = 0.045;
  private static readonly HAT_CUTOFF_HZ = 8000;
  private static readonly HAT_GAIN = 0.22;
  private static readonly HAT_DECAY_TIME_CONSTANT = 0.02;

  private static readonly KICK_START_HZ = 120;
  private static readonly KICK_END_HZ = 45;
  private static readonly KICK_SWEEP_SECONDS = 0.1;
  private static readonly KICK_GAIN = 0.7;
  private static readonly KICK_POOL_SIZE = 3;

  private static readonly LEAD_GAIN = 0.2;
  private static readonly LEAD_ATTACK_SECONDS = 0.003;
  private static readonly LEAD_DECAY_TIME_CONSTANT = 0.08;

  /** Master send level, leaving headroom for every voice sounding at once. */
  private static readonly MASTER_GAIN = 0.55;
  /** Time constant for the fade-out on `stop()`. */
  private static readonly STOP_TIME_CONSTANT = 0.05;
  /** How many time constants to wait before tearing the graph down. */
  private static readonly STOP_SETTLE_TIME_CONSTANTS = 5;

  constructor(context: AudioContext, noise: NoiseSource, destination: AudioNode) {
    this.context = context;
    this.noise = noise;

    this.masterGain = context.createGain();
    this.masterGain.gain.value = TitleMusic.MASTER_GAIN;
    this.masterGain.connect(destination);

    // --- Rhythm guitar: detuned saws -> distortion -> lowpass -> envelope.
    this.rhythmOsc1 = context.createOscillator();
    this.rhythmOsc1.type = 'sawtooth';

    this.rhythmOsc2 = context.createOscillator();
    this.rhythmOsc2.type = 'sawtooth';
    this.rhythmOsc2.detune.value = TitleMusic.RHYTHM_DETUNE_CENTS;

    this.rhythmWaveshaper = context.createWaveShaper();
    this.rhythmWaveshaper.curve = TitleMusic.createDistortionCurve() as Float32Array<ArrayBuffer>;

    this.rhythmFilter = context.createBiquadFilter();
    this.rhythmFilter.type = 'lowpass';
    this.rhythmFilter.frequency.value = TitleMusic.RHYTHM_FILTER_HZ;
    this.rhythmFilter.Q.value = TitleMusic.RHYTHM_FILTER_Q;

    this.rhythmGain = context.createGain();
    this.rhythmGain.gain.value = 0;

    this.rhythmOsc1.connect(this.rhythmWaveshaper);
    this.rhythmOsc2.connect(this.rhythmWaveshaper);
    this.rhythmWaveshaper.connect(this.rhythmFilter);
    this.rhythmFilter.connect(this.rhythmGain);
    this.rhythmGain.connect(this.masterGain);

    // --- Bass: one saw an octave down through a lowpass.
    this.bassOsc = context.createOscillator();
    this.bassOsc.type = 'sawtooth';

    this.bassFilter = context.createBiquadFilter();
    this.bassFilter.type = 'lowpass';
    this.bassFilter.frequency.value = TitleMusic.BASS_FILTER_HZ;
    this.bassFilter.Q.value = TitleMusic.BASS_FILTER_Q;

    this.bassGain = context.createGain();
    this.bassGain.gain.value = 0;

    this.bassOsc.connect(this.bassFilter);
    this.bassFilter.connect(this.bassGain);
    this.bassGain.connect(this.masterGain);

    // --- Drums: snare and hat both tap the one shared noise buffer.
    this.snareFilter = context.createBiquadFilter();
    this.snareFilter.type = 'bandpass';
    this.snareFilter.frequency.value = TitleMusic.SNARE_CENTER_HZ;
    this.snareFilter.Q.value = TitleMusic.SNARE_Q;

    this.snareGain = context.createGain();
    this.snareGain.gain.value = 0;

    this.hatFilter = context.createBiquadFilter();
    this.hatFilter.type = 'highpass';
    this.hatFilter.frequency.value = TitleMusic.HAT_CUTOFF_HZ;
    this.hatFilter.Q.value = 0.5;

    this.hatGain = context.createGain();
    this.hatGain.gain.value = 0;

    this.noise.connect(this.snareFilter);
    this.snareFilter.connect(this.snareGain);
    this.snareGain.connect(this.masterGain);

    this.noise.connect(this.hatFilter);
    this.hatFilter.connect(this.hatGain);
    this.hatGain.connect(this.masterGain);

    this.kickPool = Array.from({ length: TitleMusic.KICK_POOL_SIZE }, () => {
      const osc = context.createOscillator();
      osc.type = 'sine';
      const gain = context.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.masterGain);
      return { osc, gain };
    });

    // --- Lead: single square-wave voice for the pentatonic flourish.
    this.leadOsc = context.createOscillator();
    this.leadOsc.type = 'square';

    this.leadGain = context.createGain();
    this.leadGain.gain.value = 0;

    this.leadOsc.connect(this.leadGain);
    this.leadGain.connect(this.masterGain);
  }

  /** Hard-clip/tanh-shaped curve: the classic cheap distortion pedal shape,
   * turning a sawtooth into a buzzy power-chord tone. */
  private static createDistortionCurve(): Float32Array {
    const length = 4096;
    const curve = new Float32Array(length);
    for (let i = 0; i < length; i += 1) {
      const x = (i / (length - 1)) * 2 - 1;
      curve[i] = Math.tanh(3 * x);
    }
    return curve;
  }

  private isUsable(): boolean {
    return this.context.state !== 'closed' && !this.stopped;
  }

  /** Starts every oscillator and the look-ahead scheduler. Idempotent: a
   * second call while already playing is a no-op. */
  start(): void {
    if (this.started || !this.isUsable()) return;
    this.started = true;

    this.rhythmOsc1.start();
    this.rhythmOsc2.start();
    this.bassOsc.start();
    this.leadOsc.start();
    for (const { osc } of this.kickPool) osc.start();

    this.noise.start();

    this.stepCursor = 0;
    this.nextStepTime = this.context.currentTime;

    this.scheduleDueSteps();
    this.schedulerId = setInterval(() => this.scheduleDueSteps(), TitleMusic.SCHEDULER_INTERVAL_MS);
  }

  /** Schedules every eighth-note step whose time falls within the look-ahead
   * window from now. Never schedules the whole song at once — only what is
   * due soon — so the loop can (in principle) be altered while playing. */
  private scheduleDueSteps(): void {
    if (!this.isUsable()) return;

    const scheduleUntil = this.context.currentTime + TitleMusic.LOOK_AHEAD_SECONDS;
    const stepSeconds = beatsToSeconds(STEP_BEATS, BPM);

    while (this.nextStepTime < scheduleUntil) {
      this.scheduleStep(this.stepCursor, this.nextStepTime);
      this.stepCursor = wrapStepIndex(this.stepCursor + 1, TOTAL_STEPS);
      this.nextStepTime += stepSeconds;
    }
  }

  private scheduleStep(stepIndex: number, time: number): void {
    const bar = barIndexForStep(stepIndex);
    const eighth = eighthInBarForStep(stepIndex);
    const chord = RIFF[bar];
    const strum = GUITAR_STRUM_PATTERN[eighth];
    const drum = DRUM_PATTERN[eighth];

    this.scheduleGuitarStep(chord, strum, eighth, time);
    this.scheduleBassStep(chord, eighth, time);
    this.scheduleDrumStep(drum, time);
    this.scheduleLeadStep(bar, eighth, time);
  }

  private scheduleGuitarStep(chord: ChordStep, strum: StrumStep, eighth: number, time: number): void {
    if (eighth === 0) {
      const freq = noteFrequency(chord.note);
      this.rhythmOsc1.frequency.setValueAtTime(freq, time);
      this.rhythmOsc2.frequency.setValueAtTime(freq, time);
    }

    const accented = strum.accent || chord.accent;
    const peak = accented ? TitleMusic.RHYTHM_ACCENT_GAIN : TitleMusic.RHYTHM_CHUG_GAIN;

    // Percussive envelope, not a bare `.value =`: a palm-muted chug rings
    // briefly and dies, it does not sustain like an open chord.
    this.rhythmGain.gain.cancelScheduledValues(time);
    this.rhythmGain.gain.setValueAtTime(0.0001, time);
    this.rhythmGain.gain.exponentialRampToValueAtTime(peak, time + TitleMusic.RHYTHM_ATTACK_SECONDS);
    this.rhythmGain.gain.setTargetAtTime(0.0001, time + TitleMusic.RHYTHM_ATTACK_SECONDS, TitleMusic.RHYTHM_DECAY_TIME_CONSTANT);
  }

  private scheduleBassStep(chord: ChordStep, eighth: number, time: number): void {
    // Quarter-note pulse (every other eighth) rather than every eighth note:
    // a bass that chugs as fast as the guitar buries the low end.
    if (eighth % 2 !== 0) return;

    const freq = noteFrequency(chord.note) / 2;
    this.bassOsc.frequency.setValueAtTime(freq, time);

    this.bassGain.gain.cancelScheduledValues(time);
    this.bassGain.gain.setValueAtTime(0.0001, time);
    this.bassGain.gain.exponentialRampToValueAtTime(TitleMusic.BASS_GAIN, time + TitleMusic.BASS_ATTACK_SECONDS);
    this.bassGain.gain.setTargetAtTime(0.0001, time + TitleMusic.BASS_ATTACK_SECONDS, TitleMusic.BASS_DECAY_TIME_CONSTANT);
  }

  private scheduleDrumStep(step: DrumStep, time: number): void {
    if (step.kick) this.scheduleKick(time);

    if (step.snare) {
      this.snareGain.gain.cancelScheduledValues(time);
      this.snareGain.gain.setValueAtTime(TitleMusic.SNARE_GAIN, time);
      this.snareGain.gain.setTargetAtTime(0, time, TitleMusic.SNARE_DECAY_TIME_CONSTANT);
    }

    if (step.hat) {
      this.hatGain.gain.cancelScheduledValues(time);
      this.hatGain.gain.setValueAtTime(TitleMusic.HAT_GAIN, time);
      this.hatGain.gain.setTargetAtTime(0, time, TitleMusic.HAT_DECAY_TIME_CONSTANT);
    }
  }

  /** Round-robins the kick pool by a plain counter — never by wall-clock or
   * random sampling, both of which are forbidden in this project. */
  private scheduleKick(time: number): void {
    const { osc, gain } = this.kickPool[this.kickPoolCursor];
    this.kickPoolCursor = (this.kickPoolCursor + 1) % this.kickPool.length;

    const endTime = time + TitleMusic.KICK_SWEEP_SECONDS;
    osc.frequency.cancelScheduledValues(time);
    osc.frequency.setValueAtTime(TitleMusic.KICK_START_HZ, time);
    osc.frequency.exponentialRampToValueAtTime(TitleMusic.KICK_END_HZ, endTime);

    gain.gain.cancelScheduledValues(time);
    gain.gain.setValueAtTime(TitleMusic.KICK_GAIN, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
  }

  private scheduleLeadStep(bar: number, eighth: number, time: number): void {
    if (!barHasLick(bar)) return;

    const note = LEAD_LICK.find((entry) => entry.eighthInBar === eighth);
    if (!note) return;

    const freq = noteFrequency(note.note);
    this.leadOsc.frequency.setValueAtTime(freq, time);

    this.leadGain.gain.cancelScheduledValues(time);
    this.leadGain.gain.setValueAtTime(0.0001, time);
    this.leadGain.gain.exponentialRampToValueAtTime(TitleMusic.LEAD_GAIN, time + TitleMusic.LEAD_ATTACK_SECONDS);
    this.leadGain.gain.setTargetAtTime(0.0001, time + TitleMusic.LEAD_ATTACK_SECONDS, TitleMusic.LEAD_DECAY_TIME_CONSTANT);
  }

  /** Ramps the master send to silence, stops the scheduler, then tears the
   * graph down. Safe to call twice. */
  stop(): void {
    if (this.stopped) return;
    this.stopped = true;

    if (this.schedulerId !== null) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }

    if (this.context.state === 'closed') return;

    const now = this.context.currentTime;
    this.masterGain.gain.setTargetAtTime(0, now, TitleMusic.STOP_TIME_CONSTANT);

    const settleSeconds = TitleMusic.STOP_TIME_CONSTANT * TitleMusic.STOP_SETTLE_TIME_CONSTANTS;
    setTimeout(() => {
      try {
        this.rhythmOsc1.stop();
        this.rhythmOsc2.stop();
        this.bassOsc.stop();
        this.leadOsc.stop();
        for (const { osc } of this.kickPool) osc.stop();
      } catch {
        /* Already stopped or the context closed underneath us — nothing to do. */
      }

      this.rhythmWaveshaper.disconnect();
      this.rhythmFilter.disconnect();
      this.rhythmGain.disconnect();
      this.bassFilter.disconnect();
      this.bassGain.disconnect();
      this.snareFilter.disconnect();
      this.snareGain.disconnect();
      this.hatFilter.disconnect();
      this.hatGain.disconnect();
      for (const { gain } of this.kickPool) gain.disconnect();
      this.leadGain.disconnect();
      this.masterGain.disconnect();
    }, settleSeconds * 1000);
  }

  /** Mutes or unmutes without stopping the scheduler — the loop keeps
   * running silently so unmuting resumes in place rather than restarting. */
  setMuted(muted: boolean): void {
    if (!this.isUsable()) return;
    const now = this.context.currentTime;
    const target = muted ? 0 : TitleMusic.MASTER_GAIN;
    this.masterGain.gain.setTargetAtTime(clampUnit(target), now, TitleMusic.STOP_TIME_CONSTANT);
  }

  get isPlaying(): boolean {
    return this.started && !this.stopped;
  }

  /** Alias for `stop()`, kept as a distinct name so callers can express
   * "done with this instance forever" versus "pause the music". */
  destroy(): void {
    this.stop();
  }
}
