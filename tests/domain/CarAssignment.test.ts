import { describe, it, expect } from 'vitest';
import { assignNpcCars } from '../../src/domain/race/CarAssignment.ts';

const ROSTER = ['marauder', 'dirt-devil', 'havac', 'air-blade', 'battle-trak'];

describe('assignNpcCars', () => {
  it('never gives an NPC the car the player picked', () => {
    for (const pick of ROSTER) {
      const npcs = assignNpcCars(ROSTER, pick, 4);
      expect(npcs).not.toContain(pick);
    }
  });

  it('never repeats a car when the roster is big enough for the field', () => {
    const npcs = assignNpcCars(ROSTER, 'havac', 4);
    expect(npcs).toHaveLength(4);
    expect(new Set(npcs).size).toBe(4);
  });

  it('fills the whole roster minus the player, in roster order', () => {
    expect(assignNpcCars(ROSTER, 'marauder', 4)).toEqual([
      'dirt-devil',
      'havac',
      'air-blade',
      'battle-trak',
    ]);
  });

  it('is deterministic, so a race can be reproduced', () => {
    const first = assignNpcCars(ROSTER, 'air-blade', 4);
    const second = assignNpcCars(ROSTER, 'air-blade', 4);
    expect(second).toEqual(first);
  });

  it('returns exactly the number of NPCs asked for, even below the roster size', () => {
    expect(assignNpcCars(ROSTER, 'marauder', 2)).toEqual(['dirt-devil', 'havac']);
    expect(assignNpcCars(ROSTER, 'marauder', 1)).toEqual(['dirt-devil']);
  });

  it('reuses the roster rather than coming back short when the field is bigger', () => {
    const npcs = assignNpcCars(['a', 'b', 'c'], 'a', 5);
    // A short field would desync the grid, the standings and the HUD; duplicates
    // are the lesser evil and this pins that choice.
    expect(npcs).toHaveLength(5);
    expect(npcs).toEqual(['b', 'c', 'b', 'c', 'b']);
    expect(npcs).not.toContain('a');
  });

  it('returns empty when there is no car left to hand out', () => {
    expect(assignNpcCars(['solo'], 'solo', 4)).toEqual([]);
    expect(assignNpcCars([], 'marauder', 4)).toEqual([]);
  });

  it('returns empty for a nonsensical count instead of throwing', () => {
    expect(assignNpcCars(ROSTER, 'marauder', 0)).toEqual([]);
    expect(assignNpcCars(ROSTER, 'marauder', -3)).toEqual([]);
    expect(assignNpcCars(ROSTER, 'marauder', Number.NaN)).toEqual([]);
  });

  it('ignores a player pick that is not in the roster and simply fills from it', () => {
    expect(assignNpcCars(ROSTER, 'not-a-car', 3)).toEqual(['marauder', 'dirt-devil', 'havac']);
  });
});
