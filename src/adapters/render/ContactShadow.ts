/**
 * Ground contact shadow pose for a live car.
 *
 * The sprite pin in `cars.json` is the chassis origin on the ground. The blob
 * shares that COM (height 0) and yaws from the collision box so it reads as a
 * contact patch under the painted car, not an axis-aligned pancake beside it.
 *
 * Always sits at height 0 so a jump still reads. No springs — arcade contact
 * only: COM on the asphalt, footprint from the hit box.
 */

import { fromAngle, scale } from '../../domain/math/Vec2.ts';
import type { Vec2 } from '../../domain/math/Vec2.ts';
import type { IsoProjection } from './IsoProjection.ts';

export interface ContactShadowPose {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Screen radians, Phaser `setRotation`. Along-axis after iso projection. */
  readonly rotation: number;
}

export interface ContactShadowInput {
  readonly projection: IsoProjection;
  readonly position: Vec2;
  readonly heading: number;
  readonly collisionAlong?: number;
  readonly collisionAcross?: number;
  readonly collisionRadius: number;
  /** Sprite ground pin. The blob uses the same world point; no extra cell nudge. */
  readonly origin: { readonly x: number; readonly y: number };
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly displayScale: number;
  /**
   * Ignored. Accepted so callers cannot accidentally lift the blob with the
   * airborne sprite. The contact patch stays on the ground.
   */
  readonly height?: number;
}

/** Live hit boxes are larger than the painted chassis; this keeps the blob under the body. */
export const CONTACT_PATCH_SCALE = 0.72;
/** Softer than ISO_Y/ISO_X (0.5) so the oval still reads under the chassis. */
export const CONTACT_HEIGHT_SQUASH = 0.72;

function positiveHalf(value: number | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (Number.isFinite(fallback) && fallback > 0) {
    return fallback;
  }
  return 1;
}

/**
 * Screen pose of the contact ellipse under `position`, independent of air height.
 */
export function contactShadowPose(input: ContactShadowInput): ContactShadowPose {
  const ground = input.projection.toScreen(input.position);
  const halfAlong = positiveHalf(input.collisionAlong, input.collisionRadius);
  const halfAcross = positiveHalf(input.collisionAcross, input.collisionRadius);
  const ppu = input.projection.pixelsPerUnit * CONTACT_PATCH_SCALE;

  const forward = fromAngle(input.heading);
  const along = input.projection.toScreen(scale(forward, halfAlong));

  return {
    x: ground.x,
    y: ground.y,
    width: 2 * halfAlong * ppu,
    height: 2 * halfAcross * ppu * CONTACT_HEIGHT_SQUASH,
    rotation: Math.atan2(along.y, along.x),
  };
}
