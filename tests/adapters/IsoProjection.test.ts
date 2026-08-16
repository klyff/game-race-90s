import { IsoProjection, SCREEN_ROTATION_SIGN } from '../../src/adapters/render/IsoProjection.ts';
import { ISO_X, ISO_Y, ISO_Z } from '../../src/domain/constants.ts';
import { cross, fromAngle } from '../../src/domain/math/Vec2.ts';
import type { Vec2 } from '../../src/domain/math/Vec2.ts';

describe('IsoProjection construction', () => {
  it('rejects zero', () => {
    expect(() => new IsoProjection(0)).toThrow(
      /pixelsPerUnit must be a finite positive number/,
    );
  });

  it('rejects negative values', () => {
    expect(() => new IsoProjection(-1)).toThrow(
      /pixelsPerUnit must be a finite positive number/,
    );
  });

  it('rejects NaN', () => {
    expect(() => new IsoProjection(Number.NaN)).toThrow(
      /pixelsPerUnit must be a finite positive number/,
    );
  });

  it('rejects Infinity', () => {
    expect(() => new IsoProjection(Number.POSITIVE_INFINITY)).toThrow(
      /pixelsPerUnit must be a finite positive number/,
    );
  });

  it('rejects negative Infinity', () => {
    expect(() => new IsoProjection(Number.NEGATIVE_INFINITY)).toThrow(
      /pixelsPerUnit must be a finite positive number/,
    );
  });
});

describe('IsoProjection.toScreen', () => {
  const proj = new IsoProjection(1);

  it('maps the origin to screen origin', () => {
    const result = proj.toScreen({ x: 0, y: 0 });
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('maps +X to positive screen X and positive screen Y', () => {
    // +X basis vector maps to (ISO_X, ISO_Y) = (1, 0.5)
    const result = proj.toScreen({ x: 1, y: 0 });
    expect(result.x).toBe(ISO_X);
    expect(result.y).toBe(ISO_Y);
    expect(result.x).toBeGreaterThan(0);
    expect(result.y).toBeGreaterThan(0);
  });

  it('maps +Y to negative screen X and positive screen Y', () => {
    // +Y basis vector maps to (-ISO_X, ISO_Y) = (-1, 0.5)
    const result = proj.toScreen({ x: 0, y: 1 });
    expect(result.x).toBe(-ISO_X);
    expect(result.y).toBe(ISO_Y);
    expect(result.x).toBeLessThan(0);
    expect(result.y).toBeGreaterThan(0);
  });

  it('applies the projection formulas at a hand-computed point', () => {
    // Point (1, 0), height 0, pixelsPerUnit 1:
    // screenX = (1 - 0) * 1 * 1 = 1
    // screenY = ((1 + 0) * 0.5 - 0 * 0.85) * 1 = 0.5
    const result = proj.toScreen({ x: 1, y: 0 }, 0);
    expect(result.x).toBe(1);
    expect(result.y).toBe(0.5);
  });

  it('applies the projection formulas at a second hand-computed point', () => {
    // Point (2, 1), height 0, pixelsPerUnit 1:
    // screenX = (2 - 1) * 1 * 1 = 1
    // screenY = ((2 + 1) * 0.5 - 0 * 0.85) * 1 = 1.5
    const result = proj.toScreen({ x: 2, y: 1 }, 0);
    expect(result.x).toBe(1);
    expect(result.y).toBe(1.5);
  });

  it('applies the projection formulas with non-zero height', () => {
    // Point (1, 0), height 2, pixelsPerUnit 1:
    // screenX = (1 - 0) * 1 * 1 = 1
    // screenY = ((1 + 0) * 0.5 - 2 * 0.85) * 1 = 0.5 - 1.7 = -1.2
    const result = proj.toScreen({ x: 1, y: 0 }, 2);
    expect(result.x).toBe(1);
    expect(result.y).toBeCloseTo(0.5 - 2 * ISO_Z, 10);
  });

  it('applies the projection formulas with non-unit pixelsPerUnit', () => {
    const proj2 = new IsoProjection(2);
    // Point (1, 0), height 0, pixelsPerUnit 2:
    // screenX = (1 - 0) * 1 * 2 = 2
    // screenY = ((1 + 0) * 0.5 - 0 * 0.85) * 2 = 1
    const result = proj2.toScreen({ x: 1, y: 0 }, 0);
    expect(result.x).toBe(2);
    expect(result.y).toBe(1);
  });

  it('positive height moves points up the screen (smaller screen Y)', () => {
    const point = { x: 1, y: 1 };
    const screenYNoHeight = proj.toScreen(point, 0).y;
    const screenYWithHeight = proj.toScreen(point, 1).y;
    expect(screenYWithHeight).toBeLessThan(screenYNoHeight);
  });
});

describe('IsoProjection.depthOf', () => {
  const proj = new IsoProjection(1);

  it('returns x + y for the depth key', () => {
    expect(proj.depthOf({ x: 1, y: 2 })).toBe(3);
    expect(proj.depthOf({ x: 5, y: 3 })).toBe(8);
    expect(proj.depthOf({ x: 0, y: 0 })).toBe(0);
  });

  it('points further along x + y have strictly greater depth', () => {
    const p1 = { x: 1, y: 0 };
    const p2 = { x: 1, y: 1 };
    const p3 = { x: 2, y: 0 };
    expect(proj.depthOf(p2)).toBeGreaterThan(proj.depthOf(p1));
    expect(proj.depthOf(p3)).toBeGreaterThan(proj.depthOf(p1));
  });

  it('points further along x + y have strictly greater screen Y', () => {
    const p1 = { x: 1, y: 0 };
    const p2 = { x: 1, y: 1 };
    const screenY1 = proj.toScreen(p1).y;
    const screenY2 = proj.toScreen(p2).y;
    expect(screenY2).toBeGreaterThan(screenY1);
  });

  it('painters-order is consistent with depth keys and screen Y', () => {
    const points: Vec2[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 3, y: 2 },
      { x: 2, y: 4 },
    ];

    const byDepth = [...points].sort((a, b) => proj.depthOf(a) - proj.depthOf(b));
    const byScreenY = [...points].sort((a, b) => proj.toScreen(a).y - proj.toScreen(b).y);

    // Both orderings should be identical.
    for (let i = 0; i < points.length; i += 1) {
      expect(byDepth[i]).toEqual(byScreenY[i]);
    }
  });
});

describe('SCREEN_ROTATION_SIGN constant', () => {
  it('is exactly -1', () => {
    expect(SCREEN_ROTATION_SIGN).toBe(-1);
  });

  it('is derived from the projection and not a hard-guessed literal', () => {
    // SCREEN_ROTATION_SIGN is computed from the 2D cross product of the
    // screen basis vectors: -Math.sign(2 * ISO_X * ISO_Y).
    // Verify the derivation: the basis vectors map to
    // +X -> (ISO_X, ISO_Y) and +Y -> (-ISO_X, ISO_Y).
    // Their 2D cross product (thinking of them as 2D vectors on screen) is:
    //   ISO_X * ISO_Y - (-ISO_X) * ISO_Y = 2 * ISO_X * ISO_Y
    const crossProduct = 2 * ISO_X * ISO_Y;
    expect(crossProduct).toBeGreaterThan(0);
    expect(SCREEN_ROTATION_SIGN).toBe(-Math.sign(crossProduct));
  });

  it('correctly mirrors world rotations to screen rotations', () => {
    // Rotate a unit vector by a small positive angle (counter-clockwise in
    // world space, which is a LEFT turn per decision 13).
    const angle = 0.1; // radians, small positive value
    const v1 = fromAngle(0); // (1, 0)
    const v2 = fromAngle(angle); // (cos(angle), sin(angle))

    const proj = new IsoProjection(1);
    const s1 = proj.toScreen(v1);
    const s2 = proj.toScreen(v2);

    // Treat the projected screen points as 2D vectors and compute their
    // cross product. In a y-DOWN coordinate system, a positive cross product
    // means the turn from s1 to s2 is clockwise on screen.
    const screenCross = cross(s1, s2);
    expect(screenCross).toBeGreaterThan(0);

    // The world rotation is counter-clockwise (positive angle), but the screen
    // rotation is clockwise (positive cross product). This is the mirror that
    // SCREEN_ROTATION_SIGN corrects: when the keyboard says "turn screen-left"
    // (negative 2D screen angle), we need to apply it as a positive steer
    // (left turn in world space) by negating it. Therefore SCREEN_ROTATION_SIGN
    // must be -1.
  });
});
