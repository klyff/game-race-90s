// ---------------------------------------------------------------------------
// A `MusicScore` is a whole song as plain data: tempo, a chord progression, a
// strum/drum pattern reused every bar, an occasional lead lick, and a small
// timbre block. No `AudioContext`, no Web Audio types — everything here is
// arithmetic over plain objects so it can be unit-tested without a browser
// and so a new world's theme is authoring a value, never writing a new
// synthesiser (`MusicPlayer` is the one shared node graph that plays any
// `MusicScore`).
//
// Every score shares the same time signature: 4 beats per bar, 8 eighth-note
// steps per bar. Only the riff length (bar count), tempo, patterns and timbre
// vary between scores.
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

/**
 * The knobs that make one world's theme sound different from another's
 * without touching the node graph itself: how distorted and how bright the
 * rhythm guitar is, how the bass is filtered, and what waveform the lead
 * plays. Deliberately small — the drum kit, envelopes and mix balance stay
 * shared, or every score would need its own sound-design pass.
 */
export interface MusicTimbre {
  readonly rhythmFilterHz: number;
  readonly rhythmFilterQ: number;
  /** Tanh drive coefficient for the rhythm guitar's distortion curve. Higher
   * is buzzier/more saturated; the title theme ships at 3. */
  readonly rhythmDrive: number;
  readonly bassFilterHz: number;
  readonly bassFilterQ: number;
  readonly leadWaveform: OscillatorType;
}

/** A whole song, as data. */
export interface MusicScore {
  readonly id: string;
  readonly bpm: number;
  /** Chord progression, one entry per bar. Its length is the score's bar count. */
  readonly riff: readonly ChordStep[];
  /** One bar of eighth-note guitar strumming, reused for every bar of `riff`. */
  readonly guitarStrumPattern: readonly StrumStep[];
  /** One bar of eighth-note drums, reused for every bar of `riff`. */
  readonly drumPattern: readonly DrumStep[];
  /** A short flourish that plays on every `lickIntervalBars`-th bar. */
  readonly leadLick: readonly LeadNote[];
  readonly lickIntervalBars: number;
  readonly timbre: MusicTimbre;
}

export const BEATS_PER_BAR = 4;
export const STEPS_PER_BAR = 8;
/** Duration, in beats, of one eighth-note step: BEATS_PER_BAR / STEPS_PER_BAR. */
export const STEP_BEATS = BEATS_PER_BAR / STEPS_PER_BAR;

/** Number of bars in a score's loop. */
export function barCount(score: MusicScore): number {
  return score.riff.length;
}

/** Total eighth-note steps in a score's loop. */
export function totalSteps(score: MusicScore): number {
  return barCount(score) * STEPS_PER_BAR;
}

/** True on the bars where `score.leadLick` should play: every
 * `lickIntervalBars`th bar (0-indexed), i.e. the last bar of each phrase. */
export function barHasLick(score: MusicScore, barIndex: number): boolean {
  return (barIndex + 1) % score.lickIntervalBars === 0;
}

/** Wraps a step counter into `[0, total)`. Handles negative input too, since
 * JavaScript's `%` keeps the sign of the dividend. */
export function wrapStepIndex(index: number, total: number): number {
  return ((index % total) + total) % total;
}

/** Which bar a global step index falls in, for this score's loop length. */
export function barIndexForStep(score: MusicScore, stepIndex: number): number {
  return Math.floor(stepIndex / STEPS_PER_BAR) % barCount(score);
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
 * bar's steps add up and to size a whole score's loop. */
export function totalBeats(steps: readonly { readonly beats: number }[]): number {
  return steps.reduce((sum, step) => sum + step.beats, 0);
}
