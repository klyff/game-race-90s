import { TARMAC_ROLLING_RESISTANCE } from '../constants.ts';
import { sanitizeInput } from '../input/InputCommand.ts';
import type { InputCommand } from '../input/InputCommand.ts';
import { dot, fromAngle, scale } from '../math/Vec2.ts';
import { TURBO_SPEED_BONUS } from '../vehicle/TurboCharges.ts';
import type { VehicleState } from '../vehicle/Vehicle.ts';
import type { VehicleStats } from '../vehicle/VehicleStats.ts';
import { JUMP_HEIGHT_SCALE, type RampIncline, type RampZone } from './RampZone.ts';

/**
 * How much the car's contact sum adds to the zone's fixed launchSpeed.
 * One feel knob — not per-ramp data.
 */
export const LAUNCH_CAR_SCALE = 10;

/** Extra XY speed per unit of (positive) carForce, as a fraction. */
export const LAUNCH_HORIZ_SCALE = 0.25;

/** Backward shove when the ramp wins, world units/s. */
export const RAMP_REJECT_SPEED = 16;

/** Raw integrity lost on a 20° hot landing, before armor. */
export const RAMP_LANDING_DAMAGE = 0.04;

/** Seconds of NEUTRAL_INPUT after a 20° hot landing. */
export const RAMP_LANDING_STUN_SECONDS = 1;

/** Speed band that, with nitro burning, unlocks the hot table. */
export const HOT_APPROACH_FRAC = 0.85;

export const HOT_STEEP_HEIGHT_BONUS = 0.5;
export const HOT_STEEP_RANGE_BONUS = 0.25;
export const HOT_FLAT_HEIGHT_BONUS = 0.1;
export const HOT_FLAT_RANGE_BONUS = 0.4;
export const AIR_TURBO_HEIGHT_BONUS = 0.05;
export const AIR_TURBO_RANGE_BONUS = 0.1;

export interface RampArcadeBonus {
  readonly height: number;
  readonly range: number;
}

export type RampContactResult =
  | { readonly kind: 'launch'; readonly state: VehicleState; readonly hot: boolean }
  | { readonly kind: 'reject'; readonly state: VehicleState };

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function heightSpeedScale(heightBonus: number): number {
  return Math.sqrt(1 + heightBonus);
}

function rangeScale(rangeBonus: number): number {
  return 1 + rangeBonus;
}

/** Minimum forwardSpeed / maxSpeed to climb this lip. 20° → 0.20. */
export function minClimbFraction(incline: RampIncline): number {
  return incline / 100;
}

export function isHotApproach(
  forwardSpeed: number,
  maxSpeed: number,
  turboActive: boolean,
): boolean {
  const ceiling = Number.isFinite(maxSpeed) && maxSpeed > 0 ? maxSpeed : 1;
  return turboActive && forwardSpeed >= HOT_APPROACH_FRAC * ceiling;
}

export function rampArcadeBonus(incline: RampIncline, hot: boolean): RampArcadeBonus {
  if (!hot) {
    return { height: 0, range: 0 };
  }
  if (incline === 20) {
    return { height: HOT_STEEP_HEIGHT_BONUS, range: HOT_STEEP_RANGE_BONUS };
  }
  return { height: HOT_FLAT_HEIGHT_BONUS, range: HOT_FLAT_RANGE_BONUS };
}

/** Arc length just past the lip — the void-wreck respawn line. */
export function rampRespawnDistance(zone: RampZone): number {
  return zone.triggerDistance + zone.triggerLength;
}

/**
 * Longitudinal accel at this instant, same terms `stepVehicle` uses on tarmac:
 * throttle × enginePower − drag − rolling − brakes, reverse when no throttle.
 */
export function forwardAccelAtContact(
  state: VehicleState,
  stats: VehicleStats,
  command: InputCommand,
): number {
  const input = sanitizeInput(command);
  const forward = fromAngle(state.heading);
  const forwardSpeed = dot(state.velocity, forward);
  const netThrust = stats.enginePower - TARMAC_ROLLING_RESISTANCE;
  const dragK =
    netThrust > 0 && stats.maxSpeed > 0 ? netThrust / (stats.maxSpeed * stats.maxSpeed) : 0;
  const drag = dragK * forwardSpeed * Math.abs(forwardSpeed);
  const resistance = Math.sign(forwardSpeed) * TARMAC_ROLLING_RESISTANCE;
  const braking = Math.sign(forwardSpeed) * input.brake * stats.brakeForce;
  const effectiveReverse = input.throttle > 0 ? 0 : input.reverse;
  const reverseThrust = -stats.enginePower * effectiveReverse;
  return input.throttle * stats.enginePower + reverseThrust - drag - resistance - braking;
}

export function carForceAtContact(
  state: VehicleState,
  stats: VehicleStats,
  command: InputCommand,
  turboActive: boolean,
): number {
  const maxSpeed = Number.isFinite(stats.maxSpeed) && stats.maxSpeed > 0 ? stats.maxSpeed : 1;
  const power = Number.isFinite(stats.enginePower) && stats.enginePower > 0 ? stats.enginePower : 1;
  const forwardSpeed = dot(state.velocity, fromAngle(state.heading));
  const speedFrac = forwardSpeed / maxSpeed;
  const accelFrac = clamp(forwardAccelAtContact(state, stats, command) / power, -1, 1);
  const turboTerm = turboActive ? TURBO_SPEED_BONUS : 0;
  return speedFrac + accelFrac + turboTerm;
}

function applyHorizontalSpeed(state: VehicleState, targetForward: number): VehicleState {
  const forward = fromAngle(state.heading);
  const forwardSpeed = dot(state.velocity, forward);
  if (forwardSpeed <= 0 || targetForward <= 0) {
    return { ...state, velocity: scale(forward, targetForward) };
  }
  return { ...state, velocity: scale(state.velocity, targetForward / forwardSpeed) };
}

/**
 * First grounded frame in a ramp zone. LaunchSpeed is the floor; the car's
 * speed, accel and turbo at contact are added. Hot bonuses apply after that
 * sum, and only when both axes would already launch positive.
 */
export function resolveRampContact(
  state: VehicleState,
  zone: RampZone,
  stats: VehicleStats,
  command: InputCommand,
  turboActive: boolean,
): RampContactResult {
  const forward = fromAngle(state.heading);
  const forwardSpeed = dot(state.velocity, forward);
  const maxSpeed = Number.isFinite(stats.maxSpeed) && stats.maxSpeed > 0 ? stats.maxSpeed : 1;
  const speedFrac = forwardSpeed / maxSpeed;
  const carForce = carForceAtContact(state, stats, command, turboActive);
  const vertRaw = zone.launchSpeed + LAUNCH_CAR_SCALE * carForce;
  const horizRaw = forwardSpeed * (1 + LAUNCH_HORIZ_SCALE * Math.max(0, carForce));

  const tooSlow = speedFrac < minClimbFraction(zone.inclineDegrees);
  if (tooSlow || vertRaw <= 0 || horizRaw <= 0) {
    return {
      kind: 'reject',
      state: {
        ...state,
        velocity: scale(forward, -RAMP_REJECT_SPEED),
        height: 0,
        verticalVelocity: 0,
      },
    };
  }

  const hot = isHotApproach(forwardSpeed, maxSpeed, turboActive);
  const bonus = rampArcadeBonus(zone.inclineDegrees, hot);
  const launched = applyHorizontalSpeed(
    {
      ...state,
      height: 0,
      verticalVelocity: vertRaw * JUMP_HEIGHT_SCALE * heightSpeedScale(bonus.height),
    },
    horizRaw * rangeScale(bonus.range),
  );
  return { kind: 'launch', state: launched, hot };
}

/** Once-per-flight mid-air turbo kick. Hop never calls this. */
export function applyAirTurboKick(state: VehicleState): VehicleState {
  const vScale = heightSpeedScale(AIR_TURBO_HEIGHT_BONUS);
  const hScale = rangeScale(AIR_TURBO_RANGE_BONUS);
  return {
    ...state,
    verticalVelocity: state.verticalVelocity * vScale,
    velocity: scale(state.velocity, hScale),
  };
}
