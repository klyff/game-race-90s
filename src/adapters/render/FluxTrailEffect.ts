import Phaser from 'phaser';
import type { Vec2 } from '../../domain/math/Vec2.ts';
import { add, distance, fromAngle, perpendicularLeft, scale } from '../../domain/math/Vec2.ts';
import { isAirborne, type VehicleState } from '../../domain/vehicle/Vehicle.ts';
import { IsoProjection } from './IsoProjection.ts';
import { ROAD_DEPTH } from './TrackRenderer.ts';

/**
 * Fire trail under the DeLorean in Flux overdrive — replaces rubber skids.
 *
 * Same per-car wheel-trail discipline as `TyreMarks` (one trail pair per index,
 * age once per frame). Palette is a short fire ramp with hard edges: no soft
 * anti-aliased glow, chunky stroke width so it reads at race zoom (pixel-art
 * constraint: readable silhouette over detail).
 */

export interface FluxTrailOptions {
  readonly maxSegments?: number;
  readonly fadeSeconds?: number;
}

const REAR_AXLE_OFFSET_UNITS = 1.2;
const HALF_TRACK_UNITS = 0.9;
const DEFAULT_MAX_SEGMENTS = 480;
const DEFAULT_FADE_SECONDS = 2.4;
const MIN_SEGMENT_LENGTH_PX = 0.75;
const STROKE_WIDTH_UNITS = 1.05;

/** Hot core → ember. Hue-shifted ramp (warm highlights, cooler deep red). */
const FIRE_LAYERS: readonly { readonly color: number; readonly widthScale: number; readonly alphaScale: number }[] = [
  { color: 0xfff1a8, widthScale: 0.35, alphaScale: 1 },
  { color: 0xff9a1a, widthScale: 0.7, alphaScale: 0.85 },
  { color: 0xff3a0a, widthScale: 1, alphaScale: 0.7 },
  { color: 0x7a1208, widthScale: 1.35, alphaScale: 0.4 },
];

interface WheelTrail {
  previousPoint: Vec2 | null;
}

interface Segment {
  fromWorld: Vec2;
  toWorld: Vec2;
  baseAlpha: number;
  ageSeconds: number;
}

export class FluxTrailEffect {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly projection: IsoProjection;
  private readonly maxSegments: number;
  private readonly fadeSeconds: number;
  private readonly segments: Segment[] = [];
  private readonly trails = new Map<number, { left: WheelTrail; right: WheelTrail }>();
  private pulse = 0;

  constructor(scene: Phaser.Scene, projection: IsoProjection, options: FluxTrailOptions = {}) {
    this.projection = projection;
    this.maxSegments = options.maxSegments ?? DEFAULT_MAX_SEGMENTS;
    this.fadeSeconds = options.fadeSeconds ?? DEFAULT_FADE_SECONDS;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(ROAD_DEPTH + 1.2);
    this.graphics.setName('fluxFireTrail');
  }

  update(deltaSeconds: number): void {
    this.pulse += deltaSeconds;
    this.ageAndEvictSegments(deltaSeconds);
    this.redraw();
  }

  /**
   * Lays fire under both rear wheels while overdrive is active.
   * Call once per car; skip `TyreMarks.record` for the same car.
   */
  record(carIndex: number, state: VehicleState, intensity: number = 1): void {
    const trail = this.trailFor(carIndex);
    if (isAirborne(state) || intensity <= 0) {
      trail.left.previousPoint = null;
      trail.right.previousPoint = null;
      return;
    }

    const alpha = 0.35 + 0.5 * Math.min(1, Math.max(0, intensity));
    const [leftPoint, rightPoint] = this.rearWheelPositions(state);
    this.extendTrail(trail.left, leftPoint, alpha);
    this.extendTrail(trail.right, rightPoint, alpha);
  }

  /** Drop the previous-point latch so the next mark does not streak across the track. */
  release(carIndex: number): void {
    const trail = this.trails.get(carIndex);
    if (trail === undefined) {
      return;
    }
    trail.left.previousPoint = null;
    trail.right.previousPoint = null;
  }

  clear(): void {
    this.segments.length = 0;
    this.trails.clear();
    this.graphics.clear();
  }

  destroy(): void {
    this.graphics.destroy();
  }

  setVisible(visible: boolean): void {
    this.graphics.setVisible(visible);
  }

  private trailFor(carIndex: number): { left: WheelTrail; right: WheelTrail } {
    const existing = this.trails.get(carIndex);
    if (existing !== undefined) {
      return existing;
    }
    const created = { left: { previousPoint: null }, right: { previousPoint: null } };
    this.trails.set(carIndex, created);
    return created;
  }

  private rearWheelPositions(state: VehicleState): readonly [Vec2, Vec2] {
    const forward = fromAngle(state.heading);
    const left = perpendicularLeft(forward);
    const axleCentre = add(state.position, scale(forward, -REAR_AXLE_OFFSET_UNITS));
    return [
      add(axleCentre, scale(left, HALF_TRACK_UNITS)),
      add(axleCentre, scale(left, -HALF_TRACK_UNITS)),
    ];
  }

  private extendTrail(trail: WheelTrail, currentPoint: Vec2, alpha: number): void {
    const previousPoint = trail.previousPoint;
    trail.previousPoint = currentPoint;
    if (previousPoint === null) {
      return;
    }
    if (distance(previousPoint, currentPoint) < this.minSegmentLengthWorld()) {
      return;
    }
    this.pushSegment(previousPoint, currentPoint, alpha);
  }

  private minSegmentLengthWorld(): number {
    return MIN_SEGMENT_LENGTH_PX / this.projection.pixelsPerUnit;
  }

  private pushSegment(fromWorld: Vec2, toWorld: Vec2, baseAlpha: number): void {
    if (this.segments.length >= this.maxSegments) {
      this.segments.shift();
    }
    this.segments.push({ fromWorld, toWorld, baseAlpha, ageSeconds: 0 });
  }

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

  private redraw(): void {
    this.graphics.clear();
    if (this.segments.length === 0) {
      return;
    }
    const flicker = 0.85 + 0.15 * Math.sin(this.pulse * 28);
    const baseWidth = STROKE_WIDTH_UNITS * this.projection.pixelsPerUnit;
    for (const segment of this.segments) {
      const fadeFraction = 1 - segment.ageSeconds / this.fadeSeconds;
      const alpha = segment.baseAlpha * fadeFraction * flicker;
      const from = this.projection.toScreen(segment.fromWorld);
      const to = this.projection.toScreen(segment.toWorld);
      // Pixel snap — hard edges, no mushy anti-alias (pixel-art rule).
      const x0 = Math.round(from.x);
      const y0 = Math.round(from.y);
      const x1 = Math.round(to.x);
      const y1 = Math.round(to.y);
      for (let layer = FIRE_LAYERS.length - 1; layer >= 0; layer -= 1) {
        const style = FIRE_LAYERS[layer]!;
        const width = Math.max(1, Math.round(baseWidth * style.widthScale));
        this.graphics.lineStyle(width, style.color, alpha * style.alphaScale);
        this.graphics.beginPath();
        this.graphics.moveTo(x0, y0);
        this.graphics.lineTo(x1, y1);
        this.graphics.strokePath();
      }
    }
  }
}
