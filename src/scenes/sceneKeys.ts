/**
 * Scene and asset keys.
 *
 * Every string that Phaser looks things up by lives here as a frozen `as const`
 * object rather than being repeated at call sites: a typo in a scene key fails at
 * runtime with an unhelpful message, and `enum` is not available under the
 * project's native type stripping.
 */
export const SCENE_KEY = {
  BOOT: 'boot',
  RACE: 'race',
} as const;
export type SceneKey = (typeof SCENE_KEY)[keyof typeof SCENE_KEY];

/** Cache key of the generated car manifest. */
export const CAR_MANIFEST_KEY = 'cars-manifest';

/** Where `npm run gen:sprites` writes its output, relative to the served root. */
export const CAR_ASSET_DIRECTORY = 'assets/cars';

/**
 * The car the player drives until the car-select screen exists (T-018).
 * `marauder` is the balanced baseline, so it is the right default to tune against.
 */
export const PLAYER_CAR_ID = 'marauder';

/** The only circuit in v1 (T-008). */
export const DEFAULT_TRACK_ID = 'thunder-basin';
