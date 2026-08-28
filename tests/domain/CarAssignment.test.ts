import { describe, it, expect } from 'vitest';
import { assignNpcCars, resolveCareerField, seatCarId } from '../../src/domain/race/CarAssignment.ts';

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

  it('fills a seven-car grid with six unique NPCs from a larger roster', () => {
    const fleet = [...ROSTER, 'car-6-tank', 'car-7-turbo', 'delorean'];
    const npcs = assignNpcCars(fleet, 'marauder', 6);
    expect(npcs).toHaveLength(6);
    expect(new Set(npcs).size).toBe(6);
    expect(npcs).not.toContain('marauder');
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

  it('with two spinner cars, one is the player and the other fills every NPC seat', () => {
    const fleet = ['1-muscle-car-gray-number9', '2-sportivo-blue-combat'];
    const field = resolveCareerField(
      fleet,
      ['2-sportivo-blue-combat'],
      '2-sportivo-blue-combat',
      12,
      '2-sportivo-blue-combat',
    );
    expect(field.playerCarId).toBe('2-sportivo-blue-combat');
    expect(field.npcIds).toHaveLength(12);
    expect(new Set(field.npcIds)).toEqual(new Set(['1-muscle-car-gray-number9']));
    expect(field.npcIds).not.toContain(field.playerCarId);
  });

  it('remaps a matrix pick onto the spinner default so the grid still starts', () => {
    const fleet = ['1-muscle-car-gray-number9', '2-sportivo-blue-combat'];
    const field = resolveCareerField(fleet, fleet, 'car-1', 12, '2-sportivo-blue-combat');
    expect(field.playerCarId).toBe('2-sportivo-blue-combat');
    expect(new Set(field.npcIds)).toEqual(new Set(['1-muscle-car-gray-number9']));
  });

  it('never hands NPCs the player-only DeLorean, even when it is in the fleet', () => {
    const fleet = [
      '2-sportivo-blue-combat',
      '10-delorean-steel-flux',
      '1-muscle-car-gray-number9',
    ];
    const field = resolveCareerField(
      fleet,
      fleet,
      '2-sportivo-blue-combat',
      4,
      '2-sportivo-blue-combat',
    );
    expect(field.npcIds).not.toContain('10-delorean-steel-flux');
    expect(new Set(field.npcIds)).toEqual(new Set(['1-muscle-car-gray-number9']));
    expect(assignNpcCars(fleet, '2-sportivo-blue-combat', 3)).not.toContain(
      '10-delorean-steel-flux',
    );
  });

  it('tags reused models with a seat so finish state cannot leak across twins', () => {
    const npcs = assignNpcCars(['a', 'b', 'c'], 'a', 5);
    const seats = npcs.map((id, index) => seatCarId(id, index));
    expect(seats).toEqual(['b#0', 'c#1', 'b#2', 'c#3', 'b#4']);
    expect(new Set(seats).size).toBe(5);
    expect(seatCarId('car_21#0', 4)).toBe('car_21#0');
  });
});
