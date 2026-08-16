import { describe, it, expect } from 'vitest';
import {
  consumeJump,
  createJumpCharges,
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
