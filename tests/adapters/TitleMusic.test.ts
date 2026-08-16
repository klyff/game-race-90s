import { describe, it, expect } from 'vitest';
import {
  RIFF,
  DRUM_PATTERN,
  noteFrequency,
  beatsToSeconds,
  totalBeats,
} from '../../src/adapters/audio/TitleMusic';

describe('TitleMusic', () => {
  describe('totalBeats', () => {
    it('sums 16 bars of 4 beats each', () => {
      expect(totalBeats(RIFF)).toBe(64);
    });
  });

  describe('noteFrequency', () => {
    it('returns 440 Hz for A4 (reference pitch)', () => {
      expect(noteFrequency('A4')).toBe(440);
    });

    it('returns 220 Hz for A3 (one octave below A4)', () => {
      expect(noteFrequency('A3')).toBe(220);
    });

    it('returns ~82.41 Hz for E2 within 0.5 Hz tolerance', () => {
      const e2 = noteFrequency('E2');
      expect(e2).toBeCloseTo(82.41, 1);
    });

    it('throws on invalid note letter H', () => {
      expect(() => noteFrequency('H9')).toThrow();
    });

    it('throws on empty string', () => {
      expect(() => noteFrequency('')).toThrow();
    });
  });

  describe('RIFF notes', () => {
    it('all notes resolve to frequencies between 40 and 2000 Hz', () => {
      RIFF.forEach((step) => {
        const freq = noteFrequency(step.note);
        expect(freq).toBeGreaterThanOrEqual(40);
        expect(freq).toBeLessThanOrEqual(2000);
      });
    });
  });

  describe('beatsToSeconds', () => {
    it('converts 4 beats at 172 BPM to ~1.3953 seconds', () => {
      const result = beatsToSeconds(4, 172);
      expect(result).toBeCloseTo(1.3953, 3);
    });
  });

  describe('DRUM_PATTERN', () => {
    it('has exactly 8 steps (one bar of eighths)', () => {
      expect(DRUM_PATTERN.length).toBe(8);
    });

    it('has snare on exactly steps 2 and 6 (beats 2 and 4)', () => {
      const snareSteps = DRUM_PATTERN.map((step, i) => (step.snare ? i : null)).filter(
        (i) => i !== null,
      );
      expect(snareSteps).toEqual([2, 6]);
    });

    it('has hat on every step', () => {
      DRUM_PATTERN.forEach((step) => {
        expect(step.hat).toBe(true);
      });
    });
  });
});
