import { resolveWallContact, surfaceAt } from '../track/TrackCollision.ts';
import type { TrackDefinition } from '../track/TrackDefinition.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';
import { rampZoneAt } from '../track/RampZone.ts';
import type { RampZone } from '../track/RampZone.ts';
import { resolveRampContact } from '../track/RampLaunch.ts';
import { AIRBORNE_SURFACE, stepVehicle } from '../vehicle/ArcadeCarPhysics.ts';
import { integrateAirborne } from '../vehicle/Airborne.ts';
import { isAirborne } from '../vehicle/Vehicle.ts';
import type { InputCommand } from '../input/InputCommand.ts';
import type { VehicleState, VehicleTelemetry, SurfaceConditions } from '../vehicle/Vehicle.ts';
import type { VehicleStats } from '../vehicle/VehicleStats.ts';

/**
 * Complete result of one on-track simulation step. Includes state, telemetry,
 * and the track geometry needed for the next step's hint and subsequent lap tracking.
 */
export interface OnTrackStepResult {
  /** Wall-corrected vehicle state after the step. */
  readonly state: VehicleState;
  /** Telemetry from the physics integration (surface, grip usage, slip, etc.). */
  readonly telemetry: VehicleTelemetry;
  /** Arc-length distance of the post-step projection on the centreline. Feeds next step's hint. */
  readonly distance: number;
  /** Signed lateral offset of the CORRECTED position after wall contact. NOT the pre-correction projection offset. */
  readonly lateralOffset: number;
  /** True if the car contacted the wall during this step. */
  readonly touchedWall: boolean;
  /** Speed component INTO the wall, world units/s. Zero if no contact. */
  readonly impactSpeed: number;
  /** Ramp launch or reject that fired this step, if any. Hop never produces this. */
  readonly rampEvent: RampStepEvent;
}

export type RampStepEvent =
  | { readonly kind: 'launch'; readonly zone: RampZone; readonly hot: boolean }
  | { readonly kind: 'reject'; readonly zone: RampZone }
  | null;

/**
 * Turns the surface the track chose into the surface THIS car experiences.
 *
 * Injected as a strategy rather than resolved here, because the surface is picked inside
 * this function and a car-specific rule would otherwise have to reach in. Keeping it a
 * plain function means `OnTrackStep` knows nothing about perks, cars or any future reason
 * a surface might differ per car — it only knows that something may adjust it.
 */
export type SurfaceAdjuster = (surface: SurfaceConditions) => SurfaceConditions;

/**
 * One 60 Hz simulation step, in the order that makes the track authoritative:
 *
 *  1. project the car onto the centreline to learn where it is on the track;
 *  2. pick the surface from that lateral offset — tarmac or dirt;
 *  3. integrate the physics on that surface;
 *  4. re-project, because the car has moved;
 *  5. let the wall push it back if it went too far.
 *
 * Two projections per step rather than one: the surface must be sampled where the
 * car *was* driving and the wall must be resolved where it *ended up*. Reusing the
 * first projection for the wall would let a fast car cut the corner of the
 * geometry and end up outside the wall for a frame.
 *
 * Pure function: identical inputs always produce identical output, and the car's
 * position, velocity and heading have no history — only physics.
 *
 * @param state The car's position, velocity, heading and yawSpin.
 * @param command Driver input: throttle, brake, steer, fire, dropMine.
 * @param stats The car's mass, engine power, grip, collision radius, etc.
 * @param track The circuit definition (halfWidth, wall placement, surface boundaries).
 * @param spline The arc-length-parameterised track centreline.
 * @param hintDistance The previous frame's distance, used to narrow the projection search.
 * @param searchWindow Arc length to search left and right of hintDistance, world units.
 * @param stepSeconds Elapsed time for this step, normally 1/60.
 * @param surfaceAdjust Optional per-car adjustment of the chosen surface. Omitted means
 *        the car experiences exactly what the track dictates.
 *
 * @returns Wall-corrected state, telemetry, new distance for next step's hint,
 *          and wall-contact flags.
 */
export function stepVehicleOnTrack(
  state: VehicleState,
  command: InputCommand,
  stats: VehicleStats,
  track: TrackDefinition,
  spline: TrackSpline,
  hintDistance: number,
  searchWindow: number,
  stepSeconds: number,
  surfaceAdjust?: SurfaceAdjuster,
  turboActive = false,
): OnTrackStepResult {
  // 1. Project the car onto the centreline; use the previous frame's distance as a hint.
  const before = spline.projectNear(state.position, hintDistance, searchWindow);

  // A ramp launches a grounded car that is not already hopping; a car already
  // airborne re-entering the same zone does not re-launch.
  const zone = rampZoneAt(before.distance, track);
  let rampEvent: RampStepEvent = null;
  let launched = state;
  if (zone !== null && !isAirborne(state) && state.verticalVelocity <= 0) {
    const contact = resolveRampContact(state, zone, stats, command, turboActive);
    launched = contact.state;
    rampEvent =
      contact.kind === 'launch'
        ? { kind: 'launch', zone, hot: contact.hot }
        : { kind: 'reject', zone };
  }

  // 2. Pick the surface from the lateral offset: tarmac inside halfWidth, offroad
  //    outside — unless the car is airborne, which touches nothing at all (T-050).
  const flying = isAirborne(launched) || launched.verticalVelocity > 0;
  const chosen = flying ? AIRBORNE_SURFACE : surfaceAt(before.lateralOffset, track);
  const surface = surfaceAdjust === undefined ? chosen : surfaceAdjust(chosen);

  // 3. Integrate the physics on that surface for the full timestep, then gravity —
  //    the two are orthogonal, which is why `integrateAirborne` is a separate pass.
  const stepped = stepVehicle(launched, command, stats, surface, stepSeconds);
  const airborne = integrateAirborne(stepped.state, stepSeconds);

  // 4. Re-project the car's new position, using the old projection's distance as a hint
  //    (the car has moved continuously, so it is still nearby in arc length).
  const after = spline.projectNear(
    airborne.position,
    before.distance,
    searchWindow,
  );

  // 5. Resolve wall contact: clamp the car inside the wall and reflect/scrub velocity
  //    if it tried to go past. Skipped entirely while airborne — a jump flies OVER
  //    the wall rather than scraping it, an explicit exception to decision 19, not a
  //    repurposing of the wall-scrape code.
  const wall = isAirborne(airborne)
    ? { state: airborne, touchedWall: false, impactSpeed: 0, lateralOffset: after.lateralOffset }
    : resolveWallContact(airborne, after, track, stats.collisionRadius);

  return {
    state: wall.state,
    telemetry: stepped.telemetry,
    distance: after.distance,
    lateralOffset: wall.lateralOffset,
    touchedWall: wall.touchedWall,
    impactSpeed: wall.impactSpeed,
    rampEvent,
  };
}
