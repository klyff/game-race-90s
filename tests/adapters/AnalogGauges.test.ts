/**
 * Analog cluster helpers: needle angles and 0–220 / 0–6000 mapping.
 * Faces live in Phaser; the sweep math is pure so a shift can be asserted here.
 */
import { describe, expect, it } from 'vitest';
import {
  DIAL_START_RAD,
  DIAL_SWEEP_RAD,
  SPEED_DIAL_MAX_MPH,
  dialAngle,
  mphDialFraction,
  rpmDialFraction,
} from '../../src/adapters/render/AnalogDial.ts';

describe('dialAngle', () => {
  it('rests at 7:30 (135°) at zero', () => {
    expect(dialAngle(0)).toBeCloseTo(DIAL_START_RAD, 8);
  });

  it('pegs at 4:30 after a 270° sweep', () => {
    expect(dialAngle(1)).toBeCloseTo(DIAL_START_RAD + DIAL_SWEEP_RAD, 8);
  });

  it('sits halfway at half reading', () => {
    expect(dialAngle(0.5)).toBeCloseTo(DIAL_START_RAD + DIAL_SWEEP_RAD / 2, 8);
  });

  it('clamps out of range and non-finite', () => {
    expect(dialAngle(-1)).toBeCloseTo(DIAL_START_RAD, 8);
    expect(dialAngle(2)).toBeCloseTo(DIAL_START_RAD + DIAL_SWEEP_RAD, 8);
    expect(dialAngle(Number.NaN)).toBeCloseTo(DIAL_START_RAD, 8);
  });
});

describe('mphDialFraction', () => {
  it('maps 0 / 110 / 220 onto the 0–220 dial', () => {
    expect(mphDialFraction(0)).toBe(0);
    expect(mphDialFraction(SPEED_DIAL_MAX_MPH / 2)).toBeCloseTo(0.5, 8);
    expect(mphDialFraction(SPEED_DIAL_MAX_MPH)).toBe(1);
  });

  it('pegs overspeed and treats junk as rest', () => {
    expect(mphDialFraction(300)).toBe(1);
    expect(mphDialFraction(-10)).toBe(0);
    expect(mphDialFraction(Number.NaN)).toBe(0);
  });
});

describe('rpmDialFraction', () => {
  it('maps idle / mid / redline onto the 0–6000 dial', () => {
    expect(rpmDialFraction(0)).toBe(0);
    expect(rpmDialFraction(0.15)).toBeCloseTo(0.15, 8);
    expect(rpmDialFraction(0.5)).toBeCloseTo(0.5, 8);
    expect(rpmDialFraction(1)).toBe(1);
  });

  it('clamps the gearbox output', () => {
    expect(rpmDialFraction(1.2)).toBe(1);
    expect(rpmDialFraction(-0.1)).toBe(0);
    expect(rpmDialFraction(Number.NaN)).toBe(0);
  });
});
