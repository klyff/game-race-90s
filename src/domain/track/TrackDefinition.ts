import type { Vec2 } from '../math/Vec2.ts';
import type { RampZone } from './RampZone.ts';

/**
 * Everything that defines a circuit, as plain data.
 *
 * The control points are the ONLY geometry: `TrackSpline` derives the road
 * surface, the walls, the checkpoints, the starting grid, lap progress and the
 * AI racing line from them. Authoring a track means placing these points and
 * checking the result with `npm run gen:track` — nothing else.
 */
export interface TrackDefinition {
  readonly id: string;
  readonly displayName: string;
  /**
   * Centreline control points in travel order. The spline is closed, so the last
   * point joins back to the first. Spacing sets the resolution of the authored
   * shape: put points where the geometry changes, not at even intervals.
   */
  readonly controlPoints: readonly Vec2[];
  /**
   * Half the width of the racing surface, world units. Beyond this a car is
   * off-road; beyond `halfWidth + wallMargin` it hits the wall.
   */
  readonly halfWidth: number;
  /** Off-road shoulder between the racing surface and the wall, world units. */
  readonly shoulderWidth: number;
  readonly laps: number;
  /**
   * Checkpoints, spread evenly by arc length starting at the start line. Must be
   * crossed in order, which is what stops a car scoring a lap by reversing over
   * the line or cutting the infield.
   */
  readonly checkpointCount: number;
  /** Arc length of the start/finish line along the centreline. */
  readonly startLineDistance: number;
  /** Lateral offsets of grid slots, in units, applied left-positive. */
  readonly gridLateralOffsets: readonly number[];
  /** Gap between grid rows along the track, world units. */
  readonly gridRowSpacing: number;
  /**
   * Grip multiplier for the whole racing surface, 1 = normal tarmac. Below 1 is a
   * slippery planet (ice, swamp) where cornering grip is scarce and only high-grip
   * cars stay planted; above 1 is extra-grippy rubberised tarmac. It scales every
   * car's `grip` for this track, so the physics and the AI's corner-speed agree.
   * Optional; absent means 1 (unchanged tarmac).
   */
  readonly surfaceGrip?: number;
  /**
   * Jump-ramp zones along the centreline (T-050). Optional; absent means no
   * ramps on this circuit. See `RampZone.ts` for the shape and the physics.
   */
  readonly rampZones?: readonly RampZone[];
}

/** The track's surface grip multiplier, defaulting to 1 when unset. */
export function trackSurfaceGrip(track: TrackDefinition): number {
  return track.surfaceGrip ?? 1;
}

/** Total width from wall to wall. */
export function trackFullHalfWidth(track: TrackDefinition): number {
  return track.halfWidth + track.shoulderWidth;
}
