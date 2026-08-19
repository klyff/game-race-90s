import { describe, expect, it } from 'vitest';
import { thunderBasin } from '../../src/data/tracks/thunder-basin.track.ts';
import { planetForTrackId } from '../../src/data/tracks/planets.ts';
import { analyzeTrackTraps, trapSeat } from '../../src/domain/traps/analyzeTrackTraps.ts';
import { pickRaceTraps, trapSeed } from '../../src/domain/traps/pickRaceTraps.ts';
import {
  crateSlotCount,
  crateSpawnCount,
  drumBlastDamage,
  drumBlastRadius,
  drumSlotCount,
  drumSpawnCount,
  crateHitSpeed,
  CRATE_ENERGY_LOSS,
  CRATE_SPEED_KEEP,
} from '../../src/domain/traps/TrapRules.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';

describe('TrapRules counts', () => {
  it('grows crates by 2 slots and 1 spawn each world, then +60%', () => {
    expect(crateSlotCount(1)).toBe(16);
    expect(crateSpawnCount(1)).toBe(6);
    expect(crateSlotCount(2)).toBe(19);
    expect(crateSpawnCount(2)).toBe(8);
    expect(crateSlotCount(10)).toBe(45);
    expect(crateSpawnCount(10)).toBe(21);
  });

  it('grows drums by 2 slots and spawns half the unscaled pool, then +60%', () => {
    expect(drumSlotCount(1)).toBe(8);
    expect(drumSpawnCount(1)).toBe(3);
    expect(drumSlotCount(2)).toBe(11);
    expect(drumSpawnCount(2)).toBe(5);
    expect(drumSlotCount(10)).toBe(37);
    expect(drumSpawnCount(10)).toBe(18);
  });

  it('keeps 70% of crate-hit speed', () => {
    expect(crateHitSpeed({ x: 10, y: -4 })).toEqual({
      x: 10 * CRATE_SPEED_KEEP,
      y: -4 * CRATE_SPEED_KEEP,
    });
    expect(CRATE_ENERGY_LOSS).toBeCloseTo(0.07, 5);
  });
});

describe('drumBlastDamage', () => {
  const radius = 10;

  it('is 100% inside the first 10% band', () => {
    expect(drumBlastDamage(0, radius)).toBe(1);
    expect(drumBlastDamage(0.99, radius)).toBe(1);
  });

  it('drops 13% every 10% of the blast radius', () => {
    expect(drumBlastDamage(1.0, radius)).toBeCloseTo(0.87, 5);
    expect(drumBlastDamage(5.0, radius)).toBeCloseTo(0.35, 5);
    expect(drumBlastDamage(7.9, radius)).toBeCloseTo(0.09, 5);
  });

  it('is zero at 80% of the radius and beyond', () => {
    expect(drumBlastDamage(8, radius)).toBe(0);
    expect(drumBlastDamage(10, radius)).toBe(0);
    expect(drumBlastDamage(12, radius)).toBe(0);
  });
});

describe('drumBlastRadius', () => {
  it('is the drum plus two car lengths', () => {
    const carLength = 2.35 * 1.7;
    expect(drumBlastRadius(0.5, 1.7)).toBeCloseTo(0.5 + 2 * carLength, 5);
  });
});

describe('analyzeTrackTraps', () => {
  const catalog = analyzeTrackTraps(thunderBasin, 1);
  const spline = new TrackSpline(thunderBasin.controlPoints);

  it('fills the world-1 pool on Thunder Basin', () => {
    expect(catalog.trackId).toBe('thunder-basin');
    expect(catalog.crates).toHaveLength(16);
    expect(catalog.drums).toHaveLength(8);
  });

  it('stays on the tarmac, off the grid and ramps', () => {
    const half = thunderBasin.halfWidth;
    const puck = 2.6;
    for (const slot of [...catalog.crates, ...catalog.drums]) {
      expect(Math.abs(slot.lateral)).toBeLessThan(half - puck + 1e-6);
      expect(Math.abs(slot.lateral)).toBeGreaterThanOrEqual(5);
      const fromLine = Math.abs(spline.signedDelta(thunderBasin.startLineDistance, slot.distance));
      expect(fromLine).toBeGreaterThanOrEqual(40);
      for (const zone of thunderBasin.rampZones ?? []) {
        const fromStart = spline.signedDelta(zone.triggerDistance - 8, slot.distance);
        const window = zone.triggerLength + 16;
        expect(fromStart < 0 || fromStart > window).toBe(true);
      }
    }
  });

  it('pulls corners inside the ribbon more than straights', () => {
    expect(trapSeat(20, 'straight')).toBeCloseTo(14.5, 5);
    expect(trapSeat(20, 'corner')).toBeLessThan(trapSeat(20, 'straight'));
    expect(trapSeat(20, 'tight')).toBeLessThan(trapSeat(20, 'corner'));
  });

  it('sits drums inside the crate line', () => {
    const crateReach = Math.max(...catalog.crates.map(slot => Math.abs(slot.lateral)));
    const drumReach = Math.max(...catalog.drums.map(slot => Math.abs(slot.lateral)));
    expect(drumReach).toBeLessThan(crateReach);
  });
});

describe('pickRaceTraps', () => {
  const planet = planetForTrackId('thunder-basin')!;
  const catalog = analyzeTrackTraps(thunderBasin, planet.index);
  const seed = trapSeed(planet.seed, thunderBasin.id);

  it('spawns world-1 caps, not the old three authored drums', () => {
    const picked = pickRaceTraps(catalog, 1, seed);
    expect(picked.filter(trap => trap.kind === 'gasoline')).toHaveLength(3);
    expect(picked.filter(trap => trap.kind === 'crate')).toHaveLength(6);
    expect(picked.filter(trap => trap.kind === 'gasoline').every(trap => trap.stackHeight === 1)).toBe(
      true,
    );
    expect(picked.filter(trap => trap.kind === 'crate').every(trap => trap.stackHeight >= 1 && trap.stackHeight <= 3)).toBe(
      true,
    );
  });

  it('grows world 2 to 8 crates and 5 drums', () => {
    const later = analyzeTrackTraps(thunderBasin, 2);
    const picked = pickRaceTraps(later, 2, seed);
    expect(picked.filter(trap => trap.kind === 'gasoline')).toHaveLength(5);
    expect(picked.filter(trap => trap.kind === 'crate')).toHaveLength(8);
  });

  it('is deterministic for a seed', () => {
    const a = pickRaceTraps(catalog, 1, seed);
    const b = pickRaceTraps(catalog, 1, seed);
    expect(a).toEqual(b);
  });
});
