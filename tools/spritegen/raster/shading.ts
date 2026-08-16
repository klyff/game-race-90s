import { SHADE_STEP } from '../../../src/domain/constants.ts';
import type { ShadeStep } from '../../../src/domain/constants.ts';
import type { Vec3 } from '../geometry.ts';

/**
 * Light direction, fixed in WORLD space — not attached to the car. Every car on
 * track is therefore lit identically, and a car's shading changes as it turns,
 * which is what sells the rotation as three-dimensional.
 *
 * Weighted strongly towards +Z so that no yaw angle ends up with only dark
 * faces visible.
 */
const LIGHT: Vec3 = normalize({ x: -0.38, y: 0.42, z: 0.82 });

/**
 * Lambert thresholds mapping onto the four ramp steps. Deliberately discrete —
 * banded flat faces read as pixel art, a smooth gradient reads as a 3D render.
 */
const HIGHLIGHT_THRESHOLD = 0.62;
const BASE_THRESHOLD = 0.22;
const SHADE_THRESHOLD = -0.15;

function normalize(v: Vec3): Vec3 {
  const magnitude = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return { x: v.x / magnitude, y: v.y / magnitude, z: v.z / magnitude };
}

export function shadeStepFor(normal: Vec3): ShadeStep {
  const lambert = normal.x * LIGHT.x + normal.y * LIGHT.y + normal.z * LIGHT.z;
  if (lambert > HIGHLIGHT_THRESHOLD) return SHADE_STEP.HIGHLIGHT;
  if (lambert > BASE_THRESHOLD) return SHADE_STEP.BASE;
  if (lambert > SHADE_THRESHOLD) return SHADE_STEP.SHADE;
  return SHADE_STEP.DARK;
}
