/**
 * Top-down Thunder Basin II with the six mix-run traces (dist+lat from
 * `.tmp/reportIA-mix/.../drivers/*.log`) plus each car's authored racing line.
 *
 *   node --experimental-strip-types tools/debug/draw-mix-lines.ts
 */
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findTrack } from '../../src/data/tracks/registry.ts';
import { parseTrackLinesManifest } from '../../src/data/tracks/TrackLines.ts';
import { findLineForCar, offsetAt, type RacingLine } from '../../src/domain/race/RacingLine.ts';
import { gridSlotPosition } from '../../src/domain/race/RaceField.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import type { Vec2 } from '../../src/domain/math/Vec2.ts';
import { writePng, type Bitmap } from '../spritegen/raster/png.ts';

const SIZE = 640;
const PADDING = 36;
const ROAD_SAMPLES = 2400;
const LINE_SAMPLES = 1400;

const COLOR_BACKGROUND: readonly [number, number, number] = [22, 24, 28];
const COLOR_ROAD: readonly [number, number, number] = [196, 198, 204];
const COLOR_START: readonly [number, number, number] = [246, 246, 250];

const DRIVER_COLORS: Readonly<Record<string, readonly [number, number, number]>> = {
  KLYFF: [46, 196, 92],
  TECHNICIAN: [48, 168, 214],
  GUARDIAN: [214, 176, 48],
  PREDATOR: [232, 112, 36],
  BERSERKER: [214, 64, 64],
  SEAMUS: [176, 92, 214],
};

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const logDir = join(root, '.tmp', 'reportIA-mix', '2-2-2-300s', 'drivers');
const trackId = 'thunder-basin-2';

interface Viewport {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

interface Sample {
  readonly dist: number;
  readonly lat: number;
}

function createViewport(spline: TrackSpline, margin: number): Viewport {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < ROAD_SAMPLES; i += 1) {
    const point = spline.positionAt((i / ROAD_SAMPLES) * spline.totalLength);
    minX = Math.min(minX, point.x - margin);
    maxX = Math.max(maxX, point.x + margin);
    minY = Math.min(minY, point.y - margin);
    maxY = Math.max(maxY, point.y + margin);
  }
  const inner = SIZE - PADDING * 2;
  const scale = Math.min(inner / (maxX - minX), inner / (maxY - minY));
  const usedW = (maxX - minX) * scale;
  const usedH = (maxY - minY) * scale;
  return {
    scale,
    offsetX: (SIZE - usedW) / 2 - minX * scale,
    offsetY: (SIZE + usedH) / 2 + minY * scale,
  };
}

function toPixel(view: Viewport, point: Vec2): { x: number; y: number } {
  return {
    x: point.x * view.scale + view.offsetX,
    y: view.offsetY - point.y * view.scale,
  };
}

function createBitmap(): Bitmap {
  const pixels = new Uint8Array(SIZE * SIZE * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = COLOR_BACKGROUND[0];
    pixels[i + 1] = COLOR_BACKGROUND[1];
    pixels[i + 2] = COLOR_BACKGROUND[2];
    pixels[i + 3] = 255;
  }
  return { width: SIZE, height: SIZE, pixels };
}

function plot(bitmap: Bitmap, x: number, y: number, color: readonly [number, number, number]): void {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= bitmap.width || py >= bitmap.height) {
    return;
  }
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
      if (dx * dx + dy * dy > radius * radius) {
        continue;
      }
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
    fillDisc(
      bitmap,
      { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
      thickness,
      color,
    );
  }
}

function lineWorld(spline: TrackSpline, line: RacingLine, distance: number): Vec2 {
  const frame = spline.frameAt(distance);
  const lateral = offsetAt(line, distance, spline);
  return {
    x: frame.position.x + frame.normal.x * lateral,
    y: frame.position.y + frame.normal.y * lateral,
  };
}

function parseLog(path: string): { name: string; carId: string; samples: Sample[] } {
  const lines = readFileSync(path, 'utf8').trim().split('\n');
  const header = lines.find(line => line.startsWith('# name=')) ?? '';
  const nameMatch = /name=([A-Z0-9]+)/.exec(header);
  const carMatch = /car=([A-Za-z0-9_-]+)/.exec(header);
  const samples: Sample[] = [];
  for (const line of lines) {
    if (!line.startsWith('t=')) {
      continue;
    }
    const dist = /(?:^| )dist=([-\d.]+)/.exec(line);
    const lat = /(?:^| )lat=([-\d.]+)/.exec(line);
    if (dist === null || lat === null) {
      continue;
    }
    samples.push({ dist: Number(dist[1]), lat: Number(lat[1]) });
  }
  return {
    name: nameMatch?.[1] ?? 'UNKNOWN',
    carId: carMatch?.[1] ?? '',
    samples,
  };
}

function fade(color: readonly [number, number, number], amount: number): readonly [number, number, number] {
  return [
    Math.round(color[0] * amount + COLOR_ROAD[0] * (1 - amount)),
    Math.round(color[1] * amount + COLOR_ROAD[1] * (1 - amount)),
    Math.round(color[2] * amount + COLOR_ROAD[2] * (1 - amount)),
  ];
}

function main(): void {
  if (!existsSync(logDir)) {
    throw new Error(`missing mix logs at ${logDir}`);
  }
  const track = findTrack(trackId);
  const spline = new TrackSpline(track.controlPoints);
  const linesPath = join(root, 'public', 'assets', 'lines', `${trackId}.json`);
  const trackLines = existsSync(linesPath)
    ? parseTrackLinesManifest(JSON.parse(readFileSync(linesPath, 'utf8')))
    : undefined;

  const view = createViewport(spline, track.halfWidth + 6);
  const bitmap = createBitmap();
  const roadRadius = Math.max(1.6, track.halfWidth * view.scale);

  for (let i = 0; i < ROAD_SAMPLES; i += 1) {
    const point = spline.positionAt((i / ROAD_SAMPLES) * spline.totalLength);
    fillDisc(bitmap, toPixel(view, point), roadRadius, COLOR_ROAD);
  }

  const start = spline.frameAt(track.startLineDistance);
  drawSegment(
    bitmap,
    toPixel(view, {
      x: start.position.x - start.normal.x * track.halfWidth,
      y: start.position.y - start.normal.y * track.halfWidth,
    }),
    toPixel(view, {
      x: start.position.x + start.normal.x * track.halfWidth,
      y: start.position.y + start.normal.y * track.halfWidth,
    }),
    COLOR_START,
    1.6,
  );

  const logs = readdirSync(logDir)
    .filter(file => file.endsWith('.log'))
    .map(file => parseLog(join(logDir, file)));

  for (const driver of logs) {
    const color = DRIVER_COLORS[driver.name] ?? [80, 80, 80];
    const authored = trackLines === undefined ? undefined : findLineForCar(trackLines, driver.carId);
    if (authored !== undefined) {
      const faint = fade(color, 0.45);
      for (let i = 0; i < LINE_SAMPLES; i += 1) {
        const distance = (i / LINE_SAMPLES) * spline.totalLength;
        fillDisc(bitmap, toPixel(view, lineWorld(spline, authored, distance)), 1.05, faint);
      }
    }
    let previous: { x: number; y: number } | undefined;
    let previousDist = Number.NaN;
    for (const sample of driver.samples) {
      const pixel = toPixel(view, gridSlotPosition(spline, sample.dist, sample.lat));
      const wrapped = Number.isFinite(previousDist) && sample.dist + 80 < previousDist;
      if (previous !== undefined && !wrapped) {
        drawSegment(bitmap, previous, pixel, color, 1.45);
      }
      fillDisc(bitmap, pixel, 1.7, color);
      previous = pixel;
      previousDist = sample.dist;
    }
  }

  const outDir = join(root, '.tmp', 'reportIA-mix', '2-2-2-300s');
  mkdirSync(outDir, { recursive: true });
  const tmpPath = join(outDir, 'thunder-basin-2-lines.png');
  const docsPath = join(root, 'docs', 'circuits', 'thunder-basin-2-mix-222.png');
  writePng(tmpPath, bitmap);
  writePng(docsPath, bitmap);
  console.log(`wrote ${tmpPath}`);
  console.log(`wrote ${docsPath}`);
  for (const driver of logs) {
    const color = DRIVER_COLORS[driver.name] ?? [80, 80, 80];
    console.log(`  ${driver.name.padEnd(12)} ${driver.carId.padEnd(12)} rgb(${color.join(',')}) n=${driver.samples.length}`);
  }
}

main();
