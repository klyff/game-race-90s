/**
 * Engine idle shut-off: after the car sits still long enough with no throttle,
 * the motor voice goes silent. Pressing throttle or reverse wakes it again.
 *
 * Pure so the timer can be unit-tested without an AudioContext.
 */

import { COAST_STOP_SPEED } from '../../domain/race/Coast.ts';

/** Seconds of true standstill before the engine note cuts. */
export const ENGINE_IDLE_SHUTOFF_SECONDS = 3.5;

/** Drive input above this counts as "foot on the pedal" and restarts the motor. */
export const ENGINE_RESTART_DRIVE = 0.01;

export interface EngineIdleShutoffState {
  readonly elapsed: number;
  readonly shutOff: boolean;
}

export const ENGINE_IDLE_SHUTOFF_INITIAL: EngineIdleShutoffState = {
  elapsed: 0,
  shutOff: false,
};

export const ENGINE_IDLE_SHUTOFF_PARKED: EngineIdleShutoffState = {
  elapsed: ENGINE_IDLE_SHUTOFF_SECONDS,
  shutOff: true,
};

/**
 * Cut the rumble now: wreck, no telemetry, or already finished and stopped.
 * A live car still sitting in gear uses {@link tickEngineIdleShutoff} instead.
 */
export function shouldParkEngine(input: {
  readonly destroyed: boolean;
  readonly finished: boolean;
  readonly hasTelemetry: boolean;
  readonly speed: number;
  readonly stopSpeed?: number;
}): boolean {
  if (input.destroyed || !input.hasTelemetry) {
    return true;
  }
  const stopSpeed = input.stopSpeed ?? COAST_STOP_SPEED;
  const speed = Number.isFinite(input.speed) ? Math.max(0, input.speed) : 0;
  return input.finished && speed < stopSpeed;
}

/**
 * Advance the idle shut-off timer by one rendered frame.
 *
 * - Throttle or reverse clears shut-off immediately.
 * - Speed at or above {@link COAST_STOP_SPEED} clears the standstill clock.
 * - Otherwise the clock runs; past {@link ENGINE_IDLE_SHUTOFF_SECONDS} the
 *   engine stays off until the next drive input.
 */
export function tickEngineIdleShutoff(
  state: EngineIdleShutoffState,
  speed: number,
  drive: number,
  deltaSeconds: number,
  stopSpeed: number = COAST_STOP_SPEED,
): EngineIdleShutoffState {
  const safeDrive = Number.isFinite(drive) ? Math.max(0, drive) : 0;
  const safeSpeed = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  const dt = Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? deltaSeconds : 0;

  if (safeDrive >= ENGINE_RESTART_DRIVE) {
    return { elapsed: 0, shutOff: false };
  }

  if (safeSpeed >= stopSpeed) {
    return { elapsed: 0, shutOff: state.shutOff };
  }

  const elapsed = state.elapsed + dt;
  if (elapsed >= ENGINE_IDLE_SHUTOFF_SECONDS) {
    return { elapsed: ENGINE_IDLE_SHUTOFF_SECONDS, shutOff: true };
  }
  return { elapsed, shutOff: state.shutOff };
}
