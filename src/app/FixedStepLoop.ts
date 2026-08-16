import { SIMULATION_STEP_SECONDS } from '../domain/constants.ts';

/**
 * Fixed-timestep accumulator. Bridges Phaser's variable frame rate with the
 * simulation's fixed 60 Hz step. Pure and unit-testable in Node; does not
 * import Phaser.
 *
 * THE PATTERN:
 *
 * Each frame, call `advance(elapsedSeconds, step)`. The accumulator adds
 * `elapsedSeconds`, then runs `step(stepSeconds)` while the accumulator holds
 * a complete timestep, up to `maxStepsPerFrame` times. When the cap is hit,
 * the remaining accumulated time is DISCARDED, not carried to the next frame.
 *
 * WHY DISCARD instead of CARRY? If a frame runs long and carries the backlog
 * forward, the next frame starts with extra work queued. If it also runs long,
 * it queues even more. The simulation falls permanently behind real time, and
 * the game slows to a crawl instead of dropping some time once. Dropping time
 * makes the sim briefly run slow; unbounded carry means it never recovers.
 */
export class FixedStepLoop {
  readonly stepSeconds: number;
  readonly maxStepsPerFrame: number;
  private accumulatorSeconds: number = 0;

  constructor(
    stepSeconds: number = SIMULATION_STEP_SECONDS,
    maxStepsPerFrame: number = 5,
  ) {
    // Validate stepSeconds: must be finite and positive.
    if (!Number.isFinite(stepSeconds) || stepSeconds <= 0) {
      throw new Error(
        `Invalid stepSeconds: ${stepSeconds}. Must be finite and positive.`,
      );
    }

    // Validate maxStepsPerFrame: must be a positive integer.
    if (!Number.isInteger(maxStepsPerFrame) || maxStepsPerFrame <= 0) {
      throw new Error(
        `Invalid maxStepsPerFrame: ${maxStepsPerFrame}. Must be a positive integer.`,
      );
    }

    this.stepSeconds = stepSeconds;
    this.maxStepsPerFrame = maxStepsPerFrame;
  }

  /**
   * Advance the simulation by elapsed time and run fixed-timestep callbacks.
   *
   * @param elapsedSeconds Time passed since last frame. Non-finite, zero or
   *   negative values are ignored defensively (Phaser can hand out 0 or garbage
   *   on the first frame, and NaN would poison the accumulator forever).
   * @param step Callback invoked once per fixed timestep, passed `stepSeconds`.
   * @returns Number of steps executed.
   */
  advance(elapsedSeconds: number, step: (stepSeconds: number) => void): number {
    // Defend against Phaser's quirks: ignore non-finite, zero, or negative deltas.
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
      return 0;
    }

    this.accumulatorSeconds += elapsedSeconds;

    let stepsRun = 0;
    while (
      this.accumulatorSeconds >= this.stepSeconds &&
      stepsRun < this.maxStepsPerFrame
    ) {
      step(this.stepSeconds);
      this.accumulatorSeconds -= this.stepSeconds;
      stepsRun += 1;
    }

    // When the cap is hit, discard the remaining accumulated time instead of
    // carrying it forward. This prevents the simulation from falling permanently
    // behind real time when a frame runs long.
    if (stepsRun >= this.maxStepsPerFrame) {
      this.accumulatorSeconds = 0;
    }

    return stepsRun;
  }

  /**
   * Reset the accumulator to zero. Useful between scenes or on state resets.
   */
  reset(): void {
    this.accumulatorSeconds = 0;
  }

  /**
   * Leftover accumulated time, in seconds. Exposed for future use (e.g.,
   * interpolation between simulation states on a renderer). Nothing uses it yet.
   */
  get pendingSeconds(): number {
    return this.accumulatorSeconds;
  }
}
