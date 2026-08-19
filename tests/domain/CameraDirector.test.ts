import { describe, expect, it } from 'vitest';
import { CameraDirector, CAMERA_OVERRIDE } from '../../src/domain/camera/CameraDirector.ts';
import {
  CAMERA_HOME_ZOOM,
  CAMERA_MANUAL_HOLD_SECONDS,
  CAMERA_MAX_ZOOM_IN,
  CAMERA_SPECTATOR_ZOOM,
  CAMERA_TRIGGER_HOLD_SECONDS,
  CAMERA_TRIGGER_KIND,
  spectatorCameraPreset,
  type CameraPreset,
} from '../../src/domain/camera/CameraPreset.ts';

const PRESET: CameraPreset = {
  trackId: 'test',
  homeZoom: CAMERA_HOME_ZOOM,
  maxZoomIn: CAMERA_MAX_ZOOM_IN,
  autoZoomOutMin: 0.975,
  zoomOut50: 0.5,
  triggers: [
    {
      kind: CAMERA_TRIGGER_KIND.CURVE,
      startDistance: 100,
      endDistance: 200,
      zoomBias: 0.1,
      holdSeconds: CAMERA_TRIGGER_HOLD_SECONDS,
      targetZoom: 2.2,
    },
  ],
};

describe('CameraDirector', () => {
  it('uses live zoom until a trigger is entered', () => {
    const director = new CameraDirector();
    const first = director.sample(0.1, 1.75, 50, PRESET, 1000);
    expect(first.override).toBe(CAMERA_OVERRIDE.NONE);
    expect(first.zoom).toBe(1.75);
  });

  it('holds a trigger for 3 seconds then returns to live', () => {
    const director = new CameraDirector();
    director.sample(0.1, 1.75, 50, PRESET, 1000);
    const entered = director.sample(0.1, 1.75, 120, PRESET, 1000);
    expect(entered.override).toBe(CAMERA_OVERRIDE.TRIGGER);
    expect(entered.zoom).toBe(2.2);

    const still = director.sample(2.8, 1.4, 150, PRESET, 1000);
    expect(still.override).toBe(CAMERA_OVERRIDE.TRIGGER);

    const done = director.sample(0.4, 1.4, 160, PRESET, 1000);
    expect(done.override).toBe(CAMERA_OVERRIDE.NONE);
    expect(done.zoom).toBe(1.4);
  });

  it('lets manual zoom beat a trigger for 10 seconds', () => {
    const director = new CameraDirector();
    director.sample(0.1, 1.75, 50, PRESET, 1000);
    director.sample(0.1, 1.75, 120, PRESET, 1000);
    director.zoomIn(CAMERA_MAX_ZOOM_IN);
    const held = director.sample(1, 1.75, 130, PRESET, 1000);
    expect(held.override).toBe(CAMERA_OVERRIDE.MANUAL);
    expect(held.zoom).toBe(CAMERA_MAX_ZOOM_IN);

    const still = director.sample(CAMERA_MANUAL_HOLD_SECONDS - 1.1, 1.75, 140, PRESET, 1000);
    expect(still.override).toBe(CAMERA_OVERRIDE.MANUAL);

    const expired = director.sample(2, 1.6, 50, PRESET, 1000);
    expect(expired.override).toBe(CAMERA_OVERRIDE.NONE);
    expect(expired.zoom).toBe(1.6);
  });

  it('resetToDefault cancels the manual window', () => {
    const director = new CameraDirector();
    director.zoomOut(0.4);
    director.resetToDefault();
    const sample = director.sample(0.1, 1.75, 10, PRESET, 1000);
    expect(sample.override).toBe(CAMERA_OVERRIDE.NONE);
    expect(sample.zoom).toBe(1.75);
  });

  it('spectator preset ignores hairpins so live zoom-out holds', () => {
    const director = new CameraDirector();
    const preset = spectatorCameraPreset(PRESET);
    expect(preset.triggers).toEqual([]);
    director.sample(0.1, CAMERA_SPECTATOR_ZOOM, 50, preset, 1000);
    const throughCurve = director.sample(0.1, CAMERA_SPECTATOR_ZOOM, 120, preset, 1000);
    expect(throughCurve.override).toBe(CAMERA_OVERRIDE.NONE);
    expect(throughCurve.zoom).toBe(CAMERA_SPECTATOR_ZOOM);
  });

  it('spectator still honours manual zoom then returns to live', () => {
    const director = new CameraDirector();
    const preset = spectatorCameraPreset(PRESET);
    director.zoomIn(CAMERA_MAX_ZOOM_IN);
    const held = director.sample(1, CAMERA_SPECTATOR_ZOOM, 120, preset, 1000);
    expect(held.override).toBe(CAMERA_OVERRIDE.MANUAL);
    expect(held.zoom).toBe(CAMERA_MAX_ZOOM_IN);
    director.resetToDefault();
    const live = director.sample(0.1, CAMERA_SPECTATOR_ZOOM, 120, preset, 1000);
    expect(live.override).toBe(CAMERA_OVERRIDE.NONE);
    expect(live.zoom).toBe(CAMERA_SPECTATOR_ZOOM);
  });
});
