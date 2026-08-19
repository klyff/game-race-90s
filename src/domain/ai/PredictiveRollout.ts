/**
 * Short-horizon prediction using the real vehicle step.
 * A candidate that leaves the corridor or demands impossible rotation is IMPOSSIBLE.
 */

import { stepVehicle, TARMAC, OFFROAD } from '../vehicle/ArcadeCarPhysics.ts';
import type { VehicleState } from '../vehicle/Vehicle.ts';
import type { VehicleStats } from '../vehicle/VehicleStats.ts';
import { IDLE_INPUT } from '../input/InputCommand.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';
import type { TrackDefinition } from '../track/TrackDefinition.ts';
import { trackFullHalfWidth } from '../track/TrackDefinition.ts';
import { length } from '../math/Vec2.ts';
import { pursuitAimPoint, pursuitSteer } from '../vehicle/PursuitSteering.ts';
import { clamp, clamp01 } from './math.ts';
import type { PathCandidate } from './CandidateGenerator.ts';
import {
  minSeparation,
  occupancyTube,
  wrappedArcGap,
  type OccupancyRival,
} from './OpponentOccupancy.ts';

export const ROLLOUT_HORIZON = 1.05;
export const ROLLOUT_DT = 0.12;

export const FEASIBILITY = {
  FEASIBLE: 'FEASIBLE',
  MARGINAL: 'MARGINAL',
  IMPOSSIBLE: 'IMPOSSIBLE',
} as const;

export type Feasibility = (typeof FEASIBILITY)[keyof typeof FEASIBILITY];

export interface RolloutPoint {
  readonly t: number;
  readonly s: number;
  readonly d: number;
  readonly speed: number;
}

export interface RolloutResult {
  readonly feasible: Feasibility;
  readonly rejectReason: string | null;
  readonly progress: number;
  readonly exitSpeed: number;
  readonly offTrack: number;
  readonly wall: number;
  readonly minRivalSep: number;
  readonly targetSep: number;
  readonly samples: readonly RolloutPoint[];
}

export interface RolloutRequest {
  readonly candidate: PathCandidate;
  readonly state: VehicleState;
  readonly stats: VehicleStats;
  readonly spline: TrackSpline;
  readonly track: TrackDefinition;
  readonly distance: number;
  readonly collisionRadius: number;
  readonly lookAheadBase: number;
  readonly lookAheadScale: number;
  readonly fullLockBearing: number;
  readonly rivals: readonly OccupancyRival[];
  readonly trackLength: number;
  readonly opponentPrediction: number;
  readonly vehiclePhysics: number;
  readonly lastLap?: boolean;
}

export function rolloutCandidate(request: RolloutRequest): RolloutResult {
  const horizon = ROLLOUT_HORIZON;
  const dt = ROLLOUT_DT;
  const steps = Math.max(1, Math.round(horizon / dt));
  const skill = clamp01(request.vehiclePhysics);
  const speedFloor = request.lastLap === true ? 0.94 : 0.82;
  const speedSpan = request.lastLap === true ? 0.06 : 0.16;
  const margin = 0.85 + (1 - skill) * 0.55;
  const half = request.track.halfWidth;
  const full = trackFullHalfWidth(request.track);
  const tubes = request.rivals.slice(0, 6).map(rival => ({
    rival,
    tube: occupancyTube(rival, horizon, dt, request.trackLength, request.opponentPrediction),
  }));

  let state = request.state;
  let hint = request.distance;
  const samples: RolloutPoint[] = [];
  let off = 0;
  let wall = 0;
  let minSep = 40;
  let targetSep = 40;
  let impossible: string | null = null;

  for (let i = 1; i <= steps; i += 1) {
    const projection = request.spline.projectNear(state.position, hint, 48);
    hint = projection.distance;
    const speed = length(state.velocity);
    const aim = pursuitAimPoint(
      projection,
      request.spline,
      speed,
      request.lookAheadBase,
      request.lookAheadScale,
      request.candidate.targetLateral,
    );
    const steer = pursuitSteer(state, aim, request.fullLockBearing);
    const targetSpeed = request.stats.maxSpeed * request.candidate.speedScale * (speedFloor + skill * speedSpan);
    let throttle = 0;
    let brake = 0;
    if (speed < targetSpeed - 2) {
      throttle = 1;
    } else if (speed > targetSpeed + 3) {
      brake = clamp((speed - targetSpeed) / 18, 0, 1);
    } else {
      throttle = 0.55;
    }
    const surface = Math.abs(projection.lateralOffset) > half ? OFFROAD : TARMAC;
    const stepped = stepVehicle(
      state,
      { ...IDLE_INPUT, throttle, brake, steer },
      request.stats,
      surface,
      dt,
    );
    state = stepped.state;
    const next = request.spline.projectNear(state.position, hint, 48);
    hint = next.distance;
    const t = i * dt;
    samples.push({
      t,
      s: next.distance,
      d: next.lateralOffset,
      speed: length(state.velocity),
    });
    const absD = Math.abs(next.lateralOffset);
    if (absD > half) {
      off = Math.max(off, clamp01((absD - half) / Math.max(0.5, request.track.shoulderWidth)));
    }
    wall = Math.max(wall, clamp01(absD / Math.max(0.5, full)));
    if (absD > full * margin + 0.4) {
      impossible = 'TRACK_BOUNDARY';
      break;
    }
    const selfRadius = request.collisionRadius * 0.9;
    for (const { rival, tube } of tubes) {
      const sample = tube[Math.min(i - 1, tube.length - 1)];
      if (sample === undefined) {
        continue;
      }
      const sep = minSeparation(next.distance, next.lateralOffset, selfRadius, sample, request.trackLength);
      minSep = Math.min(minSep, sep);
      if (rival.isTarget) {
        targetSep = Math.min(targetSep, sep);
      }
    }
  }

  const last = samples[samples.length - 1];
  const progress = last === undefined
    ? 0
    : Math.max(0, wrappedArcGap(request.distance, last.s, request.trackLength));
  const exitSpeed = last?.speed ?? length(request.state.velocity);
  let feasible: typeof FEASIBILITY.FEASIBLE | typeof FEASIBILITY.MARGINAL | typeof FEASIBILITY.IMPOSSIBLE =
    FEASIBILITY.FEASIBLE;
  if (impossible !== null) {
    feasible = FEASIBILITY.IMPOSSIBLE;
  } else if (off > 0.45 || wall > 0.92) {
    feasible = FEASIBILITY.MARGINAL;
  }

  return {
    feasible,
    rejectReason: impossible,
    progress,
    exitSpeed,
    offTrack: off,
    wall,
    minRivalSep: minSep,
    targetSep,
    samples,
  };
}
