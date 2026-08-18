import { describe, expect, it } from 'vitest';
import { marauder } from '../../tools/spritegen/cars/marauder.car.ts';
import { poseExtents, poseRectPx, unionExtents } from '../../tools/spritegen/pose-footprint.ts';
import {
  REDRAWN_FRAME_SIZE,
  REDRAWN_PIXELS_PER_UNIT,
  STRIP_ORIGIN,
  STRIP_PIXELS_PER_UNIT,
} from '../../tools/spritegen/strip-contract.ts';

describe('pose footprint from fixed world size', () => {
  const pinX = STRIP_ORIGIN.x * 64;
  const pinY = STRIP_ORIGIN.y * 64;

  it('a side pose is wider and shorter than a full-front pose', () => {
    const front = poseExtents(marauder, 4);
    const side = poseExtents(marauder, 12);
    expect(side.maxSx - side.minSx).toBeGreaterThan(front.maxSx - front.minSx);
    expect(side.maxSy - side.minSy).toBeLessThan(front.maxSy - front.minSy);
  });

  it('the shared box is the union of every yaw, not a painted fill', () => {
    const union = unionExtents(marauder);
    const side = poseExtents(marauder, 12);
    expect(union.maxSx - union.minSx).toBeGreaterThanOrEqual(side.maxSx - side.minSx);
    expect(union.maxSy - union.minSy).toBeGreaterThanOrEqual(side.maxSy - side.minSy);
  });

  it('fleet pixelsPerUnit keeps every pose inside the 4px margin', () => {
    for (const frame of [0, 4, 8, 12, 16, 20, 24, 28]) {
      const rect = poseRectPx(poseExtents(marauder, frame), pinX, pinY, STRIP_PIXELS_PER_UNIT);
      expect(rect.x).toBeGreaterThanOrEqual(4);
      expect(rect.y).toBeGreaterThanOrEqual(4);
      expect(rect.x + rect.width).toBeLessThanOrEqual(60);
      expect(rect.y + rect.height).toBeLessThanOrEqual(60);
    }
  });

  it('the 128 cell at 2× ppu keeps the same world layout as the 64 fleet cell', () => {
    const pinX = STRIP_ORIGIN.x * REDRAWN_FRAME_SIZE;
    const pinY = STRIP_ORIGIN.y * REDRAWN_FRAME_SIZE;
    for (const frame of [0, 4, 8, 12, 16, 20, 24, 28]) {
      const rect = poseRectPx(poseExtents(marauder, frame), pinX, pinY, REDRAWN_PIXELS_PER_UNIT);
      expect(rect.x).toBeGreaterThanOrEqual(8);
      expect(rect.y).toBeGreaterThanOrEqual(8);
      expect(rect.x + rect.width).toBeLessThanOrEqual(REDRAWN_FRAME_SIZE - 8);
      expect(rect.y + rect.height).toBeLessThanOrEqual(REDRAWN_FRAME_SIZE - 8);
    }
  });
});
