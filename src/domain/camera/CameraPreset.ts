/**
 * Per-track camera preset: authored or generated hot-point triggers plus
 * the zoom numbers the director and the isometric-cam-man skill share.
 *
 * Distances are centreline arc length, the same coordinate checkpoints,
 * ramps and racing lines already use.
 */

export const CAMERA_TRIGGER_KIND = {
  CURVE: 'curve',
  STRAIGHT: 'straight',
  SPEED: 'speed',
  RAMP: 'ramp',
} as const;

export type CameraTriggerKind =
  (typeof CAMERA_TRIGGER_KIND)[keyof typeof CAMERA_TRIGGER_KIND];

/** Midpoint of today's 1.5–2.0 band. Tecla 0 and trigger expiry land here. */
export const CAMERA_HOME_ZOOM = 1.75;

/** Curve auto zoom: +10% from today's close (2.0). */
export const CAMERA_CLOSE_ZOOM = 2.2;

/** Fast-straight auto zoom: −15% from today's wide (1.5). */
export const CAMERA_WIDE_ZOOM = 1.275;

/** Ramp auto zoom: −10% from today's wide (1.5). */
export const CAMERA_RAMP_ZOOM = 1.35;

/** Skill / manual zoom-in ceiling: +30% from 2.0. */
export const CAMERA_MAX_ZOOM_IN = 2.6;

/** Skill auto zoom-out floor: −35% from 1.5. */
export const CAMERA_AUTO_ZOOM_OUT_MIN = 0.975;

export const CAMERA_MANUAL_HOLD_SECONDS = 10;
export const CAMERA_TRIGGER_HOLD_SECONDS = 3;
export const CAMERA_ZOOM_STEP = 0.25;
export const CAMERA_CORNER_CURVATURE = 1 / 70;
export const CAMERA_STRAIGHT_CURVATURE = 0.006;
export const CAMERA_TIGHT_CURVATURE = 0.025;
export const CAMERA_CURVATURE_SPAN_UNITS = 45;

export const CAMERA_HIT_SHAKE_SECONDS = 1;
export const CAMERA_HIT_SHAKE_LEFT = 0.1;
export const CAMERA_HIT_SHAKE_RIGHT = 0.1;
export const CAMERA_EXPLOSION_KICK = 0.15;
export const CAMERA_EXPLOSION_ZOOM_IN = 1.3;
export const CAMERA_EXPLOSION_ZOOM_OUT = 0.8;
export const CAMERA_ACCIDENT_HOLD_SECONDS = 2.5;
export const CAMERA_CLUSTER_RADIUS_UNITS = 30;
export const CAMERA_QUIT_MASTER_SCALE = 0.7;
export const CAMERA_PARK_SECONDS = 1.2;

export interface CameraTrigger {
  readonly kind: CameraTriggerKind;
  readonly startDistance: number;
  readonly endDistance: number;
  /** +0.10 curve, −0.15 straight, −0.10 ramp. Applied from the old 1.5/2.0 band. */
  readonly zoomBias: number;
  readonly holdSeconds: number;
  readonly targetZoom: number;
}

export interface CameraPreset {
  readonly trackId: string;
  readonly homeZoom: number;
  readonly maxZoomIn: number;
  readonly autoZoomOutMin: number;
  /** Phaser zoom that fits ~50% of the track AABB in a 1440×900 reference view. */
  readonly zoomOut50: number;
  readonly triggers: readonly CameraTrigger[];
}

export function wrapLapDistance(distance: number, lapLength: number): number {
  if (lapLength <= 0) {
    return 0;
  }
  const wrapped = distance % lapLength;
  return wrapped < 0 ? wrapped + lapLength : wrapped;
}

/** True when `distance` sits in [start, end) on a closed lap, including wrap. */
export function distanceInSpan(
  distance: number,
  start: number,
  end: number,
  lapLength: number,
): boolean {
  const d = wrapLapDistance(distance, lapLength);
  const a = wrapLapDistance(start, lapLength);
  const b = wrapLapDistance(end, lapLength);
  if (a <= b) {
    return d >= a && d < b;
  }
  return d >= a || d < b;
}
