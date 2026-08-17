/**
 * One oriented box for every yaw. The sprite cell can be large; this is what
 * hits. Use the largest box once — no per-pose loop.
 */

import { dot, fromAngle, perpendicularLeft, subtract } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';
import type { VehicleStats } from './VehicleStats.ts';

export interface CollisionBox {
  /** Half-length along the heading, world units. */
  readonly along: number;
  /** Half-width across the heading, world units. */
  readonly across: number;
}

/** The largest box. One size covers every yaw. */
export function collisionBox(along: number, across: number): CollisionBox {
  return { along, across };
}

/** Near-square cars use a square of the longer side; the rest stay a rectangle. */
const SQUARE_ASPECT = 1.15;

export function bestCollisionBox(halfLength: number, halfWidth: number): CollisionBox {
  const along = halfLength;
  const across = halfWidth;
  if (!(along > 0) || !(across > 0)) {
    throw new Error('collision box needs positive half-length and half-width');
  }
  const long = Math.max(along, across);
  const short = Math.min(along, across);
  if (long / short <= SQUARE_ASPECT) {
    return collisionBox(long, long);
  }
  return collisionBox(along, across);
}

/** Largest inscribed square and smallest containing square, half-sides. */
export function collisionSquares(halfLength: number, halfWidth: number): {
  readonly min: number;
  readonly max: number;
  readonly mid: number;
} {
  const min = Math.min(halfLength, halfWidth);
  const max = Math.max(halfLength, halfWidth);
  return { min, max, mid: (min + max) / 2 };
}

/** Car-to-car hit is the midpoint square. Missing field → circle fallback. */
export function collisionBoxFromStats(stats: VehicleStats): CollisionBox | undefined {
  const side = stats.collisionSquare;
  if (side === undefined || !(side > 0)) {
    return undefined;
  }
  return collisionBox(side, side);
}

export interface ObbOverlap {
  readonly normal: Vec2;
  readonly overlap: number;
}

function radiusOnAxis(box: CollisionBox, heading: number, axis: Vec2): number {
  const forward = fromAngle(heading);
  const left = perpendicularLeft(forward);
  return Math.abs(dot(forward, axis)) * box.along + Math.abs(dot(left, axis)) * box.across;
}

function overlapOnAxis(
  aPos: Vec2,
  aBox: CollisionBox,
  aHeading: number,
  bPos: Vec2,
  bBox: CollisionBox,
  bHeading: number,
  axis: Vec2,
): number {
  const length = Math.hypot(axis.x, axis.y);
  if (length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  const unit = { x: axis.x / length, y: axis.y / length };
  const delta = subtract(bPos, aPos);
  const reach = radiusOnAxis(aBox, aHeading, unit) + radiusOnAxis(bBox, bHeading, unit);
  return reach - Math.abs(dot(delta, unit));
}

/**
 * Separating-axis test for two heading-aligned boxes.
 * `normal` points from A toward B when they overlap.
 */
export function overlapObb(
  aPos: Vec2,
  aBox: CollisionBox,
  aHeading: number,
  bPos: Vec2,
  bBox: CollisionBox,
  bHeading: number,
): ObbOverlap | undefined {
  const aForward = fromAngle(aHeading);
  const bForward = fromAngle(bHeading);
  const axes: readonly Vec2[] = [
    aForward,
    perpendicularLeft(aForward),
    bForward,
    perpendicularLeft(bForward),
  ];

  let best = Number.POSITIVE_INFINITY;
  let normal: Vec2 = { x: 1, y: 0 };
  for (const axis of axes) {
    const overlap = overlapOnAxis(aPos, aBox, aHeading, bPos, bBox, bHeading, axis);
    if (overlap <= 0) {
      return undefined;
    }
    if (overlap < best) {
      best = overlap;
      const length = Math.hypot(axis.x, axis.y);
      normal = length === 0 ? { x: 1, y: 0 } : { x: axis.x / length, y: axis.y / length };
    }
  }

  const delta = subtract(bPos, aPos);
  if (dot(delta, normal) < 0) {
    normal = { x: -normal.x, y: -normal.y };
  }
  return { normal, overlap: best };
}
