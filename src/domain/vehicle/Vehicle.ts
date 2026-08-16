import type { Vec2 } from '../math/Vec2.ts';

/**
 * Everything the integrator needs to advance one car. Deliberately plain data:
 * a step is a pure function of (state, input, stats, surface), which is what
 * makes the physics deterministic and testable without a renderer.
 */
export interface VehicleState {
  readonly position: Vec2;
  /** World-space velocity. NOT along the heading — the gap between the two is drift. */
  readonly velocity: Vec2;
  /** Facing, radians. 0 points along +X. */
  readonly heading: number;
  /**
   * Extra yaw rate imposed on the car regardless of driver input, radians/s.
   * Set by weapon hits to produce a spinout; decays on its own.
   */
  readonly yawSpin: number;
}

/** Ground conditions under the car, supplied by whoever knows about the track. */
export interface SurfaceConditions {
  /** Multiplies the tyres' grip limit. 1 on the racing surface, less off it. */
  readonly gripMultiplier: number;
  /** Constant deceleration from the surface, world units/s². */
  readonly rollingResistance: number;
}

/**
 * Read-only view of what the tyres did this step. Feeds the debug overlay and
 * the tuning tests; the simulation itself never branches on it.
 */
export interface VehicleTelemetry {
  readonly speed: number;
  /** Velocity component along the heading. Negative when reversing. */
  readonly forwardSpeed: number;
  /** Velocity component across the heading. Non-zero means the car is sliding. */
  readonly lateralSpeed: number;
  /** Angle between where the car points and where it is going, radians. */
  readonly slipAngle: number;
  /** True once the tyres saturated and stopped resisting the slide. */
  readonly isSliding: boolean;
  /** How much lateral grip is in use, 0..1. Reaches 1 exactly when sliding. */
  readonly gripUsage: number;
}

export interface VehicleStepResult {
  readonly state: VehicleState;
  readonly telemetry: VehicleTelemetry;
}

export function createVehicleState(position: Vec2, heading: number): VehicleState {
  return { position, velocity: { x: 0, y: 0 }, heading, yawSpin: 0 };
}
