/**
 * 7 lateral candidates around the current racing-line offset.
 * Intention reweights the score. Intentional RAM collision ≠ accidental collision.
 */

import { offsetAt, type RacingLine } from '../race/RacingLine.ts';
import { trackFullHalfWidth, type TrackDefinition } from '../track/TrackDefinition.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';
import { TACTICAL_INTENTION, type TacticalIntention } from './UtilityEvaluator.ts';
import { clamp, clamp01 } from './math.ts';

const LATERAL_FRACTIONS = [-1, -2 / 3, -1 / 3, 0, 1 / 3, 2 / 3, 1] as const;

export interface TrajectoryCandidate {
  readonly offset: number;
  readonly score: number;
  readonly terms: TrajectoryTerms;
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
