import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRACKS, findTrack } from '../../src/data/tracks/registry.ts';
import { distance } from '../../src/domain/math/Vec2.ts';
import type { Vec2 } from '../../src/domain/math/Vec2.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import type { TrackDefinition } from '../../src/domain/track/TrackDefinition.ts';
import { writePng } from '../spritegen/raster/png.ts';
import type { Bitmap } from '../spritegen/raster/png.ts';

/**
 * Renders a circuit top-down and prints its geometry, so a track can be judged
 * by eye and by number instead of by hoping the control points were right.
 *
 *   npm run gen:track                 # every registered track
 *   npm run gen:track -- thunder-basin
 *
 * Top-down rather than isometric on purpose: this view is for authoring the
 * shape, and the iso view makes it much harder to see whether a corner radius is
 * actually tight or the road overlaps itself.
 */
const IMAGE_WIDTH = 1200;
const PADDING = 40;
const SAMPLES = 6000;

const COLOR_BACKGROUND: readonly [number, number, number] = [26, 28, 34];
const COLOR_SHOULDER: readonly [number, number, number] = [92, 76, 54];
const COLOR_SURFACE: readonly [number, number, number] = [58, 60, 66];
const COLOR_TIGHT: readonly [number, number, number] = [226, 84, 62];
const COLOR_FAST: readonly [number, number, number] = [96, 200, 128];
const COLOR_CONTROL: readonly [number, number, number] = [250, 214, 92];
const COLOR_START: readonly [number, number, number] = [246, 246, 250];
const COLOR_CHECKPOINT: readonly [number, number, number] = [96, 168, 240];

/** Curvature at or above this is drawn as a tight corner. 1/40 units. */
const TIGHT_CURVATURE = 1 / 40;

interface Viewport {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly width: number;
  readonly height: number;
}

function createViewport(spline: TrackSpline, margin: number): Viewport {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < SAMPLES; i += 1) {
    const p = spline.positionAt((i / SAMPLES) * spline.totalLength);
    minX = Math.min(minX, p.x - margin);
    maxX = Math.max(maxX, p.x + margin);
    minY = Math.min(minY, p.y - margin);
    maxY = Math.max(maxY, p.y + margin);
  }

  const scale = (IMAGE_WIDTH - PADDING * 2) / (maxX - minX);
  const height = Math.ceil((maxY - minY) * scale + PADDING * 2);
  return {
    scale,
    offsetX: PADDING - minX * scale,
    // Flip Y so +Y points up in the image, which is how the coordinates read.
    offsetY: height - PADDING + minY * scale,
    width: IMAGE_WIDTH,
    height,
  };
}

function toPixel(view: Viewport, point: Vec2): { x: number; y: number } {
  return {
    x: point.x * view.scale + view.offsetX,
    y: view.offsetY - point.y * view.scale,
  };
}

function createBitmap(view: Viewport): Bitmap {
  const pixels = new Uint8Array(view.width * view.height * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = COLOR_BACKGROUND[0];
    pixels[i + 1] = COLOR_BACKGROUND[1];
    pixels[i + 2] = COLOR_BACKGROUND[2];
    pixels[i + 3] = 255;
  }
  return { width: view.width, height: view.height, pixels };
}

function plot(bitmap: Bitmap, x: number, y: number, color: readonly [number, number, number]): void {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= bitmap.width || py >= bitmap.height) return;
  const index = (py * bitmap.width + px) * 4;
  bitmap.pixels[index] = color[0];
  bitmap.pixels[index + 1] = color[1];
  bitmap.pixels[index + 2] = color[2];
  bitmap.pixels[index + 3] = 255;
}

function fillDisc(
  bitmap: Bitmap,
  centre: { x: number; y: number },
  radius: number,
  color: readonly [number, number, number],
): void {
  const limit = Math.ceil(radius);
  for (let dy = -limit; dy <= limit; dy += 1) {
    for (let dx = -limit; dx <= limit; dx += 1) {
      if (dx * dx + dy * dy > radius * radius) continue;
      plot(bitmap, centre.x + dx, centre.y + dy, color);
    }
  }
}

function drawSegment(
  bitmap: Bitmap,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: readonly [number, number, number],
  thickness: number,
): void {
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y)) + 1;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    fillDisc(bitmap, { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, thickness, color);
  }
}

/** Blends between the fast and tight colours by how sharp the corner is. */
function curvatureColor(curvature: number): readonly [number, number, number] {
  const t = Math.min(1, Math.abs(curvature) / TIGHT_CURVATURE);
  return [
    Math.round(COLOR_FAST[0] + (COLOR_TIGHT[0] - COLOR_FAST[0]) * t),
    Math.round(COLOR_FAST[1] + (COLOR_TIGHT[1] - COLOR_FAST[1]) * t),
    Math.round(COLOR_FAST[2] + (COLOR_TIGHT[2] - COLOR_FAST[2]) * t),
  ];
}

function renderTrack(track: TrackDefinition, spline: TrackSpline): Bitmap {
  const wallHalfWidth = track.halfWidth + track.shoulderWidth;
  const view = createViewport(spline, wallHalfWidth);
  const bitmap = createBitmap(view);

  // Road surface: stamp discs along the centreline, wide first then narrow.
  for (const [radius, color] of [
    [wallHalfWidth, COLOR_SHOULDER],
    [track.halfWidth, COLOR_SURFACE],
  ] as const) {
    for (let i = 0; i < SAMPLES; i += 1) {
      const point = spline.positionAt((i / SAMPLES) * spline.totalLength);
      fillDisc(bitmap, toPixel(view, point), radius * view.scale, color);
    }
  }

  // Centreline, tinted by curvature so corners are visible at a glance.
  for (let i = 0; i < SAMPLES; i += 1) {
    const d = (i / SAMPLES) * spline.totalLength;
    const point = spline.positionAt(d);
    fillDisc(bitmap, toPixel(view, point), 1.2, curvatureColor(spline.curvatureAt(d)));
  }

  // Checkpoint gates.
  for (let i = 0; i < track.checkpointCount; i += 1) {
    const d = track.startLineDistance + (i / track.checkpointCount) * spline.totalLength;
    const frame = spline.frameAt(d);
    const inner = {
      x: frame.position.x - frame.normal.x * wallHalfWidth,
      y: frame.position.y - frame.normal.y * wallHalfWidth,
    };
    const outer = {
      x: frame.position.x + frame.normal.x * wallHalfWidth,
      y: frame.position.y + frame.normal.y * wallHalfWidth,
    };
    const color = i === 0 ? COLOR_START : COLOR_CHECKPOINT;
    drawSegment(bitmap, toPixel(view, inner), toPixel(view, outer), color, i === 0 ? 2 : 1);
  }

  // Control points, so a bad point is obvious.
  for (const point of track.controlPoints) {
    fillDisc(bitmap, toPixel(view, point), 4, COLOR_CONTROL);
  }

  return bitmap;
}

/**
 * Flags places where the centreline passes close to a distant part of itself.
 * Overlapping road would break lap tracking and wall collision, and it is very
 * hard to spot by reading coordinates.
 */
function findOverlaps(track: TrackDefinition, spline: TrackSpline): number {
  const wallHalfWidth = track.halfWidth + track.shoulderWidth;
  const clearance = wallHalfWidth * 2;
  const step = spline.totalLength / 900;
  let worst = Number.POSITIVE_INFINITY;

  for (let i = 0; i < 900; i += 1) {
    const a = spline.positionAt(i * step);
    for (let j = i + 1; j < 900; j += 1) {
      // Only compare points that are far apart ALONG the track; neighbours are
      // supposed to be close in space.
      if (Math.abs(spline.signedDelta(i * step, j * step)) < clearance * 2) continue;
      worst = Math.min(worst, distance(a, spline.positionAt(j * step)));
    }
  }
  return worst;
}

function report(track: TrackDefinition): Bitmap {
  const spline = new TrackSpline(track.controlPoints);

  let maxCurvature = 0;
  let straightLength = 0;
  let longestStraight = 0;
  const step = spline.totalLength / 2000;
  for (let i = 0; i < 2000; i += 1) {
    const curvature = Math.abs(spline.curvatureAt(i * step));
    maxCurvature = Math.max(maxCurvature, curvature);
    if (curvature < 1 / 400) {
      straightLength += step;
      longestStraight = Math.max(longestStraight, straightLength);
    } else {
      straightLength = 0;
    }
  }

  const worstClearance = findOverlaps(track, spline);
  const wallHalfWidth = track.halfWidth + track.shoulderWidth;

  console.log(`\n${track.displayName} (${track.id})`);
  console.log(`  lap length        ${spline.totalLength.toFixed(1)} units`);
  console.log(`  control points    ${track.controlPoints.length}`);
  console.log(`  road width        ${track.halfWidth * 2} units surface, ${wallHalfWidth * 2} wall to wall`);
  console.log(`  tightest corner   radius ${(1 / maxCurvature).toFixed(1)} units`);
  console.log(`  longest straight  ${longestStraight.toFixed(1)} units`);
  console.log(
    `  self-clearance    ${worstClearance.toFixed(1)} units` +
      (worstClearance < wallHalfWidth * 2
        ? `  <-- TOO CLOSE, the road overlaps itself (needs > ${(wallHalfWidth * 2).toFixed(1)})`
        : '  ok'),
  );

  return renderTrack(track, spline);
}

function main(): void {
  const requested = process.argv.slice(2);
  const targets = requested.length > 0 ? requested.map(findTrack) : TRACKS;

  const outputDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.preview');
  mkdirSync(outputDirectory, { recursive: true });

  for (const track of targets) {
    const bitmap = report(track);
    const path = join(outputDirectory, `track-${track.id}.png`);
    writePng(path, bitmap);
    console.log(`  -> .preview/track-${track.id}.png (${bitmap.width}x${bitmap.height})`);
  }
}

main();
