import { ISO_X, ISO_Y } from '../constants.ts';
import type { Vec2 } from './Vec2.ts';

/**
 * 2:1 dimetric: world heading → screen travel. Phaser +Y is down.
 * +X world → (ISO_X, ISO_Y) = down-right. +Y world → (-ISO_X, ISO_Y) = down-left.
 */
export function screenDeltaFromHeading(heading: number): Vec2 {
  const cosine = Math.cos(heading);
  const sine = Math.sin(heading);
  return {
    x: ISO_X * (cosine - sine),
    y: ISO_Y * (cosine + sine),
  };
}

/** Same 2:1 basis, for a world chord (start line → 50 m ahead, or any travel). */
export function screenDeltaFromWorldDelta(delta: Vec2): Vec2 {
  return {
    x: ISO_X * (delta.x - delta.y),
    y: ISO_Y * (delta.x + delta.y),
  };
}

/**
 * Sprite clock yaw. 0 = 6h = screen down = indice[0] (nose to the bottom).
 * Positive is clockwise, same as matrix_car a000…a029.
 */
export function clockYawFromScreenDelta(screen: Vec2): number {
  return Math.atan2(-screen.x, screen.y);
}

export function clockYawFromWorldHeading(heading: number): number {
  return clockYawFromScreenDelta(screenDeltaFromHeading(heading));
}

/** Nearest slot in the strip array. 30-frame matrix: 12° per index. */
export function nearestClockIndex(yaw: number, frameCount: number): number {
  const count = Number.isFinite(frameCount) && frameCount > 0 ? Math.floor(frameCount) : 1;
  const arc = (Math.PI * 2) / count;
  const index = ((Math.round(yaw / arc) % count) + count) % count;
  return index === 0 ? 0 : index;
}

/**
 * Nearest strip frame for a world heading under the 2:1 clock.
 * World +X is ~4h (hero / a025 on a 30-frame strip), not a000.
 */
export function frameIndexForClockHeading(heading: number, frameCount: number): number {
  return nearestClockIndex(clockYawFromWorldHeading(heading), frameCount);
}

/**
 * Nearest array index for a world chord after 2:1 projection.
 * Start pose: point zero → 50 m along the line. Curves: current travel.
 */
export function nearestClockIndexFromWorldChord(
  from: Vec2,
  to: Vec2,
  frameCount: number,
): number {
  return nearestClockIndex(
    clockYawFromScreenDelta(
      screenDeltaFromWorldDelta({ x: to.x - from.x, y: to.y - from.y }),
    ),
    frameCount,
  );
}
