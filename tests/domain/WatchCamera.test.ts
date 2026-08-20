import { describe, expect, it } from 'vitest';
import {
  CAMERA_HOME_ZOOM,
  CAMERA_TRIGGER_KIND,
  type CameraPreset,
} from '../../src/domain/camera/CameraPreset.ts';
import {
  CAMERA_WATCH_BROADCAST_MAP_FRACTION,
  CAMERA_WATCH_CHASE_FARTHER,
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

  it('toggles broadcast and chase', () => {
    const first: WatchCameraKind = WATCH_CAMERA_KIND.BROADCAST;
    const chase = nextWatchCameraKind(first);
    expect(chase).toBe(WATCH_CAMERA_KIND.CHASE);
    expect(nextWatchCameraKind(chase)).toBe(WATCH_CAMERA_KIND.BROADCAST);
  });

  it('walks down the order without wrapping past last or leader', () => {
    expect(stepWatchPlace(0, 1, 15)).toBe(1);
    expect(stepWatchPlace(1, 1, 15)).toBe(2);
    expect(stepWatchPlace(14, 1, 15)).toBe(14);
    expect(stepWatchPlace(3, -1, 15)).toBe(2);
    expect(stepWatchPlace(0, -1, 15)).toBe(0);
  });

  it('pulls chase zoom 30% farther than the player band', () => {
    const farther = scaleCameraPresetFarther(PRESET, CAMERA_WATCH_CHASE_FARTHER);
    expect(farther.homeZoom).toBeCloseTo(CAMERA_HOME_ZOOM / 1.3, 5);
    expect(farther.triggers[0]?.targetZoom).toBeCloseTo(2.2 / 1.3, 5);
  });
});
