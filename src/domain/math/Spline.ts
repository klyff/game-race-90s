import type { Vec2 } from './Vec2.ts';

/**
 * Closed uniform Catmull-Rom spline.
 *
 * Catmull-Rom passes exactly through its control points, which is what makes a
 * track authorable: the points in a `.track.ts` file are the corners you drew,
 * not opaque Bézier handles. Closed, so the last point joins back to the first
 * with no seam.
 *
 * Evaluation is in (segment, t) space. Arc length is handled one layer up, by
 * `TrackSpline` — separating the two keeps this class a pure curve.
 */
export class CatmullRomSpline {
  private readonly points: readonly Vec2[];

  constructor(controlPoints: readonly Vec2[]) {
    if (controlPoints.length < 4) {
      throw new Error(
        `A closed Catmull-Rom spline needs at least 4 control points, received ${controlPoints.length}`,
      );
    }
    this.points = controlPoints;
  }

  /** Number of segments; equal to the control point count because it is closed. */
  get segmentCount(): number {
    return this.points.length;
  }

  /** Wraps an index into range, so segment 0 can reach back to the last point. */
  private at(index: number): Vec2 {
    const count = this.points.length;
    return this.points[((index % count) + count) % count]!;
  }

  /**
   * Position on `segment` at local parameter `t` in [0, 1].
   *
   *   p(t) = 0.5 * (2*P1 + (P2-P0)t + (2*P0-5*P1+4*P2-P3)t² + (-P0+3*P1-3*P2+P3)t³)
   */
  position(segment: number, t: number): Vec2 {
    const p0 = this.at(segment - 1);
    const p1 = this.at(segment);
    const p2 = this.at(segment + 1);
    const p3 = this.at(segment + 2);
    const t2 = t * t;
    const t3 = t2 * t;

    return {
      x:
        0.5 *
        (2 * p1.x +
          (p2.x - p0.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y:
        0.5 *
        (2 * p1.y +
          (p2.y - p0.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    };
  }

  /** First derivative with respect to t. Direction of travel, unnormalised. */
  derivative(segment: number, t: number): Vec2 {
    const p0 = this.at(segment - 1);
    const p1 = this.at(segment);
    const p2 = this.at(segment + 1);
    const p3 = this.at(segment + 2);
    const t2 = t * t;

    return {
      x:
        0.5 *
        (p2.x -
          p0.x +
          2 * (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t +
          3 * (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t2),
      y:
        0.5 *
        (p2.y -
          p0.y +
          2 * (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t +
          3 * (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t2),
    };
  }
}
