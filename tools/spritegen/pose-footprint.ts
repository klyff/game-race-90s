/**
 * Per-yaw screen footprint from the car's FIXED world size.
 *
 * Raw drawings were prompted with a fixed cell / 4px-margin fill, so the
 * model filled the square every time. Front views swelled; that is not the
 * car changing size. The box is the projected AABB of the authored solids.
 */

import { CAR_SPRITE_FRAME_ARC, CAR_SPRITE_FRAMES } from '../../src/domain/constants.ts';
import { buildFaces, rotateZ } from './geometry.ts';
import { project } from './raster/projection.ts';
import type { CarModelDef } from './schema.ts';
import type { ScreenExtents } from './renderCar.ts';

export interface PoseExtents {
  readonly minSx: number;
  readonly maxSx: number;
  readonly minSy: number;
  readonly maxSy: number;
}

export interface PoseRect {
  /** Top-left in the cell, origin at the pin. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface MutableExtents {
  minSx: number;
  maxSx: number;
  minSy: number;
  maxSy: number;
}

function empty(): MutableExtents {
  return {
    minSx: Number.POSITIVE_INFINITY,
    maxSx: Number.NEGATIVE_INFINITY,
    minSy: Number.POSITIVE_INFINITY,
    maxSy: Number.NEGATIVE_INFINITY,
  };
}

function grow(into: MutableExtents, sx: number, sy: number): void {
  if (sx < into.minSx) into.minSx = sx;
  if (sx > into.maxSx) into.maxSx = sx;
  if (sy < into.minSy) into.minSy = sy;
  if (sy > into.maxSy) into.maxSy = sy;
}

export function poseExtents(def: CarModelDef, frame: number): PoseExtents {
  const faces = buildFaces(def);
  const yaw = frame * CAR_SPRITE_FRAME_ARC;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const into = empty();
  for (const face of faces) {
    for (const corner of face.corners) {
      const projected = project(rotateZ(corner, cos, sin));
      grow(into, projected.sx, projected.sy);
    }
  }
  return into;
}

export function unionExtents(def: CarModelDef): ScreenExtents {
  const into = empty();
  for (let frame = 0; frame < CAR_SPRITE_FRAMES; frame += 1) {
    const pose = poseExtents(def, frame);
    grow(into, pose.minSx, pose.minSy);
    grow(into, pose.maxSx, pose.maxSy);
  }
  return into;
}

/** Pixel rectangle of one yaw, pinned at the chassis origin. */
export function poseRectPx(
  pose: PoseExtents,
  pinX: number,
  pinY: number,
  pixelsPerUnit: number,
): PoseRect {
  return {
    x: pinX + pose.minSx * pixelsPerUnit,
    y: pinY + pose.minSy * pixelsPerUnit,
    width: (pose.maxSx - pose.minSx) * pixelsPerUnit,
    height: (pose.maxSy - pose.minSy) * pixelsPerUnit,
  };
}
