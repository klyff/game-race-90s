import { afterEach, describe, expect, it } from 'vitest';
import {
  enableTourMode,
  enableTourModeFromSearch,
  feedTourCode,
  isTourModeOn,
  resetTourMode,
  TOUR_CODE,
  tourModeFromSearch,
} from '../../src/adapters/progress/TourMode.ts';

afterEach(() => {
  resetTourMode();
});

describe('tourModeFromSearch', () => {
  it('accepts tour and allmaps query flags', () => {
    expect(tourModeFromSearch('?tour=1')).toBe(true);
    expect(tourModeFromSearch('?tour=true')).toBe(true);
    expect(tourModeFromSearch('?tour=all')).toBe(true);
    expect(tourModeFromSearch('?tour')).toBe(true);
    expect(tourModeFromSearch('allmaps=1')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(tourModeFromSearch('')).toBe(false);
    expect(tourModeFromSearch('?car=1')).toBe(false);
    expect(tourModeFromSearch('?tour=0')).toBe(false);
    expect(tourModeFromSearch('?tour=no')).toBe(false);
  });
});

describe('feedTourCode', () => {
  it('unlocks when the last letters spell TOUR', () => {
    let buffer = '';
    for (const letter of 'xxTOUR') {
      const next = feedTourCode(buffer, letter);
      buffer = next.buffer;
      expect(next.unlocked).toBe(letter === 'R');
    }
    expect(buffer).toBe(TOUR_CODE);
  });

  it('is case-insensitive and ignores arrows, Space and Enter', () => {
    let buffer = '';
    for (const key of ['t', 'ArrowLeft', 'o', ' ', 'u', 'Enter', 'r']) {
      const next = feedTourCode(buffer, key);
      buffer = next.buffer;
      expect(next.unlocked).toBe(key === 'r');
    }
  });
});

describe('tour session', () => {
  it('stays off until enabled, then stays on for the session', () => {
    expect(isTourModeOn()).toBe(false);
    expect(enableTourModeFromSearch('?car=1')).toBe(false);
    expect(isTourModeOn()).toBe(false);
    expect(enableTourModeFromSearch('?tour=1')).toBe(true);
    expect(isTourModeOn()).toBe(true);
    enableTourMode();
    expect(isTourModeOn()).toBe(true);
  });
});
