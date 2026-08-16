import type { TrackSpline } from '../track/TrackSpline.ts';
import { trackFullHalfWidth } from '../track/TrackDefinition.ts';
import type { TrackDefinition } from '../track/TrackDefinition.ts';

/**
 * A searched racing line: lateral offsets along the centreline, left-positive.
 *
 * Produced offline by `npm run gen:lines` and loaded as data — never computed in
 * the browser at boot (owner decision, 2026-08-16).
 */
export interface RacingLine {
  readonly trackId: string;
  readonly carId: string;
  readonly candidateName: string;
  /** Evenly spaced lateral offsets covering one lap, world units. */
  readonly offsets: readonly number[];
  readonly lapSeconds: number;
  readonly wallContacts: number;
}

export interface TrackLinesManifest {
  readonly trackId: string;
  /**
   * Fastest simulated lap for a mid-pack car on this track. Source of truth for
   * T-042 scoring — never hand-authored (T-047).
   */
  readonly parTime: number;
  readonly parCarId: string;
  readonly lines: readonly RacingLine[];
}

/** Interpolate the authored offset at an arc length along the lap. */
export function offsetAt(line: RacingLine, distance: number, spline: TrackSpline): number {
  const count = line.offsets.length;
  if (count === 0) {
    return 0;
  }
  if (count === 1) {
    return line.offsets[0] ?? 0;
  }
  const wrapped = spline.wrap(distance);
  const phase = (wrapped / spline.totalLength) * count;
  const i0 = Math.floor(phase) % count;
  const i1 = (i0 + 1) % count;
  const t = phase - Math.floor(phase);
  const a = line.offsets[i0] ?? 0;
  const b = line.offsets[i1] ?? 0;
  return a + (b - a) * t;
}

export interface LineCandidate {
  readonly name: string;
  readonly offsets: readonly number[];
}

const SAMPLE_COUNT = 64;

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * Build the five candidate profiles the owner asked for. Pure, no Math.random.
 * Offsets are bounded inside `trackFullHalfWidth - collisionRadius`.
 */
export function buildLineCandidates(
  track: TrackDefinition,
  spline: TrackSpline,
  collisionRadius: number,
): readonly LineCandidate[] {
  const maxOffset = Math.max(0.5, trackFullHalfWidth(track) - collisionRadius - 0.5);
  const centreline = Array.from({ length: SAMPLE_COUNT }, () => 0);

  const classic: number[] = [];
  const lateApex: number[] = [];
  const earlyApex: number[] = [];
  const driftEntry: number[] = [];

  for (let i = 0; i < SAMPLE_COUNT; i += 1) {
    const distance = (i / SAMPLE_COUNT) * spline.totalLength;
    const curvature = spline.curvatureAt(distance);
    // Look ahead a little so the line prepares for the corner rather than reacting late.
    const ahead = spline.curvatureAt(spline.wrap(distance + 40));
    const behind = spline.curvatureAt(spline.wrap(distance - 25));

    // Inside the apex = opposite sign of curvature (left-positive normal).
    const inside = curvature === 0 ? 0 : -Math.sign(curvature);
    const aheadInside = ahead === 0 ? 0 : -Math.sign(ahead);
    const intensity = clamp(Math.abs(curvature) * 80, 0, 1);
    const aheadIntensity = clamp(Math.abs(ahead) * 80, 0, 1);

    // Classic outside-apex-outside: sit wide on the approach, dive inside at the apex.
    const classicOffset = intensity > 0.35
      ? inside * maxOffset * 0.85 * intensity
      : aheadInside * -maxOffset * 0.55 * aheadIntensity;
    classic.push(clamp(classicOffset, -maxOffset, maxOffset));

    // Late apex: stay wide longer, then cut.
    const late = intensity > 0.55
      ? inside * maxOffset * 0.9 * intensity
      : aheadInside * -maxOffset * 0.7 * aheadIntensity;
    lateApex.push(clamp(late, -maxOffset, maxOffset));

    // Early apex: dive earlier (use behind curvature).
    const earlyInside = behind === 0 ? inside : -Math.sign(behind);
    const early = (intensity > 0.2 ? earlyInside : aheadInside) * maxOffset * 0.75;
    earlyApex.push(clamp(early, -maxOffset, maxOffset));

    // Wide-entry drift line: exaggerate the outside on entry.
    const drift = intensity > 0.3
      ? inside * maxOffset * 0.7 * intensity
      : aheadInside * -maxOffset * 0.95 * Math.max(aheadIntensity, 0.35);
    driftEntry.push(clamp(drift, -maxOffset, maxOffset));
  }

  return [
    { name: 'centreline', offsets: centreline },
    { name: 'classic', offsets: classic },
    { name: 'late-apex', offsets: lateApex },
    { name: 'early-apex', offsets: earlyApex },
    { name: 'drift-entry', offsets: driftEntry },
  ];
}

export function findLineForCar(
  manifest: TrackLinesManifest,
  carId: string,
): RacingLine | undefined {
  return manifest.lines.find(line => line.carId === carId);
}
