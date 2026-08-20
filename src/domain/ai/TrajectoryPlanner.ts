/**
 * 7-15 corridor futures from the live car state. Intention is a label of the winner.
 * Legacy `candidateOffsets` remains for tests that check spacing.
 */

import { offsetAt, type RacingLine } from '../race/RacingLine.ts';
import { trackFullHalfWidth, type TrackDefinition } from '../track/TrackDefinition.ts';
import { rampApproach } from '../track/RampZone.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';
import { TACTICAL_INTENTION, type TacticalIntention } from './UtilityEvaluator.ts';
import { isPodiumSeat } from './SituationEvaluator.ts';
import { clamp, clamp01 } from './math.ts';
import { generatePathCandidates } from './CandidateGenerator.ts';
import { ROLLOUT_HORIZON, rolloutCandidate } from './PredictiveRollout.ts';
import { scoreFuture } from './OutcomeEvaluator.ts';
import type { VehicleState } from '../vehicle/Vehicle.ts';
import type { VehicleStats } from '../vehicle/VehicleStats.ts';
import type { DriverProfile } from './DriverProfile.ts';
import type { OccupancyRival } from './OpponentOccupancy.ts';

const LATERAL_FRACTIONS = [-1, -2 / 3, -1 / 3, 0, 1 / 3, 2 / 3, 1] as const;

export interface TrajectoryCandidate {
  readonly offset: number;
  readonly score: number;
  readonly terms: TrajectoryTerms;
  readonly id?: string;
  readonly kind?: string;
  readonly feasible?: boolean;
}

export interface TrajectoryTerms {
  readonly progressValue: number;
  readonly speedValue: number;
  readonly tacticalValue: number;
  readonly collisionPenalty: number;
  readonly wallPenalty: number;
  readonly offRoadPenalty: number;
  readonly instabilityPenalty: number;
}

export interface TrajectoryPlan {
  readonly selected: TrajectoryCandidate;
  readonly candidates: readonly TrajectoryCandidate[];
  readonly generatedCandidates?: number;
  readonly uniqueCandidates?: number;
}

export interface NearbyLateral {
  readonly carId: string;
  readonly lateralOffset: number;
  readonly gap: number;
  readonly isTarget: boolean;
}

export function maxSafeOffset(track: TrackDefinition, collisionRadius: number): number {
  return Math.max(0.5, trackFullHalfWidth(track) - collisionRadius - 0.5);
}

export function candidateOffsets(baseOffset: number, maxOffset: number): readonly number[] {
  const span = maxOffset * 0.62;
  return LATERAL_FRACTIONS.map(fraction => clamp(baseOffset + fraction * span, -maxOffset, maxOffset));
}

export function baselineOffset(
  line: RacingLine | undefined,
  distance: number,
  spline: TrackSpline,
  laneBias: number,
): number {
  const lineOffset = line === undefined ? 0 : offsetAt(line, distance + 12, spline);
  return lineOffset + laneBias;
}

export function scoreCandidate(
  offset: number,
  currentOffset: number,
  track: TrackDefinition,
  maxOffset: number,
  intention: TacticalIntention,
  nearby: readonly NearbyLateral[],
  interceptLateral: number | null,
): TrajectoryTerms {
  const half = track.halfWidth;
  const offRoad = Math.max(0, Math.abs(offset) - half);
  const wallProximity = Math.max(0, Math.abs(offset) / maxOffset);
  const towardIntercept =
    interceptLateral === null ? 0 : 1 - clamp01(Math.abs(offset - interceptLateral) / Math.max(1, maxOffset));

  let collisionOther = 0;
  let collisionTarget = 0;
  for (const rival of nearby) {
    if (rival.gap > 22) {
      continue;
    }
    const overlap = 1 - clamp01(Math.abs(offset - rival.lateralOffset) / 3.2);
    const proximity = 1 - clamp01(rival.gap / 22);
    const hit = overlap * proximity;
    if (rival.isTarget) {
      collisionTarget = Math.max(collisionTarget, hit);
    } else {
      collisionOther = Math.max(collisionOther, hit);
    }
  }

  const ramLike =
    intention === TACTICAL_INTENTION.RAM || intention === TACTICAL_INTENTION.ATTACK;
  const blockLike =
    intention === TACTICAL_INTENTION.BLOCK || intention === TACTICAL_INTENTION.DEFEND;
  const overtake = intention === TACTICAL_INTENTION.OVERTAKE;

  const progressValue = clamp01(1 - offRoad * 0.35 - wallProximity * 0.15);
  const speedValue = clamp01(1 - Math.abs(offset) / Math.max(1, maxOffset) * 0.25);
  const tacticalValue = ramLike || blockLike ? towardIntercept : overtake ? 1 - towardIntercept * 0.35 : 0.45;
  const collisionPenalty = ramLike
    ? collisionOther * 0.85 + collisionTarget * 0.08
    : collisionOther * 0.7 + collisionTarget * 0.55;
  const wallPenalty = wallProximity * (intention === TACTICAL_INTENTION.RECOVER ? 0.15 : 0.35);
  const offRoadPenalty = clamp01(offRoad / Math.max(0.5, track.shoulderWidth)) * 0.4;
  const instabilityPenalty = clamp01(Math.abs(offset - currentOffset) / Math.max(1, maxOffset)) * 0.2;

  return {
    progressValue,
    speedValue,
    tacticalValue,
    collisionPenalty,
    wallPenalty,
    offRoadPenalty,
    instabilityPenalty,
  };
}

export function trajectoryScore(terms: TrajectoryTerms, intention: TacticalIntention): number {
  const raceLike =
    intention === TACTICAL_INTENTION.RACE || intention === TACTICAL_INTENTION.OVERTAKE;
  const ramLike = intention === TACTICAL_INTENTION.RAM;
  const progressW = raceLike ? 1.1 : ramLike ? 0.45 : 0.7;
  const speedW = raceLike ? 1 : 0.55;
  const tacticalW = ramLike || intention === TACTICAL_INTENTION.BLOCK ? 1.25 : 0.6;
  return (
    terms.progressValue * progressW +
    terms.speedValue * speedW +
    terms.tacticalValue * tacticalW -
    terms.collisionPenalty -
    terms.wallPenalty -
    terms.offRoadPenalty -
    terms.instabilityPenalty
  );
}

export function planTrajectory(
  baseOffset: number,
  currentOffset: number,
  track: TrackDefinition,
  collisionRadius: number,
  intention: TacticalIntention,
  nearby: readonly NearbyLateral[],
  interceptLateral: number | null,
): TrajectoryPlan {
  const maxOffset = maxSafeOffset(track, collisionRadius);
  const offsets = candidateOffsets(baseOffset, maxOffset);
  const candidates = offsets.map(offset => {
    const terms = scoreCandidate(
      offset,
      currentOffset,
      track,
      maxOffset,
      intention,
      nearby,
      interceptLateral,
    );
    return { offset, terms, score: trajectoryScore(terms, intention) };
  });
  let selected = candidates[0];
  if (selected === undefined) {
    const terms = scoreCandidate(baseOffset, currentOffset, track, maxOffset, intention, nearby, interceptLateral);
    selected = { offset: baseOffset, terms, score: trajectoryScore(terms, intention) };
    return { selected, candidates: [selected] };
  }
  for (const candidate of candidates) {
    if (candidate.score > selected.score) {
      selected = candidate;
    }
  }
  return { selected, candidates };
}

export interface FuturePlanInput {
  readonly currentOffset: number;
  readonly lineOffset: number;
  readonly gapLateral: number | null;
  readonly track: TrackDefinition;
  readonly collisionRadius: number;
  readonly state: VehicleState;
  readonly stats: VehicleStats;
  readonly spline: TrackSpline;
  readonly distance: number;
  readonly lookAheadBase: number;
  readonly lookAheadScale: number;
  readonly fullLockBearing: number;
  readonly rivals: readonly OccupancyRival[];
  readonly trackLength: number;
  readonly profile: DriverProfile;
  readonly rammingCapability: number;
  readonly weaponCapability: number;
  readonly canAim: boolean;
  readonly missiles: number;
  readonly memory: number;
  readonly switchPenalty: number;
  readonly aheadGap: number | null;
  readonly behindGap: number | null;
  readonly lastLap?: boolean;
  readonly position?: number;
}

export function planFutures(input: FuturePlanInput): {
  readonly plan: TrajectoryPlan;
  readonly intention: TacticalIntention;
  readonly winnerScore: number;
} {
  const maxOffset = maxSafeOffset(input.track, input.collisionRadius);
  const generated = 11 + (input.gapLateral === null ? 0 : 1);
  const ramp = rampApproach(input.distance, input.track, input.trackLength);
  const lastLapPodium = input.lastLap === true && isPodiumSeat(input.position ?? 99);
  const unique = generatePathCandidates(
    input.currentOffset,
    input.lineOffset,
    maxOffset,
    input.gapLateral,
    ramp !== null || lastLapPodium ? 1 : 0.55,
  );
  const scored: TrajectoryCandidate[] = [];
  let bestIntention: TacticalIntention = TACTICAL_INTENTION.RACE;
  let bestScore = Number.NEGATIVE_INFINITY;
  let selected: TrajectoryCandidate | undefined;
  const cap = Math.max(8, ROLLOUT_HORIZON * 28);
  for (const candidate of unique) {
    const rollout = rolloutCandidate({
      candidate,
      state: input.state,
      stats: input.stats,
      spline: input.spline,
      track: input.track,
      distance: input.distance,
      collisionRadius: input.collisionRadius,
      lookAheadBase: input.lookAheadBase,
      lookAheadScale: input.lookAheadScale,
      fullLockBearing: input.fullLockBearing,
      rivals: input.rivals,
      trackLength: input.trackLength,
      opponentPrediction: input.profile.opponentPrediction,
      vehiclePhysics: input.profile.vehiclePhysics,
      lastLap: lastLapPodium,
    });
    const future = scoreFuture(candidate, rollout, {
      profile: input.profile,
      rammingCapability: input.rammingCapability,
      weaponCapability: input.weaponCapability,
      canAim: input.canAim,
      missiles: input.missiles,
      memory: input.memory,
      switchPenalty: input.switchPenalty,
      aheadGap: input.aheadGap,
      behindGap: input.behindGap,
      lastLap: input.lastLap === true,
      podium: lastLapPodium,
    }, cap);
    if (future === null) {
      scored.push({
        offset: candidate.targetLateral,
        score: -99,
        terms: emptyTerms(),
        id: candidate.id,
        kind: candidate.kind,
        feasible: false,
      });
      continue;
    }
    const row: TrajectoryCandidate = {
      offset: candidate.targetLateral,
      score: future.score,
      terms: {
        progressValue: future.outcome.progressGain,
        speedValue: future.outcome.exitSpeed,
        tacticalValue: clamp01(future.tactical / 4),
        collisionPenalty: future.outcome.accidentalCollision,
        wallPenalty: future.outcome.wallRisk,
        offRoadPenalty: future.outcome.offTrackRisk,
        instabilityPenalty: future.outcome.selfLoss,
      },
      id: candidate.id,
      kind: candidate.kind,
      feasible: true,
    };
    scored.push(row);
    if (future.score > bestScore) {
      bestScore = future.score;
      selected = row;
      bestIntention = future.intention;
    }
  }
  const fallback = selected ?? {
    offset: input.currentOffset,
    score: 0,
    terms: emptyTerms(),
    id: 'KEEP',
    kind: 'KEEP',
    feasible: true,
  };
  return {
    plan: {
      selected: fallback,
      candidates: scored,
      generatedCandidates: generated,
      uniqueCandidates: unique.length,
    },
    intention: bestIntention,
    winnerScore: bestScore,
  };
}

function emptyTerms(): TrajectoryTerms {
  return {
    progressValue: 0,
    speedValue: 0,
    tacticalValue: 0,
    collisionPenalty: 0,
    wallPenalty: 0,
    offRoadPenalty: 0,
    instabilityPenalty: 0,
  };
}

