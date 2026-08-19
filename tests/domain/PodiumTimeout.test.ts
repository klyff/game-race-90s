import { describe, it, expect } from 'vitest';
import {
  PODIUM_PLAYER_HOLD_SECONDS,
  PODIUM_TIMEOUT_FRACTION,
  PODIUM_TIMEOUT_LABEL,
  fullTrackSeconds,
  isPlayerOnPodium,
  podiumGraceDuration,
  podiumIsLocked,
  podiumTimeoutDuration,
  formatPodiumTimeoutHud,
} from '../../src/domain/race/PodiumTimeout.ts';

describe('fullTrackSeconds', () => {
  it('multiplies one-lap par by the race lap count', () => {
    expect(fullTrackSeconds(40, 3, 999)).toBe(120);
  });

  it('falls back to a live finish time when par is missing', () => {
    expect(fullTrackSeconds(undefined, 3, 88)).toBe(88);
  });

  it('ignores non-positive par and uses the fallback', () => {
    expect(fullTrackSeconds(0, 3, 50)).toBe(50);
    expect(fullTrackSeconds(-10, 3, 50)).toBe(50);
    expect(fullTrackSeconds(NaN, 3, 50)).toBe(50);
  });

  it('returns 0 when both par and fallback are unusable', () => {
    expect(fullTrackSeconds(undefined, 3, 0)).toBe(0);
    expect(fullTrackSeconds(undefined, 3, NaN)).toBe(0);
  });
});

describe('podiumTimeoutDuration', () => {
  it('is one sixth of a full-track run', () => {
    expect(podiumTimeoutDuration(120)).toBe(120 * PODIUM_TIMEOUT_FRACTION);
    expect(podiumTimeoutDuration(120)).toBe(20);
  });

  it('returns 0 for nonsense', () => {
    expect(podiumTimeoutDuration(0)).toBe(0);
    expect(podiumTimeoutDuration(-4)).toBe(0);
    expect(podiumTimeoutDuration(NaN)).toBe(0);
  });
});

describe('podiumIsLocked', () => {
  it('locks a normal field when three cars have finished', () => {
    expect(podiumIsLocked(2, 10)).toBe(false);
    expect(podiumIsLocked(3, 10)).toBe(true);
    expect(podiumIsLocked(4, 10)).toBe(true);
  });

  it('locks a short field when every car has finished', () => {
    expect(podiumIsLocked(1, 2)).toBe(false);
    expect(podiumIsLocked(2, 2)).toBe(true);
    expect(podiumIsLocked(1, 1)).toBe(true);
  });

  it('rejects empty or broken counts', () => {
    expect(podiumIsLocked(3, 0)).toBe(false);
    expect(podiumIsLocked(NaN, 10)).toBe(false);
    expect(podiumIsLocked(3, NaN)).toBe(false);
  });
});

describe('formatPodiumTimeoutHud', () => {
  it('is hidden until the clock is armed', () => {
    expect(formatPodiumTimeoutHud(undefined, 30)).toEqual({ clock: null, label: null });
    expect(formatPodiumTimeoutHud(12, undefined)).toEqual({ clock: null, label: null });
  });

  it('ceils remaining seconds so the last tick still reads 1', () => {
    expect(formatPodiumTimeoutHud(12.01, 30).clock).toBe('13');
    expect(formatPodiumTimeoutHud(12, 30).clock).toBe('12');
    expect(formatPodiumTimeoutHud(0.2, 30).clock).toBe('1');
  });

  it('hides at zero so the overlay does not linger on 0', () => {
    expect(formatPodiumTimeoutHud(0, 30)).toEqual({ clock: null, label: null });
  });

  it('drops TIME OUT in at the halfway mark and keeps it', () => {
    const duration = 20;
    expect(formatPodiumTimeoutHud(10.1, duration).label).toBeNull();
    expect(formatPodiumTimeoutHud(10, duration).label).toBe(PODIUM_TIMEOUT_LABEL);
    expect(formatPodiumTimeoutHud(1, duration).label).toBe(PODIUM_TIMEOUT_LABEL);
  });

  it('does not flash TIME OUT on the short player-podium hold', () => {
    expect(formatPodiumTimeoutHud(1.5, PODIUM_PLAYER_HOLD_SECONDS).label).toBeNull();
    expect(formatPodiumTimeoutHud(3, PODIUM_PLAYER_HOLD_SECONDS).clock).toBe('3');
  });
});

describe('isPlayerOnPodium', () => {
  it('is true for a finished 1st–3rd', () => {
    expect(isPlayerOnPodium(true, 1)).toBe(true);
    expect(isPlayerOnPodium(true, 3)).toBe(true);
  });

  it('is false while still racing or off the podium', () => {
    expect(isPlayerOnPodium(false, 1)).toBe(false);
    expect(isPlayerOnPodium(true, 4)).toBe(false);
    expect(isPlayerOnPodium(true, 0)).toBe(false);
  });
});

describe('podiumGraceDuration', () => {
  it('is three seconds when the player already has a podium seat', () => {
    expect(podiumGraceDuration(120, true)).toBe(PODIUM_PLAYER_HOLD_SECONDS);
  });

  it('is one sixth of the full track when the player is still out', () => {
    expect(podiumGraceDuration(120, false)).toBe(20);
  });
});
