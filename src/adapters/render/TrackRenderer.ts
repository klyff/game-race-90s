import Phaser from 'phaser';
import { add, lerp, scale } from '../../domain/math/Vec2.ts';
import type { TrackDefinition } from '../../domain/track/TrackDefinition.ts';
import type { TrackFrame } from '../../domain/track/TrackSpline.ts';
import { TrackSpline } from '../../domain/track/TrackSpline.ts';
import { DEFAULT_THEME, type PlanetTheme } from '../../data/tracks/planetThemes.ts';
import { rampPeakHeight } from '../../domain/track/RampZone.ts';
import type { RampZone } from '../../domain/track/RampZone.ts';
import { IsoProjection } from './IsoProjection.ts';
import type { ScreenPoint } from './IsoProjection.ts';

/**
 * Draws the whole circuit once, as flat static geometry, into a single
 * `Phaser.GameObjects.Graphics`. The racing surface is a carved rock bed —
 * packed slabs, jagged lips, cliff walls — not a painted highway. There is
 * no dashed centreline: that marking would not exist on a stone path.
 *
 * The track never changes shape after authoring, so everything is built once
 * in the constructor. Re-tessellating a static circuit every frame would just
 * burn CPU for a picture that never differs from the one before it.
 */

/**
 * Arc-length spacing between centreline samples, world units. This is the one
 * knob that trades corner fidelity for triangle count on a track that is
 * drawn exactly once. Thunder Basin's tightest corner (the west hairpin) has
 * a measured radius of 39.8 units; much coarser than this and the hairpin
 * would visibly facet into a polygon instead of reading as a curve. Much
 * finer buys nothing, because there is no per-frame re-tessellation to save
 * work on — the cost is paid once at scene creation.
 */
const DEFAULT_SAMPLE_SPACING_UNITS = 3;

/**
 * Outward thickness of the wall band, world units. Chosen to read as a solid
 * barrier on screen without the wall dominating the shoulder next to it.
 */
const WALL_THICKNESS_UNITS = 2.5;

/** How far a rock lip may wander off the authored edge, world units. */
const ROCK_EDGE_JITTER_UNITS = 1.1;

/** Typical flagstone width across the bed, world units. */
const SLAB_WIDTH_UNITS = 5.5;

/**
 * Length of the start/finish chequered band along the direction of travel,
 * world units. Short on purpose: it is a marker, not a runway.
 */
const START_LINE_LENGTH_UNITS = 3;

/**
 * Arc-length spacing between trackside boulders (T-048), world units. Tight
 * enough that the wall reads as a rock field, not a painted fence.
 */
const PROP_SPACING_UNITS = 14;

/** How far a prop's position along the track may jitter from its slot, as a
 * fraction of `PROP_SPACING_UNITS`, so a straight line of props does not look
 * like a picket fence. */
const PROP_JITTER_FRACTION = 0.35;

/** How far outward from the wall's outer edge a prop's base sits, world units. */
const PROP_SETBACK_UNITS = 1.2;

/**
 * Screen-space padding added around the projected outer wall footprint when
 * computing camera bounds, pixels. A few tens of pixels of slack so the wall
 * itself is never clipped flush against the camera's hard edge.
 */
const BOUNDS_PADDING_PX = 48;

/**
 * Depth the whole road graphics object is drawn at. Cars are given a depth of
 * `projection.depthOf(position)`, which for this circuit's coordinate range
 * never falls below about -520 (see the domain track geometry notes). A depth
 * far below that keeps the road under every car regardless of where on the
 * circuit it stands, without needing the two systems to agree on a shared
 * origin.
 */
export const ROAD_DEPTH = -1000;

/** TileSprite larger than this (px) is what froze Chrome Verge. Never allocate more. */
const MAX_GROUND_TILE_PX = 2048;

export interface TrackRendererOptions {
  readonly sampleSpacing?: number;
  /** Per-planet palette and optional ground tile. Defaults to Thunder Basin. */
  readonly theme?: PlanetTheme;
}

/** Screen-space bounding box, e.g. for camera bounds. */
interface ScreenBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Darkens a 0xRRGGBB colour by `factor` (0..1), for a prop's outline/shadow
 * so its silhouette reads against a similarly-toned wall or ground. */
function shade(color: number, factor: number): number {
  const clamp = (channel: number): number => Math.max(0, Math.min(255, Math.round(channel * factor)));
  const r = clamp((color >> 16) & 0xff);
  const g = clamp((color >> 8) & 0xff);
  const b = clamp(color & 0xff);
  return (r << 16) | (g << 8) | b;
}

/**
 * Deterministic pseudo-random value in [0, 1) for a prop slot. `Math.random`
 * is avoided so the circuit renders identically every time (screenshots,
 * tests, and a track drawn once in the constructor must never reroll).
 */
function propHash(index: number, salt: number): number {
  const n = Math.imul(index + salt * 13, 374761393) ^ Math.imul(salt + 7, 668265263);
  const mixed = (n ^ (n >>> 13)) * 1274126177;
  return ((mixed ^ (mixed >>> 16)) >>> 0) / 4294967296;
}

/**
 * Resamples the centreline at even arc-length spacing, wrapping the last
 * sample back to the first with no seam at distance 0.
 *
 * The spacing is adjusted slightly so that `totalLength` divides evenly into
 * whole samples; without this, the final segment connecting sample N-1 back
 * to sample 0 would be a different length than every other segment, which is
 * harmless for a closed ribbon but pointless to leave uneven.
 */
function sampleCenterline(spline: TrackSpline, spacing: number): readonly TrackFrame[] {
  const sampleCount = Math.max(3, Math.round(spline.totalLength / spacing));
  const actualSpacing = spline.totalLength / sampleCount;
  const frames: TrackFrame[] = new Array(sampleCount);
  for (let i = 0; i < sampleCount; i += 1) {
    frames[i] = spline.frameAt(i * actualSpacing);
  }
  return frames;
}

/**
 * Screen-space bounding box of the outer wall edge, padded for camera use.
 *
 * Derived from the same projected points the wall band is drawn from, not
 * re-derived from the raw control points, so it can never disagree with what
 * is actually on screen.
 */
function computeBounds(
  frames: readonly TrackFrame[],
  wallOuterOffset: number,
  projection: IsoProjection,
  padding: number,
): ScreenBounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const frame of frames) {
    for (const offset of [wallOuterOffset, -wallOuterOffset]) {
      const point = add(frame.position, scale(frame.normal, offset));
      const screen = projection.toScreen(point);
      minX = Math.min(minX, screen.x);
      maxX = Math.max(maxX, screen.x);
      minY = Math.min(minY, screen.y);
      maxY = Math.max(maxY, screen.y);
    }
  }

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

export class TrackRenderer {
  readonly bounds: ScreenBounds;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly groundFill: Phaser.GameObjects.Rectangle;
  private readonly groundTile: Phaser.GameObjects.TileSprite | null;
  private readonly projection: IsoProjection;
  private readonly theme: PlanetTheme;

  constructor(
    scene: Phaser.Scene,
    track: TrackDefinition,
    spline: TrackSpline,
    projection: IsoProjection,
    options: TrackRendererOptions = {},
  ) {
    this.projection = projection;
    this.theme = options.theme ?? DEFAULT_THEME;
    const spacing = options.sampleSpacing ?? DEFAULT_SAMPLE_SPACING_UNITS;
    const frames = sampleCenterline(spline, spacing);

    const shoulderOuter = track.halfWidth + track.shoulderWidth;
    const wallOuter = shoulderOuter + WALL_THICKNESS_UNITS;

    this.bounds = computeBounds(frames, wallOuter, projection, BOUNDS_PADDING_PX);

    // Solid fill covers the whole circuit — a rectangle is two triangles, cheap
    // at any size. The repeating tile must NOT be that size: Chrome Verge's
    // projected bounds are ~13k px, and a TileSprite that large allocates a
    // texture that freezes the tab. The tile follows the camera instead.
    this.groundFill = scene.add
      .rectangle(
        this.bounds.x,
        this.bounds.y,
        this.bounds.width,
        this.bounds.height,
        this.theme.ground,
      )
      .setOrigin(0, 0)
      .setDepth(ROAD_DEPTH - 2);
    this.groundTile = scene.textures.exists(this.theme.groundKey)
      ? scene.add
          .tileSprite(0, 0, 64, 64, this.theme.groundKey)
          .setOrigin(0, 0)
          .setDepth(ROAD_DEPTH - 1)
          .setAlpha(0.92)
      : null;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(ROAD_DEPTH);

    // Back to front: cliff, scree, stone bed, rock lip, start stones, ramps, boulders.
    this.fillJaggedBand(frames, wallOuter, shoulderOuter, this.theme.wall, 11);
    this.fillJaggedBand(frames, -shoulderOuter, -wallOuter, this.theme.wall, 12);

    this.fillRockyBand(frames, shoulderOuter, track.halfWidth, this.theme.shoulder, 21);
    this.fillRockyBand(frames, -track.halfWidth, -shoulderOuter, this.theme.shoulder, 22);

    this.fillRockyBed(frames, track.halfWidth, this.theme.tarmac);

    this.fillJaggedBand(frames, track.halfWidth + 0.9, track.halfWidth - 0.4, shade(this.theme.tarmac, 0.55), 31);
    this.fillJaggedBand(frames, -(track.halfWidth - 0.4), -(track.halfWidth + 0.9), shade(this.theme.tarmac, 0.55), 32);

    this.drawStoneThreshold(track, spline);
    this.drawRockRamps(track, spline);
    this.drawBorderProps(spline, wallOuter);
    this.drawShoulderBoulders(spline, track.halfWidth, track.shoulderWidth);
  }

  /**
   * Pins the ground tile to the visible camera rect so it stays a few hundred
   * pixels, not the size of the whole circuit.
   */
  syncToCamera(camera: Phaser.Cameras.Scene2D.Camera): void {
    if (this.groundTile === null) {
      return;
    }
    const view = camera.worldView;
    const width = Math.max(1, Math.min(MAX_GROUND_TILE_PX, Math.ceil(view.width)));
    const height = Math.max(1, Math.min(MAX_GROUND_TILE_PX, Math.ceil(view.height)));
    this.groundTile.setPosition(view.x, view.y);
    this.groundTile.setSize(width, height);
    this.groundTile.tilePositionX = view.x;
    this.groundTile.tilePositionY = view.y;
  }

  destroy(): void {
    this.graphics.destroy();
    this.groundFill.destroy();
    this.groundTile?.destroy();
  }

  /** Projects a point offset laterally from a frame's centreline position. */
  private edgeScreen(frame: Pick<TrackFrame, 'position' | 'normal'>, lateralOffset: number): ScreenPoint {
    const point = add(frame.position, scale(frame.normal, lateralOffset));
    return this.projection.toScreen(point);
  }

  /**
   * Fills a ribbon between two constant lateral offsets from the centreline,
   * one quad per pair of consecutive samples (including the wrap-around pair
   * from the last sample back to the first, so the loop has no seam).
   *
   * The two offsets need not be ordered by magnitude or sign: a quad built
   * from [edgeA(i), edgeA(i+1), edgeB(i+1), edgeB(i)] is a simple trapezoid
   * regardless of which offset is numerically larger, since both edges are
   * displacements along the same normal at each sample.
   */
  private fillBand(
    frames: readonly TrackFrame[],
    edgeOffsetA: number,
    edgeOffsetB: number,
    color: number,
  ): void {
    this.graphics.fillStyle(color, 1);
    const count = frames.length;
    for (let i = 0; i < count; i += 1) {
      const next = (i + 1) % count;
      const quad: ScreenPoint[] = [
        this.edgeScreen(frames[i]!, edgeOffsetA),
        this.edgeScreen(frames[next]!, edgeOffsetA),
        this.edgeScreen(frames[next]!, edgeOffsetB),
        this.edgeScreen(frames[i]!, edgeOffsetB),
      ];
      this.graphics.fillPoints(quad, true);
    }
  }

  /**
   * Stone bed: a dark packed base, then irregular flagstones across the width.
   * Each slab is a hashed shade of the planet's surface colour so the path
   * reads as rock, not a sprayed ribbon of tarmac.
   */
  private fillRockyBed(frames: readonly TrackFrame[], halfWidth: number, color: number): void {
    this.fillBand(frames, halfWidth, -halfWidth, shade(color, 0.72));
    const count = frames.length;
    for (let i = 0; i < count; i += 1) {
      const next = (i + 1) % count;
      let lateral = -halfWidth;
      let slab = 0;
      while (lateral < halfWidth - 0.4) {
        const width = SLAB_WIDTH_UNITS * (0.65 + propHash(i, 40 + slab) * 0.7);
        const far = Math.min(halfWidth, lateral + width);
        const jitterA = (propHash(i, 50 + slab) - 0.5) * 0.7;
        const jitterB = (propHash(next, 50 + slab) - 0.5) * 0.7;
        const tone = 0.78 + propHash(i, 60 + slab) * 0.28;
        this.graphics.fillStyle(shade(color, tone), 1);
        this.graphics.fillPoints(
          [
            this.edgeScreen(frames[i]!, lateral + jitterA),
            this.edgeScreen(frames[next]!, lateral + jitterB),
            this.edgeScreen(frames[next]!, far + jitterB),
            this.edgeScreen(frames[i]!, far + jitterA),
          ],
          true,
        );
        lateral = far;
        slab += 1;
      }
    }
  }

  /** A ribbon whose edges wander, so a cliff or lip does not look extruded. */
  private fillJaggedBand(
    frames: readonly TrackFrame[],
    edgeOffsetA: number,
    edgeOffsetB: number,
    color: number,
    salt: number,
  ): void {
    const count = frames.length;
    for (let i = 0; i < count; i += 1) {
      const next = (i + 1) % count;
      const tone = 0.82 + propHash(i, salt) * 0.28;
      this.graphics.fillStyle(shade(color, tone), 1);
      this.graphics.fillPoints(
        [
          this.edgeScreen(frames[i]!, edgeOffsetA + this.edgeWander(i, salt)),
          this.edgeScreen(frames[next]!, edgeOffsetA + this.edgeWander(next, salt)),
          this.edgeScreen(frames[next]!, edgeOffsetB + this.edgeWander(next, salt + 1)),
          this.edgeScreen(frames[i]!, edgeOffsetB + this.edgeWander(i, salt + 1)),
        ],
        true,
      );
    }
  }

  /** Shoulder/scree with per-quad tone shifts. */
  private fillRockyBand(
    frames: readonly TrackFrame[],
    edgeOffsetA: number,
    edgeOffsetB: number,
    color: number,
    salt: number,
  ): void {
    const count = frames.length;
    for (let i = 0; i < count; i += 1) {
      const next = (i + 1) % count;
      const tone = 0.7 + propHash(i, salt) * 0.4;
      this.graphics.fillStyle(shade(color, tone), 1);
      this.graphics.fillPoints(
        [
          this.edgeScreen(frames[i]!, edgeOffsetA),
          this.edgeScreen(frames[next]!, edgeOffsetA),
          this.edgeScreen(frames[next]!, edgeOffsetB),
          this.edgeScreen(frames[i]!, edgeOffsetB),
        ],
        true,
      );
    }
  }

  private edgeWander(index: number, salt: number): number {
    return (propHash(index, salt) - 0.5) * ROCK_EDGE_JITTER_UNITS;
  }

  /**
   * Start/finish as a row of pale threshold stones — a carved step, not a
   * painted chequer. Still spans the full racing width so the line is obvious.
   */
  private drawStoneThreshold(track: TrackDefinition, spline: TrackSpline): void {
    const halfLength = START_LINE_LENGTH_UNITS / 2;
    const backFrame = spline.frameAt(track.startLineDistance - halfLength);
    const frontFrame = spline.frameAt(track.startLineDistance + halfLength);

    const fullWidth = track.halfWidth * 2;
    const columns = Math.max(3, Math.round(fullWidth / 4.2));
    const cellWidth = fullWidth / columns;

    for (let column = 0; column < columns; column += 1) {
      const outer = track.halfWidth - column * cellWidth;
      const inner = outer - cellWidth;
      const pale = propHash(column, 90) > 0.45;
      this.graphics.fillStyle(pale ? this.theme.marking : shade(this.theme.tarmac, 1.15), 1);
      const inset = 0.15 + propHash(column, 91) * 0.25;
      this.graphics.fillPoints(
        [
          this.edgeScreen(backFrame, outer - inset),
          this.edgeScreen(frontFrame, outer - inset * 0.4),
          this.edgeScreen(frontFrame, inner + inset * 0.4),
          this.edgeScreen(backFrame, inner + inset),
        ],
        true,
      );
    }
  }

  /**
   * Raised rock wedges on authored ramp zones. Height matches `rampPeakHeight`
   * so the slab the player sees is the same launch the physics uses.
   */
  private drawRockRamps(track: TrackDefinition, spline: TrackSpline): void {
    const zones = track.rampZones;
    if (zones === undefined || zones.length === 0) {
      return;
    }
    for (const zone of zones) {
      this.drawRockRamp(spline, track.halfWidth * 0.72, zone);
    }
  }

  private drawRockRamp(spline: TrackSpline, halfWidth: number, zone: RampZone): void {
    const peak = rampPeakHeight(zone);
    const steps = Math.max(4, Math.round(zone.triggerLength / 2));
    for (let i = 0; i < steps; i += 1) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      const d0 = zone.triggerDistance + zone.triggerLength * t0;
      const d1 = zone.triggerDistance + zone.triggerLength * t1;
      const h0 = peak * t0;
      const h1 = peak * t1;
      const a = spline.frameAt(d0);
      const b = spline.frameAt(d1);
      const left0 = add(a.position, scale(a.normal, halfWidth));
      const right0 = add(a.position, scale(a.normal, -halfWidth));
      const left1 = add(b.position, scale(b.normal, halfWidth));
      const right1 = add(b.position, scale(b.normal, -halfWidth));
      const sL0 = this.projection.toScreen(left0, h0);
      const sR0 = this.projection.toScreen(right0, h0);
      const sL1 = this.projection.toScreen(left1, h1);
      const sR1 = this.projection.toScreen(right1, h1);
      this.graphics.fillStyle(shade(this.theme.tarmac, 0.95 + t0 * 0.2), 1);
      this.graphics.fillPoints([sL0, sL1, sR1, sR0], true);
      this.graphics.fillStyle(shade(this.theme.wall, 0.7), 1);
      this.graphics.fillPoints(
        [this.projection.toScreen(left0), sL0, sL1, this.projection.toScreen(left1)],
        true,
      );
    }
  }

  /** Extra boulders sitting in the scree so the border is rock, not a painted kerb. */
  private drawShoulderBoulders(
    spline: TrackSpline,
    halfWidth: number,
    shoulderWidth: number,
  ): void {
    const count = Math.max(1, Math.round(spline.totalLength / 9));
    const slot = spline.totalLength / count;
    for (let i = 0; i < count; i += 1) {
      for (const side of [1, -1] as const) {
        if (propHash(i, side === 1 ? 70 : 71) < 0.35) {
          continue;
        }
        const distance = i * slot + (propHash(i, 72) - 0.5) * slot * 0.4;
        const frame = spline.frameAt(distance);
        const inset = 1.2 + propHash(i, 73) * Math.max(1, shoulderWidth - 2);
        this.drawStandingProp(frame, side * (halfWidth + inset), i * 5 + (side === 1 ? 3 : 4));
      }
    }
  }

  /**
   * Stamps a row of trackside decoration along both walls, one per
   * `PROP_SPACING_UNITS` of arc length (T-048). Shape, height and colour come
   * from `theme.propShape/propHeight/propWidth/propColor/propAccent`, so a
   * new world's look is a data change here, not a new render pass — this is
   * what actually varies by planet, rather than the wall band's flat colour.
   * Drawn once, like everything else in this constructor, using a
   * deterministic hash instead of `Math.random` so the circuit never rerolls.
   */
  private drawBorderProps(spline: TrackSpline, wallOuterOffset: number): void {
    const propCount = Math.max(1, Math.round(spline.totalLength / PROP_SPACING_UNITS));
    const slotLength = spline.totalLength / propCount;

    for (let i = 0; i < propCount; i += 1) {
      for (const side of [1, -1] as const) {
        const jitter = (propHash(i, side === 1 ? 1 : 2) - 0.5) * PROP_JITTER_FRACTION * slotLength;
        const distance = i * slotLength + jitter;
        const frame = spline.frameAt(distance);
        const lateralOffset = side * (wallOuterOffset + PROP_SETBACK_UNITS);
        this.drawStandingProp(frame, lateralOffset, i * 2 + (side === 1 ? 0 : 1));
      }
    }
  }

  /**
   * One prop: a squat rounded `blob` (an ellipse, for boulders/scrap/debris)
   * or a standing `spike` (a triangle from the ground to `propHeight`, for
   * pipes/reeds/pylons). The spike's apex is projected WITH height —
   * `IsoProjection.toScreen`'s height parameter, proven by `ExplosionEffect`'s
   * rising fireball — which is what makes it read as standing rather than a
   * flat shape painted on the ground.
   */
  private drawStandingProp(frame: Pick<TrackFrame, 'position' | 'normal' | 'tangent'>, lateralOffset: number, seed: number): void {
    const base = add(frame.position, scale(frame.normal, lateralOffset));
    const sizeScale = 0.75 + propHash(seed, 3) * 0.5;
    const halfWidth = this.theme.propWidth * sizeScale;

    const baseScreen = this.edgeScreen(frame, lateralOffset);

    if (this.theme.propShape === 'blob') {
      const px = this.projection.pixelsPerUnit;
      const outlineColor = shade(this.theme.propColor, 0.55);
      this.graphics.fillStyle(outlineColor, 1);
      this.graphics.fillEllipse(baseScreen.x, baseScreen.y, halfWidth * px * 2.3, halfWidth * px * 1.25);
      this.graphics.fillStyle(this.theme.propColor, 1);
      this.graphics.fillEllipse(baseScreen.x, baseScreen.y, halfWidth * px * 2, halfWidth * px);
      this.graphics.fillStyle(this.theme.propAccent, 1);
      this.graphics.fillEllipse(baseScreen.x, baseScreen.y - halfWidth * px * 0.32, halfWidth * px * 0.9, halfWidth * px * 0.45);
      return;
    }

    const height = this.theme.propHeight * sizeScale;
    const leftBase = add(base, scale(frame.tangent, halfWidth));
    const rightBase = add(base, scale(frame.tangent, -halfWidth));
    const leftScreen = this.projection.toScreen(leftBase);
    const rightScreen = this.projection.toScreen(rightBase);
    const tipScreen = this.projection.toScreen(base, height);

    this.graphics.fillStyle(this.theme.propColor, 1);
    this.graphics.fillTriangle(leftScreen.x, leftScreen.y, rightScreen.x, rightScreen.y, tipScreen.x, tipScreen.y);

    const tipHeight = height * 0.82;
    const tipLeft = this.projection.toScreen(lerp(leftBase, rightBase, 0.35), tipHeight * 0.9);
    const tipRight = this.projection.toScreen(lerp(leftBase, rightBase, 0.65), tipHeight * 0.9);
    this.graphics.fillStyle(this.theme.propAccent, 1);
    this.graphics.fillTriangle(tipLeft.x, tipLeft.y, tipRight.x, tipRight.y, tipScreen.x, tipScreen.y);
  }
}
