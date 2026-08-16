import Phaser from 'phaser';
import type { Vec2 } from '../../domain/math/Vec2.ts';
import { add, distance, fromAngle, perpendicularLeft, scale } from '../../domain/math/Vec2.ts';
import type { VehicleState, VehicleTelemetry } from '../../domain/vehicle/Vehicle.ts';
import { IsoProjection } from './IsoProjection.ts';
import { ROAD_DEPTH } from './TrackRenderer.ts';

/**
 * Lays skid marks on the road while a wheel is sliding: the visual feedback
 * for the drift model the whole handling feel is built around. Two strips,
 * one per rear wheel, drawn as a chain of fading segments.
 *
 * `Phaser.GameObjects.Graphics` has no way to mutate a stroke it already
 * drew, so the only way to fade old segments is to clear the whole object
 * and re-stroke everything that is still alive, every frame. That redraw
 * cost is what `maxSegments` bounds: however long a drift goes on, at most
 * that many strokes are ever issued per frame.
 */

export interface TyreMarksOptions {
  readonly maxSegments?: number;
  readonly fadeSeconds?: number;
  readonly gripUsageThreshold?: number;
}

/**
 * How far behind the car's centre the rear axle sits, world units. Cars are
 * ~4 units long (see `tools/spritegen/schema.ts`); this places the axle
 * under the back half of the body rather than at dead centre.
 */
const REAR_AXLE_OFFSET_UNITS = 1.2;

/**
 * Half the rear track width, world units: how far each rear wheel sits from
 * the car's centreline. Cars are ~2 units wide, so this keeps both marks
 * under the body rather than spilling out past the wheel arches.
 */
const HALF_TRACK_UNITS = 0.9;

/** Default cap on live segments, one entry of which is a wheel's worth of quad. */
const DEFAULT_MAX_SEGMENTS = 700;

/** Default time a segment stays visible before it is dropped, seconds. */
const DEFAULT_FADE_SECONDS = 6;

/**
 * Default grip-usage fraction above which marks start, even before the
 * tyres fully break away. `isSliding` alone would only catch the car once
 * it has already lost the slide; this threshold catches the moment just
 * before that, which is where a mark should visibly begin.
 */
const DEFAULT_GRIP_USAGE_THRESHOLD = 0.85;

/**
 * Segments shorter than this, in pixels, are skipped. Below this the two
 * endpoints are indistinguishable on screen (a near-stationary or barely
 * sliding wheel), so stroking them would just waste a draw call on a dot.
 */
const MIN_SEGMENT_LENGTH_PX = 0.5;

/** Near-black tarmac scuff colour. Low alpha lets it read as rubber, not paint. */
const MARK_COLOR = 0x14141a;

/**
 * Tyre contact width, world units, converted to pixels via
 * `projection.pixelsPerUnit` at draw time (decision 3: never hard-code a
 * pixel width, it must track the shared sprite scale).
 * Halved from 1.6 on 2026-08-15 per user feedback: marks read too heavy at
 * 1.5–2.0× camera zoom. Value tuned at the wheel in live play.
 */
const STROKE_WIDTH_UNITS = 0.8;

/**
 * Alpha of a freshly drawn segment at maximum slide intensity (intensity 1).
 * Kept below full opacity so even a hard drift reads as rubber on asphalt,
 * not a solid black line.
 */
const MAX_FRESH_ALPHA = 0.55;

/**
 * Alpha of a freshly drawn segment at the minimum slide intensity that still
 * qualifies for a mark (right at `gripUsageThreshold`). A gentle slide should
 * leave a faint trace, not vanish or jump straight to the full mark colour.
 */
const MIN_FRESH_ALPHA = 0.12;

/**
 * Lateral speed, world units/s, at or above which a slide counts as "hard"
 * for the purpose of darkening a mark. Chosen well below top speed so a
 * normal cornering drift already reaches near-maximum darkness; this is a
 * cosmetic curve, not a physics limit.
 */
const HARD_SLIDE_LATERAL_SPEED = 6;

/** One rear wheel's running trail state: where it last was, or nothing yet. */
interface WheelTrail {
  previousPoint: Vec2 | null;
}

/** A single drawn stroke: two world points, a base alpha, and its age. */
interface Segment {
  fromWorld: Vec2;
  toWorld: Vec2;
  baseAlpha: number;
  ageSeconds: number;
}

/**
 * Combines how saturated the tyres are (`gripUsage`) with how fast the car
 * is actually sliding sideways (`lateralSpeed`) into one 0..1 intensity.
 * Grip usage alone would make a slow parking-lot slide look as dark as a
 * flat-out drift; folding in lateral speed lets the mark darken with the
 * actual violence of the slide.
 */
function slideIntensity(telemetry: VehicleTelemetry): number {
  const speedFactor = Math.min(1, Math.abs(telemetry.lateralSpeed) / HARD_SLIDE_LATERAL_SPEED);
  return Math.max(telemetry.gripUsage, speedFactor);
}

/** Maps a 0..1 slide intensity to the alpha a freshly drawn segment gets. */
function freshAlphaFor(intensity: number): number {
  return MIN_FRESH_ALPHA + (MAX_FRESH_ALPHA - MIN_FRESH_ALPHA) * intensity;
}

export class TyreMarks {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly projection: IsoProjection;
  private readonly maxSegments: number;
  private readonly fadeSeconds: number;
  private readonly gripUsageThreshold: number;

  private readonly segments: Segment[] = [];
  private readonly leftWheel: WheelTrail = { previousPoint: null };
  private readonly rightWheel: WheelTrail = { previousPoint: null };

  constructor(scene: Phaser.Scene, projection: IsoProjection, options: TyreMarksOptions = {}) {
    this.projection = projection;
    this.maxSegments = options.maxSegments ?? DEFAULT_MAX_SEGMENTS;
    this.fadeSeconds = options.fadeSeconds ?? DEFAULT_FADE_SECONDS;
    this.gripUsageThreshold = options.gripUsageThreshold ?? DEFAULT_GRIP_USAGE_THRESHOLD;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(ROAD_DEPTH + 1);
  }

  /** Call once per rendered frame, after the simulation has stepped. */
  record(state: VehicleState, telemetry: VehicleTelemetry, deltaSeconds: number): void {
    this.ageAndEvictSegments(deltaSeconds);

    const isBreakingAway = telemetry.isSliding || telemetry.gripUsage >= this.gripUsageThreshold;
    if (!isBreakingAway) {
      // Emission stopped: forget where the wheels were, so the next mark
      // starts fresh instead of drawing a streak from wherever the car
      // last slid, possibly across the whole track.
      this.leftWheel.previousPoint = null;
      this.rightWheel.previousPoint = null;
    } else {
      const alpha = freshAlphaFor(slideIntensity(telemetry));
      const [leftPoint, rightPoint] = this.rearWheelPositions(state);
      this.extendTrail(this.leftWheel, leftPoint, alpha);
      this.extendTrail(this.rightWheel, rightPoint, alpha);
    }

    this.redraw();
  }

  clear(): void {
    this.segments.length = 0;
    this.leftWheel.previousPoint = null;
    this.rightWheel.previousPoint = null;
    this.graphics.clear();
  }

  destroy(): void {
    this.graphics.destroy();
  }

  /** World-space positions of the left and right rear wheels this frame. */
  private rearWheelPositions(state: VehicleState): readonly [Vec2, Vec2] {
    const forward = fromAngle(state.heading);
    const left = perpendicularLeft(forward);
    const axleCentre = add(state.position, scale(forward, -REAR_AXLE_OFFSET_UNITS));
    const leftWheel = add(axleCentre, scale(left, HALF_TRACK_UNITS));
    const rightWheel = add(axleCentre, scale(left, -HALF_TRACK_UNITS));
    return [leftWheel, rightWheel];
  }

  /**
   * Appends a segment from a wheel's last recorded point to its current one,
   * skipping degenerate segments and gaps where the trail just restarted.
   */
  private extendTrail(trail: WheelTrail, currentPoint: Vec2, alpha: number): void {
    const previousPoint = trail.previousPoint;
    trail.previousPoint = currentPoint;

    if (previousPoint === null) return;
    if (distance(previousPoint, currentPoint) < this.minSegmentLengthWorld()) return;

    this.pushSegment(previousPoint, currentPoint, alpha);
  }

  /** Converts the pixel degeneracy threshold into world units for comparison. */
  private minSegmentLengthWorld(): number {
    return MIN_SEGMENT_LENGTH_PX / this.projection.pixelsPerUnit;
  }

  /** Appends a segment, evicting the oldest one first if already at capacity. */
  private pushSegment(fromWorld: Vec2, toWorld: Vec2, baseAlpha: number): void {
    if (this.segments.length >= this.maxSegments) {
      this.segments.shift();
    }
    this.segments.push({ fromWorld, toWorld, baseAlpha, ageSeconds: 0 });
  }

  /** Ages every live segment and drops those past `fadeSeconds`, oldest first. */
  private ageAndEvictSegments(deltaSeconds: number): void {
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < this.segments.length; readIndex += 1) {
      const segment = this.segments[readIndex]!;
      segment.ageSeconds += deltaSeconds;
      if (segment.ageSeconds < this.fadeSeconds) {
        this.segments[writeIndex] = segment;
        writeIndex += 1;
      }
    }
    this.segments.length = writeIndex;
  }

  /**
   * Redraws every live segment from scratch. Required because `Graphics`
   * cannot mutate a stroke already committed to it; `maxSegments` is what
   * keeps this bounded regardless of how long a drift has been going on.
   */
  private redraw(): void {
    this.graphics.clear();
    if (this.segments.length === 0) return;

    const strokeWidthPx = STROKE_WIDTH_UNITS * this.projection.pixelsPerUnit;
    for (const segment of this.segments) {
      const fadeFraction = 1 - segment.ageSeconds / this.fadeSeconds;
      const alpha = segment.baseAlpha * fadeFraction;
      const from = this.projection.toScreen(segment.fromWorld);
      const to = this.projection.toScreen(segment.toWorld);

      this.graphics.lineStyle(strokeWidthPx, MARK_COLOR, alpha);
      this.graphics.beginPath();
      this.graphics.moveTo(from.x, from.y);
      this.graphics.lineTo(to.x, to.y);
      this.graphics.strokePath();
    }
  }
}
