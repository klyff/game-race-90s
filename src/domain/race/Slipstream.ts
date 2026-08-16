import type { Vec2 } from '../math/Vec2.ts';
import { dot, fromAngle, perpendicularLeft, subtract } from '../math/Vec2.ts';
import type { VehicleState } from '../vehicle/Vehicle.ts';

/** One car a follower might be drafting. */
export interface DraftCandidate {
  readonly position: Vec2;
  readonly heading: number;
}

/** Tunables, so a test can pin the geometry instead of memorising magic numbers. */
export interface SlipstreamOptions {
  /** Closest gap that still counts, world units. Inside this the cars are touching. */
  readonly minimumGap: number;
  /** Gap at which the draft has faded to nothing, world units. */
  readonly maximumGap: number;
  /** Gap at which the draft is strongest, world units. */
  readonly peakGap: number;
  /** Half-width of the tow, world units: lateral offset from the leader's wake at which it fades out. */
  readonly wakeHalfWidth: number;
  /** Cosine of the largest heading difference that still counts as "following". */
  readonly minimumHeadingAlignment: number;
}

/**
 * Tuned for this game's scale: a 40-unit-wide road, ~1.7-unit collision radii, and
 * a 1505-unit lap. `minimumHeadingAlignment` of 0.8 is about 37 degrees either side
 * of dead ahead — tight enough that a car rounding Thunder Basin's hairpin (82 units
 * of self-clearance) never draws a tow off the car coming back the other way.
 */
export const SLIPSTREAM_DEFAULTS: SlipstreamOptions = {
  minimumGap: 2.5,
  peakGap: 6,
  maximumGap: 16,
  wakeHalfWidth: 3.2,
  minimumHeadingAlignment: 0.8,
};

/**
 * Linear ramp: 0 at `min`, 1 at `peak`, back down to 0 at `max`.
 *
 * A straight-line rise and fall rather than a smoothstep or Gaussian, per the
 * project decision to keep every curve in this simulation reproducible by hand
 * with a pencil — no transcendental shaping functions where a ramp will do.
 */
function rampToPeakAndBack(value: number, min: number, peak: number, max: number): number {
  if (value <= min || value >= max) return 0;
  if (value <= peak) return (value - min) / (peak - min);
  return (max - value) / (max - peak);
}

/** Linear falloff from 1 at zero offset to 0 at `halfWidth`, clamped below zero. */
function rampFalloff(offset: number, halfWidth: number): number {
  if (halfWidth <= 0) return offset === 0 ? 1 : 0;
  const remaining = 1 - Math.abs(offset) / halfWidth;
  return remaining > 0 ? remaining : 0;
}

/**
 * Linear ramp from 0 at `minimumAlignment` to 1 at perfect alignment (cosine 1).
 * Below `minimumAlignment` the candidate is not "behind" in any useful sense —
 * crossing or oncoming traffic — so it contributes nothing.
 */
function rampAlignment(cosineOfHeadingDelta: number, minimumAlignment: number): number {
  if (cosineOfHeadingDelta < minimumAlignment) return 0;
  const span = 1 - minimumAlignment;
  if (span <= 0) return 1;
  return (cosineOfHeadingDelta - minimumAlignment) / span;
}

/**
 * How much draft one car is getting from ONE candidate, 0..1.
 * 0 means no tow at all; 1 means directly in the wake at the ideal gap.
 *
 * Three independent factors are multiplied together — longitudinal position,
 * lateral position, and heading alignment — because a tow is only real when all
 * three hold at once: close behind, in the wake, and pointed the same way. All
 * geometry is expressed in the follower's own frame (its forward and left-normal
 * vectors), so a rotated track segment produces the identical answer as the
 * canonical +X orientation.
 */
export function draftFromCandidate(
  follower: VehicleState,
  candidate: DraftCandidate,
  options: SlipstreamOptions = SLIPSTREAM_DEFAULTS,
): number {
  const raw = computeRawDraft(follower, candidate, options);

  // A NaN anywhere upstream (bad telemetry, a corrupted save) must never reach the
  // engine-power multiplier that consumes this number. Fail closed to "no draft".
  if (!Number.isFinite(raw)) return 0;

  return Math.min(1, Math.max(0, raw));
}

function computeRawDraft(
  follower: VehicleState,
  candidate: DraftCandidate,
  options: SlipstreamOptions,
): number {
  const forward = fromAngle(follower.heading);
  const toCandidate = subtract(candidate.position, follower.position);

  // Longitudinal: how far ahead, along the follower's own nose, the candidate sits.
  const ahead = dot(toCandidate, forward);
  if (!(ahead > 0)) return 0; // Behind the follower (or NaN): no draft, full stop.

  const longitudinal = rampToPeakAndBack(ahead, options.minimumGap, options.peakGap, options.maximumGap);

  // Lateral: perpendicular distance from the candidate's wake line, measured along
  // the follower's LEFT normal so the sign convention matches the rest of the domain.
  const lateralOffset = dot(toCandidate, perpendicularLeft(forward));
  const lateral = rampFalloff(lateralOffset, options.wakeHalfWidth);

  // Heading alignment: the candidate must be pointed roughly the same way, which is
  // what tells a following car apart from one coming back the other way on a folded
  // circuit.
  const candidateForward = fromAngle(candidate.heading);
  const alignment = rampAlignment(dot(forward, candidateForward), options.minimumHeadingAlignment);

  return longitudinal * lateral * alignment;
}

/**
 * The strongest draft available from a whole field, 0..1.
 * Drafts do NOT accumulate: sitting behind two cars is not twice the tow — a real
 * air-blade in real traffic rides the single best wake it can find, not a sum of them.
 */
export function slipstreamFactor(
  follower: VehicleState,
  candidates: readonly DraftCandidate[],
  options: SlipstreamOptions = SLIPSTREAM_DEFAULTS,
): number {
  let best = 0;
  for (const candidate of candidates) {
    const factor = draftFromCandidate(follower, candidate, options);
    if (factor > best) best = factor;
  }
  return best;
}
