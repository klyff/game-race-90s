/**
 * Pure state machine for brake→reverse engagement.
 *
 * When the down key is held and the car is moving forward, emits brake.
 * When held at a standstill for engageDelaySeconds, emits reverse instead.
 * When the up key is pressed while reversing, disengages immediately.
 *
 * No Phaser, no side effects, fully testable. Composes into KeyboardDriver.
 */

export interface ReverseLatchOptions {
  /** Held time at a standstill before reverse engages, seconds. */
  readonly engageDelaySeconds?: number;
  /** Forward speed below which the car counts as stopped, world units/s. */
  readonly stoppedSpeedThreshold?: number;
}

export interface DriveIntent {
  readonly brake: number;
  readonly reverse: number;
}

export class ReverseLatch {
  private readonly engageDelaySeconds: number;
  private readonly stoppedSpeedThreshold: number;
  private dwellSeconds: number = 0;
  private isEngaged: boolean = false;

  constructor(options?: ReverseLatchOptions) {
    this.engageDelaySeconds = options?.engageDelaySeconds ?? 0.3;
    this.stoppedSpeedThreshold = options?.stoppedSpeedThreshold ?? 0.5;
  }

  /**
   * Update the latch state and emit the current brake/reverse intent.
   *
   * @param downHeld - whether the brake key is currently held
   * @param upHeld - whether the forward key is currently held
   * @param forwardSpeed - the car's current forward velocity (world units/s)
   * @param deltaSeconds - time since last update (clamped to [0, ∞))
   * @returns current brake and reverse values to emit
   */
  update(
    downHeld: boolean,
    upHeld: boolean,
    forwardSpeed: number,
    deltaSeconds: number,
  ): DriveIntent {
    // Up key always disengages immediately; driver asking to go forward wins.
    if (upHeld) {
      this.isEngaged = false;
      this.dwellSeconds = 0;
      return { brake: 0, reverse: 0 };
    }

    // Down key not held: disengage and let go.
    if (!downHeld) {
      this.isEngaged = false;
      this.dwellSeconds = 0;
      return { brake: 0, reverse: 0 };
    }

    // Down is held. Ignore non-finite or negative deltas to avoid poisoning the timer.
    const safeDelta = Number.isFinite(deltaSeconds) && deltaSeconds >= 0 ? deltaSeconds : 0;

    // Car is rolling forward: brake to hold it, reset dwell timer, and disengage.
    if (forwardSpeed > this.stoppedSpeedThreshold) {
      this.dwellSeconds = 0;
      this.isEngaged = false;
      return { brake: 1, reverse: 0 };
    }

    // Car is stopped (or reversing). Down is held.
    // Accumulate dwell time; decide whether to engage.
    if (!this.isEngaged) {
      this.dwellSeconds += safeDelta;
      if (this.dwellSeconds >= this.engageDelaySeconds) {
        // Reached the delay; engage reverse and emit it.
        this.isEngaged = true;
        return { brake: 0, reverse: 1 };
      }
      // Still building up; hold the brake.
      return { brake: 1, reverse: 0 };
    }

    // Already engaged; keep emitting reverse while down is held.
    return { brake: 0, reverse: 1 };
  }

  /**
   * Current engagement state. True means reverse is active and will be emitted.
   */
  get engaged(): boolean {
    return this.isEngaged;
  }

  /**
   * Reset all state: clear the dwell timer and disengage.
   * Used on vehicle respawn or scene restart.
   */
  reset(): void {
    this.dwellSeconds = 0;
    this.isEngaged = false;
  }
}
