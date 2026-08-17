import type { NoiseSource } from './NoiseSource.ts';
import { MusicPlayer } from './MusicPlayer.ts';
import type { ChordStep, DrumStep, LeadNote, MusicScore, StrumStep } from './MusicScore.ts';

export const BPM = 186;
export const LICK_INTERVAL_BARS = 4;

/**
 * 16-bar sunny California rock in A major / A mixolydian.
 *
 * Half 1: A - A - G - D - A - E - F#m - D  (I–I–bVII–IV, then I–V–vi–IV).
 * Half 2: A - A - G - D - A - E - D - A   — the last four bars walk home
 * so the loop seam lands on A and disappears.
 *
 * This replaced the E-minor punk/metal title riff: same 16-bar shape and
 * the same MusicPlayer graph, but a brighter, more animated SoCal feel
 * that matches the splash art (palms, explosion, Santa Monica energy).
 */
export const RIFF: readonly ChordStep[] = [
  { note: 'A3', beats: 4, accent: false },
  { note: 'A3', beats: 4, accent: true },
  { note: 'G3', beats: 4, accent: false },
  { note: 'D3', beats: 4, accent: false },
  { note: 'A3', beats: 4, accent: true },
  { note: 'E3', beats: 4, accent: false },
  { note: 'F#3', beats: 4, accent: false },
  { note: 'D3', beats: 4, accent: false },
  { note: 'A3', beats: 4, accent: false },
  { note: 'A3', beats: 4, accent: true },
  { note: 'G3', beats: 4, accent: false },
  { note: 'D3', beats: 4, accent: false },
  { note: 'A3', beats: 4, accent: true },
  { note: 'E3', beats: 4, accent: false },
  { note: 'D3', beats: 4, accent: true },
  { note: 'A3', beats: 4, accent: false },
];

export const BAR_COUNT = RIFF.length;

/**
 * Open, ringing strums on every downbeat — less palm-mute chug than the
 * old metal riff, more California bounce.
 */
export const GUITAR_STRUM_PATTERN: readonly StrumStep[] = [
  { beats: 0.5, accent: true },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: true },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: true },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: true },
  { beats: 0.5, accent: false },
];

/** Snare still on 2 and 4; extra kicks on the "and"s for a skate-punk push. */
export const DRUM_PATTERN: readonly DrumStep[] = [
  { kick: true, snare: false, hat: true },
  { kick: false, snare: false, hat: true },
  { kick: false, snare: true, hat: true },
  { kick: true, snare: false, hat: true },
  { kick: true, snare: false, hat: true },
  { kick: false, snare: false, hat: true },
  { kick: false, snare: true, hat: true },
  { kick: true, snare: false, hat: true },
];

/** A-major pentatonic run that fills the back half of every 4th bar. */
export const LEAD_LICK: readonly LeadNote[] = [
  { eighthInBar: 4, note: 'A5', beats: 0.5 },
  { eighthInBar: 5, note: 'C#5', beats: 0.5 },
  { eighthInBar: 6, note: 'E5', beats: 0.5 },
  { eighthInBar: 7, note: 'A5', beats: 0.5 },
];

/** The title screen's theme: sunny California rock. */
export const TITLE_SCORE: MusicScore = {
  id: 'title',
  bpm: BPM,
  riff: RIFF,
  guitarStrumPattern: GUITAR_STRUM_PATTERN,
  drumPattern: DRUM_PATTERN,
  leadLick: LEAD_LICK,
  lickIntervalBars: LICK_INTERVAL_BARS,
  timbre: {
    rhythmFilterHz: 5200,
    rhythmFilterQ: 0.55,
    rhythmDrive: 1.5,
    bassFilterHz: 620,
    bassFilterQ: 0.7,
    leadWaveform: 'triangle',
  },
};

/**
 * Looping California title-screen instrumental. Exactly `MusicPlayer`
 * played with `TITLE_SCORE` — kept as its own tiny class only so
 * `TitleAudio.ts` can keep constructing a named type, per this project's
 * locked decision that every sound is procedural (decision 20).
 */
export class TitleMusic extends MusicPlayer {
  constructor(context: AudioContext, noise: NoiseSource, destination: AudioNode) {
    super(context, noise, destination, TITLE_SCORE);
  }
}
