import Phaser from 'phaser';
import { add, scale } from '../../domain/math/Vec2.ts';
import type { TrackDefinition } from '../../domain/track/TrackDefinition.ts';
import type { TrackFrame } from '../../domain/track/TrackSpline.ts';
import { TrackSpline } from '../../domain/track/TrackSpline.ts';
import { DEFAULT_THEME, type PlanetTheme } from '../../data/tracks/planetThemes.ts';
import { IsoProjection } from './IsoProjection.ts';
import type { ScreenPoint } from './IsoProjection.ts';

/**
 * Draws the whole circuit once, as flat static geometry, into a single
 * `Phaser.GameObjects.Graphics`. This is the first thing ever rendered in
 * this project, so the road must be legible by eye: bounded by a visible
 * wall, coloured so tarmac/shoulder/wall read apart at a glance, and marked
 * with a start line that proves the projection and the scale are both right.
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

/** Width of the bright kerb strip straddling each tarmac edge, world units. */
const KERB_WIDTH_UNITS = 0.6;

/** Length of one painted centreline dash, world units. */
const CENTERLINE_DASH_PAINT_UNITS = 6;

/** Length of the gap between centreline dashes, world units. */
const CENTERLINE_DASH_GAP_UNITS = 10;

/** Full paint+gap period of the dashed centreline, world units. */
const CENTERLINE_DASH_CYCLE_UNITS = CENTERLINE_DASH_PAINT_UNITS + CENTERLINE_DASH_GAP_UNITS;

/** Width of the dashed centreline stripe, world units. */
const CENTERLINE_WIDTH_UNITS = 0.5;

/**
 * Length of the start/finish chequered band along the direction of travel,
 * world units. Short on purpose: it is a marker, not a runway.
 */
const START_LINE_LENGTH_UNITS = 3;

/** Side length of one chequer square across the start line, world units. */
const CHEQUER_SIZE_UNITS = 2.5;

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
    const kerbHalf = KERB_WIDTH_UNITS / 2;

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

    // Back to front: wall, shoulder, tarmac, kerb, centreline, start line.
    this.fillBand(frames, wallOuter, shoulderOuter, this.theme.wall);
    this.fillBand(frames, -shoulderOuter, -wallOuter, this.theme.wall);

    this.fillBand(frames, shoulderOuter, track.halfWidth, this.theme.shoulder);
    this.fillBand(frames, -track.halfWidth, -shoulderOuter, this.theme.shoulder);

    this.fillBand(frames, track.halfWidth, -track.halfWidth, this.theme.tarmac);

    this.fillBand(frames, track.halfWidth + kerbHalf, track.halfWidth - kerbHalf, this.theme.kerb);
    this.fillBand(frames, -(track.halfWidth - kerbHalf), -(track.halfWidth + kerbHalf), this.theme.kerb);

    this.drawCenterline(frames, spacing);
    this.drawStartLine(track, spline);
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
   * Dashed centreline. Painted per segment rather than clipped exactly at
   * dash boundaries: the sample spacing (a few units) is small relative to
   * both the dash length and the gap, so quantising the on/off decision to
   * whichever side of the boundary a segment's midpoint falls on is well
   * within "roughly 6 units painted, 10 units gap" and not worth the extra
   * geometry of clipping quads at exact dash edges on a track drawn once.
   */
  private drawCenterline(frames: readonly TrackFrame[], spacing: number): void {
    this.graphics.fillStyle(this.theme.marking, 1);
    const halfWidth = CENTERLINE_WIDTH_UNITS / 2;
    const count = frames.length;
    for (let i = 0; i < count; i += 1) {
      const midDistance = frames[i]!.distance + spacing / 2;
      const cyclePosition = midDistance % CENTERLINE_DASH_CYCLE_UNITS;
      if (cyclePosition >= CENTERLINE_DASH_PAINT_UNITS) continue;

      const next = (i + 1) % count;
      const quad: ScreenPoint[] = [
        this.edgeScreen(frames[i]!, halfWidth),
        this.edgeScreen(frames[next]!, halfWidth),
        this.edgeScreen(frames[next]!, -halfWidth),
        this.edgeScreen(frames[i]!, -halfWidth),
      ];
      this.graphics.fillPoints(quad, true);
    }
  }

  /**
   * Start/finish chequered band: a single row of alternating squares spanning
   * the full tarmac width at `track.startLineDistance`. Queried directly from
   * the spline at two explicit distances (rather than reused from the general
   * sample ring) so its length is exactly `START_LINE_LENGTH_UNITS`
   * regardless of the sample spacing chosen for the rest of the track.
   */
  private drawStartLine(track: TrackDefinition, spline: TrackSpline): void {
    const halfLength = START_LINE_LENGTH_UNITS / 2;
    const backFrame = spline.frameAt(track.startLineDistance - halfLength);
    const frontFrame = spline.frameAt(track.startLineDistance + halfLength);

    const fullWidth = track.halfWidth * 2;
    const columns = Math.max(2, Math.round(fullWidth / CHEQUER_SIZE_UNITS));
    const cellWidth = fullWidth / columns;

    for (let column = 0; column < columns; column += 1) {
      const outer = track.halfWidth - column * cellWidth;
      const inner = outer - cellWidth;
      const color = column % 2 === 0 ? this.theme.marking : this.theme.chequerDark;
      this.graphics.fillStyle(color, 1);
      const quad: ScreenPoint[] = [
        this.edgeScreen(backFrame, outer),
        this.edgeScreen(frontFrame, outer),
        this.edgeScreen(frontFrame, inner),
        this.edgeScreen(backFrame, inner),
      ];
      this.graphics.fillPoints(quad, true);
    }
  }
}
