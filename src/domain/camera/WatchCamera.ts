/**
 * Watch filming: chase (player-like, a bit farther) is the default.
 * F still toggles the old aerial broadcast. Left/right step race place;
 * they do not wrap past the leader or last car.
 */

import type { CameraPreset } from './CameraPreset.ts';

export const WATCH_CAMERA_KIND = {
  BROADCAST: 'broadcast',
  CHASE: 'chase',
} as const;

export type WatchCameraKind = (typeof WATCH_CAMERA_KIND)[keyof typeof WATCH_CAMERA_KIND];

export const DEFAULT_WATCH_CAMERA_KIND = WATCH_CAMERA_KIND.CHASE;

/** Half the circuit fills the view — 50% closer than a full-map fit. */
export const CAMERA_WATCH_BROADCAST_MAP_FRACTION = 0.5;

/** Chase sits 25% farther than the player racing frame. */
export const CAMERA_WATCH_CHASE_FARTHER = 1.25;

export function nextWatchCameraKind(kind: WatchCameraKind): WatchCameraKind {
  return kind === WATCH_CAMERA_KIND.BROADCAST
    ? WATCH_CAMERA_KIND.CHASE
    : WATCH_CAMERA_KIND.BROADCAST;
}

/** `step > 0` walks down the order (leader → 2nd). `step < 0` walks back to the leader. */
export function stepWatchPlace(place: number, step: number, fieldSize: number): number {
  if (fieldSize <= 0) {
    return 0;
  }
  const max = fieldSize - 1;
  const current = Number.isFinite(place) ? Math.floor(place) : 0;
  const next = current + step;
  if (next < 0) {
    return 0;
  }
  if (next > max) {
    return max;
  }
  return next;
}

export function scaleCameraPresetFarther(preset: CameraPreset, farther: number): CameraPreset {
  const factor = Number.isFinite(farther) && farther > 0 ? 1 / farther : 1;
  return {
    ...preset,
    homeZoom: preset.homeZoom * factor,
    maxZoomIn: preset.maxZoomIn * factor,
    autoZoomOutMin: preset.autoZoomOutMin * factor,
    triggers: preset.triggers.map(trigger => ({
      ...trigger,
      targetZoom: trigger.targetZoom * factor,
    })),
  };
}
