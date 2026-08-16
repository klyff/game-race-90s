import { resolveWallContact, surfaceAt } from '../track/TrackCollision.ts';
import type { TrackDefinition } from '../track/TrackDefinition.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';
import { stepVehicle } from '../vehicle/ArcadeCarPhysics.ts';
import type { InputCommand } from '../input/InputCommand.ts';
import type { VehicleState, VehicleTelemetry } from '../vehicle/Vehicle.ts';
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
}

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
): OnTrackStepResult {
  // 1. Project the car onto the centreline; use the previous frame's distance as a hint.
  const before = spline.projectNear(state.position, hintDistance, searchWindow);

  // 2. Pick the surface from the lateral offset: tarmac inside halfWidth, offroad outside.
  const surface = surfaceAt(before.lateralOffset, track);

  // 3. Integrate the physics on that surface for the full timestep.
  const stepped = stepVehicle(state, command, stats, surface, stepSeconds);

  // 4. Re-project the car's new position, using the old projection's distance as a hint
  //    (the car has moved continuously, so it is still nearby in arc length).
  const after = spline.projectNear(
    stepped.state.position,
    before.distance,
    searchWindow,
  );

  // 5. Resolve wall contact: clamp the car inside the wall and reflect/scrub velocity
  //    if it tried to go past.
  const wall = resolveWallContact(
    stepped.state,
    after,
    track,
    stats.collisionRadius,
  );

  return {
    state: wall.state,
    telemetry: stepped.telemetry,
    distance: after.distance,
    lateralOffset: wall.lateralOffset,
    touchedWall: wall.touchedWall,
    impactSpeed: wall.impactSpeed,
  };
}
