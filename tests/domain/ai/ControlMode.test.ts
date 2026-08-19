import { describe, expect, it } from 'vitest';
import {
  CONTROL_MODE,
  RECOVER_REASON,
  RecoverController,
  wrappedProgress,
} from '../../../src/domain/ai/ControlMode.ts';
import { createVehicleState } from '../../../src/domain/vehicle/Vehicle.ts';
import { TrackSpline } from '../../../src/domain/track/TrackSpline.ts';

const oval = new TrackSpline([
  { x: 0, y: 0 },
  { x: 40, y: 0 },
  { x: 40, y: 40 },
  { x: 0, y: 40 },
]);

function facts(over: Partial<Parameters<RecoverController['step']>[0]> = {}) {
  return {
    finished: false,
    integrity: 1,
    lateralOffset: 0,
    halfWidth: 8,
    yawSpin: 0,
    headingError: 0,
    speed: 40,
    progressVelocity: 20,
    airborne: false,
    onRamp: false,
    ...over,
  };
}

describe('RecoverController', () => {
  it('does not recover a healthy car making progress on tarmac', () => {
    const controller = new RecoverController();
    const state = createVehicleState({ x: 2, y: 0 }, 0);
    let distance = 0;
    for (let i = 0; i < 90; i += 1) {
      distance += 0.6;
      const update = controller.step(facts({ headingError: 0.1 }), distance, oval.totalLength, 1 / 60);
      expect(update.mode).not.toBe(CONTROL_MODE.RECOVERING);
    }
    expect(state.heading).toBeDefined();
  });

  it('enters recover for no forward progress and exits after stable progress', () => {
    const controller = new RecoverController();
    let update = controller.step(facts({ speed: 40 }), 0, oval.totalLength, 1 / 60);
    for (let i = 1; i <= 20; i += 1) {
      update = controller.step(facts({ speed: 40 }), i * 0.8, oval.totalLength, 1 / 60);
    }
    const parkedAt = 20 * 0.8;
    for (let i = 0; i < 90; i += 1) {
      update = controller.step(facts({ speed: 1 }), parkedAt, oval.totalLength, 1 / 60);
    }
    expect(update.mode).toBe(CONTROL_MODE.RECOVERING);
    expect(update.reason).toBe(RECOVER_REASON.NO_FORWARD_PROGRESS);
    for (let i = 0; i < 50; i += 1) {
      update = controller.step(
        facts({ speed: 30, headingError: 0.1 }),
        parkedAt + 2 + i * 0.8,
        oval.totalLength,
        1 / 60,
      );
    }
    expect(update.mode).not.toBe(CONTROL_MODE.RECOVERING);
  });

  it('wraps progress across the start line', () => {
    expect(wrappedProgress(oval.totalLength - 1, 2, oval.totalLength)).toBeGreaterThan(0);
  });

  it('does not treat a ramp reject bounce as parked', () => {
    const controller = new RecoverController();
    controller.step(facts({ speed: 50 }), 0, oval.totalLength, 1 / 60);
    let update = controller.step(facts({ speed: 50 }), 10, oval.totalLength, 1 / 60);
    for (let i = 0; i < 90; i += 1) {
      update = controller.step(
        facts({ speed: 2, headingError: 1.5, onRamp: true }),
        12,
        oval.totalLength,
        1 / 60,
      );
    }
    expect(update.mode).not.toBe(CONTROL_MODE.RECOVERING);
    expect(update.reverse).toBe(0);
  });
});
