/**
 * Post-finish coast: a car that has completed its laps lifts off and brakes
 * until it is nearly stopped. Pure so the results ceremony can wait on a
 * number instead of a Phaser tween.
 */

import { IDLE_INPUT } from '../input/InputCommand.ts';
import type { InputCommand } from '../input/InputCommand.ts';

/** Below this speed (world units/s) a coasting car is treated as stopped. */
export const COAST_STOP_SPEED = 1.2;

/** Brake amount while still rolling after the chequered flag. */
export const COAST_BRAKE = 0.75;

/** How long the race holds after the player finishes before the ceremony, seconds. */
export const CEREMONY_HOLD_SECONDS = 5.5;

export function coastInput(speed: number): InputCommand {
  const safe = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  return {
    ...IDLE_INPUT,
    brake: safe > COAST_STOP_SPEED ? COAST_BRAKE : 1,
  };
}

export function isNearlyStopped(speed: number): boolean {
  return !Number.isFinite(speed) || speed < COAST_STOP_SPEED;
}
