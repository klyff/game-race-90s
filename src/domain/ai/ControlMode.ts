/**
 * Orthogonal driving mode. Recovery is not a tactical candidate.
 *
 * ENTER / EXIT have hysteresis. Every enter logs a reason; "RECOVER" alone is invalid.
 */

import { clamp } from './math.ts';
import { cross, dot, fromAngle } from '../math/Vec2.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';
import type { VehicleState } from '../vehicle/Vehicle.ts';

export const CONTROL_MODE = {
  NORMAL: 'NORMAL',
  DEGRADED: 'DEGRADED',
  RECOVERING: 'RECOVERING',
  RESPAWNING: 'RESPAWNING',
  FINISHED: 'FINISHED',
} as const;

export type ControlMode = (typeof CONTROL_MODE)[keyof typeof CONTROL_MODE];

export const RECOVER_REASON = {
  YAW_SPIN: 'YAW_SPIN',
  OFF_CORRIDOR: 'OFF_CORRIDOR',
  LOW_INTEGRITY: 'LOW_INTEGRITY',
  NO_FORWARD_PROGRESS: 'NO_FORWARD_PROGRESS',
  HEADING_ERROR: 'HEADING_ERROR',
  WEDGED: 'WEDGED',
} as const;

export type RecoverReason = (typeof RECOVER_REASON)[keyof typeof RECOVER_REASON];

const SPIN_ENTER = 4;
const SPIN_EXIT = 1.8;
const INTEGRITY_ENTER = 0.2;
const INTEGRITY_EXIT = 0.28;
const INTEGRITY_DEGRADED = 0.45;
const HEADING_ENTER = 1.35;
const HEADING_EXIT = 0.55;
const STUCK_SPEED = 8;
const STUCK_PROGRESS = 1.8;
const STUCK_SECONDS = 1.25;
const STABLE_SECONDS = 0.4;
const LATERAL_EXIT_FRACTION = 0.82;

export interface ControlFacts {
  readonly finished: boolean;
  readonly integrity: number;
  readonly lateralOffset: number;
  readonly halfWidth: number;
  readonly yawSpin: number;
  readonly headingError: number;
  readonly speed: number;
  readonly progressVelocity: number;
  readonly airborne: boolean;
}

export interface ControlUpdate {
  readonly mode: ControlMode;
  readonly reason: RecoverReason | null;
  readonly reverse: number;
  readonly enter: boolean;
  readonly exit: boolean;
}

export function headingErrorOnTrack(state: VehicleState, spline: TrackSpline, distance: number): number {
  const tangent = spline.frameAt(distance).tangent;
  const heading = fromAngle(state.heading);
  return Math.atan2(cross(tangent, heading), dot(tangent, heading));
}

export function wrappedProgress(previous: number, next: number, trackLength: number): number {
  let delta = next - previous;
  if (delta > trackLength * 0.5) {
    delta -= trackLength;
  } else if (delta < -trackLength * 0.5) {
    delta += trackLength;
  }
  return delta;
}

export class RecoverController {
  mode: ControlMode = CONTROL_MODE.NORMAL;
  reason: RecoverReason | null = null;
  private stuckSeconds = 0;
  private stableSeconds = 0;
  private lastDistance = 0;
  private hasDistance = false;
  private maxSpeedSeen = 0;

  reset(): void {
    this.mode = CONTROL_MODE.NORMAL;
    this.reason = null;
    this.stuckSeconds = 0;
    this.stableSeconds = 0;
    this.hasDistance = false;
    this.maxSpeedSeen = 0;
  }

  step(
    facts: ControlFacts,
    distance: number,
    trackLength: number,
    dt: number,
  ): ControlUpdate {
    const previous = this.mode;
    const progress = this.hasDistance ? wrappedProgress(this.lastDistance, distance, trackLength) : 0;
    this.lastDistance = distance;
    this.hasDistance = true;
    const progressVelocity = dt > 0 ? progress / dt : 0;

    const live: ControlFacts = { ...facts, progressVelocity };
    if (live.finished) {
      this.mode = CONTROL_MODE.FINISHED;
      this.reason = null;
      this.stuckSeconds = 0;
      this.stableSeconds = 0;
      return {
        mode: this.mode,
        reason: null,
        reverse: 0,
        enter: previous !== CONTROL_MODE.FINISHED,
        exit: previous === CONTROL_MODE.RECOVERING,
      };
    }

    if (live.integrity <= 0.02) {
      this.mode = CONTROL_MODE.RESPAWNING;
      this.reason = RECOVER_REASON.LOW_INTEGRITY;
      return {
        mode: this.mode,
        reason: this.reason,
        reverse: 0,
        enter: previous !== CONTROL_MODE.RESPAWNING,
        exit: previous === CONTROL_MODE.RECOVERING,
      };
    }

    this.maxSpeedSeen = Math.max(this.maxSpeedSeen, live.speed);

    if (
      this.maxSpeedSeen > 16 &&
      !live.airborne &&
      live.speed < STUCK_SPEED &&
      progressVelocity < STUCK_PROGRESS
    ) {
      this.stuckSeconds += dt;
    } else if (progressVelocity > STUCK_PROGRESS * 1.5 && live.speed > STUCK_SPEED) {
      this.stuckSeconds = 0;
    } else {
      this.stuckSeconds = Math.max(0, this.stuckSeconds - dt * 0.6);
    }

    const enterReason = enterReasonOf(live, this.stuckSeconds);
    if (this.mode !== CONTROL_MODE.RECOVERING && enterReason !== null) {
      this.mode = CONTROL_MODE.RECOVERING;
      this.reason = enterReason;
      this.stableSeconds = 0;
      return {
        mode: this.mode,
        reason: this.reason,
        reverse: reverseFor(live),
        enter: true,
        exit: false,
      };
    }

    if (this.mode === CONTROL_MODE.RECOVERING) {
      if (exitReady(live, this.stuckSeconds)) {
        this.stableSeconds += dt;
      } else {
        this.stableSeconds = 0;
      }
      if (this.stableSeconds >= STABLE_SECONDS) {
        this.mode = live.integrity < INTEGRITY_DEGRADED ? CONTROL_MODE.DEGRADED : CONTROL_MODE.NORMAL;
        const exited = this.reason;
        this.reason = null;
        this.stuckSeconds = 0;
        this.stableSeconds = 0;
        return {
          mode: this.mode,
          reason: exited,
          reverse: 0,
          enter: false,
          exit: true,
        };
      }
      const current = enterReasonOf(live, this.stuckSeconds) ?? this.reason;
      this.reason = current;
      return {
        mode: this.mode,
        reason: this.reason,
        reverse: reverseFor(live),
        enter: false,
        exit: false,
      };
    }

    this.mode = live.integrity < INTEGRITY_DEGRADED ? CONTROL_MODE.DEGRADED : CONTROL_MODE.NORMAL;
    this.reason = null;
    return {
      mode: this.mode,
      reason: null,
      reverse: 0,
      enter: false,
      exit: previous === CONTROL_MODE.RECOVERING,
    };
  }
}

function enterReasonOf(facts: ControlFacts, stuckSeconds: number): RecoverReason | null {
  if (Math.abs(facts.yawSpin) > SPIN_ENTER) {
    return RECOVER_REASON.YAW_SPIN;
  }
  if (Math.abs(facts.lateralOffset) > facts.halfWidth) {
    return RECOVER_REASON.OFF_CORRIDOR;
  }
  if (facts.integrity < INTEGRITY_ENTER) {
    return RECOVER_REASON.LOW_INTEGRITY;
  }
  if (Math.abs(facts.headingError) > HEADING_ENTER) {
    return RECOVER_REASON.HEADING_ERROR;
  }
  if (stuckSeconds >= STUCK_SECONDS) {
    return Math.abs(facts.headingError) > 0.9 ? RECOVER_REASON.WEDGED : RECOVER_REASON.NO_FORWARD_PROGRESS;
  }
  return null;
}

function exitReady(facts: ControlFacts, stuckSeconds: number): boolean {
  return (
    Math.abs(facts.yawSpin) < SPIN_EXIT &&
    Math.abs(facts.lateralOffset) < facts.halfWidth * LATERAL_EXIT_FRACTION &&
    facts.integrity >= INTEGRITY_EXIT &&
    Math.abs(facts.headingError) < HEADING_EXIT &&
    facts.progressVelocity > STUCK_PROGRESS &&
    stuckSeconds < STUCK_SECONDS * 0.35 &&
    !facts.airborne
  );
}

function reverseFor(facts: ControlFacts): number {
  if (Math.abs(facts.headingError) > 1.15 && facts.speed < 22) {
    return clamp(0.45 + (Math.abs(facts.headingError) - 1.15) * 0.5, 0, 1);
  }
  return 0;
}
