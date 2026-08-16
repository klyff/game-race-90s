import type { NoiseSource } from './NoiseSource.ts';
import { MusicPlayer } from './MusicPlayer.ts';
import type { ChordStep, DrumStep, LeadNote, MusicScore, StrumStep } from './MusicScore.ts';

export const BPM = 172;
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
  { note: 'E3', beats: 4, accent: false },
  { note: 'E3', beats: 4, accent: true },
  { note: 'G3', beats: 4, accent: false },
  { note: 'D3', beats: 4, accent: false },
  { note: 'E3', beats: 4, accent: true },
  { note: 'C3', beats: 4, accent: false },
  { note: 'D3', beats: 4, accent: false },
  { note: 'D3', beats: 4, accent: false },
  { note: 'E3', beats: 4, accent: false },
  { note: 'E3', beats: 4, accent: true },
  { note: 'G3', beats: 4, accent: false },
  { note: 'D3', beats: 4, accent: false },
  { note: 'E3', beats: 4, accent: true },
  { note: 'C3', beats: 4, accent: false },
  { note: 'A#2', beats: 4, accent: true },
  { note: 'E3', beats: 4, accent: false },
];

export const BAR_COUNT = RIFF.length;

/**
 * One bar of eighth-note guitar strumming: accented stabs on beats 1 and 3,
 * palm-muted chugs everywhere else. Reused for every bar — the chord changes
 * (from `RIFF`), the strum feel does not, which is exactly how a punk/metal
 * rhythm guitarist plays a progression.
 */
export const GUITAR_STRUM_PATTERN: readonly StrumStep[] = [
  { beats: 0.5, accent: true },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: true },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: false },
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
  { eighthInBar: 4, note: 'E5', beats: 0.5 },
  { eighthInBar: 5, note: 'D5', beats: 0.5 },
  { eighthInBar: 6, note: 'B4', beats: 0.5 },
  { eighthInBar: 7, note: 'G4', beats: 0.5 },
];

/** The title screen's theme: an 80s punk/metal riff. This is the score that
 * proved the `MusicPlayer` node graph and the pattern every world's theme in
 * `src/data/tracks/planetMusic.ts` follows. */
export const TITLE_SCORE: MusicScore = {
  id: 'title',
  bpm: BPM,
  riff: RIFF,
  guitarStrumPattern: GUITAR_STRUM_PATTERN,
  drumPattern: DRUM_PATTERN,
  leadLick: LEAD_LICK,
  lickIntervalBars: LICK_INTERVAL_BARS,
  timbre: {
    rhythmFilterHz: 3000,
    rhythmFilterQ: 0.8,
    rhythmDrive: 3,
    bassFilterHz: 500,
    bassFilterQ: 0.9,
    leadWaveform: 'square',
  },
};

/**
 * Looping 80s punk/metal title-screen instrumental. Exactly `MusicPlayer`
 * played with `TITLE_SCORE` — kept as its own tiny class only so
 * `TitleAudio.ts` can keep constructing a named type, per this project's
 * locked decision that every sound is procedural (decision 20).
 */
export class TitleMusic extends MusicPlayer {
  constructor(context: AudioContext, noise: NoiseSource, destination: AudioNode) {
    super(context, noise, destination, TITLE_SCORE);
  }
}
