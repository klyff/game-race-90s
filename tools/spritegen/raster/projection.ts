import { ISO_X, ISO_Y, ISO_Z } from '../../../src/domain/constants.ts';
import type { Vec3 } from '../geometry.ts';

export interface Projected {
  /** Screen X in projection units (before scale-to-fit). */
  readonly sx: number;
  /** Screen Y in projection units, growing downwards. */
  readonly sy: number;
  /** View depth. Smaller is nearer the camera. */
  readonly depth: number;
}

/**
 * The one and only projection, matching `src/domain/constants.ts`:
 *
 *   sx = (x - y) * ISO_X
 *   sy = (x + y) * ISO_Y - z * ISO_Z
 *
 * Depth and the backface test below are DERIVED from those two formulas rather
 * than chosen by hand. That matters: an independently invented depth function
 * disagrees with the projection, and geometry stacked along +Z (a cabin on a
 * chassis, a canopy on a cabin) then loses the depth test to the surface it sits
 * on and vanishes.
 *
 * Reading the projection as an orthographic camera, the screen right and screen
 * up axes are the row vectors of the transform:
 *
 *   r =  (ISO_X, -ISO_X, 0)          from sx
 *   u = (-ISO_Y, -ISO_Y, ISO_Z)      from sy, negated because sy grows downwards
 *
 * They are orthogonal for any constants. The view direction is their cross
 * product, which after dividing out ISO_X gives
 *
 *   d = (-ISO_Z, -ISO_Z, -2 * ISO_Y)
 *
 * so the camera looks from +X/+Y/+Z towards the origin: further along x+y is
 * drawn lower on screen and is nearer the viewer, and higher up (+z) is drawn
 * higher on screen and is also nearer.
 */
const VIEW_XY = -ISO_Z;
const VIEW_Z = -2 * ISO_Y;

export function project(p: Vec3): Projected {
  return {
    sx: (p.x - p.y) * ISO_X,
    sy: (p.x + p.y) * ISO_Y - p.z * ISO_Z,
    depth: VIEW_XY * (p.x + p.y) + VIEW_Z * p.z,
  };
}

/**
 * Backface test. Prisms are closed solids, so a face whose outward normal points
 * away from the camera can never be visible. Skipping those halves the fill work
 * and avoids co-planar depth ties between a solid's own two caps.
 */
export function facesCamera(normal: Vec3): boolean {
  return VIEW_XY * (normal.x + normal.y) + VIEW_Z * normal.z < 0;
}
