import {
  RIFF,
  GUITAR_STRUM_PATTERN,
  DRUM_PATTERN,
  LEAD_LICK,
  BAR_COUNT,
  LICK_INTERVAL_BARS,
  TITLE_SCORE,
} from '../../src/adapters/audio/TitleMusic.ts';
import {
  BEATS_PER_BAR,
  STEPS_PER_BAR,
  barHasLick,
  wrapStepIndex,
  barIndexForStep,
  eighthInBarForStep,
  noteFrequency,
  beatsToSeconds,
  totalBeats,
  totalSteps,
} from '../../src/adapters/audio/MusicScore.ts';

const TOTAL_STEPS = totalSteps(TITLE_SCORE);

const MIN_SANE_HZ = 40;
const MAX_SANE_HZ = 2000;

describe('TitleMusic composition', () => {
  it('sums the chord progression to BAR_COUNT full bars of BEATS_PER_BAR', () => {
    expect(totalBeats(RIFF)).toBe(BAR_COUNT * BEATS_PER_BAR);
  });

  it('sums the guitar strum pattern to exactly one bar of beats', () => {
    expect(totalBeats(GUITAR_STRUM_PATTERN)).toBe(BEATS_PER_BAR);
  });

  it('every chord in RIFF resolves to a frequency in the sane instrument range', () => {
    for (const step of RIFF) {
      const freq = noteFrequency(step.note);
      expect(freq).toBeGreaterThanOrEqual(MIN_SANE_HZ);
      expect(freq).toBeLessThanOrEqual(MAX_SANE_HZ);
    }
  });

  it('every lead lick note resolves to a frequency in the sane instrument range', () => {
    for (const note of LEAD_LICK) {
      const freq = noteFrequency(note.note);
      expect(freq).toBeGreaterThanOrEqual(MIN_SANE_HZ);
      expect(freq).toBeLessThanOrEqual(MAX_SANE_HZ);
    }
  });

  it('resolves a known reference pitch (A4 = 440 Hz) exactly', () => {
    expect(noteFrequency('A4')).toBe(440);
  });

  it('resolves a note one octave below the reference to half the frequency', () => {
    expect(noteFrequency('A3')).toBeCloseTo(220, 5);
  });

  it('throws on a note letter outside A-G', () => {
    expect(() => noteFrequency('H4')).toThrow();
  });

  it('throws on malformed input with no octave', () => {
    expect(() => noteFrequency('E')).toThrow();
  });

  it('has the expected total pattern length in bars', () => {
    expect(BAR_COUNT).toBe(16);
    expect(RIFF.length).toBe(BAR_COUNT);
  });

  it('opens in A major, the sunny California home chord', () => {
    expect(RIFF[0]?.note).toBe('A3');
    expect(TITLE_SCORE.bpm).toBe(186);
    expect(TITLE_SCORE.timbre.rhythmDrive).toBeLessThan(2);
  });

  it('has TOTAL_STEPS equal to bars times steps-per-bar', () => {
    expect(TOTAL_STEPS).toBe(BAR_COUNT * STEPS_PER_BAR);
  });

  it('converts beats to seconds using tempo (4 beats at 186 BPM)', () => {
    const seconds = beatsToSeconds(4, 186);
    expect(seconds).toBeCloseTo((4 * 60) / 186, 6);
  });

  it('marks the lick on every LICK_INTERVAL_BARS-th bar and no other', () => {
    for (let bar = 0; bar < BAR_COUNT; bar += 1) {
      const expected = (bar + 1) % LICK_INTERVAL_BARS === 0;
      expect(barHasLick(TITLE_SCORE, bar)).toBe(expected);
    }
  });

  it('wraps a step index that lands exactly on the pattern length back to zero', () => {
    expect(wrapStepIndex(TOTAL_STEPS, TOTAL_STEPS)).toBe(0);
  });

  it('wraps a step index one past the pattern length to one', () => {
    expect(wrapStepIndex(TOTAL_STEPS + 1, TOTAL_STEPS)).toBe(1);
  });

  it('wraps a negative step index into range', () => {
    expect(wrapStepIndex(-1, TOTAL_STEPS)).toBe(TOTAL_STEPS - 1);
  });

  it('leaves an in-range step index untouched', () => {
    expect(wrapStepIndex(5, TOTAL_STEPS)).toBe(5);
  });

  it('maps global step indices to the correct bar index across the whole loop', () => {
    for (let step = 0; step < TOTAL_STEPS; step += 1) {
      const expectedBar = Math.floor(step / STEPS_PER_BAR);
      expect(barIndexForStep(TITLE_SCORE, step)).toBe(expectedBar);
    }
  });

  it('maps global step indices to the correct eighth-in-bar across the whole loop', () => {
    for (let step = 0; step < TOTAL_STEPS; step += 1) {
      const expectedEighth = step % STEPS_PER_BAR;
      expect(eighthInBarForStep(step)).toBe(expectedEighth);
    }
  });
});

describe('TitleMusic drum pattern', () => {
  it('sums to exactly one bar of beats', () => {
    expect(DRUM_PATTERN.length).toBe(STEPS_PER_BAR);
  });

  it('places the snare on beats 2 and 4 (eighth-note slots 2 and 6)', () => {
    const snareSlots = DRUM_PATTERN.reduce<number[]>((acc, step, index) => {
      if (step.snare) acc.push(index);
      return acc;
    }, []);
    expect(snareSlots).toEqual([2, 6]);
  });

  it('plays the hi-hat on every eighth-note slot', () => {
    expect(DRUM_PATTERN.every((step) => step.hat)).toBe(true);
  });
});
