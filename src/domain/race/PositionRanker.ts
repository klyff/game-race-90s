import type { LapProgress } from './LapTracker.ts';

export interface RacerProgress {
  readonly carId: string;
  readonly progress: LapProgress;
  /** Arc length at which this car finished, for ordering the cars that already finished. */
  readonly finishedAtProgress?: number;
}

export interface RacerStanding {
  readonly carId: string;
  /** 1-based race position. */
  readonly position: number;
  readonly lapsCompleted: number;
  readonly finished: boolean;
}

/**
 * Pure. Returns standings ordered 1st..last.
 *
 * Ranking logic:
 * - Primary: totalProgress descending (encodes both laps and distance within lap)
 * - Finished cars always rank ahead of unfinished
 * - Among finished cars: ordered by finishedAtProgress ascending (first to finish ranks first)
 * - Among unfinished cars: ordered by totalProgress descending
 * - Ties broken by carId for determinism
 */
export function rankRacers(racers: readonly RacerProgress[]): readonly RacerStanding[] {
  if (racers.length === 0) {
    return [];
  }

  // Separate finished and unfinished cars
  const finished: RacerProgress[] = [];
  const unfinished: RacerProgress[] = [];

  for (const racer of racers) {
    if (racer.progress.finished) {
      finished.push(racer);
    } else {
      unfinished.push(racer);
    }
  }

  // Sort finished cars: by finishedAtProgress ascending (first to finish first).
  // When finishedAtProgress is absent, fall back to totalProgress.
  // If both cars lack finishedAtProgress, sort by totalProgress descending (highest first).
  // If at least one has finishedAtProgress, sort by effective value ascending.
  finished.sort((a, b) => {
    const aHasFinished = a.finishedAtProgress !== undefined;
    const bHasFinished = b.finishedAtProgress !== undefined;

    const aValue = aHasFinished ? a.finishedAtProgress : a.progress.totalProgress;
    const bValue = bHasFinished ? b.finishedAtProgress : b.progress.totalProgress;

    // If both lack finishedAtProgress, sort by totalProgress descending (highest first).
    if (!aHasFinished && !bHasFinished) {
      if (aValue !== bValue) {
        return bValue - aValue;
      }
    }
    // Otherwise (if at least one has finishedAtProgress), sort ascending.
    else {
      if (aValue !== bValue) {
        return aValue - bValue;
      }
    }

    return a.carId.localeCompare(b.carId);
  });

  // Sort unfinished cars: by totalProgress descending, then by carId for determinism.
  unfinished.sort((a, b) => {
    if (a.progress.totalProgress !== b.progress.totalProgress) {
      return b.progress.totalProgress - a.progress.totalProgress;
    }

    return a.carId.localeCompare(b.carId);
  });

  // Combine: finished first, then unfinished.
  const sorted = [...finished, ...unfinished];

  // Build standings with 1-based position numbers.
  return sorted.map((racer, index) => ({
    carId: racer.carId,
    position: index + 1,
    lapsCompleted: racer.progress.lapsCompleted,
    finished: racer.progress.finished,
  }));
}
