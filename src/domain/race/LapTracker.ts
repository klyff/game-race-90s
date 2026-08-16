import type { TrackDefinition } from '../track/TrackDefinition.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';

/**
 * Represents progress through a multi-lap race.
 *
 * A car must pass checkpoints IN ORDER before a start-line crossing counts as a lap.
 * This rejects shortcuts (teleporting over checkpoints) and reverse-driving cheese.
 */
export interface LapProgress {
  /** Number of complete laps finished. */
  readonly lapsCompleted: number;
  /** Index of the checkpoint the car must reach next, 0..checkpointCount-1. */
  readonly nextCheckpoint: number;
  /**
   * Checkpoints claimed since the last start-line crossing, EXCLUDING the line itself.
   *
   * This exists because `nextCheckpoint` alone cannot tell "claimed nothing yet" from
   * "claimed everything": both are 0, since checkpoint 0 *is* the start line. Collapsing
   * those two states let a car that crossed the line having passed no checkpoints at all
   * score a lap — the exact shortcut this module exists to reject.
   */
  readonly gatesClaimed: number;
  /** Total arc length travelled forward since the race started, world units. Monotonic. */
  readonly totalProgress: number;
  /** True when lapsCompleted >= track.laps, stays true forever. */
  readonly finished: boolean;
}

/**
 * Initialise lap tracking at a starting position.
 *
 * The car begins at checkpoint 0, ready to claim checkpoints in order
 * and complete its first lap by crossing the start line.
 */
export function createLapProgress(_startDistance: number): LapProgress {
  return {
    lapsCompleted: 0,
    nextCheckpoint: 0,
    gatesClaimed: 0,
    totalProgress: 0,
    finished: false,
  };
}

/**
 * Compute the arc-length distance of checkpoint i on the track.
 *
 * Checkpoints are evenly spaced by arc length, starting at the start line.
 * All distances wrap to [0, totalLength).
 */
function checkpointDistance(
  checkpointIndex: number,
  track: TrackDefinition,
  spline: TrackSpline,
): number {
  const checkpointSpacing = spline.totalLength / track.checkpointCount;
  const distance = track.startLineDistance + checkpointIndex * checkpointSpacing;
  return spline.wrap(distance);
}

/**
 * Advance lap progress for one simulation step.
 *
 * Pure function: given the car's movement this step and the current progress,
 * return the new progress state. The car's movement is characterised by
 * (previousDistance, currentDistance), which may wrap around the track.
 *
 * Movement is considered FORWARD if signedDelta(previousDistance, currentDistance) > 0.
 * Backwards movement (and zero movement) never increments laps or checkpoints.
 * A checkpoint is claimed only when a forward-moving step crosses it.
 * A lap is complete only when the car crosses the start line forward with all
 * checkpoints already claimed (nextCheckpoint == 0).
 */
export function advanceLapProgress(
  progress: LapProgress,
  previousDistance: number,
  currentDistance: number,
  track: TrackDefinition,
  spline: TrackSpline,
): LapProgress {
  // If already finished, stay finished.
  if (progress.finished) {
    return progress;
  }

  // Compute signed movement this step: positive = forward, negative = backwards.
  const signedMovement = spline.signedDelta(previousDistance, currentDistance);

  // No forward movement: do not advance anything. Backwards movement also does nothing.
  if (signedMovement <= 0) {
    return progress;
  }

  // Forward movement detected. Try to claim checkpoints and complete laps.
  let lapsCompleted = progress.lapsCompleted;
  let nextCheckpoint = progress.nextCheckpoint;
  let gatesClaimed = progress.gatesClaimed;
  let totalProgress = progress.totalProgress;

  // Accumulate forward progress (monotonic).
  totalProgress += signedMovement;

  // Does this step cross the start line? Checked BEFORE claiming checkpoints, because
  // checkpoint 0 sits on the line and claiming it would move `nextCheckpoint` past it.
  const startLineDist = track.startLineDistance;
  const distToStartLine = spline.signedDelta(previousDistance, startLineDist);
  const crossesStartLine = distToStartLine > 0 && distToStartLine <= signedMovement;

  // A lap counts only if every gate between the lines was claimed on the way round.
  // Testing `gatesClaimed` rather than `nextCheckpoint === 0` is what rejects a shortcut:
  // a car that jumps the infield straight to the line arrives with gates still missing.
  const claimedEveryGate = gatesClaimed >= track.checkpointCount - 1;
  if (crossesStartLine && claimedEveryGate) {
    lapsCompleted += 1;
    gatesClaimed = 0;
  } else if (crossesStartLine) {
    // Crossed the line without the full set: the lap does not count, and the gate tally
    // resets so the car cannot bank half a lap now and the other half on the next pass.
    gatesClaimed = 0;
  }

  // Claim checkpoints in order. We can cross multiple checkpoints in a single step.
  // Starting from nextCheckpoint, check each checkpoint in order to see if it's crossed.
  // IMPORTANT: Use the starting value of nextCheckpoint for the checkpoint index calculation,
  // not the updated value, so we check checkpoint i, i+1, i+2, ... in order.
  const nextCheckpointAtStart = nextCheckpoint;
  for (let i = 0; i < track.checkpointCount; i += 1) {
    const checkpointIdx = (nextCheckpointAtStart + i) % track.checkpointCount;
    const checkpointDist = checkpointDistance(checkpointIdx, track, spline);

    // Check if this checkpoint is crossed on this step.
    // A checkpoint at distance D_c is crossed if the signed distance from previousDistance to D_c
    // is positive (ahead) and less than or equal to the signed movement.
    const distToCheckpoint = spline.signedDelta(previousDistance, checkpointDist);

    if (distToCheckpoint > 0 && distToCheckpoint <= signedMovement) {
      // This checkpoint is crossed; claim it and advance to the next.
      nextCheckpoint = (checkpointIdx + 1) % track.checkpointCount;
      // Checkpoint 0 is the start line itself, already handled above — only the gates
      // between the lines count towards completing a lap.
      if (checkpointIdx !== 0) {
        gatesClaimed += 1;
      }
    } else {
      // This checkpoint is not crossed. Since checkpoints must be claimed in order,
      // stop checking further ones.
      break;
    }
  }

  // Determine if we've reached the finish line.
  const finished = lapsCompleted >= track.laps;

  return {
    lapsCompleted,
    nextCheckpoint,
    gatesClaimed,
    totalProgress,
    finished,
  };
}
