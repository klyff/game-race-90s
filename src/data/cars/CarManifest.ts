import { CAR_SPRITE_FRAMES } from '../../domain/constants.ts';
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
    stats: stats as unknown as VehicleStats,
  };
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
