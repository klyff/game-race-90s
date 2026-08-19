import { RACE_PHASE } from '../constants.ts';
import type { RacePhase } from '../constants.ts';
import { advanceLapProgress } from './LapTracker.ts';
import type { LapProgress } from './LapTracker.ts';
import { rankRacers } from './PositionRanker.ts';
import type { RacerStanding } from './PositionRanker.ts';
import type { TrackDefinition } from '../track/TrackDefinition.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';

/**
 * Per-racer state during a race.
 */
export interface RacerRaceState {
  readonly carId: string;
  readonly racerIndex: number;
  readonly progress: LapProgress;
  /** Elapsed race seconds at which this racer finished; undefined while still racing. */
  readonly finishedAtSeconds?: number;
  readonly finishedAtProgress?: number;
}

/**
 * The entire race state over time: phase, countdown, elapsed time, per-racer progress, and standings.
 */
export interface RaceState {
  readonly phase: RacePhase;
  /** Seconds remaining on the countdown; 0 once racing. */
  readonly countdownRemaining: number;
  /** Seconds since the lights went green. 0 during the countdown. */
  readonly elapsedSeconds: number;
  readonly racers: readonly RacerRaceState[];
  /** Standings, 1st..last, recomputed each step. */
  readonly standings: readonly RacerStanding[];
}

/**
 * One racer's centreline distance this step: where it was, and where it is now.
 */
export interface RacerStep {
  readonly carId: string;
  readonly racerIndex?: number;
  readonly previousDistance: number;
  readonly currentDistance: number;
}

/**
 * Pure. Initialise race state with a countdown.
 *
 * All racers start at the given startDistance with zero progress.
 * The countdown begins at countdownSeconds (default 3), and once it expires the race enters RACING.
 */
export function createRaceState(
  carIds: readonly string[],
  startDistance: number,
  countdownSeconds: number = 3,
): RaceState {
  const racers = carIds.map((carId, racerIndex) => ({
    carId,
    racerIndex,
    progress: {
      lapsCompleted: 0,
      nextCheckpoint: 0,
      gatesClaimed: 0,
      totalProgress: startDistance,
      finished: false,
    },
  }));

  return {
    phase: countdownSeconds > 0 ? RACE_PHASE.COUNTDOWN : RACE_PHASE.RACING,
    countdownRemaining: countdownSeconds,
    elapsedSeconds: 0,
    racers,
    standings: rankRacers(
      racers.map((racer) => ({
        carId: racer.carId,
        racerIndex: racer.racerIndex,
        progress: racer.progress,
      })),
    ),
  };
}

/**
 * Pure. Advance the race by deltaSeconds given where every car moved.
 *
 * During COUNTDOWN:
 *   - countdownRemaining ticks down
 *   - lap progress does NOT advance (a jumped start must not be rewarded)
 *   - elapsedSeconds stays 0
 *   - When countdownRemaining reaches 0, phase becomes RACING
 *
 * During RACING:
 *   - each racer's LapProgress advances via advanceLapProgress
 *   - elapsedSeconds accumulates
 *   - When a racer's progress.finished turns true, record finishedAtSeconds and finishedAtProgress ONCE
 *   - When ALL racers have finished, phase becomes FINISHED
 *
 * During FINISHED:
 *   - nothing changes
 *
 * Non-finite or negative deltaSeconds are treated as 0 (defensive guard).
 * A RacerStep for an unknown carId is ignored.
 * A racer with no step this call simply does not advance.
 */
export function advanceRace(
  state: RaceState,
  steps: readonly RacerStep[],
  track: TrackDefinition,
  spline: TrackSpline,
  deltaSeconds: number,
): RaceState {
  // Guard against non-finite or negative deltaSeconds.
  const safeDelta = Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? deltaSeconds : 0;

  // If already FINISHED, nothing changes.
  if (state.phase === RACE_PHASE.FINISHED) {
    return state;
  }

  // If in COUNTDOWN, just tick it down. No lap advancement, no elapsed time accumulation.
  if (state.phase === RACE_PHASE.COUNTDOWN) {
    const newCountdown = Math.max(0, state.countdownRemaining - safeDelta);
    const newPhase = newCountdown === 0 ? RACE_PHASE.RACING : RACE_PHASE.COUNTDOWN;

    return {
      phase: newPhase,
      countdownRemaining: newCountdown,
      elapsedSeconds: 0,
      racers: state.racers,
      standings: state.standings,
    };
  }

  // RACING phase: advance lap progress and elapsed time.
  const newElapsed = state.elapsedSeconds + safeDelta;

  const stepsByIndex = new Map<number, RacerStep>();
  const stepsByCarId = new Map<string, RacerStep>();
  for (const step of steps) {
    if (step.racerIndex !== undefined) {
      stepsByIndex.set(step.racerIndex, step);
    }
    stepsByCarId.set(step.carId, step);
  }

  // Advance each racer's progress.
  const newRacers = state.racers.map((racer) => {
    // If already finished, stay finished.
    if (racer.progress.finished) {
      return racer;
    }

    const step = stepsByIndex.get(racer.racerIndex) ?? stepsByCarId.get(racer.carId);
    if (step === undefined) {
      // No step provided for this racer; do not advance.
      return racer;
    }

    // Advance lap progress.
    const newProgress = advanceLapProgress(
      racer.progress,
      step.previousDistance,
      step.currentDistance,
      track,
      spline,
    );

    // If it just finished, record the moment.
    if (newProgress.finished && !racer.progress.finished) {
      return {
        ...racer,
        progress: newProgress,
        finishedAtSeconds: newElapsed,
        finishedAtProgress: newProgress.totalProgress,
      };
    }

    return {
      ...racer,
      progress: newProgress,
    };
  });

  // Check if all racers have finished.
  const allFinished = newRacers.every((racer) => racer.progress.finished);
  const newPhase = allFinished ? RACE_PHASE.FINISHED : RACE_PHASE.RACING;

  // Recompute standings.
  const newStandings = rankRacers(
    newRacers.map((racer) => ({
      carId: racer.carId,
      racerIndex: racer.racerIndex,
      progress: racer.progress,
      finishedAtProgress: racer.finishedAtProgress,
    })),
  );

  return {
    phase: newPhase,
    countdownRemaining: 0,
    elapsedSeconds: newElapsed,
    racers: newRacers,
    standings: newStandings,
  };
}
