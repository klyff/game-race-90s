/**
 * Isometric projection from world space to screen space.
 *
 * Both the runtime and the offline sprite generator use this projection so
 * that pre-rendered cars match the ground plane they drive on. The projection
 * is orthographic (parallel rays, no perspective), and it maps a 3D world with
 * unit axes +X (right), +Y (left, per decision 13), and +Z (up) onto a 2D
 * screen where both X and Y grow downwards on screen (as they do in Phaser).
 *
 * The screen basis vectors are:
 *   +X (1,0,0) -> (ISO_X, ISO_Y) on screen
 *   +Y (0,1,0) -> (-ISO_X, ISO_Y) on screen
 * Their 2D cross product is ISO_X * ISO_Y - (-ISO_X * ISO_Y) = 2 * ISO_X * ISO_Y.
 * Since ISO_X = 1 and ISO_Y = 0.5, this product is +1, which is positive. In a
 * y-DOWN screen coordinate system (as in Phaser), a positive 2D cross product
 * means the turn from the first vector to the second is CLOCKWISE on screen.
 * Therefore, a world counter-clockwise rotation (increasing heading, which is
 * a LEFT turn per decision 13) appears CLOCKWISE on screen.
 *
 * This projection *mirrors* rotation. That is why SCREEN_ROTATION_SIGN = -1:
 * it is the multiplier the keyboard adapter uses to convert "player wants to
 * turn towards screen-left" (negative 2D screen angle) into a positive steer
 * sign (left turn in world space). Without the sign flip, turning the camera
 * left would turn the car right.
 *
 * `depthOf` returns x + y, which orders painters-order (further along the
 * x+y axis is nearer the camera, so that sum is the correct depth key for
 * z-sorting). This is derived from the projection: the screen Y coordinate
 * is ((x + y) * ISO_Y - height * ISO_Z) * pixelsPerUnit. Since pixelsPerUnit
 * and ISO_Y are positive, screen Y grows monotonically with (x + y) for fixed
 * height. Therefore points further along x + y sit lower on screen (higher
 * painters-order index) and should be drawn later.
 */

import { ISO_X, ISO_Y, ISO_Z } from '../../domain/constants.ts';
import type { Vec2 } from '../../domain/math/Vec2.ts';

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * The multiplier applied to heading deltas to convert from world-space
 * left-turn (increasing heading per decision 13) to screen-space rotation.
 * This projection mirrors rotation: a world counter-clockwise rotation
 * appears clockwise on screen, so screen rotations must be negated.
 * Derived from the 2D cross product of the screen basis vectors:
 * 2 * ISO_X * ISO_Y > 0 implies a clockwise turn on the y-DOWN screen,
 * so SCREEN_ROTATION_SIGN = -Math.sign(2 * ISO_X * ISO_Y) = -1.
 */
export const SCREEN_ROTATION_SIGN = -Math.sign(2 * ISO_X * ISO_Y);

export class IsoProjection {
  readonly pixelsPerUnit: number;

  constructor(pixelsPerUnit: number) {
    if (!Number.isFinite(pixelsPerUnit) || pixelsPerUnit <= 0) {
      throw new Error(
        `pixelsPerUnit must be a finite positive number, got ${pixelsPerUnit}`,
      );
    }
    this.pixelsPerUnit = pixelsPerUnit;
  }

  /**
   * Project a point from world space to screen space.
   *
   * @param point The position in world space (x, y).
   * @param height The height above the ground plane in world units. Defaults to 0.
   * @returns The position on screen.
   */
  toScreen(point: Vec2, height: number = 0): ScreenPoint {
    const screenX = (point.x - point.y) * ISO_X * this.pixelsPerUnit;
    const screenY = ((point.x + point.y) * ISO_Y - height * ISO_Z) * this.pixelsPerUnit;
    return { x: screenX, y: screenY };
  }

  /**
   * Compute the painters-order depth key for a point.
   *
   * Points further along the x + y axis are nearer the camera (closer to the
   * screen), so they should be drawn later to occlude points behind them.
   * This function returns the correct z-sort key for that ordering.
   *
   * Derivation: the screen Y coordinate is ((x + y) * ISO_Y - height * ISO_Z)
   * * pixelsPerUnit. Since pixelsPerUnit and ISO_Y are positive, screen Y
   * grows monotonically with (x + y) for fixed height. Therefore, x + y is
   * the correct painters-order key.
   */
  depthOf(point: Vec2): number {
    return point.x + point.y;
  }
}
