import {
  LATERAL_GRIP_STIFFNESS,
  OFFROAD_GRIP_MULTIPLIER,
  OFFROAD_ROLLING_RESISTANCE,
  OVERSPEED_ALLOWANCE,
  REVERSE_SPEED_FRACTION,
  STEERING_AUTHORITY_SPEED,
  TARMAC_ROLLING_RESISTANCE,
  YAW_SPIN_DECAY_PER_SECOND,
} from '../constants.ts';
import { sanitizeInput } from '../input/InputCommand.ts';
import type { InputCommand } from '../input/InputCommand.ts';
import { dot, fromAngle, length, perpendicularLeft } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';
import type {
  SurfaceConditions,
  VehicleState,
  VehicleStepResult,
  VehicleTelemetry,
} from './Vehicle.ts';
import type { VehicleStats } from './VehicleStats.ts';

export const TARMAC: SurfaceConditions = {
  gripMultiplier: 1,
  rollingResistance: TARMAC_ROLLING_RESISTANCE,
};

export const OFFROAD: SurfaceConditions = {
  gripMultiplier: OFFROAD_GRIP_MULTIPLIER,
  rollingResistance: OFFROAD_ROLLING_RESISTANCE,
};

/** A car mid-jump touches nothing: no tyre grip, no rolling resistance
 * (T-050). Steering and drag (a function of the car alone, decision 11)
 * still apply — only what the ground would have supplied is zeroed. */
export const AIRBORNE_SURFACE: SurfaceConditions = {
  gripMultiplier: 0,
  rollingResistance: 0,
};

/**
 * Quadratic drag coefficient that makes a car's authored `maxSpeed` its actual
 * terminal speed on the racing surface.
 *
 * At full throttle and steady state on tarmac:
 *   enginePower - TARMAC_ROLLING_RESISTANCE - k*v² = 0
 * Solving for k at v = maxSpeed removes the need for a separate drag stat and
 * for an artificial speed clamp — `maxSpeed` means what it says, and top speed
 * is approached asymptotically rather than by hitting a wall.
 *
 * Deliberately a function of the CAR ONLY, never of the current surface. Drag is
 * the car's aerodynamics; it does not change when the car leaves the track.
 * Folding the surface in here looks harmless and silently cancels the entire
 * off-road penalty: a bigger rolling resistance would reduce the derived drag by
 * exactly the same amount, leaving terminal speed at `maxSpeed` everywhere.
 */
function dragCoefficient(stats: VehicleStats): number {
  const netThrust = stats.enginePower - TARMAC_ROLLING_RESISTANCE;
  if (netThrust <= 0) return 0;
  return netThrust / (stats.maxSpeed * stats.maxSpeed);
}

/**
 * Reverse thrust: the engine's FULL force, limited by gearing rather than by force.
 *
 * The obvious model — derive a small constant reverse power that happens to make
 * `REVERSE_SPEED_FRACTION * maxSpeed` the terminal speed on tarmac — was tried and is
 * wrong. It gives the Marauder 5.92 u/s² in reverse against tarmac's rolling resistance
 * of 2, which works, and against off-road's 16, which does not: **reverse stopped
 * existing the moment the car left the track**, measured at 0.05 u/s after a full second
 * on dirt for every one of the five cars. That is precisely where reverse matters, since
 * a driver reaches for it after sliding off and beaching on a wall. Forward drive never
 * had the problem because 34 comfortably beats 16.
 *
 * A real car is not short of force in reverse; it is short of GEARING. So the force here
 * is the same `enginePower` as forward, tapered linearly to zero as the car approaches its
 * reverse speed limit. Consequences, all intended:
 *   - a stopped car backs up immediately on any surface (dirt gets 34 - 16 = 18 u/s²);
 *   - the off-road penalty survives intact — reverse on dirt is much slower than on
 *     tarmac, rather than being exempted from it (decision 11);
 *   - the limit is approached asymptotically instead of by hitting a clamp, exactly as
 *     `maxSpeed` is for forward drive.
 *
 * Terminal reverse on tarmac lands slightly under the nominal fraction (~30% of `maxSpeed`
 * rather than 35%) because resistance and drag still oppose the taper near the limit.
 * `REVERSE_SPEED_FRACTION` is therefore a ceiling the car creeps towards, not an exact
 * measured speed — T-021's "exactly 35.0%" no longer holds and should not be re-asserted.
 */
function reverseThrustFor(stats: VehicleStats, forwardSpeed: number): number {
  const speedLimit = REVERSE_SPEED_FRACTION * stats.maxSpeed;
  if (speedLimit <= 0) return 0;
  const reverseSpeed = Math.max(0, -forwardSpeed);
  const taper = Math.max(0, 1 - reverseSpeed / speedLimit);
  return stats.enginePower * taper;
}

/**
 * Advances one car by `dt` seconds. Pure: same inputs, same output, always.
 *
 * THE MODEL, and where the game's feel comes from:
 *
 * Velocity is kept in WORLD space, never rebuilt from the heading. Each step the
 * tyres are asked to produce a sideways force that pulls velocity back in line
 * with where the car points, and that force is CLAMPED at the car's `grip`.
 * Under the clamp the car corners cleanly. Once a corner demands more than the
 * clamp allows, the excess sideways velocity simply survives into the next step
 * — the car slides while continuing to rotate. That one clamp is the whole drift
 * mechanic; there is no separate "drift mode" to enter or exit.
 *
 * Steering is kinematic (heading is integrated from a yaw rate) rather than
 * torque-based. For an arcade racer that is the right trade: it responds
 * immediately, and the interesting behaviour lives in the tyre clamp instead.
 */
export function stepVehicle(
  state: VehicleState,
  rawInput: InputCommand,
  stats: VehicleStats,
  surface: SurfaceConditions,
  dt: number,
): VehicleStepResult {
  const input = sanitizeInput(rawInput);

  const forward = fromAngle(state.heading);
  const left = perpendicularLeft(forward);
  const forwardSpeed = dot(state.velocity, forward);
  const lateralSpeed = dot(state.velocity, left);
  const speed = length(state.velocity);

  // --- Steering -------------------------------------------------------------
  // Authority ramps in with speed so a stationary car cannot pivot, and falls
  // off again at high speed by the car's own `steerSpeedFalloff`.
  const authority = Math.min(1, Math.abs(forwardSpeed) / STEERING_AUTHORITY_SPEED);
  const speedFraction = Math.min(1, Math.abs(forwardSpeed) / stats.maxSpeed);
  const steerRate = stats.steerRate * (1 - stats.steerSpeedFalloff * speedFraction);
  // Throttle wins over reverse: any accelerator input zeroes reverse thrust
  // outright, rather than the two fighting or the input layer having to
  // arbitrate. This is also what lets a player tap Up to escape while backing
  // up, and means a reverse key stuck down can never fight the accelerator.
  const effectiveReverse = input.throttle > 0 ? 0 : input.reverse;
  // Mirror steering only while the driver is actually in reverse. A hop, oil
  // spin or wall bounce can make forwardSpeed dip negative for a few frames;
  // flipping the wheel on that sign made left become right and front look like
  // reverse. Sliding backwards after a hit keeps the same steer as forward.
  const travelSign = effectiveReverse > 0 ? -1 : 1;
  const driverYawRate = input.steer * steerRate * authority * travelSign;

  // --- Longitudinal force --------------------------------------------------
  const drag = dragCoefficient(stats) * forwardSpeed * Math.abs(forwardSpeed);
  const resistance = Math.sign(forwardSpeed) * surface.rollingResistance;
  const braking = Math.sign(forwardSpeed) * input.brake * stats.brakeForce;
  const reverseThrust = -reverseThrustFor(stats, forwardSpeed) * effectiveReverse;
  let forwardAcceleration =
    input.throttle * stats.enginePower + reverseThrust - drag - resistance - braking;

  // Rolling resistance and brakes must stop the car, never reverse it — but
  // that guard only applies when the driver asks for NO drive at all. With
  // reverse held, `forwardAcceleration` is intentionally driving the car
  // negative and must be allowed through, or a stopped car could never back up.
  const noDriveRequested = input.throttle === 0 && effectiveReverse === 0;
  if (noDriveRequested && Math.abs(forwardSpeed) < Math.abs(forwardAcceleration * dt)) {
    forwardAcceleration = -forwardSpeed / dt;
  }

  // --- Lateral force: the grip clamp ---------------------------------------
  const gripLimit = stats.grip * surface.gripMultiplier;
  const demandedLateral = -lateralSpeed * LATERAL_GRIP_STIFFNESS;
  const gripUsage = gripLimit > 0 ? Math.min(1, Math.abs(demandedLateral) / gripLimit) : 1;
  const isSliding = Math.abs(demandedLateral) > gripLimit;
  const lateralAcceleration = isSliding
    ? Math.sign(demandedLateral) * gripLimit
    : demandedLateral;

  // --- Integrate ------------------------------------------------------------
  const acceleration: Vec2 = {
    x: forward.x * forwardAcceleration + left.x * lateralAcceleration,
    y: forward.y * forwardAcceleration + left.y * lateralAcceleration,
  };

  let velocity: Vec2 = {
    x: state.velocity.x + acceleration.x * dt,
    y: state.velocity.y + acceleration.y * dt,
  };

  // Safety net for collision launches, not the normal top-speed mechanism.
  const ceiling = stats.maxSpeed * OVERSPEED_ALLOWANCE;
  const newSpeed = length(velocity);
  if (newSpeed > ceiling) {
    const factor = ceiling / newSpeed;
    velocity = { x: velocity.x * factor, y: velocity.y * factor };
  }

  const yawSpin = state.yawSpin * Math.pow(YAW_SPIN_DECAY_PER_SECOND, dt);
  const heading = normalizeAngle(state.heading + (driverYawRate + yawSpin) * dt);

  const nextState: VehicleState = {
    position: {
      x: state.position.x + velocity.x * dt,
      y: state.position.y + velocity.y * dt,
    },
    velocity,
    heading,
    yawSpin,
    // Height and verticalVelocity are gravity's job, not this function's —
    // `integrateAirborne` (called around this from `stepVehicleOnTrack`)
    // owns them so a car's airtime is orthogonal to its ground physics.
    height: state.height,
    verticalVelocity: state.verticalVelocity,
  };

  const telemetry: VehicleTelemetry = {
    speed,
    forwardSpeed,
    lateralSpeed,
    slipAngle: Math.atan2(lateralSpeed, Math.abs(forwardSpeed)),
    isSliding,
    gripUsage,
  };

  return { state: nextState, telemetry };
}

/** Folds an angle into (-PI, PI] so headings cannot drift towards huge values. */
export function normalizeAngle(radians: number): number {
  const twoPi = Math.PI * 2;
  let angle = radians % twoPi;
  if (angle > Math.PI) angle -= twoPi;
  if (angle <= -Math.PI) angle += twoPi;
  return angle;
}

/** Lateral speed at which a car's tyres let go. Useful for tuning and the HUD. */
export function driftThreshold(stats: VehicleStats, surface: SurfaceConditions): number {
  return (stats.grip * surface.gripMultiplier) / LATERAL_GRIP_STIFFNESS;
}
