/**
 * Physical identity of a car. Authored once per car model alongside its art
 * (see `tools/spritegen/cars/*.car.ts`) and consumed by `ArcadeCarPhysics`.
 *
 * Units are deliberately loose "arcade" units: world units per second, and
 * forces expressed as accelerations (already divided by mass where it matters).
 * The goal is a feel, not a simulation.
 */
export interface VehicleStats {
  /** Relative mass. Only used for collision impulse exchange. */
  readonly mass: number;
  /** Forward acceleration at full throttle, world units/s². */
  readonly enginePower: number;
  /** Deceleration while braking, world units/s². */
  readonly brakeForce: number;
  /** Hard speed ceiling, world units/s. */
  readonly maxSpeed: number;
  /**
   * Maximum lateral acceleration the tyres can produce, world units/s².
   * Once the required lateral force exceeds this, the car slides — this single
   * clamp is what produces the signature arcade drift.
   */
  readonly grip: number;
  /** Steering rate at standstill, radians/s. */
  readonly steerRate: number;
  /** How much steering authority is lost at top speed, 0..1. */
  readonly steerSpeedFalloff: number;
  /** Spinout resistance when hit, 0..1. Higher shrugs off weapons. */
  readonly armor: number;
  /** Maximum carried rounds per weapon. */
  readonly ammoCapacity: number;
  /** Collision circle radius, world units. */
  readonly collisionRadius: number;
}
