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
  PLANET_SELECT: 'planet-select',
  TRACK_SELECT: 'track-select',
  RACE: 'race',
  HUD: 'hud',
  RESULTS: 'results',
  PAUSE: 'pause',
} as const;
export type SceneKey = (typeof SCENE_KEY)[keyof typeof SCENE_KEY];

/** Cache key of the generated car manifest. */
export const CAR_MANIFEST_KEY = 'cars-manifest';

/** Cache key of a track's offline racing-line search, one per circuit. */
export function linesCacheKey(trackId: string): string {
  return `track-lines:${trackId}`;
}

/** Where `npm run gen:lines` writes its output, relative to the served root. */
export const LINES_ASSET_DIRECTORY = 'assets/lines';

/** Where `npm run gen:sprites` writes its output, relative to the served root. */
export const CAR_ASSET_DIRECTORY = 'assets/cars';

/** Where the authored (non-generated) interface art lives, relative to the served root. */
export const UI_ASSET_DIRECTORY = 'assets/ui';

/** Per-planet area-select illustrations, relative to the served root. */
export const PLANET_ART_DIRECTORY = 'assets/ui/planets';

/** Seamless off-road ground tiles, relative to the served root. */
export const GROUND_ASSET_DIRECTORY = 'assets/ground';

/** Where owner-provided weapon art (missile / oil / mine) lives, relative to the served root. */
export const WEAPON_ASSET_DIRECTORY = 'assets/weapons';

/**
 * Texture keys and filenames for the weapon sprites. These are OPTIONAL: the game
 * boots and plays with geometric fallbacks when the files are absent, and swaps in
 * the art automatically once the owner drops it into `WEAPON_ASSET_DIRECTORY`.
 *
 * Each file is a 4×8 contact sheet (32 yaw frames), same convention as the cars —
 * NOT a single image. Boot loads them as spritesheets so RaceScene can show one
 * frame instead of the whole grid. `npm run gen:weapons` writes the stand-in art.
 */
export const WEAPON_SPRITES = [
  { key: 'weapon-missile', file: 'missile.png' },
  { key: 'weapon-oil', file: 'oil.png' },
  { key: 'weapon-mine', file: 'mine.png' },
] as const;

/** Owner missile sheet is 1774×887; 8×4 of 221 leaves a few leftover pixels. */
export const WEAPON_SHEET = {
  columns: 8,
  rows: 4,
  frameWidth: 221,
  frameHeight: 221,
  frameCount: 32,
} as const;

export const MISSILE_SPRITE_KEY = 'weapon-missile';
export const OIL_SPRITE_KEY = 'weapon-oil';
export const MINE_SPRITE_KEY = 'weapon-mine';

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
