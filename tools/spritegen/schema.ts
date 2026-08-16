import type { CarPerkId, PaletteRole } from '../../src/domain/constants.ts';
import type { VehicleStats } from '../../src/domain/vehicle/VehicleStats.ts';
export type { CarSetManifest, CarSheetManifest } from '../../src/data/cars/CarManifest.ts';

/**
 * CONTRACT FOR CAR ART AUTHORS.
 *
 * A car model is a short list of solids in local space plus six base colours.
 * The generator handles everything else: camera, shading ramps, 32 yaw frames,
 * automatic scale-to-fit, palette quantization, outline and PNG packing.
 *
 * Local space (right-handed):
 *   +X = forward (the nose)
 *   +Y = left
 *   +Z = up (z = 0 is the ground the wheels touch)
 *
 * Scale is arbitrary and never needs tuning: the generator measures the model
 * across all 32 frames and scales it to fill the sprite frame. Only the
 * *proportions* between parts matter. A useful mental scale is
 * "length 4, width 2, height 1.2".
 */
export interface CarModelDef {
  /** Lowercase kebab-case; becomes the asset filename and the texture key. */
  readonly id: string;
  /** Shown on the car-select screen. */
  readonly displayName: string;
  /** One-line flavour description of the archetype. */
  readonly archetype: string;
  readonly palette: CarPalette;
  /** Drawn back-to-front is irrelevant — the rasterizer uses a depth buffer. */
  readonly parts: readonly CarPart[];
  readonly stats: VehicleStats;
  /** This car's one signature advantage. Optional: a car may have none. */
  readonly perk?: CarPerkId;
}

/**
 * Six base colours. The generator derives a four-step ramp
 * (highlight / base / shade / dark) from each one, so authors never pick
 * shading colours by hand and contrast stays consistent between cars.
 */
export interface CarPalette {
  /** Main hull colour. */
  readonly body: string;
  /** Secondary colour for spoilers, pods, plating, stripes. */
  readonly accent: string;
  /** Windows and canopy. */
  readonly glass: string;
  /** Wheels. */
  readonly tire: string;
  /** Head/tail lights. */
  readonly light: string;
  /** 1 px silhouette outline. Should be very dark. */
  readonly outline: string;
}

export interface CarPart {
  /** Free-form label; helps when reading a diff. Not used for rendering. */
  readonly name: string;
  /** Which palette colour shades this solid. */
  readonly role: PaletteRole;
  readonly shape: Prism;
}

/**
 * The single geometric primitive: a box whose two end caps (at -X and +X) can
 * be independently narrowed, flattened and shifted vertically. That is enough
 * for hulls, wedge noses, sloped roofs, canopies, spoilers, pods and wheels.
 *
 * A plain box needs no `rear`/`front` at all.
 */
export interface Prism {
  /** Centre of the solid, local space. */
  readonly center: Vec3Tuple;
  /** Extents along [X forward, Y across, Z up]. */
  readonly size: Vec3Tuple;
  /** End cap at -X (the tail). */
  readonly rear?: SectionMod;
  /** End cap at +X (the nose). */
  readonly front?: SectionMod;
}

/**
 * Modifies one end cap of a prism.
 * `width`/`height` are multipliers on `size` (1 = unchanged, 0 = pinched to an
 * edge). `z` shifts that cap up or down, in the same units as `size`.
 */
export interface SectionMod {
  readonly width?: number;
  readonly height?: number;
  readonly z?: number;
}

export type Vec3Tuple = readonly [number, number, number];
