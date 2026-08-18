import { CAR_PERK, CAR_SPRITE_FRAMES, WORLD_ADVANTAGE } from '../../domain/constants.ts';
import type { CarPerkId, WorldAdvantage } from '../../domain/constants.ts';
import { collisionBox } from '../../domain/vehicle/CollisionMap.ts';
import type { CollisionBox } from '../../domain/vehicle/CollisionMap.ts';
import type { VehicleStats } from '../../domain/vehicle/VehicleStats.ts';

/**
 * The contract between the offline sprite generator and the runtime.
 *
 * It lives in `src/` rather than in `tools/` on purpose: the game is what needs
 * this data, and `tools/spritegen` merely produces it (`tools/spritegen/schema.ts`
 * re-exports these types). The dependency therefore points from the tool to the
 * product and never the other way round.
 *
 * Written to `public/assets/cars/cars.json` by `npm run gen:sprites`.
 */

/** Metadata emitted for each generated sprite sheet. */
export interface CarSheetManifest {
  readonly id: string;
  readonly displayName: string;
  readonly archetype: string;
  /** Strip filename, relative to the manifest. */
  readonly image: string;
  /** Ground shadow footprint in pixels, centred on the sprite origin. */
  readonly shadow: { readonly width: number; readonly height: number };
  readonly stats: VehicleStats;
  readonly perk?: CarPerkId;
  /** Planet this car is native to. Optional so a fixture can omit it. */
  readonly homePlanetId?: string;
  /** 0.9 titular / 0.7 reserva on the home planet. */
  readonly worldAdvantage?: WorldAdvantage;
  /** Cell size when this strip is not the set default (redrawn cars may be 128). */
  readonly frameWidth?: number;
  readonly frameHeight?: number;
  /** Yaw frames when this strip is not the set default (matrix cars are 30). */
  readonly frameCount?: number;
  /**
   * Public-root path to a matrix strip JSON (`production_scale.frames`).
   * When set, Boot loads `image` as one picture and crops these boxes —
   * not a uniform Phaser spritesheet.
   */
  readonly framesJson?: string;
}

/**
 * Emitted once for the whole car set. Every car shares the frame geometry, the
 * scale and the origin, so relative car sizes are honest and the runtime only
 * needs `pixelsPerUnit` to draw a road that matches the sprites.
 */
export interface CarSetManifest {
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameCount: number;
  /** World units → pixels. The renderer MUST use this to size the track. */
  readonly pixelsPerUnit: number;
  /**
   * Sprite anchor as a fraction of the frame: where the car's local origin
   * (its centre, on the ground) sits. Every frame is anchored identically, so
   * the sprite cannot wobble while the car turns.
   */
  readonly origin: { readonly x: number; readonly y: number };
  readonly cars: readonly CarSheetManifest[];
}

/** Raised when the generated manifest is missing, malformed or inconsistent. */
export class CarManifestError extends Error {
  constructor(message: string) {
    super(`cars.json: ${message}. Run \`npm run gen:sprites\` to regenerate it.`);
    this.name = 'CarManifestError';
  }
}

function requirePositiveNumber(source: Record<string, unknown>, field: string): number {
  const value = source[field];
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new CarManifestError(`"${field}" must be a positive number, received ${String(value)}`);
  }
  return value;
}

function requireObject(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new CarManifestError(`${what} must be an object, received ${String(value)}`);
  }
  return value as Record<string, unknown>;
}

const KNOWN_CAR_PERKS: readonly string[] = Object.values(CAR_PERK);

/**
 * A `perk` key is optional, but if it is present it must name a real perk.
 * Unlike the other fields on `CarSheetManifest`, a typo here cannot be let
 * through as "no perk": that would silently take a car's advantage away
 * instead of failing at load time where it is cheap to notice.
 */
function parsePerk(raw: unknown, carId: string): CarPerkId | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw !== 'string' || !KNOWN_CAR_PERKS.includes(raw)) {
    throw new CarManifestError(
      `car "${carId}" has unknown perk ${JSON.stringify(raw)}. Valid perks: ${KNOWN_CAR_PERKS.join(', ')}`,
    );
  }
  return raw as CarPerkId;
}

function parseHomePlanet(raw: unknown, carId: string): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new CarManifestError(`car "${carId}" has invalid homePlanetId ${JSON.stringify(raw)}`);
  }
  return raw;
}

function parseWorldAdvantage(raw: unknown, carId: string): WorldAdvantage | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (raw !== WORLD_ADVANTAGE.PRIMARY && raw !== WORLD_ADVANTAGE.SECONDARY) {
    throw new CarManifestError(
      `car "${carId}" has invalid worldAdvantage ${JSON.stringify(raw)}. Valid: ${WORLD_ADVANTAGE.PRIMARY}, ${WORLD_ADVANTAGE.SECONDARY}`,
    );
  }
  return raw;
}

/**
 * Validates a freshly loaded `cars.json` before anything draws with it.
 *
 * Worth the code: every number here silently changes what the screen looks like
 * rather than throwing. A missing `origin` would read as `undefined` and make
 * every car wobble as it turns; a missing `pixelsPerUnit` would size the road
 * wrongly and nothing would look broken until the cars were compared to it.
 * Failing loudly at load time is much cheaper than debugging that by eye.
 */
export function parseCarSetManifest(raw: unknown): CarSetManifest {
  const source = requireObject(raw, 'manifest');

  const frameCount = requirePositiveNumber(source, 'frameCount');
  if (frameCount !== CAR_SPRITE_FRAMES) {
    throw new CarManifestError(
      `"frameCount" is ${frameCount} but the build expects ${CAR_SPRITE_FRAMES}`,
    );
  }

  const origin = requireObject(source['origin'], '"origin"');
  const cars = source['cars'];
  if (!Array.isArray(cars) || cars.length === 0) {
    throw new CarManifestError('"cars" must be a non-empty array');
  }

  return {
    frameWidth: requirePositiveNumber(source, 'frameWidth'),
    frameHeight: requirePositiveNumber(source, 'frameHeight'),
    frameCount,
    pixelsPerUnit: requirePositiveNumber(source, 'pixelsPerUnit'),
    origin: {
      x: requirePositiveNumber(origin, 'x'),
      y: requirePositiveNumber(origin, 'y'),
    },
    cars: cars.map((car, index) => parseCarSheet(car, index)),
  };
}

function parseCarSheet(raw: unknown, index: number): CarSheetManifest {
  const source = requireObject(raw, `cars[${index}]`);
  const id = source['id'];
  const image = source['image'];
  if (typeof id !== 'string' || id.length === 0) {
    throw new CarManifestError(`cars[${index}].id must be a non-empty string`);
  }
  if (typeof image !== 'string' || image.length === 0) {
    throw new CarManifestError(`car "${id}" has no image`);
  }
  const shadow = requireObject(source['shadow'], `car "${id}" shadow`);
  const stats = requireObject(source['stats'], `car "${id}" stats`);

  return {
    id,
    displayName: typeof source['displayName'] === 'string' ? source['displayName'] : id,
    archetype: typeof source['archetype'] === 'string' ? source['archetype'] : '',
    image,
    shadow: {
      width: requirePositiveNumber(shadow, 'width'),
      height: requirePositiveNumber(shadow, 'height'),
    },
    stats: foldCollisionStats(stats as unknown as VehicleStats, source['collisionBox'] ?? source['collisionMap'], id),
    perk: parsePerk(source['perk'], id),
    homePlanetId: parseHomePlanet(source['homePlanetId'], id),
    worldAdvantage: parseWorldAdvantage(source['worldAdvantage'], id),
    frameWidth: parseOptionalSize(source['frameWidth'], id, 'frameWidth'),
    frameHeight: parseOptionalSize(source['frameHeight'], id, 'frameHeight'),
    frameCount: parseOptionalFrameCount(source['frameCount'], id),
    framesJson: parseOptionalPath(source['framesJson'], id, 'framesJson'),
  };
}

function parseOptionalSize(raw: unknown, carId: string, field: string): number | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) {
    throw new CarManifestError(`car "${carId}" ${field} must be a positive number`);
  }
  return raw;
}

function parseOptionalFrameCount(raw: unknown, carId: string): number | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw <= 0) {
    throw new CarManifestError(`car "${carId}" frameCount must be a positive integer`);
  }
  return raw;
}

function parseOptionalPath(raw: unknown, carId: string, field: string): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new CarManifestError(`car "${carId}" ${field} must be a non-empty string`);
  }
  return raw;
}

function readExtents(raw: unknown, carId: string, where: string): CollisionBox {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new CarManifestError(`car "${carId}" ${where} must be an object`);
  }
  const box = raw as Record<string, unknown>;
  const along = box['along'];
  const across = box['across'];
  if (typeof along !== 'number' || !(along > 0) || typeof across !== 'number' || !(across > 0)) {
    throw new CarManifestError(`car "${carId}" ${where} needs positive along/across`);
  }
  return { along, across };
}

function parseCollisionBox(raw: unknown, carId: string): CollisionBox | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      throw new CarManifestError(`car "${carId}" collisionBox is empty`);
    }
    let maxAlong = 0;
    let maxAcross = 0;
    raw.forEach((entry, index) => {
      const pose = readExtents(entry, carId, `collisionBox[${index}]`);
      maxAlong = Math.max(maxAlong, pose.along);
      maxAcross = Math.max(maxAcross, pose.across);
    });
    return collisionBox(maxAlong, maxAcross);
  }
  return readExtents(raw, carId, 'collisionBox');
}

function withSquares(stats: VehicleStats): VehicleStats {
  const along = stats.collisionAlong;
  const across = stats.collisionAcross;
  if (along === undefined || across === undefined || !(along > 0) || !(across > 0)) {
    return stats;
  }
  const min = Math.min(along, across);
  const max = Math.max(along, across);
  return {
    ...stats,
    collisionSquareMin: stats.collisionSquareMin ?? min,
    collisionSquareMax: stats.collisionSquareMax ?? max,
    collisionSquare: stats.collisionSquare ?? (min + max) / 2,
  };
}

function foldCollisionStats(stats: VehicleStats, rawBox: unknown, carId: string): VehicleStats {
  if (
    typeof stats.collisionAlong === 'number' &&
    stats.collisionAlong > 0 &&
    typeof stats.collisionAcross === 'number' &&
    stats.collisionAcross > 0
  ) {
    return withSquares(stats);
  }
  const box = parseCollisionBox(rawBox, carId);
  if (box === undefined) {
    return stats;
  }
  return withSquares({ ...stats, collisionAlong: box.along, collisionAcross: box.across });
}

/** `car-16` → `16`, `delorean` → `delorean`. Used only for leftover `cart_*_300.png` files. */
export function cartPortraitToken(carId: string): string {
  const numbered = /^car-(\d+)/.exec(carId);
  return numbered?.[1] ?? carId.replace(/[^a-z0-9]+/gi, '-');
}

/**
 * Matrix vitrine index. `car-1` and `car_1` are both 1.
 * `delorean` has no folder.
 */
export function matrixHeroNumber(carId: string): number | undefined {
  const match = /(\d+)/.exec(carId);
  if (match === null) {
    return undefined;
  }
  const n = Number(match[1]);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/** `car_1_hero.png` */
export function matrixHeroFile(n: number): string {
  return `car_${n}_hero.png`;
}

/** `matrix_car/1_hero/car_1_hero.png` — the garage still. */
export function matrixHeroUrl(n: number): string {
  return `matrix_car/${n}_hero/${matrixHeroFile(n)}`;
}

/**
 * Load order for a garage still. First hit wins.
 * Numbered cars start at the matrix vitrine; other files are leftovers.
 */
export function portraitCandidateUrls(carId: string): readonly string[] {
  const n = matrixHeroNumber(carId);
  const hero = cartHeroFile(carId);
  const still = cartPortraitFile(carId);
  const urls: string[] = [];
  if (n !== undefined) {
    urls.push(matrixHeroUrl(n));
  }
  urls.push(
    `assets/cars/${hero}`,
    `assets/cars/new/${hero}`,
    `assets/cars/${still}`,
    `assets/${still}`,
    `assets/cars/${cartPortraitLegacyFile(carId)}`,
  );
  return urls;
}

/** New-fleet garage still and strip source: `car_1_hero.png`. */
export function cartHeroFile(carId: string): string {
  return `${carId}_hero.png`;
}

/** Inbox / clock-fleet id: `car_2`, not the old hyphen roster (`car-2`). */
export function isNewFleetCarId(carId: string): boolean {
  return /^car_\d+$/.test(carId);
}

/** New-fleet clock strip: `car_1_strip.png`. */
export function cartStripFile(carId: string): string {
  return `${carId}_strip.png`;
}

/** Owner garage still: `car-6-tank_300px.png`, `delorean_300px.png`. */
export function cartPortraitFile(carId: string): string {
  return `${carId}_300px.png`;
}

/** Older generated still: `cart_16_300.png`. Tried only if the `_300px` file is missing. */
export function cartPortraitLegacyFile(carId: string): string {
  return `cart_${cartPortraitToken(carId)}_300.png`;
}

export function cartPortraitKey(carId: string): string {
  return `cart-portrait:${carId}`;
}

/** Cell size for this sheet when it is not the set default. */
export function sheetCellSize(
  sheet: CarSheetManifest,
  manifest: CarSetManifest,
): { readonly width: number; readonly height: number } {
  return {
    width: sheet.frameWidth ?? manifest.frameWidth,
    height: sheet.frameHeight ?? manifest.frameHeight,
  };
}

/** Yaw frames for this sheet when it is not the set default. */
export function sheetFrameCount(sheet: CarSheetManifest, manifest: CarSetManifest): number {
  return sheet.frameCount ?? manifest.frameCount;
}

/** Looks up one car, failing loudly rather than returning `undefined`. */
export function findCarSheet(manifest: CarSetManifest, id: string): CarSheetManifest {
  const sheet = manifest.cars.find(car => car.id === id);
  if (sheet === undefined) {
    const known = manifest.cars.map(car => car.id).join(', ');
    throw new CarManifestError(`unknown car "${id}". Known cars: ${known}`);
  }
  return sheet;
}

/**
 * Sprite frame showing a car facing `heading`.
 *
 * The generator renders frame `f` at a yaw of `f * 2π / frameCount` about +Z in
 * car local space, where +X is forward — exactly the convention `VehicleState.heading`
 * uses. So this is a plain rounding, and the nearest frame is never more than
 * half a frame arc (5.6° at 32 frames) away from the true heading.
 */
export function frameIndexForHeading(heading: number, frameCount: number): number {
  const frameArc = (Math.PI * 2) / frameCount;
  const index = Math.round(heading / frameArc) % frameCount;
  return index < 0 ? index + frameCount : index;
}

/** Art canvas width → production strip (`SCALE.md`). */
export const MATRIX_PRODUCTION_SCALE = 64 / 1700;

export interface MatrixStripFrameBox {
  readonly i: number;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly pivotX: number;
  readonly pivotY: number;
}

/** Crop boxes + one midpoint collision rect from `car_N_strip.json`. */
export interface MatrixStripAtlas {
  readonly count: number;
  readonly frames: readonly MatrixStripFrameBox[];
  readonly collisionRect: { readonly w: number; readonly h: number };
  readonly scale: number;
}

/** True when this sheet is a variable-width matrix strip, not a uniform grid. */
export function isBBoxSheet(sheet: CarSheetManifest): boolean {
  return typeof sheet.framesJson === 'string' && sheet.framesJson.length > 0;
}

/** Phaser / HTTP path: public-root if `image` has a slash, else `assets/cars/`. */
export function carSheetImageUrl(sheet: CarSheetManifest): string {
  return sheet.image.includes('/') ? sheet.image : `assets/cars/${sheet.image}`;
}

export function matrixStripUrl(n: number): string {
  return `matrix_car/${n}_hero/car_${n}_strip_64.png`;
}

export function matrixStripJsonUrl(n: number): string {
  return `matrix_car/${n}_hero/car_${n}_strip.json`;
}

export function matrixStripCacheKey(carId: string): string {
  return `car-strip-json:${carId}`;
}

function readFrameBox(raw: Record<string, unknown>, index: number): MatrixStripFrameBox {
  const i = typeof raw['i'] === 'number' ? raw['i'] : typeof raw['index'] === 'number' ? raw['index'] : index;
  const x = raw['x'];
  const y = raw['y'];
  const w = raw['w'];
  const h = raw['h'];
  if (
    typeof i !== 'number' ||
    !Number.isInteger(i) ||
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof w !== 'number' ||
    typeof h !== 'number' ||
    !(w > 0) ||
    !(h > 0)
  ) {
    throw new CarManifestError(`strip frame ${index} needs integer i and positive x/y/w/h`);
  }
  let pivotX = 0.5;
  let pivotY = 0.5;
  const center = raw['collision_center'];
  if (typeof center === 'object' && center !== null && !Array.isArray(center)) {
    const point = center as Record<string, unknown>;
    const cx = point['x'];
    const cy = point['y'];
    if (typeof cx === 'number' && typeof cy === 'number') {
      pivotX = (cx - x) / w;
      pivotY = (cy - y) / h;
    }
  }
  return { i, x, y, w, h, pivotX, pivotY };
}

/**
 * Reads `production_scale.frames` (already at 64/1700). The art-space `frames`
 * array is the high-res pack and must not be used as Phaser crop boxes.
 */
export function parseMatrixStripJson(raw: unknown): MatrixStripAtlas {
  const source = requireObject(raw, 'matrix strip');
  const prod = requireObject(source['production_scale'], '"production_scale"');
  const framesRaw = prod['frames'];
  if (!Array.isArray(framesRaw) || framesRaw.length === 0) {
    throw new CarManifestError('"production_scale.frames" must be a non-empty array');
  }
  const frames = framesRaw.map((frame, index) =>
    readFrameBox(requireObject(frame, `production_scale.frames[${index}]`), index),
  );
  const count = typeof source['count'] === 'number' ? source['count'] : frames.length;
  if (!Number.isInteger(count) || count !== frames.length) {
    throw new CarManifestError(`strip count ${String(source['count'])} does not match frames (${frames.length})`);
  }
  const rect = requireObject(prod['collision_rect'], '"production_scale.collision_rect"');
  const scale = typeof prod['scale'] === 'number' && prod['scale'] > 0 ? prod['scale'] : MATRIX_PRODUCTION_SCALE;
  return {
    count,
    frames,
    collisionRect: {
      w: requirePositiveNumber(rect, 'w'),
      h: requirePositiveNumber(rect, 'h'),
    },
    scale,
  };
}

/** Half-extents in world units from the one midpoint production rect. */
export function collisionFromMatrixStrip(
  strip: MatrixStripAtlas,
  pixelsPerUnit: number,
): { readonly along: number; readonly across: number } {
  if (!(pixelsPerUnit > 0)) {
    throw new CarManifestError('pixelsPerUnit must be positive to scale matrix collision');
  }
  return {
    along: strip.collisionRect.w / 2 / pixelsPerUnit,
    across: strip.collisionRect.h / 2 / pixelsPerUnit,
  };
}

/** Fold JSON collision (and frame count) onto a sheet after the strip JSON loads. */
export function applyMatrixStripToSheet(
  sheet: CarSheetManifest,
  strip: MatrixStripAtlas,
  pixelsPerUnit: number,
): CarSheetManifest {
  const box = collisionFromMatrixStrip(strip, pixelsPerUnit);
  return {
    ...sheet,
    frameCount: strip.count,
    stats: withSquares({
      ...sheet.stats,
      collisionAlong: box.along,
      collisionAcross: box.across,
      collisionRadius: Math.max(box.along, box.across, sheet.stats.collisionRadius),
      collisionSquareMin: undefined,
      collisionSquareMax: undefined,
      collisionSquare: undefined,
    }),
  };
}
