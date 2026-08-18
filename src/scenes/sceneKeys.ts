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
  GARAGE: 'garage',
  PLANET_SELECT: 'planet-select',
  TRACK_SELECT: 'track-select',
  RACE: 'race',
  HUD: 'hud',
  RESULTS: 'results',
  PAUSE: 'pause',
  HELP: 'help',
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

export function camerasCacheKey(trackId: string): string {
  return `track-cameras:${trackId}`;
}

/** Where `npm run gen:cameras` writes its output, relative to the served root. */
export const CAMERAS_ASSET_DIRECTORY = 'assets/cameras';

export function trapsCacheKey(trackId: string): string {
  return `track-traps:${trackId}`;
}

/** Where `npm run gen:traps` writes its output, relative to the served root. */
export const TRAPS_ASSET_DIRECTORY = 'assets/traps';

/** Where `npm run gen:sprites` writes its output, relative to the served root. */
export const CAR_ASSET_DIRECTORY = 'assets/cars';

/** Drop folder for new-fleet heroes (`car_1_hero.png`). Strips are `car_1_strip.png`. */
export const NEW_CARS_DIRECTORY = `${CAR_ASSET_DIRECTORY}/new`;

/** Where the authored (non-generated) interface art lives, relative to the served root. */
export const UI_ASSET_DIRECTORY = 'assets/ui';

/** Per-planet area-select illustrations, relative to the served root. */
export const PLANET_ART_DIRECTORY = 'assets/ui/planets';

/** Seamless off-road ground tiles, relative to the served root. */
export const GROUND_ASSET_DIRECTORY = 'assets/ground';

/** Where owner-provided weapon art (missile / oil / mine) lives, relative to the served root. */
export const WEAPON_ASSET_DIRECTORY = 'assets/weapons';

/** Single-frame isometric HUD icons (turbo, missile, mine, oil, jump). */
export const HUD_ICON_DIRECTORY = `${UI_ASSET_DIRECTORY}/hud`;

export const HUD_ICONS = [
  { key: 'hud-turbo', file: 'hud-turbo.png' },
  { key: 'hud-missile', file: 'hud-missile.png' },
  { key: 'hud-mine', file: 'hud-mine.png' },
  { key: 'hud-oil', file: 'hud-oil.png' },
  { key: 'hud-jump', file: 'hud-jump.png' },
] as const;

export const HUD_TURBO_KEY = 'hud-turbo';
export const HUD_MISSILE_KEY = 'hud-missile';
export const HUD_MINE_KEY = 'hud-mine';
export const HUD_OIL_KEY = 'hud-oil';
export const HUD_JUMP_KEY = 'hud-jump';

/** Dirty red gasoline barrel still, used as a world hazard. */
export const GASOLINE_SPRITE_KEY = 'world-gasoline';
export const GASOLINE_SPRITE_FILE = 'world-gasoline.png';

/** Optional isometric world props. Missing files fall back to HUD still / geometry. */
export const TRAP_CRATE_KEY = 'trap-crate';
export const TRAP_CRATE_FILE = 'crate.png';
export const TRAP_GASOLINE_KEY = 'trap-gasoline';
export const TRAP_GASOLINE_FILE = 'gasoline.png';

export const WOOD_CHIP_SPRITES = [1, 2, 3, 4, 5, 6].map(n => ({
  key: `trap-wood-chip-${String(n).padStart(2, '0')}`,
  file: `wood-chip-${String(n).padStart(2, '0')}.png`,
}));

/** Where the metal-scrap pieces live (`scrap-01.png` …). */
export const DEBRIS_ASSET_DIRECTORY = 'assets/debris';

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
  { key: 'weapon-turbo', file: 'turbo.png' },
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
export const TURBO_SPRITE_KEY = 'weapon-turbo';

/** Texture key of the splash artwork. */
export const SPLASH_ART_KEY = 'splash-art';

/** Filename of the splash artwork inside `UI_ASSET_DIRECTORY`. */
export const SPLASH_ART_FILE = 'splash.jpeg';

export const GARAGE_ART_KEY = 'garage-art';
export const GARAGE_ART_FILE = 'garage.png';

/** Pixel size of the garage hero still (`car-16_300px.png`). */
export const CART_PORTRAIT_SIZE = 300;

/**
 * Which car the player drives when nobody chose one.
 *
 * `SplashScene` now picks the car and passes it on, so this is the fallback for entering
 * `RaceScene` directly — which the screenshot harness does. `car-1` is the balanced
 * Thunder Basin titular, so it is the right car to land on by default.
 */
export const PLAYER_CAR_ID = 'car-1';

/** The only circuit in v1 (T-008). */
export const DEFAULT_TRACK_ID = 'thunder-basin';
