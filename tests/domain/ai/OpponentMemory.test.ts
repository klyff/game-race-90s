import { describe, expect, it } from 'vitest';
import {
  decayMemory,
  emptyMemory,
  memoryEffect,
  recordRamReceived,
  recordWeaponHitReceived,
} from '../../../src/domain/ai/OpponentMemory.ts';

describe('opponent memory', () => {
  it('scales stored memory by opponentMemory personality', () => {
    const entry = recordRamReceived(emptyMemory('car-2'), 1);
    expect(memoryEffect(entry, 0.95)).toBeGreaterThan(memoryEffect(entry, 0.4));
  });

  it('decays grudges over time', () => {
    const hot = recordWeaponHitReceived(emptyMemory('car-2'), 1);
    const cold = decayMemory(hot, 8);
    expect(cold.grudge).toBeLessThan(hot.grudge);
  });
});
