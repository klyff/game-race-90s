/**
 * Shared simulation and presentation constants.
 *
 * Every string used in a condition or a switch is declared here as a frozen
 * `as const` object so that it is a single source of truth across modules.
 * Enums are deliberately avoided: the sources run under Node's native type
 * stripping (`erasableSyntaxOnly`), which forbids non-erasable syntax.
 */

/** Fixed simulation step. The renderer may run at any frame rate. */
export const SIMULATION_HZ = 60;
export const SIMULATION_STEP_SECONDS = 1 / SIMULATION_HZ;

/**
 * Handling model constants shared by every car. Per-car character lives in
 * `VehicleStats`; these are the knobs that define the *game's* feel, and they
 * are centralised so tuning is one file rather than a hunt through call sites.
 */

/**
 * How hard the tyres resist sideways motion, per second, before saturating.
 * Together with a car's `grip` this sets the drift threshold: the tyres let go
 * above a lateral speed of `grip / LATERAL_GRIP_STIFFNESS`.
 */
export const LATERAL_GRIP_STIFFNESS = 12;

/**
 * Speed at which steering reaches full authority, world units/s. Below it,
 * steering scales down — a stationary car cannot pivot on the spot.
 */
export const STEERING_AUTHORITY_SPEED = 8;

/** Deceleration from the racing surface, world units/s². */
export const TARMAC_ROLLING_RESISTANCE = 2;

/** Deceleration off the racing surface. Punishes cutting corners. */
export const OFFROAD_ROLLING_RESISTANCE = 16;

/** Grip multiplier off the racing surface. */
export const OFFROAD_GRIP_MULTIPLIER = 0.55;

/** How fast a weapon-induced spin decays, as a fraction retained per second. */
export const YAW_SPIN_DECAY_PER_SECOND = 0.12;

/**
 * Hard ceiling on speed as a multiple of a car's `maxSpeed`. Drag already sets
 * the top speed under power; this only bounds pathological cases such as being
 * launched by a collision.
 */
export const OVERSPEED_ALLOWANCE = 1.2;

/** Fraction of a car's `maxSpeed` it can reach travelling in reverse. */
export const REVERSE_SPEED_FRACTION = 0.35;


/**
 * Isometric projection, shared by the runtime renderer and the offline sprite
 * generator. Both MUST use these numbers, otherwise pre-rendered cars stop
 * matching the ground plane they drive on.
 *
 *   screenX = (x - y) * ISO_X
 *   screenY = (x + y) * ISO_Y - z * ISO_Z
 */
export const ISO_X = 1;
export const ISO_Y = 0.5;
export const ISO_Z = 0.85;

/** Number of pre-rendered yaw frames per car sprite sheet. */
export const CAR_SPRITE_FRAMES = 32;
export const CAR_SPRITE_FRAME_ARC = (Math.PI * 2) / CAR_SPRITE_FRAMES;

/** Pixel size of one car sprite frame. */
export const CAR_FRAME_WIDTH = 64;
export const CAR_FRAME_HEIGHT = 64;

export const RACE_PHASE = {
  COUNTDOWN: 'countdown',
  RACING: 'racing',
  FINISHED: 'finished',
} as const;
export type RacePhase = (typeof RACE_PHASE)[keyof typeof RACE_PHASE];

export const PALETTE_ROLE = {
  BODY: 'body',
  ACCENT: 'accent',
  GLASS: 'glass',
  TIRE: 'tire',
  LIGHT: 'light',
} as const;
export type PaletteRole = (typeof PALETTE_ROLE)[keyof typeof PALETTE_ROLE];

export const SHADE_STEP = {
  HIGHLIGHT: 'highlight',
  BASE: 'base',
  SHADE: 'shade',
  DARK: 'dark',
} as const;
export type ShadeStep = (typeof SHADE_STEP)[keyof typeof SHADE_STEP];

/**
 * A car's one signature advantage. Only the id travels as data (through
 * `cars.json` and the authoring files in `tools/spritegen/cars/`); the
 * tunable numbers behind each perk live in `src/domain/vehicle/CarPerk.ts`.
 * Keeping the id and the tuning separate is what lets `cars.json` stay small
 * and lets the tunables be unit-tested without touching car art at all.
 */
export const CAR_PERK = {
  BULLDOZER: 'bulldozer',
  OFF_ROAD_ACE: 'off-road-ace',
  ANVIL: 'anvil',
  SLIPSTREAM: 'slipstream',
  TRENCH_GRIP: 'trench-grip',
  ARSENAL: 'arsenal',
  WAR_TANK: 'war-tank',
  TURBO: 'turbo',
} as const;
export type CarPerkId = (typeof CAR_PERK)[keyof typeof CAR_PERK];

/**
 * Extra engine power and top speed a car gets on its home planet, before the
 * 0.9 / 0.7 world-advantage fraction is applied. 0.20 × 0.9 = +18% for a
 * titular; 0.20 × 0.7 = +14% for a reserva. Visitors get nothing.
 */
export const HOME_WORLD_STAT_BONUS = 0.2;

/** Titular (featured) vs reserva advantage on a home planet. */
export const WORLD_ADVANTAGE = {
  PRIMARY: 0.9,
  SECONDARY: 0.7,
} as const;
export type WorldAdvantage = (typeof WORLD_ADVANTAGE)[keyof typeof WORLD_ADVANTAGE];
