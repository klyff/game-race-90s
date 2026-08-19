import { describe, expect, it } from 'vitest';

import {
  AIR_TURBO_HEIGHT_BONUS,
  AIR_TURBO_RANGE_BONUS,
  HOT_45_HEIGHT_BONUS,
  HOT_45_RANGE_BONUS,
  HOT_APPROACH_FRAC,
  HOT_FLAT_HEIGHT_BONUS,
  HOT_FLAT_RANGE_BONUS,
  LAUNCH_CAR_SCALE,
  LAUNCH_HORIZ_SCALE,
  RAMP_LANDING_DAMAGE,
  RAMP_REJECT_SPEED,
  applyAirTurboKick,
  carForceAtContact,
  isHotApproach,
  minClimbFraction,
  rampArcadeBonus,
  resolveRampContact,
} from '../../src/domain/track/RampLaunch.ts';
import {
  JUMP_HEIGHT_SCALE,
  RAMP_GRAVITY_REF,
  RAMP_LIP_LENGTH,
  isRampLaunchWindow,
  rampAirtimeSeconds,
  rampApproach,
  rampPeakHeight,
  rampProgress,
  rampVisualPeak,
  type RampZone,
} from '../../src/domain/track/RampZone.ts';
import { IDLE_INPUT } from '../../src/domain/input/InputCommand.ts';
import type { InputCommand } from '../../src/domain/input/InputCommand.ts';
import { createVehicleState } from '../../src/domain/vehicle/Vehicle.ts';
import type { VehicleStats } from '../../src/domain/vehicle/VehicleStats.ts';
import { thunderBasin } from '../../src/data/tracks/thunder-basin.track.ts';
import { thunderBasinTwo } from '../../src/data/tracks/thunder-basin-2.track.ts';
import { TURBO_SPEED_BONUS } from '../../src/domain/vehicle/TurboCharges.ts';
import { dot, fromAngle, length, scale } from '../../src/domain/math/Vec2.ts';

const STATS: VehicleStats = {
  mass: 1000,
  enginePower: 34,
  brakeForce: 50,
  maxSpeed: 78,
  grip: 40,
  steerRate: 2.4,
  steerSpeedFalloff: 0.35,
  armor: 0.4,
  ammoCapacity: 6,
  collisionRadius: 1.7,
  aimRadius: 3.5,
};

const ZONE_45: RampZone = {
  triggerDistance: 200,
  triggerLength: 12,
  launchSpeed: 12,
  inclineDegrees: 45,
};

const ZONE_30: RampZone = { ...ZONE_45, inclineDegrees: 30, launchSpeed: 13 };
const ZONE_15: RampZone = { ...ZONE_45, inclineDegrees: 15, launchSpeed: 11 };

const THROTTLE: InputCommand = { ...IDLE_INPUT, throttle: 1 };

function atSpeed(fraction: number) {
  const heading = 0;
  const speed = STATS.maxSpeed * fraction;
  return {
    ...createVehicleState({ x: 0, y: 0 }, heading),
    velocity: scale(fromAngle(heading), speed),
  };
}

describe('RampLaunch table', () => {
  it('locks the owner numbers', () => {
    expect(LAUNCH_CAR_SCALE).toBe(10);
    expect(LAUNCH_HORIZ_SCALE).toBe(0.25);
    expect(RAMP_REJECT_SPEED).toBe(16);
    expect(RAMP_LANDING_DAMAGE).toBe(0.04);
    expect(HOT_APPROACH_FRAC).toBe(0.85);
    expect(TURBO_SPEED_BONUS).toBe(0.35);
    expect(minClimbFraction(45)).toBe(0.45);
    expect(minClimbFraction(30)).toBe(0.3);
    expect(minClimbFraction(15)).toBe(0.15);
    expect(rampArcadeBonus(45, true)).toEqual({
      height: HOT_45_HEIGHT_BONUS,
      range: HOT_45_RANGE_BONUS,
    });
    expect(rampArcadeBonus(30, true)).toEqual({
      height: HOT_FLAT_HEIGHT_BONUS,
      range: HOT_FLAT_RANGE_BONUS,
    });
    expect(rampArcadeBonus(15, true)).toEqual({
      height: HOT_FLAT_HEIGHT_BONUS,
      range: HOT_FLAT_RANGE_BONUS,
    });
    expect(rampArcadeBonus(45, false)).toEqual({ height: 0, range: 0 });
  });
});

describe('resolveRampContact', () => {
  it('launches a full-throttle turbo car higher and farther than the same car at 60% cold', () => {
    const hot = resolveRampContact(atSpeed(0.95), ZONE_45, STATS, THROTTLE, true);
    const cold = resolveRampContact(atSpeed(0.6), ZONE_45, STATS, THROTTLE, false);
    expect(hot.kind).toBe('launch');
    expect(cold.kind).toBe('launch');
    if (hot.kind !== 'launch' || cold.kind !== 'launch') {
      return;
    }
    expect(hot.state.verticalVelocity).toBeGreaterThan(cold.state.verticalVelocity);
    expect(length(hot.state.velocity)).toBeGreaterThan(length(cold.state.velocity));
    expect(carForceAtContact(atSpeed(0.95), STATS, THROTTLE, true)).toBeGreaterThan(
      carForceAtContact(atSpeed(0.6), STATS, THROTTLE, false),
    );
  });

  it('rejects a 45° ramp below 45% maxSpeed with a backward shove', () => {
    const result = resolveRampContact(atSpeed(0.4), ZONE_45, STATS, THROTTLE, true);
    expect(result.kind).toBe('reject');
    expect(result.state.height).toBe(0);
    expect(result.state.verticalVelocity).toBe(0);
    expect(dot(result.state.velocity, fromAngle(0))).toBeCloseTo(-RAMP_REJECT_SPEED, 5);
  });

  it('rejects when the contact sum cannot launch both axes', () => {
    const reverse: InputCommand = { ...IDLE_INPUT, reverse: 1 };
    const result = resolveRampContact(atSpeed(-0.5), ZONE_45, STATS, reverse, false);
    expect(result.kind).toBe('reject');
    expect(result.state.height).toBe(0);
  });

  it('rejects 30° below 30% and 15° below 15%', () => {
    expect(resolveRampContact(atSpeed(0.25), ZONE_30, STATS, THROTTLE, false).kind).toBe('reject');
    expect(resolveRampContact(atSpeed(0.1), ZONE_15, STATS, THROTTLE, false).kind).toBe('reject');
  });

  it('applies only the car sum when above the climb gate but not hot', () => {
    const result = resolveRampContact(atSpeed(0.6), ZONE_45, STATS, THROTTLE, false);
    expect(result.kind).toBe('launch');
    if (result.kind !== 'launch') {
      return;
    }
    expect(result.hot).toBe(false);
    const force = carForceAtContact(atSpeed(0.6), STATS, THROTTLE, false);
    const vertRaw = ZONE_45.launchSpeed + LAUNCH_CAR_SCALE * force;
    const horizRaw = STATS.maxSpeed * 0.6 * (1 + LAUNCH_HORIZ_SCALE * Math.max(0, force));
    expect(result.state.verticalVelocity).toBeCloseTo(vertRaw * JUMP_HEIGHT_SCALE, 5);
    expect(length(result.state.velocity)).toBeCloseTo(horizRaw, 5);
  });

  it('multiplies a 45° hot launch by the 1.50 height / 1.25 range table', () => {
    const result = resolveRampContact(atSpeed(0.95), ZONE_45, STATS, THROTTLE, true);
    expect(result.kind).toBe('launch');
    if (result.kind !== 'launch') {
      return;
    }
    expect(result.hot).toBe(true);
    const force = carForceAtContact(atSpeed(0.95), STATS, THROTTLE, true);
    const vertRaw = ZONE_45.launchSpeed + LAUNCH_CAR_SCALE * force;
    const horizRaw = STATS.maxSpeed * 0.95 * (1 + LAUNCH_HORIZ_SCALE * Math.max(0, force));
    expect(result.state.verticalVelocity).toBeCloseTo(
      vertRaw * JUMP_HEIGHT_SCALE * Math.sqrt(1 + HOT_45_HEIGHT_BONUS),
      5,
    );
    expect(length(result.state.velocity)).toBeCloseTo(horizRaw * (1 + HOT_45_RANGE_BONUS), 5);
  });

  it('multiplies hot 15° and 30° by 1.10 height / 1.40 range', () => {
    for (const zone of [ZONE_15, ZONE_30]) {
      const result = resolveRampContact(atSpeed(0.95), zone, STATS, THROTTLE, true);
      expect(result.kind).toBe('launch');
      if (result.kind !== 'launch') {
        continue;
      }
      const force = carForceAtContact(atSpeed(0.95), STATS, THROTTLE, true);
      const vertRaw = zone.launchSpeed + LAUNCH_CAR_SCALE * force;
      expect(result.state.verticalVelocity).toBeCloseTo(
        vertRaw * JUMP_HEIGHT_SCALE * Math.sqrt(1 + HOT_FLAT_HEIGHT_BONUS),
        5,
      );
    }
  });

  it('stays cold below 85% even with turbo, and at 85%+ without turbo', () => {
    const withTurbo = resolveRampContact(atSpeed(0.7), ZONE_45, STATS, THROTTLE, true);
    const noTurbo = resolveRampContact(atSpeed(0.95), ZONE_45, STATS, THROTTLE, false);
    expect(withTurbo.kind).toBe('launch');
    expect(noTurbo.kind).toBe('launch');
    if (withTurbo.kind === 'launch') {
      expect(withTurbo.hot).toBe(false);
    }
    if (noTurbo.kind === 'launch') {
      expect(noTurbo.hot).toBe(false);
    }
    expect(isHotApproach(STATS.maxSpeed * 0.7, STATS.maxSpeed, true)).toBe(false);
    expect(isHotApproach(STATS.maxSpeed * 0.95, STATS.maxSpeed, false)).toBe(false);
  });
});

describe('jump flatten', () => {
  it('lowers the apex and keeps the same airtime as the 40-g table', () => {
    expect(rampAirtimeSeconds(ZONE_15)).toBeCloseTo((2 * ZONE_15.launchSpeed) / RAMP_GRAVITY_REF, 5);
    expect(rampPeakHeight(ZONE_15)).toBeCloseTo(
      ((ZONE_15.launchSpeed * ZONE_15.launchSpeed) / (2 * RAMP_GRAVITY_REF)) * JUMP_HEIGHT_SCALE,
      5,
    );
  });
});

describe('arcade takeoff at the lip', () => {
  it('rides the slab and pops at the lip, not partway up', () => {
    expect(RAMP_LIP_LENGTH).toBe(3);
    expect(isRampLaunchWindow(ZONE_45.triggerDistance, ZONE_45)).toBe(false);
    expect(isRampLaunchWindow(ZONE_45.triggerDistance + ZONE_45.triggerLength / 3, ZONE_45)).toBe(
      false,
    );
    expect(
      isRampLaunchWindow(ZONE_45.triggerDistance + ZONE_45.triggerLength - RAMP_LIP_LENGTH, ZONE_45),
    ).toBe(true);
    expect(rampProgress(ZONE_45.triggerDistance + 4, ZONE_45)).toBeCloseTo(4 / 12, 5);
  });

  it('draws the lip from the invented angle, not the ballistic peak', () => {
    expect(rampVisualPeak(ZONE_15)).toBeCloseTo(12 * Math.tan((15 * Math.PI) / 180), 5);
    expect(rampVisualPeak(ZONE_45)).toBeCloseTo(12, 5);
    expect(rampVisualPeak(ZONE_45)).toBeGreaterThan(rampPeakHeight(ZONE_45));
  });
});

describe('Thunder Basin ramps', () => {
  it('authors 15° then 30° on Basin I', () => {
    expect(thunderBasin.rampZones?.map(z => z.inclineDegrees)).toEqual([15, 15, 30]);
    expect(thunderBasin.rampZones?.map(z => z.triggerDistance)).toEqual([200, 720, 1240]);
  });

  it('authors 45° then 30° on Basin II', () => {
    expect(thunderBasinTwo.rampZones?.map(z => z.inclineDegrees)).toEqual([45, 30]);
    expect(thunderBasinTwo.rampZones?.map(z => z.triggerDistance)).toEqual([280, 1520]);
  });
});

describe('applyAirTurboKick', () => {
  it('adds 5% height and 10% range once, and stacks on a 45° hot launch', () => {
    const launched = resolveRampContact(atSpeed(0.95), ZONE_45, STATS, THROTTLE, true);
    expect(launched.kind).toBe('launch');
    if (launched.kind !== 'launch') {
      return;
    }
    const kicked = applyAirTurboKick(launched.state);
    expect(kicked.verticalVelocity).toBeCloseTo(
      launched.state.verticalVelocity * Math.sqrt(1 + AIR_TURBO_HEIGHT_BONUS),
      5,
    );
    expect(length(kicked.velocity)).toBeCloseTo(
      length(launched.state.velocity) * (1 + AIR_TURBO_RANGE_BONUS),
      5,
    );
    const twice = applyAirTurboKick(kicked);
    expect(twice.verticalVelocity).toBeGreaterThan(kicked.verticalVelocity);
  });

  it('sees a 45° lip from the approach and while on the slab', () => {
    const zone = thunderBasinTwo.rampZones![0]!;
    const length = 2400;
    expect(rampApproach(zone.triggerDistance - 40, thunderBasinTwo, length)?.inclineDegrees).toBe(45);
    expect(rampApproach(zone.triggerDistance + 4, thunderBasinTwo, length)?.inclineDegrees).toBe(45);
    expect(rampApproach(zone.triggerDistance - 200, thunderBasinTwo, length)).toBeNull();
  });
});
