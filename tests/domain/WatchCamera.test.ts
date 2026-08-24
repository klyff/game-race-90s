import { describe, expect, it } from 'vitest';
import {
  CAMERA_HOME_ZOOM,
  CAMERA_TRIGGER_KIND,
  type CameraPreset,
} from '../../src/domain/camera/CameraPreset.ts';
import {
  CAMERA_WATCH_BROADCAST_MAP_FRACTION,
  CAMERA_WATCH_CHASE_FARTHER,
  DEFAULT_WATCH_CAMERA_KIND,
  nextWatchCameraKind,
  scaleCameraPresetFarther,
  stepWatchPlace,
  WATCH_CAMERA_KIND,
  type WatchCameraKind,
} from '../../src/domain/camera/WatchCamera.ts';

const PRESET: CameraPreset = {
  trackId: 'test',
  homeZoom: CAMERA_HOME_ZOOM,
  maxZoomIn: 2.6,
  autoZoomOutMin: 0.975,
  zoomOut50: 0.5,
  triggers: [
    {
      kind: CAMERA_TRIGGER_KIND.CURVE,
      startDistance: 0,
      endDistance: 10,
      zoomBias: 0.1,
      holdSeconds: 3,
      targetZoom: 2.2,
    },
  ],
};

describe('WatchCamera', () => {
  it('broadcasts closer than a whole-circuit fit', () => {
    expect(CAMERA_WATCH_BROADCAST_MAP_FRACTION).toBe(0.5);
  });

  it('defaults to chase and toggles broadcast', () => {
    expect(DEFAULT_WATCH_CAMERA_KIND).toBe(WATCH_CAMERA_KIND.CHASE);
    const first: WatchCameraKind = DEFAULT_WATCH_CAMERA_KIND;
    const broadcast = nextWatchCameraKind(first);
    expect(broadcast).toBe(WATCH_CAMERA_KIND.BROADCAST);
    expect(nextWatchCameraKind(broadcast)).toBe(WATCH_CAMERA_KIND.CHASE);
  });

  it('walks down the order without wrapping past last or leader', () => {
    expect(stepWatchPlace(0, 1, 15)).toBe(1);
    expect(stepWatchPlace(1, 1, 15)).toBe(2);
    expect(stepWatchPlace(14, 1, 15)).toBe(14);
    expect(stepWatchPlace(3, -1, 15)).toBe(2);
    expect(stepWatchPlace(0, -1, 15)).toBe(0);
  });

  it('pulls chase zoom 25% farther than the player band', () => {
    const farther = scaleCameraPresetFarther(PRESET, CAMERA_WATCH_CHASE_FARTHER);
    expect(CAMERA_WATCH_CHASE_FARTHER).toBe(1.25);
    expect(farther.homeZoom).toBeCloseTo(CAMERA_HOME_ZOOM / 1.25, 5);
    expect(farther.triggers[0]?.targetZoom).toBeCloseTo(2.2 / 1.25, 5);
  });
});
