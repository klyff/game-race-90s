import {
  CAR_FRAME_HEIGHT,
  CAR_FRAME_WIDTH,
  CAR_SPRITE_FRAMES,
  CAR_SPRITE_FRAME_ARC,
  ISO_X,
  ISO_Y,
} from '../../src/domain/constants.ts';
import { resolvePalette } from './color.ts';
import { buildFaces, groundExtents, rotateZ } from './geometry.ts';
import type { Face } from './geometry.ts';
import { Framebuffer } from './raster/Framebuffer.ts';
import type { ScreenVertex } from './raster/Framebuffer.ts';
import { facesCamera, project } from './raster/projection.ts';
import { resolveFrame } from './raster/resolve.ts';
import { shadeStepFor } from './raster/shading.ts';
import type { CarModelDef, CarSheetManifest } from './schema.ts';

/**
 * Supersampling factor. Edges are resolved by coverage thresholding rather than
 * alpha blending, so this buys clean pixel-boundary edges without a soft fringe.
 */
const SUPERSAMPLE = 4;

/** Pixels reserved on each side for the 1 px outline plus breathing room. */
const FRAME_MARGIN = 2;

/** Shadow hugs the car slightly rather than matching its full footprint. */
const SHADOW_TIGHTNESS = 0.86;

export interface ScreenExtents {
  minSx: number;
  maxSx: number;
  minSy: number;
  maxSy: number;
}

/** Shared scale and offset applied to every car in the set. */
export interface ProjectionFit {
  /** World units → pixels. */
  readonly scale: number;
  /** Pixel position of the car's local origin within a frame. */
  readonly offsetX: number;
  readonly offsetY: number;
}

export interface RenderedCar {
  readonly frames: readonly Uint8Array[];
  readonly manifest: CarSheetManifest;
}

function emptyExtents(): ScreenExtents {
  return {
    minSx: Number.POSITIVE_INFINITY,
    maxSx: Number.NEGATIVE_INFINITY,
    minSy: Number.POSITIVE_INFINITY,
    maxSy: Number.NEGATIVE_INFINITY,
  };
}

/**
 * Walks every vertex of every yaw frame to find the screen-space bounds the car
 * occupies. Accumulates into `into` so several cars can share one measurement.
 */
export function measureCar(def: CarModelDef, into: ScreenExtents = emptyExtents()): ScreenExtents {
  const faces = buildFaces(def);
  for (let frame = 0; frame < CAR_SPRITE_FRAMES; frame += 1) {
    const yaw = frame * CAR_SPRITE_FRAME_ARC;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    for (const face of faces) {
      for (const corner of face.corners) {
        const projected = project(rotateZ(corner, cos, sin));
        if (projected.sx < into.minSx) into.minSx = projected.sx;
        if (projected.sx > into.maxSx) into.maxSx = projected.sx;
        if (projected.sy < into.minSy) into.minSy = projected.sy;
        if (projected.sy > into.maxSy) into.maxSy = projected.sy;
      }
    }
  }
  return into;
}

/**
 * Derives the single scale/offset shared by the whole car set: largest scale at
 * which the widest and tallest car still fits, with the content centred.
 */
export function fitFrom(extents: ScreenExtents): ProjectionFit {
  const contentWidth = extents.maxSx - extents.minSx;
  const contentHeight = extents.maxSy - extents.minSy;
  if (!(contentWidth > 0) || !(contentHeight > 0)) {
    throw new Error('Car set has no measurable extent — are any parts defined?');
  }

  const scale = Math.min(
    (CAR_FRAME_WIDTH - 2 * FRAME_MARGIN) / contentWidth,
    (CAR_FRAME_HEIGHT - 2 * FRAME_MARGIN) / contentHeight,
  );

  return {
    scale,
    offsetX: CAR_FRAME_WIDTH / 2 - ((extents.minSx + extents.maxSx) / 2) * scale,
    offsetY: CAR_FRAME_HEIGHT / 2 - ((extents.minSy + extents.maxSy) / 2) * scale,
  };
}

/**
 * The fit shared by every car. Measuring the whole set together is what keeps
 * relative car sizes honest and lets the runtime use one `pixelsPerUnit` for
 * both sprites and track geometry. Previewing a single car still uses the set
 * fit, so what an art agent sees is exactly what ships.
 */
export function computeSetFit(defs: readonly CarModelDef[]): ProjectionFit {
  const extents = emptyExtents();
  for (const def of defs) measureCar(def, extents);
  return fitFrom(extents);
}

function toScreenVertex(
  face: Face,
  cornerIndex: number,
  cos: number,
  sin: number,
  fit: ProjectionFit,
): ScreenVertex {
  const projected = project(rotateZ(face.corners[cornerIndex]!, cos, sin));
  return {
    x: (fit.offsetX + projected.sx * fit.scale) * SUPERSAMPLE,
    y: (fit.offsetY + projected.sy * fit.scale) * SUPERSAMPLE,
    depth: projected.depth,
  };
}

export function renderCar(def: CarModelDef, fit: ProjectionFit): RenderedCar {
  const faces = buildFaces(def);
  if (faces.length === 0) {
    throw new Error(`Car "${def.id}" produced no faces`);
  }
  const palette = resolvePalette(def.palette);
  const buffer = new Framebuffer(CAR_FRAME_WIDTH * SUPERSAMPLE, CAR_FRAME_HEIGHT * SUPERSAMPLE);
  const frames: Uint8Array[] = [];

  for (let frame = 0; frame < CAR_SPRITE_FRAMES; frame += 1) {
    const yaw = frame * CAR_SPRITE_FRAME_ARC;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    buffer.clear();

    for (const face of faces) {
      const normal = rotateZ(face.normal, cos, sin);
      if (!facesCamera(normal)) continue;
      const color = palette.ramps[face.role][shadeStepFor(normal)];
      buffer.fillQuad(
        [
          toScreenVertex(face, 0, cos, sin, fit),
          toScreenVertex(face, 1, cos, sin, fit),
          toScreenVertex(face, 2, cos, sin, fit),
          toScreenVertex(face, 3, cos, sin, fit),
        ],
        color,
      );
    }

    frames.push(
      resolveFrame(buffer, CAR_FRAME_WIDTH, CAR_FRAME_HEIGHT, SUPERSAMPLE, palette),
    );
  }

  // Worst-case footprint of the ground rectangle over a full turn: its
  // projected diamond spans (halfLength + halfWidth) in each screen axis.
  const { halfLength, halfWidth } = groundExtents(faces);
  const footprint = (halfLength + halfWidth) * fit.scale * SHADOW_TIGHTNESS;

  return {
    frames,
    manifest: {
      id: def.id,
      displayName: def.displayName,
      archetype: def.archetype,
      image: `${def.id}.png`,
      shadow: {
        width: Math.round(footprint * 2 * ISO_X),
        height: Math.round(footprint * 2 * ISO_Y),
      },
      stats: def.stats,
      perk: def.perk,
    },
  };
}
