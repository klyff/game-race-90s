/**
 * Race scoring (T-042). Pure, so the number on the results screen is under test
 * rather than eyeballed.
 *
 * Owner split: finishing POSITION is worth 70% and TIME-VS-PAR is worth 30%. Par
 * comes from `npm run gen:lines` (`TrackLinesManifest.parTime`, a single lap) and
 * is multiplied by the lap count before it reaches here, so `parSeconds` is the
 * target time for the WHOLE race, comparable to the player's finish time.
 */

export const POSITION_WEIGHT = 70;
export const TIME_WEIGHT = 30;

export interface RaceScoreInput {
  /** 1-based finishing position (1 = winner). */
  readonly position: number;
  /** How many cars were in the race. */
  readonly totalRacers: number;
  /** The player's total race time, seconds. */
  readonly finishSeconds: number;
  /**
   * Target total race time from par, seconds. Omitted (or non-positive) when the
   * track has no generated lines yet, in which case the whole score is positional.
   */
  readonly parSeconds?: number;
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Fraction 1..0 for first..last place. A single-car field always scores 1. */
export function positionFraction(position: number, totalRacers: number): number {
  if (totalRacers <= 1) {
    return 1;
  }
  const clampedPosition = Math.max(1, Math.min(totalRacers, position));
  return (totalRacers - clampedPosition) / (totalRacers - 1);
}

/** Fraction 1..0: 1 when the player matched or beat par, falling off as they run slower. */
export function timeFraction(finishSeconds: number, parSeconds: number): number {
  if (!Number.isFinite(parSeconds) || parSeconds <= 0) {
    return 0;
  }
  if (!Number.isFinite(finishSeconds) || finishSeconds <= 0) {
    return 0;
  }
  return clamp01(parSeconds / finishSeconds);
}

/**
 * The 0..100 score. When there is no par time the position carries the whole
 * score so a track without generated lines still produces a sensible number.
 */
export function computeRaceScore(input: RaceScoreInput): number {
  const posFraction = positionFraction(input.position, input.totalRacers);

  const hasPar = input.parSeconds !== undefined && input.parSeconds > 0;
  if (!hasPar) {
    return Math.round(clamp01(posFraction) * 100);
  }

  const timeFrac = timeFraction(input.finishSeconds, input.parSeconds as number);
  const score = posFraction * POSITION_WEIGHT + timeFrac * TIME_WEIGHT;
  return Math.round(Math.max(0, Math.min(100, score)));
}
