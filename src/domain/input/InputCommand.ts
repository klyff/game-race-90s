/**
 * A driver's intent for one simulation step, whatever produced it.
 *
 * The whole point of this type is that `AIDriver` and the keyboard adapter both
 * emit it: NPCs and the human are then indistinguishable to the physics, which
 * is what keeps the AI honest. An NPC cannot cheat by writing velocity directly
 * because it has no way to express that.
 */
export interface InputCommand {
  /** 0..1 */
  readonly throttle: number;
  /** 0..1 */
  readonly brake: number;
  /** 0..1. Ignored by the physics whenever `throttle > 0`; see `ArcadeCarPhysics`. */
  readonly reverse: number;
  /** -1 (full right) .. +1 (full left), matching the left-positive convention. */
  readonly steer: number;
  readonly fire: boolean;
  readonly dropMine: boolean;
}

export const IDLE_INPUT: InputCommand = {
  throttle: 0,
  brake: 0,
  reverse: 0,
  steer: 0,
  fire: false,
  dropMine: false,
};

function clampUnit(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function clampSigned(value: number): number {
  return value < -1 ? -1 : value > 1 ? 1 : value;
}

/** Clamps a command into range. Guards against a misbehaving AI or adapter. */
export function sanitizeInput(command: InputCommand): InputCommand {
  return {
    throttle: clampUnit(command.throttle),
    brake: clampUnit(command.brake),
    reverse: clampUnit(command.reverse),
    steer: clampSigned(command.steer),
    fire: command.fire,
    dropMine: command.dropMine,
  };
}
