import { describe, expect, it } from 'vitest';
import { CameraImpulse } from '../../src/domain/camera/CameraImpulse.ts';
import {
  CAMERA_EXPLOSION_KICK,
  CAMERA_EXPLOSION_ZOOM_IN,
  CAMERA_EXPLOSION_ZOOM_OUT,
  CAMERA_HIT_SHAKE_LEFT,
} from '../../src/domain/camera/CameraPreset.ts';

describe('CameraImpulse', () => {
  it('hits only on X: left then right, done in 1s', () => {
    const impulse = new CameraImpulse();
    impulse.punchHit();
    const left = impulse.sample(0.1);
    expect(left.x).toBeLessThan(0);
    expect(left.y).toBe(0);
    expect(left.x).toBeGreaterThanOrEqual(-CAMERA_HIT_SHAKE_LEFT);

    impulse.sample(0.3);
    const right = impulse.sample(0.2);
    expect(right.x).toBeGreaterThan(0);
    expect(right.y).toBe(0);

    const done = impulse.sample(0.5);
    expect(done.x).toBeCloseTo(0, 5);
    expect(done.y).toBe(0);
    expect(done.zoomScale).toBe(1);
  });

  it('explosion second kick is the opposite of the first', () => {
    const impulse = new CameraImpulse();
    impulse.punchExplosion(() => 0);
    const first = impulse.sample(0.25);
    expect(first.x).toBeCloseTo(-CAMERA_EXPLOSION_KICK, 5);
    expect(first.y).toBeCloseTo(-CAMERA_EXPLOSION_KICK, 5);
    expect(first.zoomScale).toBeCloseTo(CAMERA_EXPLOSION_ZOOM_IN, 5);

    impulse.sample(0.25);
    const opposite = impulse.sample(0.25);
    expect(Math.sign(opposite.x)).toBe(-Math.sign(first.x) || 0);
    expect(Math.sign(opposite.y)).toBe(-Math.sign(first.y) || 0);
  });

  it('holds wreck zoom-out until recoverFromExplosion', () => {
    const impulse = new CameraImpulse();
    impulse.punchExplosion(() => 1);
    impulse.sample(1.1);
    const held = impulse.sample(0.1);
    expect(held.zoomScale).toBeCloseTo(CAMERA_EXPLOSION_ZOOM_OUT, 5);
    expect(held.x).toBeCloseTo(0, 5);

    impulse.recoverFromExplosion();
    const after = impulse.sample(0.1);
    expect(after.zoomScale).toBe(1);
  });

  it('lets explosion replace a hit on the same window', () => {
    const impulse = new CameraImpulse();
    impulse.punchHit();
    impulse.punchExplosion(() => 1);
    const sample = impulse.sample(0.15);
    expect(sample.y).not.toBe(0);
  });
});
