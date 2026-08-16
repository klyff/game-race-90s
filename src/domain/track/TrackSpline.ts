import { CatmullRomSpline } from '../math/Spline.ts';
import {
  cross,
  distanceSquared,
  dot,
  normalize,
  perpendicularLeft,
  subtract,
} from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';

/** A point on the centreline together with its local frame of reference. */
export interface TrackFrame {
  /** Arc length along the centreline, in [0, totalLength). */
  readonly distance: number;
  readonly position: Vec2;
  /** Unit vector along the direction of travel. */
  readonly tangent: Vec2;
  /** Unit vector 90° left of travel. */
  readonly normal: Vec2;
  /** Signed curvature; positive bends left. */
  readonly curvature: number;
}

/** The result of projecting a world point onto the centreline. */
export interface TrackProjection extends TrackFrame {
  /** Signed distance from the centreline; positive is left of travel. */
  readonly lateralOffset: number;
}

/** Samples per spline segment in the arc-length table. */
const DEFAULT_SAMPLES_PER_SEGMENT = 64;

/** Ternary-search iterations used to refine a projection. */
const REFINE_ITERATIONS = 24;

/**
 * Arc-length parameterised closed track centreline, and the single source of
 * truth for track geometry.
 *
 * Deliberately one class rather than several parallel representations: road
 * rendering, wall collision, checkpoints, lap counting, the starting grid and
 * the AI racing line all derive from these same queries, so they cannot drift
 * out of sync with each other.
 *
 * Distance is the natural coordinate: "how far around the lap", wrapping at
 * `totalLength`. Lateral offset is the other axis. Together they turn wall
 * collision and progress tracking into arithmetic instead of geometry.
 */
export class TrackSpline {
  private readonly spline: CatmullRomSpline;
  private readonly samplesPerSegment: number;
  /** Positions at each sample, indexed 0..sampleCount-1. */
  private readonly samplePositions: readonly Vec2[];
  /** Cumulative arc length, indexed 0..sampleCount (last entry = totalLength). */
  private readonly cumulativeLengths: readonly number[];
  readonly totalLength: number;

  constructor(
    controlPoints: readonly Vec2[],
    samplesPerSegment: number = DEFAULT_SAMPLES_PER_SEGMENT,
  ) {
    if (samplesPerSegment < 2) {
      throw new Error(`samplesPerSegment must be at least 2, received ${samplesPerSegment}`);
    }
    this.spline = new CatmullRomSpline(controlPoints);
    this.samplesPerSegment = samplesPerSegment;

    const sampleCount = this.spline.segmentCount * samplesPerSegment;
    const positions: Vec2[] = new Array(sampleCount);
    for (let i = 0; i < sampleCount; i += 1) {
      const u = i / samplesPerSegment;
      const segment = Math.floor(u);
      positions[i] = this.spline.position(segment, u - segment);
    }

    // Chord lengths, closing the loop from the last sample back to the first.
    const cumulative: number[] = new Array(sampleCount + 1);
    cumulative[0] = 0;
    for (let i = 1; i <= sampleCount; i += 1) {
      const previous = positions[i - 1]!;
      const current = positions[i % sampleCount]!;
      cumulative[i] = cumulative[i - 1]! + Math.hypot(current.x - previous.x, current.y - previous.y);
    }

    this.samplePositions = positions;
    this.cumulativeLengths = cumulative;
    this.totalLength = cumulative[sampleCount]!;
  }

  get sampleCount(): number {
    return this.samplePositions.length;
  }

  /** Folds any distance into [0, totalLength). */
  wrap(distance: number): number {
    const wrapped = distance % this.totalLength;
    return wrapped < 0 ? wrapped + this.totalLength : wrapped;
  }

  /**
   * Shortest signed distance from `from` to `to` around the loop, in
   * (-totalLength/2, totalLength/2]. Positive means `to` is ahead.
   */
  signedDelta(from: number, to: number): number {
    const half = this.totalLength / 2;
    let delta = this.wrap(to) - this.wrap(from);
    if (delta > half) delta -= this.totalLength;
    if (delta <= -half) delta += this.totalLength;
    return delta;
  }

  /**
   * Index of the sample immediately at or before `distance` in the arc-length
   * table, found by binary search over `cumulativeLengths`.
   *
   * The sample table is uniform in the SPLINE PARAMETER, not in arc length —
   * authored segments differ in length on every real track, so the spacing
   * between consecutive samples varies. Dividing an arc length by the average
   * spacing (`totalLength / sampleCount`) to guess an index is therefore wrong
   * by however much that track's segment lengths vary from the average; this
   * binary search is the only exact way to go from arc length to sample index.
   */
  private sampleIndexAt(distance: number): number {
    const target = this.wrap(distance);

    let low = 0;
    let high = this.samplePositions.length;
    while (high - low > 1) {
      const middle = (low + high) >>> 1;
      if (this.cumulativeLengths[middle]! <= target) low = middle;
      else high = middle;
    }
    return low;
  }

  /** Maps an arc length onto the spline's (segment, t) parameter space. */
  private parameterAt(distance: number): { segment: number; t: number } {
    const target = this.wrap(distance);
    const low = this.sampleIndexAt(target);

    const spanStart = this.cumulativeLengths[low]!;
    const spanLength = this.cumulativeLengths[low + 1]! - spanStart;
    const localFraction = spanLength > 0 ? (target - spanStart) / spanLength : 0;

    const u = (low + localFraction) / this.samplesPerSegment;
    const segment = Math.floor(u);
    return { segment, t: u - segment };
  }

  frameAt(distance: number): TrackFrame {
    const wrapped = this.wrap(distance);
    const { segment, t } = this.parameterAt(wrapped);
    const tangent = normalize(this.spline.derivative(segment, t));
    return {
      distance: wrapped,
      position: this.spline.position(segment, t),
      tangent,
      normal: perpendicularLeft(tangent),
      curvature: this.curvatureAt(wrapped),
    };
  }

  positionAt(distance: number): Vec2 {
    const { segment, t } = this.parameterAt(distance);
    return this.spline.position(segment, t);
  }

  /** Arc length of the authored segment containing `distance`. */
  private segmentLengthAt(distance: number): number {
    const { segment } = this.parameterAt(distance);
    const start = this.cumulativeLengths[segment * this.samplesPerSegment]!;
    const end = this.cumulativeLengths[(segment + 1) * this.samplesPerSegment]!;
    return end - start;
  }

  /**
   * Signed curvature at `distance`, positive when the track bends left, taken
   * from the circle through three points spaced `span` apart in ARC LENGTH.
   *
   * Not the spline's analytic second derivative, and the span is not arbitrary.
   * A uniform Catmull-Rom through 16 evenly spaced points on a circle of radius
   * 100 is not a circle: it wanders up to 0.055 units off it, and its true
   * curvature therefore oscillates between 0.00945 and 0.01107 — about ±10%
   * around 1/R — once per segment. Measured behaviour across spans on that
   * fixture:
   *
   *   span  1.8 -> ±10.7%     span 16 -> ±4.0%
   *   span  8   -> ±7.3%      span 32 -> ±0.4%
   *
   * The wiggle's period is one segment, so averaging over roughly one segment
   * cancels it — hence the default span is the LOCAL segment length. That also
   * says something true: curvature resolved finer than the control point spacing
   * is interpolation artifact, not authored design. Using the global average
   * segment length instead would break on a track mixing long straights with
   * tight hairpins.
   *
   * Callers may pass an explicit `span` to average a corner over a look-ahead.
   */
  curvatureAt(distance: number, span?: number): number {
    const reach = span ?? this.segmentLengthAt(distance);
    const behind = this.positionAt(distance - reach);
    const here = this.positionAt(distance);
    const ahead = this.positionAt(distance + reach);

    const inbound = subtract(here, behind);
    const outbound = subtract(ahead, here);
    const chord = subtract(ahead, behind);

    // Signed Menger curvature: 1/R of the circumscribed circle, via
    // R = (a*b*c) / (4*Area) and Area = |cross| / 2.
    const denominator =
      Math.hypot(inbound.x, inbound.y) *
      Math.hypot(outbound.x, outbound.y) *
      Math.hypot(chord.x, chord.y);
    if (denominator === 0) return 0;
    return (2 * cross(inbound, outbound)) / denominator;
  }

  /**
   * Projects a world point onto the centreline, scanning every sample.
   *
   * Use this once to initialise a car. For the per-step hot path use
   * `projectNear`, which searches only around the previous result.
   */
  project(point: Vec2): TrackProjection {
    return this.refine(point, this.nearestSampleInRange(point, 0, this.samplePositions.length - 1));
  }

  /**
   * Projects a point, searching only within `searchWindow` world units either
   * side of `hintDistance`.
   *
   * Cars move continuously, so the previous frame's distance is always a good
   * hint. This keeps the per-step cost independent of track length. The window
   * must comfortably exceed the furthest a car can travel in one step, or the
   * projection will lag behind and lateral offset will read nonsense.
   *
   * The sample table is uniform in spline PARAMETER, not in arc length, so the
   * search range cannot be derived from a sample count (that was the bug: on
   * any track whose authored segments differ in length, an index guessed from
   * the average spacing lands on a completely different part of the circuit —
   * up to 150+ units off on Thunder Basin). Instead the centre sample is found
   * by exact binary search (`sampleIndexAt`), and the range is grown outward
   * from it one sample at a time, in ARC LENGTH, until it has covered
   * `searchWindow` on both sides.
   */
  projectNear(point: Vec2, hintDistance: number, searchWindow: number): TrackProjection {
    if (2 * searchWindow >= this.totalLength) return this.project(point);

    const count = this.samplePositions.length;
    const hintWrapped = this.wrap(hintDistance);
    const centreIndex = this.sampleIndexAt(hintWrapped);

    let toIndex = centreIndex;
    while (
      toIndex - centreIndex < count &&
      this.arcLengthOfIndex(toIndex + 1) - hintWrapped <= searchWindow
    ) {
      toIndex += 1;
    }

    let fromIndex = centreIndex;
    while (
      centreIndex - fromIndex < count &&
      hintWrapped - this.arcLengthOfIndex(fromIndex - 1) <= searchWindow
    ) {
      fromIndex -= 1;
    }

    return this.refine(point, this.nearestSampleInRange(point, fromIndex, toIndex));
  }

  /**
   * Arc length of a sample index that may be outside `[0, sampleCount)`,
   * unwinding as many laps as needed. Used to walk a search window outward
   * from a centre index without wrapping the index itself, which would make
   * `fromIndex <= toIndex` (required by `nearestSampleInRange`) impossible to
   * maintain across the wrap point.
   */
  private arcLengthOfIndex(index: number): number {
    const count = this.samplePositions.length;
    const wrappedIndex = ((index % count) + count) % count;
    const laps = (index - wrappedIndex) / count;
    return this.cumulativeLengths[wrappedIndex]! + laps * this.totalLength;
  }

  /** Index of the closest sample within an inclusive, possibly wrapping range. */
  private nearestSampleInRange(point: Vec2, fromIndex: number, toIndex: number): number {
    const count = this.samplePositions.length;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = fromIndex; i <= toIndex; i += 1) {
      const index = ((i % count) + count) % count;
      const candidate = distanceSquared(point, this.samplePositions[index]!);
      if (candidate < bestDistance) {
        bestDistance = candidate;
        bestIndex = index;
      }
    }
    return bestIndex;
  }

  /**
   * Arc length of the sample spans on either side of `sampleIndex`, taking the
   * larger of the two.
   *
   * Used to bracket the ternary search in `refine`. The table is uniform in
   * spline parameter, not arc length, so neighbouring spans are not equal in
   * general — using the global average as the bracket half-width (the original
   * bug) can make the bracket narrower than the true local spacing and clip off
   * the actual minimum before the search ever sees it. Wraps at index 0 (there
   * is no `sampleIndex - 1`, so the backward span is the closing chord from the
   * last sample) but not at the last index, since `cumulativeLengths` carries
   * one extra trailing entry equal to `totalLength` for exactly this case.
   */
  private localSpacingAt(sampleIndex: number): number {
    const count = this.samplePositions.length;
    const forwardSpan = this.cumulativeLengths[sampleIndex + 1]! - this.cumulativeLengths[sampleIndex]!;
    const backwardSpan =
      sampleIndex === 0
        ? this.cumulativeLengths[count]! - this.cumulativeLengths[count - 1]!
        : this.cumulativeLengths[sampleIndex]! - this.cumulativeLengths[sampleIndex - 1]!;
    return Math.max(forwardSpan, backwardSpan);
  }

  /**
   * Ternary search between the samples either side of `sampleIndex`.
   *
   * Squared distance to a point is unimodal over that short a span of a smooth
   * curve, so ternary search converges without needing derivatives — and unlike
   * Newton's method it cannot diverge on a tight corner.
   */
  private refine(point: Vec2, sampleIndex: number): TrackProjection {
    const step = this.localSpacingAt(sampleIndex);
    let low = this.cumulativeLengths[sampleIndex]! - step;
    let high = this.cumulativeLengths[sampleIndex]! + step;

    for (let i = 0; i < REFINE_ITERATIONS; i += 1) {
      const third = (high - low) / 3;
      const leftProbe = low + third;
      const rightProbe = high - third;
      if (
        distanceSquared(point, this.positionAt(leftProbe)) <
        distanceSquared(point, this.positionAt(rightProbe))
      ) {
        high = rightProbe;
      } else {
        low = leftProbe;
      }
    }

    const frame = this.frameAt((low + high) / 2);
    return {
      ...frame,
      lateralOffset: dot(subtract(point, frame.position), frame.normal),
    };
  }
}
