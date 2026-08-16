/**
 * One music theme per world (T-040). Every score is plain data played
 * through the shared `MusicPlayer` node graph — see `MusicScore.ts` for the
 * shape and `TitleMusic.ts` for the first score this pattern was proved on.
 *
 * Mood is carried mostly by tempo, timbre and arrangement density rather than
 * exotic chord theory, per the owner's own brief on T-040: "Vulkanis heavier
 * and slower, Neon Kasbah synth-led with a brighter filter, Cryo Hollow
 * sparse with lots of space, Bogmire Deep dragging and minor." Three strum
 * patterns and three drum patterns are shared across scores that want the
 * same groove density; only the notes, tempo and timbre change per planet.
 */

import type { ChordStep, DrumStep, MusicScore, StrumStep } from '../../adapters/audio/MusicScore.ts';
import { planetForTrackId, PLANETS } from './planets.ts';

// ---------------------------------------------------------------------------
// Shared arrangement shapes, reused across scores that want the same feel.
// ---------------------------------------------------------------------------

/** Accented stabs on beats 1 and 3, chugs elsewhere — the title theme's feel. */
const STANDARD_STRUM: readonly StrumStep[] = [
  { beats: 0.5, accent: true },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: true },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: false },
];

/** One accent per bar only, long gaps between chugs — for a spacious/sparse world. */
const SPARSE_STRUM: readonly StrumStep[] = [
  { beats: 0.5, accent: true },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: false },
];

/** Accented on every downbeat, for a heavier, more relentless world. */
const HEAVY_STRUM: readonly StrumStep[] = [
  { beats: 0.5, accent: true },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: true },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: true },
  { beats: 0.5, accent: false },
  { beats: 0.5, accent: true },
  { beats: 0.5, accent: false },
];

/** Straight hats, snare on 2 and 4, syncopated kick — the title theme's drums. */
const STANDARD_DRUM: readonly DrumStep[] = [
  { kick: true, snare: false, hat: true },
  { kick: false, snare: false, hat: true },
  { kick: false, snare: true, hat: true },
  { kick: false, snare: false, hat: true },
  { kick: true, snare: false, hat: true },
  { kick: true, snare: false, hat: true },
  { kick: false, snare: true, hat: true },
  { kick: false, snare: false, hat: true },
];

/** Half-time feel: hats only on every other step, snare on the backbeat, one kick per half-bar. */
const SPARSE_DRUM: readonly DrumStep[] = [
  { kick: true, snare: false, hat: true },
  { kick: false, snare: false, hat: false },
  { kick: false, snare: false, hat: true },
  { kick: false, snare: false, hat: false },
  { kick: false, snare: true, hat: true },
  { kick: false, snare: false, hat: false },
  { kick: false, snare: false, hat: true },
  { kick: false, snare: false, hat: false },
];

/** Kick on every step but the snare beats, for a driving, heavier pulse. */
const DOUBLE_KICK_DRUM: readonly DrumStep[] = [
  { kick: true, snare: false, hat: true },
  { kick: true, snare: false, hat: true },
  { kick: false, snare: true, hat: true },
  { kick: true, snare: false, hat: true },
  { kick: true, snare: false, hat: true },
  { kick: true, snare: false, hat: true },
  { kick: false, snare: true, hat: true },
  { kick: true, snare: false, hat: true },
];

const LICK_INTERVAL_BARS = 4;

/** Builds an 8-bar minor-key riff from six chord roots (`i - i - VI - VII` twice,
 * with the last bar of each half swapped for variety), each bar 4 beats. */
function minorRiff(
  i: string,
  vi: string,
  vii: string,
  flourish: string,
  accentBars: readonly number[] = [1, 4],
): readonly ChordStep[] {
  const bars = [i, i, vi, vii, i, vi, flourish, i];
  return bars.map((note, index) => ({ note, beats: 4, accent: accentBars.includes(index) }));
}

// ---------------------------------------------------------------------------
// The ten scores, keyed by planet slug (matches `planetThemes.ts`).
// ---------------------------------------------------------------------------

/** Thunder Basin: the flagship world, an arrangement close kin to the title
 * theme (same key, same energy) but its own lick and drum fill. */
const THUNDER_BASIN_SCORE: MusicScore = {
  id: 'thunder-basin',
  bpm: 168,
  riff: minorRiff('E3', 'C3', 'D3', 'A#2'),
  guitarStrumPattern: STANDARD_STRUM,
  drumPattern: STANDARD_DRUM,
  leadLick: [
    { eighthInBar: 3, note: 'B4', beats: 0.5 },
    { eighthInBar: 4, note: 'D5', beats: 0.5 },
    { eighthInBar: 5, note: 'E5', beats: 0.5 },
    { eighthInBar: 7, note: 'B4', beats: 0.5 },
  ],
  lickIntervalBars: LICK_INTERVAL_BARS,
  timbre: { rhythmFilterHz: 2800, rhythmFilterQ: 0.8, rhythmDrive: 2.6, bassFilterHz: 480, bassFilterQ: 0.9, leadWaveform: 'square' },
};

/** Chrome Verge: refinery grind — slower, harsher, more distorted. */
const CHROME_VERGE_SCORE: MusicScore = {
  id: 'chrome-verge',
  bpm: 148,
  riff: minorRiff('D3', 'A#2', 'C3', 'F#2'),
  guitarStrumPattern: HEAVY_STRUM,
  drumPattern: DOUBLE_KICK_DRUM,
  leadLick: [
    { eighthInBar: 4, note: 'D5', beats: 0.5 },
    { eighthInBar: 5, note: 'C5', beats: 0.5 },
    { eighthInBar: 6, note: 'A#4', beats: 0.5 },
    { eighthInBar: 7, note: 'F4', beats: 0.5 },
  ],
  lickIntervalBars: LICK_INTERVAL_BARS,
  timbre: { rhythmFilterHz: 2200, rhythmFilterQ: 0.9, rhythmDrive: 4.5, bassFilterHz: 420, bassFilterQ: 1, leadWaveform: 'sawtooth' },
};

/** Bogmire Deep: dragging and minor, per the owner's own brief. */
const BOGMIRE_DEEP_SCORE: MusicScore = {
  id: 'bogmire-deep',
  bpm: 112,
  riff: minorRiff('C3', 'G#2', 'A#2', 'F#2', [1]),
  guitarStrumPattern: SPARSE_STRUM,
  drumPattern: SPARSE_DRUM,
  leadLick: [
    { eighthInBar: 4, note: 'G4', beats: 1 },
    { eighthInBar: 6, note: 'F4', beats: 1 },
  ],
  lickIntervalBars: LICK_INTERVAL_BARS,
  timbre: { rhythmFilterHz: 1500, rhythmFilterQ: 0.7, rhythmDrive: 2, bassFilterHz: 340, bassFilterQ: 0.8, leadWaveform: 'triangle' },
};

/** Cryo Hollow: sparse, with lots of space, per the owner's own brief. */
const CRYO_HOLLOW_SCORE: MusicScore = {
  id: 'cryo-hollow',
  bpm: 130,
  riff: minorRiff('A2', 'F2', 'G2', 'E2', [1]),
  guitarStrumPattern: SPARSE_STRUM,
  drumPattern: SPARSE_DRUM,
  leadLick: [
    { eighthInBar: 5, note: 'A5', beats: 1 },
    { eighthInBar: 7, note: 'E5', beats: 1 },
  ],
  lickIntervalBars: LICK_INTERVAL_BARS,
  timbre: { rhythmFilterHz: 5200, rhythmFilterQ: 0.6, rhythmDrive: 1.4, bassFilterHz: 380, bassFilterQ: 0.7, leadWaveform: 'triangle' },
};

/** Ferro Rust: scrapyard grind, the buzziest, most metallic score. */
const FERRO_RUST_SCORE: MusicScore = {
  id: 'ferro-rust',
  bpm: 160,
  riff: minorRiff('D3', 'A#2', 'F3', 'C#3'),
  guitarStrumPattern: HEAVY_STRUM,
  drumPattern: DOUBLE_KICK_DRUM,
  leadLick: [
    { eighthInBar: 3, note: 'F5', beats: 0.5 },
    { eighthInBar: 4, note: 'D5', beats: 0.5 },
    { eighthInBar: 5, note: 'C#5', beats: 0.5 },
    { eighthInBar: 6, note: 'A#4', beats: 0.5 },
  ],
  lickIntervalBars: LICK_INTERVAL_BARS,
  timbre: { rhythmFilterHz: 2000, rhythmFilterQ: 1, rhythmDrive: 5, bassFilterHz: 400, bassFilterQ: 1, leadWaveform: 'sawtooth' },
};

/** Vulkanis: heavier and slower, per the owner's own brief. */
const VULKANIS_SCORE: MusicScore = {
  id: 'vulkanis',
  bpm: 122,
  riff: minorRiff('E2', 'C2', 'B1', 'A#1'),
  guitarStrumPattern: HEAVY_STRUM,
  drumPattern: DOUBLE_KICK_DRUM,
  leadLick: [
    { eighthInBar: 4, note: 'E4', beats: 1 },
    { eighthInBar: 6, note: 'A#3', beats: 1 },
  ],
  lickIntervalBars: LICK_INTERVAL_BARS,
  timbre: { rhythmFilterHz: 1700, rhythmFilterQ: 1.1, rhythmDrive: 5.5, bassFilterHz: 280, bassFilterQ: 1, leadWaveform: 'sawtooth' },
};

/** Neon Kasbah: synth-led with a brighter filter, per the owner's own brief. */
const NEON_KASBAH_SCORE: MusicScore = {
  id: 'neon-kasbah',
  bpm: 138,
  riff: minorRiff('A2', 'E3', 'D3', 'F#2', [1, 4]),
  guitarStrumPattern: STANDARD_STRUM,
  drumPattern: STANDARD_DRUM,
  leadLick: [
    { eighthInBar: 2, note: 'C#5', beats: 0.5 },
    { eighthInBar: 3, note: 'E5', beats: 0.5 },
    { eighthInBar: 4, note: 'F#5', beats: 0.5 },
    { eighthInBar: 5, note: 'E5', beats: 0.5 },
    { eighthInBar: 6, note: 'C#5', beats: 0.5 },
    { eighthInBar: 7, note: 'A4', beats: 0.5 },
  ],
  lickIntervalBars: LICK_INTERVAL_BARS,
  timbre: { rhythmFilterHz: 6000, rhythmFilterQ: 0.5, rhythmDrive: 1, bassFilterHz: 700, bassFilterQ: 0.7, leadWaveform: 'sawtooth' },
};

/** Ash Reach: grey, muted, desolate — the dampest, quietest timbre. */
const ASH_REACH_SCORE: MusicScore = {
  id: 'ash-reach',
  bpm: 108,
  riff: minorRiff('F2', 'D2', 'D#2', 'C2', [1]),
  guitarStrumPattern: SPARSE_STRUM,
  drumPattern: SPARSE_DRUM,
  leadLick: [
    { eighthInBar: 5, note: 'F4', beats: 1 },
    { eighthInBar: 7, note: 'D4', beats: 1 },
  ],
  lickIntervalBars: LICK_INTERVAL_BARS,
  timbre: { rhythmFilterHz: 1200, rhythmFilterQ: 0.6, rhythmDrive: 1.5, bassFilterHz: 320, bassFilterQ: 0.7, leadWaveform: 'sine' },
};

/** Voidport: orbital platform, cold and metallic, a pulsing lead. */
const VOIDPORT_SCORE: MusicScore = {
  id: 'voidport',
  bpm: 150,
  riff: minorRiff('B2', 'G2', 'A2', 'F#2'),
  guitarStrumPattern: STANDARD_STRUM,
  drumPattern: STANDARD_DRUM,
  leadLick: [
    { eighthInBar: 0, note: 'B4', beats: 0.5 },
    { eighthInBar: 2, note: 'F#4', beats: 0.5 },
    { eighthInBar: 4, note: 'B4', beats: 0.5 },
    { eighthInBar: 6, note: 'D5', beats: 0.5 },
  ],
  lickIntervalBars: LICK_INTERVAL_BARS,
  timbre: { rhythmFilterHz: 3500, rhythmFilterQ: 0.9, rhythmDrive: 2.5, bassFilterHz: 450, bassFilterQ: 0.9, leadWaveform: 'square' },
};

/** Verdant Fault: jungle ruins, gold light — the warmest score. */
const VERDANT_FAULT_SCORE: MusicScore = {
  id: 'verdant-fault',
  bpm: 145,
  riff: minorRiff('G2', 'D3', 'E3', 'C3', [1, 4]),
  guitarStrumPattern: STANDARD_STRUM,
  drumPattern: STANDARD_DRUM,
  leadLick: [
    { eighthInBar: 3, note: 'D5', beats: 0.5 },
    { eighthInBar: 4, note: 'E5', beats: 0.5 },
    { eighthInBar: 5, note: 'G5', beats: 0.5 },
    { eighthInBar: 7, note: 'D5', beats: 0.5 },
  ],
  lickIntervalBars: LICK_INTERVAL_BARS,
  timbre: { rhythmFilterHz: 4000, rhythmFilterQ: 0.7, rhythmDrive: 2, bassFilterHz: 550, bassFilterQ: 0.8, leadWaveform: 'triangle' },
};

export const PLANET_MUSIC: readonly MusicScore[] = [
  THUNDER_BASIN_SCORE,
  CHROME_VERGE_SCORE,
  BOGMIRE_DEEP_SCORE,
  CRYO_HOLLOW_SCORE,
  FERRO_RUST_SCORE,
  VULKANIS_SCORE,
  NEON_KASBAH_SCORE,
  ASH_REACH_SCORE,
  VOIDPORT_SCORE,
  VERDANT_FAULT_SCORE,
];

/** The world's score by planet slug, or `undefined` if the slug is unknown. */
export function musicForPlanetId(planetId: string): MusicScore | undefined {
  return PLANET_MUSIC.find((score) => score.id === planetId);
}

/** The world's score for whichever planet a track belongs to. */
export function musicForTrackId(trackId: string): MusicScore | undefined {
  const planet = planetForTrackId(trackId);
  return planet === undefined ? undefined : musicForPlanetId(planet.id);
}

/** Every planet has a score row — a missing one is a data bug, not a runtime one. */
export function everyPlanetHasMusic(): boolean {
  return PLANETS.every((planet) => PLANET_MUSIC.some((score) => score.id === planet.id));
}
