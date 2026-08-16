/**
 * Shared offline lap simulator for the track and line generators.
 *
 * It drives ONE lap with the conservative AIDriver (aggression 0, so the line is
 * a stable geometric path, not a risk-taking race), using the exact on-track step
 * the game uses. Crucially it applies the track's `surfaceGrip` by scaling the
 * car's grip, so a slippery planet is as slippery here as it is in a live race.
 */

import { add, angleOf, scale } from '../../src/domain/math/Vec2.ts';
import { SIMULATION_STEP_SECONDS } from '../../src/domain/constants.ts';
import { stepVehicleOnTrack } from '../../src/domain/race/OnTrackStep.ts';
import type { RacingLine } from '../../src/domain/race/RacingLine.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import { trackSurfaceGrip } from '../../src/domain/track/TrackDefinition.ts';
import type { TrackDefinition } from '../../src/domain/track/TrackDefinition.ts';
import { AIDriver } from '../../src/domain/vehicle/AIDriver.ts';
import { PACE_DRIVER_DEFAULTS } from '../../src/domain/vehicle/PaceDriver.ts';
import { createVehicleState } from '../../src/domain/vehicle/Vehicle.ts';
import type { VehicleStats } from '../../src/domain/vehicle/VehicleStats.ts';

const SPAWN_SETBACK = 14;
const STEP_BUDGET = 100_000;
const SEARCH_WINDOW = 50;

export interface LapSimResult {
  readonly lapSeconds: number;
  readonly wallContacts: number;
  readonly completed: boolean;
}

/** Grip scaled for the track surface — the single place surfaceGrip enters the offline tools. */
export function effectiveStats(stats: VehicleStats, track: TrackDefinition): VehicleStats {
  const surfaceGrip = trackSurfaceGrip(track);
  return surfaceGrip === 1 ? stats : { ...stats, grip: stats.grip * surfaceGrip };
}

/**
 * Drive one lap. Pass a `line` to follow a searched racing line; omit it to drive
 * the centreline. Returns `Infinity` lap seconds when the car fails to finish.
 */
export function simulateLap(
  stats: VehicleStats,
  track: TrackDefinition,
  spline: TrackSpline,
  line?: RacingLine,
  stepBudget: number = STEP_BUDGET,
): LapSimResult {
  const carStats = effectiveStats(stats, track);
  const driver = new AIDriver(PACE_DRIVER_DEFAULTS, 0);

  const spawnDistance = spline.wrap(track.startLineDistance - SPAWN_SETBACK);
  const spawnFrame = spline.frameAt(spawnDistance);
  const lateralOffset = track.gridLateralOffsets[0] ?? 0;
  const position = add(spawnFrame.position, scale(spawnFrame.normal, lateralOffset));
  const heading = angleOf(spawnFrame.tangent);

  let state = createVehicleState(position, heading);
  let accumulated = 0;
  let previousDistance = spawnDistance;
  let hintDistance = spawnDistance;
  let wallContacts = 0;

  for (let step = 0; step < stepBudget; step += 1) {
    const projection = spline.projectNear(state.position, hintDistance, SEARCH_WINDOW);
    const command = driver.command(state, projection, carStats, spline, line, []);
    const result = stepVehicleOnTrack(
      state,
      command,
      carStats,
      track,
      spline,
      projection.distance,
      SEARCH_WINDOW,
      SIMULATION_STEP_SECONDS,
    );
    state = result.state;
    hintDistance = result.distance;
    if (result.touchedWall) {
      wallContacts += 1;
    }
    const delta = spline.signedDelta(previousDistance, result.distance);
    if (delta > 0) {
      accumulated += delta;
    }
    previousDistance = result.distance;

    if (accumulated >= spline.totalLength) {
      return { lapSeconds: step * SIMULATION_STEP_SECONDS, wallContacts, completed: true };
    }
  }

  return { lapSeconds: Number.POSITIVE_INFINITY, wallContacts, completed: false };
}
