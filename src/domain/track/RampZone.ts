import type { TrackDefinition } from './TrackDefinition.ts';

/**
 * A jump-ramp zone on the track (T-050), keyed by arc-length distance —
 * the same "one true coordinate" checkpoints, the starting grid and the AI
 * line already use. Deliberately minimal: a trigger window and a launch
 * speed. Peak height and airtime are DERIVED rather than separately
 * authored, so they can never disagree with the physics that produces them.
 */
export interface RampZone {
  /** Arc length where the trigger zone begins. */
  readonly triggerDistance: number;
  /** Length of the trigger zone, arc-length units. */
  readonly triggerLength: number;
  /** Vertical launch speed imparted on entry, world units/s. */
  readonly launchSpeed: number;
}

/** Shared gravity for every ramp — one feel knob, not per-ramp data, so
 * "how floaty a jump feels" stays a single tuning constant. */
export const RAMP_GRAVITY = 40;

/** Peak height a ramp's launch speed reaches under `RAMP_GRAVITY`, world units. */
export function rampPeakHeight(zone: RampZone): number {
  return (zone.launchSpeed * zone.launchSpeed) / (2 * RAMP_GRAVITY);
}

/** Total time from launch to landing back at height 0, seconds. */
export function rampAirtimeSeconds(zone: RampZone): number {
  return (2 * zone.launchSpeed) / RAMP_GRAVITY;
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
