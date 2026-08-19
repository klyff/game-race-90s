import type { TrackDefinition } from './TrackDefinition.ts';

/**
 * A jump-ramp zone on the track (T-050), keyed by arc-length distance —
 * the same "one true coordinate" checkpoints, the starting grid and the AI
 * line already use. Deliberately minimal: a trigger window and a launch
 * speed. Peak height and airtime are DERIVED rather than separately
 * authored, so they can never disagree with the physics that produces them.
 */
/** Authored lip angle. Also the minimum climb as a percent of maxSpeed. */
export type RampIncline = 15 | 30 | 45;

export interface RampZone {
  /** Arc length where the trigger zone begins. */
  readonly triggerDistance: number;
  /** Length of the trigger zone, arc-length units. */
  readonly triggerLength: number;
  /** Vertical launch speed imparted on entry, world units/s. */
  readonly launchSpeed: number;
  /** Lip angle in degrees. Selects climb gate, hot-bonus table, and slab shape. */
  readonly inclineDegrees: RampIncline;
}

/**
 * Flatten the jump parabola: same airtime / horizontal range, lower apex.
 * Applied to gravity and every vertical launch (hop + ramp).
 *
 * Arcade, not Earth: the authored lip angle is a trick (T-050). Takeoff is
 * one-third of the way up the slab, then a low ballistic so the remaining
 * two-thirds of the rock is scenery the car flies past.
 */
export const JUMP_HEIGHT_SCALE = 0.35;

/** Fraction of `triggerLength` the car rides before the pop. */
export const RAMP_LAUNCH_PROGRESS = 1 / 3;

/** Shared gravity for every ramp — one feel knob, not per-ramp data, so
 * "how floaty a jump feels" stays a single tuning constant. */
export const RAMP_GRAVITY_REF = 40;
export const RAMP_GRAVITY = RAMP_GRAVITY_REF * JUMP_HEIGHT_SCALE;

/** Peak height a ramp's launch speed reaches under `RAMP_GRAVITY`, world units. */
export function rampPeakHeight(zone: RampZone): number {
  const launch = zone.launchSpeed * JUMP_HEIGHT_SCALE;
  return (launch * launch) / (2 * RAMP_GRAVITY);
}

/** Total time from launch to landing back at height 0, seconds. */
export function rampAirtimeSeconds(zone: RampZone): number {
  return (2 * zone.launchSpeed * JUMP_HEIGHT_SCALE) / RAMP_GRAVITY;
}

/** How far along the slab this distance sits, 0 at the toe, 1 at the lip. */
export function rampProgress(distance: number, zone: RampZone): number {
  if (!(zone.triggerLength > 0)) {
    return 1;
  }
  return (distance - zone.triggerDistance) / zone.triggerLength;
}

/** True once the car has ridden the first third and may launch or reject. */
export function isRampLaunchWindow(distance: number, zone: RampZone): boolean {
  return rampProgress(distance, zone) >= RAMP_LAUNCH_PROGRESS;
}

/**
 * Visual lip height from the authored angle × slab length — not the ballistic
 * peak. The angle is invented on purpose; physics does not have to match tan.
 */
export function rampVisualPeak(zone: RampZone): number {
  const tan = Math.tan((zone.inclineDegrees * Math.PI) / 180);
  return tan > 0 ? zone.triggerLength * tan : 0;
}

/** The ramp zone active at this arc-length distance, or `null` if none. Wraps
 * distance the same way the rest of the spline-keyed geometry does. */
export function rampZoneAt(distance: number, track: TrackDefinition): RampZone | null {
  if (track.rampZones === undefined) return null;
  for (const zone of track.rampZones) {
    const end = zone.triggerDistance + zone.triggerLength;
    if (distance >= zone.triggerDistance && distance < end) return zone;
  }
  return null;
}
