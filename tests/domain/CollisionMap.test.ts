import { describe, expect, it } from 'vitest';
import {
  bestCollisionBox,
  collisionBox,
  collisionBoxFromStats,
  collisionSquares,
  overlapObb,
} from '../../src/domain/vehicle/CollisionMap.ts';
import { vec2 } from '../../src/domain/math/Vec2.ts';
import type { VehicleStats } from '../../src/domain/vehicle/VehicleStats.ts';

const BOX = collisionBox(2, 0.9);

describe('bestCollisionBox', () => {
  it('keeps a long car as a rectangle', () => {
    expect(bestCollisionBox(1.98, 1.09)).toEqual({ along: 1.98, across: 1.09 });
  });

  it('uses a square when length and width are close', () => {
    expect(bestCollisionBox(1.2, 1.1)).toEqual({ along: 1.2, across: 1.2 });
  });
});

describe('collisionSquares', () => {
  it('min is the inscribed square, max is the containing square, mid is the hit box', () => {
    const squares = collisionSquares(1.98, 1.09);
    expect(squares.min).toBe(1.09);
    expect(squares.max).toBe(1.98);
    expect(squares.mid).toBeCloseTo(1.535, 4);
  });
});

describe('collisionBoxFromStats', () => {
  it('uses the midpoint square on every side', () => {
    expect(
      collisionBoxFromStats({
        collisionRadius: 1,
        collisionSquare: 1.535,
      } as VehicleStats),
    ).toEqual({ along: 1.535, across: 1.535 });
  });
});

describe('overlapObb', () => {
  it('two heading-aligned boxes overlap along the nose', () => {
    const hit = overlapObb(vec2(0, 0), BOX, 0, vec2(3.2, 0), BOX, 0);
    expect(hit).toBeDefined();
    expect(hit!.overlap).toBeCloseTo(0.8, 5);
    expect(hit!.normal.x).toBeGreaterThan(0);
  });

  it('side-by-side boxes that a circle would swallow do not overlap', () => {
    const hit = overlapObb(vec2(0, 0), BOX, 0, vec2(0, 2.0), BOX, 0);
    expect(hit).toBeUndefined();
  });

  it('T-bone: the across of one meets the along of the other', () => {
    const hit = overlapObb(vec2(0, 0), BOX, 0, vec2(2.4, 0), BOX, Math.PI / 2);
    expect(hit).toBeDefined();
    expect(hit!.overlap).toBeGreaterThan(0);
  });
});
