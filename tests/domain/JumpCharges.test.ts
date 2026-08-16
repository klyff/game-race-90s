import { describe, it, expect } from 'vitest';
import {
  consumeJump,
  createJumpCharges,
  hopLaunchSpeed,
  HOP_LAUNCH_SPEED,
  HOP_SCALE_MAX,
  HOP_SCALE_MIN,
  JUMP_START_COUNT,
  refillJumpCharges,
} from '../../src/domain/vehicle/JumpCharges.ts';

describe('JumpCharges', () => {
  it('starts every car with 4 hops', () => {
    expect(createJumpCharges()).toBe(JUMP_START_COUNT);
    expect(JUMP_START_COUNT).toBe(4);
  });

  it('consumes one charge at a time and refuses an empty stock', () => {
    expect(consumeJump(4)).toBe(3);
    expect(consumeJump(1)).toBe(0);
    expect(consumeJump(0)).toBeNull();
    expect(consumeJump(-1)).toBeNull();
    expect(consumeJump(Number.NaN)).toBeNull();
  });

  it('refills to 4 without reducing a stock already above the ceiling', () => {
    expect(refillJumpCharges(0)).toBe(4);
    expect(refillJumpCharges(2)).toBe(4);
    expect(refillJumpCharges(4)).toBe(4);
    expect(refillJumpCharges(6)).toBe(6);
    expect(refillJumpCharges(Number.NaN)).toBe(4);
  });
});

describe('hopLaunchSpeed', () => {
  const mid = { mass: 1000, maxSpeed: 78 };
  const sprinter = { mass: 650, maxSpeed: 95 };
  const tank = { mass: 1600, maxSpeed: 52 };

  it('keeps the mid-table car on the authored baseline', () => {
    expect(hopLaunchSpeed(mid)).toBeCloseTo(HOP_LAUNCH_SPEED, 5);
  });

  it('lets a light, fast car hop higher than a heavy, slow one', () => {
    expect(hopLaunchSpeed(sprinter)).toBeGreaterThan(hopLaunchSpeed(mid));
    expect(hopLaunchSpeed(tank)).toBeLessThan(hopLaunchSpeed(mid));
    expect(hopLaunchSpeed(sprinter)).toBeCloseTo(HOP_LAUNCH_SPEED * HOP_SCALE_MAX, 5);
    expect(hopLaunchSpeed(tank)).toBeCloseTo(HOP_LAUNCH_SPEED * HOP_SCALE_MIN, 5);
  });

  it('falls back to the baseline when mass or speed is unusable', () => {
    expect(hopLaunchSpeed({ mass: 0, maxSpeed: 78 })).toBeCloseTo(HOP_LAUNCH_SPEED, 5);
    expect(hopLaunchSpeed({ mass: 1000, maxSpeed: Number.NaN })).toBeCloseTo(HOP_LAUNCH_SPEED, 5);
  });
});
