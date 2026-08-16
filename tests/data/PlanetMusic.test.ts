import { describe, it, expect } from 'vitest';
import { PLANETS, planetTrackId } from '../../src/data/tracks/planets.ts';
import {
  PLANET_MUSIC,
  everyPlanetHasMusic,
  musicForPlanetId,
  musicForTrackId,
} from '../../src/data/tracks/planetMusic.ts';
import {
  STEPS_PER_BAR,
  BEATS_PER_BAR,
  barCount,
  noteFrequency,
  totalBeats,
} from '../../src/adapters/audio/MusicScore.ts';

const MIN_SANE_HZ = 30;
const MAX_SANE_HZ = 2000;

describe('planetMusic', () => {
  it('covers every campaign planet', () => {
    expect(everyPlanetHasMusic()).toBe(true);
    expect(PLANET_MUSIC).toHaveLength(10);
  });

  it('looks up a score by its campaign track id', () => {
    const cryo = PLANETS.find((planet) => planet.id === 'cryo-hollow')!;
    expect(musicForTrackId(planetTrackId(cryo, 2))?.id).toBe('cryo-hollow');
  });

  it('returns undefined for an unknown planet or track id', () => {
    expect(musicForPlanetId('not-a-planet')).toBeUndefined();
    expect(musicForTrackId('missing')).toBeUndefined();
  });

  it('every score has a distinct id matching a real planet slug', () => {
    const ids = PLANET_MUSIC.map((score) => score.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(PLANETS.some((planet) => planet.id === id)).toBe(true);
    }
  });

  it('every score is playable at a sane tempo', () => {
    for (const score of PLANET_MUSIC) {
      expect(score.bpm).toBeGreaterThanOrEqual(80);
      expect(score.bpm).toBeLessThanOrEqual(200);
    }
  });

  it('every riff sums to whole bars of BEATS_PER_BAR', () => {
    for (const score of PLANET_MUSIC) {
      expect(totalBeats(score.riff)).toBe(barCount(score) * BEATS_PER_BAR);
    }
  });

  it('every guitar strum pattern and drum pattern is exactly one bar of eighth notes', () => {
    for (const score of PLANET_MUSIC) {
      expect(score.guitarStrumPattern).toHaveLength(STEPS_PER_BAR);
      expect(score.drumPattern).toHaveLength(STEPS_PER_BAR);
      expect(totalBeats(score.guitarStrumPattern)).toBe(BEATS_PER_BAR);
    }
  });

  it('every chord and lead note resolves to a frequency in the sane instrument range', () => {
    for (const score of PLANET_MUSIC) {
      for (const step of score.riff) {
        const freq = noteFrequency(step.note);
        expect(freq).toBeGreaterThanOrEqual(MIN_SANE_HZ);
        expect(freq).toBeLessThanOrEqual(MAX_SANE_HZ);
      }
      for (const note of score.leadLick) {
        const freq = noteFrequency(note.note);
        expect(freq).toBeGreaterThan(0);
        expect(Number.isFinite(freq)).toBe(true);
      }
    }
  });

  it('every lead note falls inside its bar and every timbre value is a positive, finite number', () => {
    for (const score of PLANET_MUSIC) {
      for (const note of score.leadLick) {
        expect(note.eighthInBar).toBeGreaterThanOrEqual(0);
        expect(note.eighthInBar).toBeLessThan(STEPS_PER_BAR);
      }
      expect(score.timbre.rhythmFilterHz).toBeGreaterThan(0);
      expect(score.timbre.rhythmFilterQ).toBeGreaterThan(0);
      expect(score.timbre.rhythmDrive).toBeGreaterThan(0);
      expect(score.timbre.bassFilterHz).toBeGreaterThan(0);
      expect(score.timbre.bassFilterQ).toBeGreaterThan(0);
    }
  });
});
