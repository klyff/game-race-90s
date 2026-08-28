import { afterEach, describe, expect, it } from 'vitest';
import {
  buildMcflyCareer,
  buildMcflySave,
  enableMcflyCheatFromSearch,
  isMcflyCheatOn,
  MCFLY_CAR_ID,
  MCFLY_CASH,
  MCFLY_CODE,
  MCFLY_PILOT,
  mcflyCodeFromSearch,
  mcflyTrackFromSearch,
  resetMcflyCheat,
} from '../../src/adapters/progress/McflyCheat.ts';
import { isTourModeOn, resetTourMode } from '../../src/adapters/progress/TourMode.ts';

afterEach(() => {
  resetMcflyCheat();
  resetTourMode();
});

describe('mcflyCodeFromSearch', () => {
  it('accepts the exact McFly code', () => {
    expect(mcflyCodeFromSearch(`?code=${MCFLY_CODE}`)).toBe(true);
    expect(mcflyCodeFromSearch(`code=${MCFLY_CODE}&tour=1`)).toBe(true);
  });

  it('rejects wrong case or wrong codes', () => {
    expect(mcflyCodeFromSearch('?code=mcfly1985')).toBe(false);
    expect(mcflyCodeFromSearch('?code=MCFLY1985')).toBe(false);
    expect(mcflyCodeFromSearch('?code=1')).toBe(false);
    expect(mcflyCodeFromSearch('')).toBe(false);
  });
});

describe('mcflyTrackFromSearch', () => {
  it('resolves world/pista to a campaign track', () => {
    expect(mcflyTrackFromSearch('?code=Mcfly1985&world=3&pista=3')).toBe('bogmire-deep-3');
  });
});

describe('buildMcflySave / buildMcflyCareer', () => {
  it('seeds KLYFF + DeLorean with cash', () => {
    const save = buildMcflySave(42);
    expect(save.slots[0]?.name).toBe(MCFLY_PILOT);
    expect(save.slots[0]?.carId).toBe(MCFLY_CAR_ID);

    const career = buildMcflyCareer(42);
    expect(career.activeSlotIndex).toBe(0);
    expect(career.slots[0]?.equippedCarId).toBe(MCFLY_CAR_ID);
    expect(career.slots[0]?.ownedCarIds).toContain(MCFLY_CAR_ID);
    expect(career.slots[0]?.cash).toBe(MCFLY_CASH);
  });
});

describe('enableMcflyCheatFromSearch', () => {
  it('arms tour + session when the code matches', () => {
    expect(enableMcflyCheatFromSearch(`?code=${MCFLY_CODE}`, 1_700_000_000_000)).toBe(true);
    expect(isMcflyCheatOn()).toBe(true);
    expect(isTourModeOn()).toBe(true);
  });

  it('is a no-op for a bad code', () => {
    expect(enableMcflyCheatFromSearch('?code=nope')).toBe(false);
    expect(isMcflyCheatOn()).toBe(false);
    expect(isTourModeOn()).toBe(false);
  });
});
