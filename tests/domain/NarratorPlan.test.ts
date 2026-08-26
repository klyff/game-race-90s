import { describe, expect, it } from 'vitest';
import { NARRATOR_CATEGORY, NARRATOR_LINES, narratorLine } from '../../src/data/audio/NarratorBank.ts';
import { clipsInPlan, planNarratorRace } from '../../src/domain/audio/NarratorPlan.ts';

function sequence(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
}

describe('NarratorPlan', () => {
  it('pre-rolls start, two different final-lap lines, and a finish bucket', () => {
    const plan = planNarratorRace({
      lapCount: 3,
      parSeconds: 50,
      random: sequence([0.1, 0.4, 0.7, 0.2, 0.9, 0.35, 0.55, 0.05, 0.8]),
    });

    expect(narratorLine(plan.raceStart.lineId)?.category).toBe(NARRATOR_CATEGORY.RACE_START);
    expect(plan.finalLapStart.lineId).not.toBe(plan.finalLapMid.lineId);
    expect(narratorLine(plan.victory.lineId)?.category).toBe(NARRATOR_CATEGORY.VICTORY);
    expect(narratorLine(plan.second.lineId)?.category).toBe(NARRATOR_CATEGORY.VICTORY);
    expect(['we-got-a-winner', 'you-got-it']).toContain(plan.victory.lineId);
    expect(['we-got-a-winner', 'you-got-it']).toContain(plan.second.lineId);
    expect(plan.victory.lineId).not.toBe(plan.second.lineId);
    expect(narratorLine(plan.last.lineId)?.category).toBe(NARRATOR_CATEGORY.LAST);
  });

  it('builds event pools as shuffled index lists, not the whole catalog', () => {
    const plan = planNarratorRace({
      lapCount: 3,
      parSeconds: 50,
      random: () => 0.25,
    });

    expect(plan.damagePool.length).toBeGreaterThanOrEqual(2);
    expect(plan.damagePool.length).toBeLessThanOrEqual(
      NARRATOR_LINES.filter(line => line.category === NARRATOR_CATEGORY.DAMAGE).length,
    );
    expect(plan.weaponsPool.length).toBeGreaterThanOrEqual(2);
    expect(plan.behindPool.length).toBeGreaterThanOrEqual(1);
    expect(plan.boostPool.length).toBeGreaterThanOrEqual(2);
  });

  it('schedules banter on the race clock with a gap, inside the three laps', () => {
    const plan = planNarratorRace({
      lapCount: 3,
      parSeconds: 50,
      random: sequence([0.11, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77, 0.88, 0.19, 0.41]),
    });

    expect(plan.banter.length).toBeGreaterThanOrEqual(4);
    const times = plan.banter.map(cue => cue.atSeconds);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times[0]).toBeGreaterThanOrEqual(8);
    expect(times[times.length - 1]).toBeLessThan(150);
    for (let i = 1; i < times.length; i += 1) {
      expect((times[i] ?? 0) - (times[i - 1] ?? 0)).toBeGreaterThanOrEqual(10 - 1e-9);
    }
  });

  it('lists unique clips so the race can preload exactly what it will speak', () => {
    const plan = planNarratorRace({ lapCount: 3, parSeconds: 48, random: () => 0.4 });
    const clips = clipsInPlan(plan);
    const keys = clips.map(clip => `${clip.voice}-${clip.lineId}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(clips.length).toBeGreaterThan(8);
  });
});
