/**
 * Immutable 2D vector helpers.
 *
 * Plain object literals rather than a class: the domain layer is serialised in
 * tests and compared field-by-field, and structural typing keeps that trivial.
 * Allocation is not a concern at 60 Hz with a handful of cars.
 */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const VEC2_ZERO: Vec2 = { x: 0, y: 0 };

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Vec2, factor: number): Vec2 {
  return { x: a.x * factor, y: a.y * factor };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

/** Z component of the 3D cross product. Positive when b is left of a. */
export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function lengthSquared(a: Vec2): number {
  return a.x * a.x + a.y * a.y;
}

export function length(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distanceSquared(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Returns the zero vector for zero-length input rather than NaN. */
export function normalize(a: Vec2): Vec2 {
  const magnitude = Math.hypot(a.x, a.y);
  if (magnitude === 0) return VEC2_ZERO;
  return { x: a.x / magnitude, y: a.y / magnitude };
}

/** Rotates 90° counter-clockwise: the left-hand normal of a heading. */
export function perpendicularLeft(a: Vec2): Vec2 {
  return { x: -a.y, y: a.x };
}

export function fromAngle(radians: number): Vec2 {
  return { x: Math.cos(radians), y: Math.sin(radians) };
}

export function angleOf(a: Vec2): number {
  return Math.atan2(a.y, a.x);
}

export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
