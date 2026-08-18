import { describe, expect, it } from 'vitest';
import { CameraZoomPolicy } from '../../src/adapters/render/CameraZoomPolicy.ts';
import {
  CAMERA_CLOSE_ZOOM,
  CAMERA_HOME_ZOOM,
  CAMERA_WIDE_ZOOM,
} from '../../src/domain/camera/CameraPreset.ts';

describe('CameraZoomPolicy', () => {
  const policy = new CameraZoomPolicy();

  it('returns homeZoom when stationary on a straight', () => {
    expect(policy.targetZoom(0, 100, 0)).toBeCloseTo(CAMERA_HOME_ZOOM, 10);
  });

  it('returns closeZoom at full speed in a full corner', () => {
    expect(policy.targetZoom(100, 100, 1 / 70)).toBeCloseTo(CAMERA_CLOSE_ZOOM, 10);
    expect(policy.targetZoom(100, 100, 0.1)).toBeCloseTo(CAMERA_CLOSE_ZOOM, 10);
  });

  it('returns wideZoom at full speed on a dead straight', () => {
    expect(policy.targetZoom(100, 100, 0)).toBeCloseTo(CAMERA_WIDE_ZOOM, 10);
  });

  it('treats left and right corners the same', () => {
    expect(policy.targetZoom(100, 100, 0.05)).toBe(policy.targetZoom(100, 100, -0.05));
  });

  it('treats reverse speed as absolute', () => {
    expect(policy.targetZoom(-50, 100, 0)).toBe(policy.targetZoom(50, 100, 0));
  });

  it('returns homeZoom when inputs are pathological', () => {
    expect(policy.targetZoom(NaN, 100, 0)).toBe(CAMERA_HOME_ZOOM);
    expect(policy.targetZoom(50, 0, 0)).toBe(CAMERA_HOME_ZOOM);
    expect(policy.targetZoom(50, Infinity, 0)).toBe(CAMERA_HOME_ZOOM);
  });

  it('never returns NaN', () => {
    for (const zoom of [policy.targetZoom(NaN, 100, 0), policy.targetZoom(50, 100, Infinity)]) {
      expect(Number.isFinite(zoom)).toBe(true);
    }
  });

  it('stays inside the configured band', () => {
    const lo = Math.min(CAMERA_WIDE_ZOOM, CAMERA_CLOSE_ZOOM, CAMERA_HOME_ZOOM);
    const hi = Math.max(CAMERA_WIDE_ZOOM, CAMERA_CLOSE_ZOOM, CAMERA_HOME_ZOOM);
    for (const speed of [0, 50, 100]) {
      for (const curvature of [0, 0.009, 0.025]) {
        const zoom = policy.targetZoom(speed, 100, curvature);
        expect(zoom).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(zoom).toBeLessThanOrEqual(hi + 1e-9);
      }
    }
  });

  it('snaps to zoomStep when asked', () => {
    const snapped = new CameraZoomPolicy({ zoomStep: 0.25 });
    const zoom = snapped.targetZoom(100, 100, 0);
    expect(Math.abs(zoom / 0.25 - Math.round(zoom / 0.25))).toBeLessThan(1e-10);
  });

  it('throws on illegal constructor options', () => {
    expect(() => new CameraZoomPolicy({ homeZoom: 0 })).toThrow(/homeZoom/);
    expect(() => new CameraZoomPolicy({ closeZoom: -1 })).toThrow(/closeZoom/);
    expect(() => new CameraZoomPolicy({ wideZoom: NaN })).toThrow(/wideZoom/);
    expect(() => new CameraZoomPolicy({ cornerCurvature: 0 })).toThrow(/cornerCurvature/);
    expect(() => new CameraZoomPolicy({ zoomStep: -0.5 })).toThrow(/zoomStep/);
  });
});
