import type { LapProgress } from './LapTracker.ts';

export interface RacerProgress {
  readonly carId: string;
  /** Grid seat. Required when two racers share a car model. */
  readonly racerIndex?: number;
  readonly progress: LapProgress;
  /** Elapsed race seconds when this car crossed the line. Earlier wins. */
  readonly finishedAtSeconds?: number;
  /** totalProgress at the finish step. Same-second tie: higher (the leader) wins. */
  readonly finishedAtProgress?: number;
}

export interface RacerStanding {
  readonly carId: string;
  readonly racerIndex: number;
  /** 1-based race position. */
  readonly position: number;
  readonly lapsCompleted: number;
  readonly finished: boolean;
}

/**
 * Pure. Returns standings ordered 1st..last.
 *
 * Ranking logic:
 * - Finished cars always rank ahead of unfinished
 * - Among finished cars: finishedAtSeconds ascending (who crossed earlier), then
 *   finishedAtProgress descending (same-step leader has more overshoot)
 * - Among unfinished cars: totalProgress descending
 * - Ties broken by carId, then racerIndex
 */
export function rankRacers(racers: readonly RacerProgress[]): readonly RacerStanding[] {
  if (racers.length === 0) {
    return [];
  }

  const seated = racers.map((racer, index) => ({
    ...racer,
    racerIndex: racer.racerIndex ?? index,
  }));

  // Separate finished and unfinished cars
  const finished: RacerProgress[] = [];
  const unfinished: RacerProgress[] = [];

  for (const racer of seated) {
    if (racer.progress.finished) {
      finished.push(racer);
    } else {
      unfinished.push(racer);
    }
  }

  finished.sort((a, b) => compareFinished(a, b));

  // Sort unfinished cars: by totalProgress descending, then by carId for determinism.
  unfinished.sort((a, b) => {
    if (a.progress.totalProgress !== b.progress.totalProgress) {
      return b.progress.totalProgress - a.progress.totalProgress;
    }

    const byId = a.carId.localeCompare(b.carId);
    if (byId !== 0) {
      return byId;
    }
    return (a.racerIndex ?? 0) - (b.racerIndex ?? 0);
  });

  // Combine: finished first, then unfinished.
  const sorted = [...finished, ...unfinished];

  // Build standings with 1-based position numbers.
  return sorted.map((racer, index) => ({
    carId: racer.carId,
    racerIndex: racer.racerIndex ?? 0,
    position: index + 1,
    lapsCompleted: racer.progress.lapsCompleted,
    finished: racer.progress.finished,
  }));
}

/**
 * Seat first, carId second. Finished cars sort ahead, so a `find` by carId
 * alone hands a twin the chequered flag and it coasts on the last lap.
 */
export function standingForSeat(
  standings: readonly RacerStanding[],
  carId: string,
  racerIndex?: number,
): RacerStanding | undefined {
  if (racerIndex !== undefined) {
    const seated = standings.find(standing => standing.racerIndex === racerIndex);
    if (seated !== undefined) {
      return seated;
    }
  }
  return standings.find(standing => standing.carId === carId);
}

function compareFinished(a: RacerProgress, b: RacerProgress): number {
  const aHasSeconds = a.finishedAtSeconds !== undefined;
  const bHasSeconds = b.finishedAtSeconds !== undefined;
  if (aHasSeconds && bHasSeconds && a.finishedAtSeconds !== b.finishedAtSeconds) {
    return a.finishedAtSeconds! - b.finishedAtSeconds!;
  }
  if (aHasSeconds !== bHasSeconds) {
    return aHasSeconds ? -1 : 1;
  }

  const aProgress = a.finishedAtProgress ?? a.progress.totalProgress;
  const bProgress = b.finishedAtProgress ?? b.progress.totalProgress;
  if (aProgress !== bProgress) {
    return bProgress - aProgress;
  }

  const byId = a.carId.localeCompare(b.carId);
  if (byId !== 0) {
    return byId;
  }
  return (a.racerIndex ?? 0) - (b.racerIndex ?? 0);
}
