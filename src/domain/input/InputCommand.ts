/**
 * A driver's intent for one simulation step, whatever produced it.
 *
 * The whole point of this type is that `AIDriver` and the keyboard adapter both
 * emit it: NPCs and the human are then indistinguishable to the physics, which
 * is what keeps the AI honest. An NPC cannot cheat by writing velocity directly
 * because it has no way to express that.
 *
 * Weapon keys: missile `C`, oil `Z`, landmine `X`, turbo Left-Shift or `A`. Hop is `Space`.
 * Adapters edge-trigger these so holding a key cannot dump the whole inventory
 * or spend every jump in one frame.
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
  /** Fire a missile. */
  readonly fire: boolean;
  /** Drop an oil slick. */
  readonly dropOil: boolean;
  /** Drop a landmine. */
  readonly dropMine: boolean;
  /** Hop over ground hazards. Ignored while airborne or out of charges. */
  readonly jump: boolean;
  /** Spend one turbo charge. */
  readonly boost: boolean;
}

export const IDLE_INPUT: InputCommand = {
  throttle: 0,
  brake: 0,
  reverse: 0,
  steer: 0,
  fire: false,
  dropOil: false,
  dropMine: false,
  jump: false,
  boost: false,
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
    dropOil: command.dropOil,
    dropMine: command.dropMine,
    jump: command.jump,
    boost: command.boost,
  };
}
