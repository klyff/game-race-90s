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
  SPLASH: 'splash',
  RACE: 'race',
  HUD: 'hud',
} as const;
export type SceneKey = (typeof SCENE_KEY)[keyof typeof SCENE_KEY];

/** Cache key of the generated car manifest. */
export const CAR_MANIFEST_KEY = 'cars-manifest';

/** Where `npm run gen:sprites` writes its output, relative to the served root. */
export const CAR_ASSET_DIRECTORY = 'assets/cars';

/** Where the authored (non-generated) interface art lives, relative to the served root. */
export const UI_ASSET_DIRECTORY = 'assets/ui';

/** Texture key of the splash artwork. */
export const SPLASH_ART_KEY = 'splash-art';

/** Filename of the splash artwork inside `UI_ASSET_DIRECTORY`. */
export const SPLASH_ART_FILE = 'splash.jpeg';

/**
 * Which car the player drives when nobody chose one.
 *
 * `SplashScene` now picks the car and passes it on, so this is the fallback for entering
 * `RaceScene` directly — which the screenshot harness does. `marauder` is the balanced
 * baseline, so it is the right car to land on by default.
 */
export const PLAYER_CAR_ID = 'marauder';

/** The only circuit in v1 (T-008). */
export const DEFAULT_TRACK_ID = 'thunder-basin';
