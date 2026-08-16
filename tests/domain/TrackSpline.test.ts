import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import { findTrack } from '../../src/data/tracks/registry.ts';
import { add, distance, dot, length, scale } from '../../src/domain/math/Vec2.ts';
import type { Vec2 } from '../../src/domain/math/Vec2.ts';

/**
 * A circle is the ideal fixture: its arc length, curvature and nearest-point
 * answers are all known in closed form, so these tests check the maths rather
 * than merely re-asserting whatever the implementation happens to produce.
 *
 * Points are laid out counter-clockwise, so travel bends LEFT and curvature is
 * positive, and the left-hand normal points inwards towards the centre.
 */
const RADIUS = 100;
const POINT_COUNT = 16;

function circleControlPoints(): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i < POINT_COUNT; i += 1) {
    const angle = (i / POINT_COUNT) * Math.PI * 2;
    points.push({ x: Math.cos(angle) * RADIUS, y: Math.sin(angle) * RADIUS });
  }
  return points;
}

const circle = new TrackSpline(circleControlPoints());

describe('CatmullRomSpline construction', () => {
  it('rejects a control point count too small to close a loop', () => {
    expect(() => new TrackSpline([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }])).toThrow(
      /at least 4 control points/,
    );
  });
});

describe('TrackSpline arc length', () => {
  it('matches the circumference of the circle it interpolates', () => {
    const expected = 2 * Math.PI * RADIUS;
    expect(circle.totalLength).toBeCloseTo(expected, 0);
    expect(Math.abs(circle.totalLength - expected) / expected).toBeLessThan(0.002);
  });

  it('passes through its control points', () => {
    // Control point 0 sits at distance 0 by construction.
    expect(distance(circle.frameAt(0).position, { x: RADIUS, y: 0 })).toBeLessThan(0.01);
  });

  it('keeps every sampled point on the circle', () => {
    for (let i = 0; i < 200; i += 1) {
      const point = circle.positionAt((i / 200) * circle.totalLength);
      expect(Math.abs(Math.hypot(point.x, point.y) - RADIUS)).toBeLessThan(0.2);
    }
  });

  it('advances distance monotonically and wraps cleanly', () => {
    expect(circle.wrap(-1)).toBeCloseTo(circle.totalLength - 1, 6);
    expect(circle.wrap(circle.totalLength + 5)).toBeCloseTo(5, 6);
    expect(circle.wrap(0)).toBe(0);
  });
});

describe('TrackSpline frames', () => {
  it('produces a unit tangent perpendicular to a unit normal', () => {
    for (let i = 0; i < 32; i += 1) {
      const frame = circle.frameAt((i / 32) * circle.totalLength);
      expect(length(frame.tangent)).toBeCloseTo(1, 6);
      expect(length(frame.normal)).toBeCloseTo(1, 6);
      expect(dot(frame.tangent, frame.normal)).toBeCloseTo(0, 6);
    }
  });

  it('reports curvature 1/R, signed positive for a left-hand turn', () => {
    // Within 1% on purpose. The spline is not exactly a circle — it wanders
    // 0.055 units off it and its true curvature oscillates ±10% once per
    // segment — so this only holds because curvature is measured over a span of
    // one segment, which cancels that wiggle. If this tolerance has to be
    // loosened, that averaging has regressed.
    for (let i = 0; i < 16; i += 1) {
      const frame = circle.frameAt((i / 16) * circle.totalLength);
      expect(frame.curvature).toBeGreaterThan(0);
      expect(Math.abs(frame.curvature - 1 / RADIUS) / (1 / RADIUS)).toBeLessThan(0.01);
    }
  });

  it('averages out the per-segment wiggle instead of tracking it', () => {
    // Sampled far more densely than the control points: a naive pointwise
    // curvature swings ±10% here, which would make the AI brake and accelerate
    // rhythmically all the way around a constant-radius corner.
    let minimum = Number.POSITIVE_INFINITY;
    let maximum = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < 256; i += 1) {
      const k = circle.curvatureAt((i / 256) * circle.totalLength);
      minimum = Math.min(minimum, k);
      maximum = Math.max(maximum, k);
    }
    expect((maximum - minimum) / (1 / RADIUS)).toBeLessThan(0.02);
  });

  it('reports curvature near zero along a straight', () => {
    // A stadium: two long straights joined by hairpins. The middle of a straight
    // must read as flat, or the AI would brake for a corner that is not there.
    const stadium = new TrackSpline([
      { x: -300, y: -40 },
      { x: -100, y: -40 },
      { x: 100, y: -40 },
      { x: 300, y: -40 },
      { x: 340, y: 0 },
      { x: 300, y: 40 },
      { x: 100, y: 40 },
      { x: -100, y: 40 },
      { x: -300, y: 40 },
      { x: -340, y: 0 },
    ]);
    expect(Math.abs(stadium.project({ x: 0, y: -40 }).curvature)).toBeLessThan(0.001);
  });

  it('flips the sign of curvature when the track is driven the other way round', () => {
    const clockwise = new TrackSpline(circleControlPoints().slice().reverse());
    for (let i = 0; i < 8; i += 1) {
      const frame = clockwise.frameAt((i / 8) * clockwise.totalLength);
      expect(frame.curvature).toBeLessThan(0);
      expect(Math.abs(frame.curvature + 1 / RADIUS) / (1 / RADIUS)).toBeLessThan(0.01);
    }
  });

  it('points the left-hand normal towards the centre of a left turn', () => {
    const frame = circle.frameAt(0);
    // At (R, 0) travelling counter-clockwise the tangent is +Y and left is -X.
    expect(frame.tangent.x).toBeCloseTo(0, 3);
    expect(frame.tangent.y).toBeCloseTo(1, 3);
    expect(frame.normal.x).toBeCloseTo(-1, 3);
  });
});

describe('TrackSpline.project', () => {
  it('reports zero lateral offset for a point on the centreline', () => {
    const onLine = circle.positionAt(circle.totalLength * 0.37);
    const projection = circle.project(onLine);
    expect(Math.abs(projection.lateralOffset)).toBeLessThan(0.05);
    expect(projection.distance).toBeCloseTo(circle.totalLength * 0.37, 1);
  });

  it('signs lateral offset negative outside a left-hand loop and positive inside', () => {
    const outside = circle.project({ x: RADIUS + 12, y: 0 });
    expect(outside.lateralOffset).toBeCloseTo(-12, 1);

    const inside = circle.project({ x: RADIUS - 12, y: 0 });
    expect(inside.lateralOffset).toBeCloseTo(12, 1);
  });

  it('recovers the offset at many angles around the loop', () => {
    for (let i = 0; i < 24; i += 1) {
      const angle = (i / 24) * Math.PI * 2;
      const offset = 7;
      const probe = {
        x: Math.cos(angle) * (RADIUS + offset),
        y: Math.sin(angle) * (RADIUS + offset),
      };
      expect(circle.project(probe).lateralOffset).toBeCloseTo(-offset, 1);
    }
  });
});

describe('TrackSpline.projectNear', () => {
  it('agrees with the exhaustive projection when given a good hint', () => {
    for (let i = 0; i < 24; i += 1) {
      const trueDistance = (i / 24) * circle.totalLength;
      const centre = circle.positionAt(trueDistance);
      const frame = circle.frameAt(trueDistance);
      const probe = {
        x: centre.x + frame.normal.x * 5,
        y: centre.y + frame.normal.y * 5,
      };

      const exhaustive = circle.project(probe);
      const hinted = circle.projectNear(probe, trueDistance - 3, 20);
      expect(hinted.lateralOffset).toBeCloseTo(exhaustive.lateralOffset, 3);
      expect(circle.signedDelta(hinted.distance, exhaustive.distance)).toBeCloseTo(0, 3);
    }
  });

  it('still works when the hint sits just across the wrap point', () => {
    const probe = circle.positionAt(2);
    const hinted = circle.projectNear(probe, circle.totalLength - 4, 20);
    expect(Math.abs(circle.signedDelta(hinted.distance, 2))).toBeLessThan(0.1);
  });

  it('falls back to an exhaustive search when the window covers the whole track', () => {
    const probe = circle.positionAt(circle.totalLength * 0.8);
    const hinted = circle.projectNear(probe, 0, circle.totalLength);
    expect(Math.abs(circle.signedDelta(hinted.distance, circle.totalLength * 0.8))).toBeLessThan(0.1);
  });
});

/**
 * Regression coverage for a critical bug: `projectNear` used to locate its
 * search window by dividing an arc length by the AVERAGE sample spacing
 * (`totalLength / sampleCount`). The sample table is uniform in the SPLINE
 * PARAMETER, not in arc length, so that division is only correct when every
 * authored segment happens to be the same length.
 *
 * The circle fixture above (`circleControlPoints`) evenly spaces 16 control
 * points around a perfect circle, so its segments ARE all the same length and
 * the average spacing equals the true local spacing everywhere — the bug is
 * completely invisible on that fixture, which is exactly why the existing
 * `TrackSpline.projectNear` tests above passed both before and after the fix.
 * `thunder-basin` is a real, irregularly authored circuit (tight hairpin
 * segments packed close together, a long straight with widely spaced points,
 * per decision 14 in WORKLOG.md), so the average spacing diverges sharply from
 * the local spacing and the bug shows up as 150+ unit projection errors.
 */
describe('TrackSpline.projectNear on an irregular real track (regression)', () => {
  const track = findTrack('thunder-basin');
  const thunderBasin = new TrackSpline(track.controlPoints);
  const SEARCH_WINDOW = 20;
  const LAP_SAMPLE_COUNT = 40;

  function offsetPoint(arc: number, lateralOffset: number): Vec2 {
    const frame = thunderBasin.frameAt(arc);
    return add(frame.position, scale(frame.normal, lateralOffset));
  }

  it('agrees with the exhaustive projection across the whole lap, for points on, left of and right of the centreline', () => {
    for (let i = 0; i < LAP_SAMPLE_COUNT; i += 1) {
      const trueArc = (i / LAP_SAMPLE_COUNT) * thunderBasin.totalLength;
      for (const lateralOffset of [-9, 0, 9]) {
        const point = offsetPoint(trueArc, lateralOffset);
        const exhaustive = thunderBasin.project(point);
        const hinted = thunderBasin.projectNear(point, trueArc, SEARCH_WINDOW);

        expect(Math.abs(thunderBasin.signedDelta(hinted.distance, exhaustive.distance))).toBeLessThan(
          0.5,
        );
        expect(hinted.lateralOffset).toBeCloseTo(exhaustive.lateralOffset, 0);
      }
    }
  });

  it('still agrees when the hint is stale by up to +/-15 units but stays inside the window', () => {
    for (let i = 0; i < LAP_SAMPLE_COUNT; i += 1) {
      const trueArc = (i / LAP_SAMPLE_COUNT) * thunderBasin.totalLength;
      for (const staleness of [-15, -7, 7, 15]) {
        for (const lateralOffset of [-9, 0, 9]) {
          const point = offsetPoint(trueArc, lateralOffset);
          const exhaustive = thunderBasin.project(point);
          const staleHint = trueArc + staleness;
          const hinted = thunderBasin.projectNear(point, staleHint, SEARCH_WINDOW);

          expect(
            Math.abs(thunderBasin.signedDelta(hinted.distance, exhaustive.distance)),
          ).toBeLessThan(0.5);
          expect(hinted.lateralOffset).toBeCloseTo(exhaustive.lateralOffset, 0);
        }
      }
    }
  });

  it('does not run away when the reported distance is fed back in as the next hint, step after step', () => {
    // This is the exact failure mode that broke the game: RaceScene feeds each
    // step's projectNear() result back in as next step's hint. With the
    // average-spacing bug, a single bad frame near a tight segment could throw
    // the hint index far from the true position, and because the corrupted
    // hint is used again next step, the error compounded instead of
    // correcting itself. The observed failure sequence on this exact track
    // was: 63 -> 66 -> 69 -> 75 -> 86 -> 106 -> 143 -> 318 -> 675 -> 1084.
    let trueArc = 63;
    let hint = 63;
    const maxAllowedError = SEARCH_WINDOW; // must never exceed the search window itself

    for (let i = 0; i < 200; i += 1) {
      trueArc = thunderBasin.wrap(trueArc + 1);
      const point = offsetPoint(trueArc, -9);
      const result = thunderBasin.projectNear(point, hint, SEARCH_WINDOW);

      const error = Math.abs(thunderBasin.signedDelta(result.distance, trueArc));
      expect(error).toBeLessThan(maxAllowedError);
      expect(result.lateralOffset).toBeCloseTo(-9, 0);

      hint = result.distance;
    }
  });
});

describe('TrackSpline.signedDelta', () => {
  it('returns the shortest way round, signed', () => {
    const total = circle.totalLength;
    expect(circle.signedDelta(10, 30)).toBeCloseTo(20, 6);
    expect(circle.signedDelta(30, 10)).toBeCloseTo(-20, 6);
    // Across the wrap point: 5 units forward, not (total - 5) backwards.
    expect(circle.signedDelta(total - 2, 3)).toBeCloseTo(5, 6);
    expect(circle.signedDelta(3, total - 2)).toBeCloseTo(-5, 6);
  });

  it('never exceeds half the lap in magnitude', () => {
    const total = circle.totalLength;
    for (let i = 0; i < 50; i += 1) {
      const from = (i / 50) * total;
      for (let j = 0; j < 50; j += 1) {
        const to = (j / 50) * total;
        expect(Math.abs(circle.signedDelta(from, to))).toBeLessThanOrEqual(total / 2 + 1e-9);
      }
    }
  });
});
