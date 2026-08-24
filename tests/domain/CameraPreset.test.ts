import { describe, expect, it } from 'vitest';
import {
  applyTurboStraightZoom,
  CAMERA_CLOSE_ZOOM,
  CAMERA_CURVE_ZOOM_IN_RETAIN,
  CAMERA_HOME_ZOOM,
  CAMERA_STRAIGHT_CURVATURE,
  CAMERA_TIGHT_ZOOM,
  CAMERA_TURBO_STRAIGHT_SCALE,
} from '../../src/domain/camera/CameraPreset.ts';

describe('curve zoom-in retain', () => {
  it('keeps 70% of the old pull-in from home', () => {
    expect(CAMERA_CURVE_ZOOM_IN_RETAIN).toBe(0.7);
    expect(CAMERA_CLOSE_ZOOM).toBeCloseTo(CAMERA_HOME_ZOOM + (2.2 - CAMERA_HOME_ZOOM) * 0.7, 10);
    expect(CAMERA_TIGHT_ZOOM).toBeCloseTo(CAMERA_HOME_ZOOM + (2.6 - CAMERA_HOME_ZOOM) * 0.7, 10);
    expect(CAMERA_CLOSE_ZOOM).toBeLessThan(2.2);
    expect(CAMERA_TIGHT_ZOOM).toBeLessThan(2.6);
  });
});

describe('applyTurboStraightZoom', () => {
  it('pulls 10% farther on a straight while nitro burns', () => {
    expect(applyTurboStraightZoom(1.275, true, 0)).toBeCloseTo(1.275 * CAMERA_TURBO_STRAIGHT_SCALE, 10);
  });

  it('leaves corners and idle nitro alone', () => {
    expect(applyTurboStraightZoom(2.065, true, CAMERA_STRAIGHT_CURVATURE)).toBe(2.065);
    expect(applyTurboStraightZoom(1.275, false, 0)).toBe(1.275);
  });

  it('falls back to home on a broken zoom', () => {
    expect(applyTurboStraightZoom(Number.NaN, true, 0)).toBe(CAMERA_HOME_ZOOM);
  });
});
