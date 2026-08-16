/**
 * Pure on/off timer for retro blinking text (e.g. "PRESS SPACE TO ROCK'N THE 90s").
 *
 * The 80s/90s arcade cabinet blink was a hard palette flip at a fixed interval, not
 * a fade — a CRT text layer was either drawn or it was not, frame to frame. Modelling
 * `isOn` as a boolean rather than an alpha value keeps the caller honest: it must call
 * `setVisible`, and reaching for `setAlpha` here would read as a modern tween that
 * misses the reference entirely.
 *
 * No Phaser import and no `Date.now()`: time only ever arrives through `advance`,
 * matching this project's rule that wall-clock reads are forbidden so the whole
 * render layer stays deterministic and testable without a browser.
 */
export class BlinkClock {
  private readonly periodSeconds: number;
  private readonly dutyCycle: number;
  private elapsedSeconds = 0;

  constructor(periodSeconds: number, dutyCycle = 0.5) {
    if (!Number.isFinite(periodSeconds) || periodSeconds <= 0) {
      throw new Error(`BlinkClock period must be a positive number, received ${String(periodSeconds)}`);
    }
    if (!Number.isFinite(dutyCycle) || dutyCycle <= 0 || dutyCycle >= 1) {
      throw new Error(`BlinkClock duty cycle must be within (0, 1), received ${String(dutyCycle)}`);
    }
    this.periodSeconds = periodSeconds;
    this.dutyCycle = dutyCycle;
  }

  /**
   * Accumulates elapsed time and wraps it back into `[0, periodSeconds)`.
   *
   * A non-finite or negative `deltaSeconds` (e.g. a NaN frame delta after a tab
   * loses focus) is guarded to 0 rather than corrupting the running phase — one
   * bad frame should never desynchronise every blink after it.
   */
  advance(deltaSeconds: number): void {
    const safeDelta = Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? deltaSeconds : 0;
    this.elapsedSeconds = (this.elapsedSeconds + safeDelta) % this.periodSeconds;
  }

  /** True for the first `dutyCycle` fraction of the period, false for the rest. */
  get isOn(): boolean {
    return this.elapsedSeconds < this.periodSeconds * this.dutyCycle;
  }
}
