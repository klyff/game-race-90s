import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import {
  CAR_FRAME_HEIGHT,
  CAR_FRAME_WIDTH,
  CAR_SPRITE_FRAMES,
} from '../../src/domain/constants.ts';
import type { CarSheetManifest } from '../../src/data/cars/CarManifest.ts';
import { collisionBoxForCarId, withCollisionBox } from './collision-map.ts';
import { FLEET_CARS } from './fleet.ts';
import { packStrip, writePng } from './raster/png.ts';
import { writeMatrixManifest } from './write-matrix-manifest.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE_DIRECTORY = join(REPO_ROOT, 'tools', 'spritegen', 'fleet-src');
const OUTPUT_DIRECTORY = join(REPO_ROOT, 'public', 'assets', 'cars');

/** Shared scale/origin from the previous generated set so the track does not resize. */
const PIXELS_PER_UNIT = 8.143264;
const ORIGIN = { x: 0.5, y: 0.550512 };

const CONTENT_ALPHA = 10;
const CONTENT_LUMA = 15;
const CROP_MARGIN = 2;
const FIT_PAD = 2;

/**
 * Source frame that becomes output frame 0, and whether the painted pack walks
 * the opposite way to `frameIndexForHeading` (heading 0 = +X = down-right on
 * the iso screen). The fleet-src sheets already start on that pose and step
 * clockwise, which matches increasing heading, so both stay at identity.
 */
const FRAME_ZERO_OFFSET = 0;
const FRAME_REVERSE = false;

function isContent(r: number, g: number, b: number, a: number): boolean {
  return a > CONTENT_ALPHA && r + g + b > CONTENT_LUMA;
}

function readRgba(path: string): { width: number; height: number; pixels: Uint8Array } {
  const png = PNG.sync.read(readFileSync(path));
  return { width: png.width, height: png.height, pixels: new Uint8Array(png.data) };
}

function pixelAt(
  pixels: Uint8Array,
  width: number,
  x: number,
  y: number,
): { r: number; g: number; b: number; a: number } {
  const index = (y * width + x) * 4;
  return {
    r: pixels[index] ?? 0,
    g: pixels[index + 1] ?? 0,
    b: pixels[index + 2] ?? 0,
    a: pixels[index + 3] ?? 0,
  };
}

function contentRowRange(pixels: Uint8Array, width: number, height: number): { y0: number; y1: number } {
  let y0 = height;
  let y1 = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = pixelAt(pixels, width, x, y);
      if (isContent(p.r, p.g, p.b, p.a)) {
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        break;
      }
    }
  }
  if (y1 < 0) {
    throw new Error('source sheet has no opaque content');
  }
  return {
    y0: Math.max(0, y0 - CROP_MARGIN),
    y1: Math.min(height - 1, y1 + CROP_MARGIN),
  };
}

function contentBox(
  pixels: Uint8Array,
  width: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { x0: number; y0: number; x1: number; y1: number } | null {
  let minX = x1;
  let minY = y1;
  let maxX = x0 - 1;
  let maxY = y0 - 1;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const p = pixelAt(pixels, width, x, y);
      if (isContent(p.r, p.g, p.b, p.a)) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) {
    return null;
  }
  return { x0: minX, y0: minY, x1: maxX, y1: maxY };
}

function cellBounds(sheetWidth: number, frameIndex: number): { x0: number; x1: number } {
  const x0 = Math.round((frameIndex * sheetWidth) / CAR_SPRITE_FRAMES);
  const x1 = Math.round(((frameIndex + 1) * sheetWidth) / CAR_SPRITE_FRAMES) - 1;
  return { x0, x1 };
}

function sourceIndexForOutput(outputIndex: number): number {
  if (FRAME_REVERSE) {
    return (FRAME_ZERO_OFFSET - outputIndex + CAR_SPRITE_FRAMES) % CAR_SPRITE_FRAMES;
  }
  return (outputIndex + FRAME_ZERO_OFFSET) % CAR_SPRITE_FRAMES;
}

/**
 * Maps every source cell through the same scale and dest origin. The cell
 * centre lands on `ORIGIN` so the sprite cannot wobble as the car turns.
 */
function extractFrame(
  source: { width: number; height: number; pixels: Uint8Array },
  cellX0: number,
  cellX1: number,
  cropY0: number,
  cropY1: number,
  scale: number,
): Uint8Array {
  const cellCenterX = (cellX0 + cellX1 + 1) / 2;
  const cellCenterY = (cropY0 + cropY1 + 1) / 2;
  const destOriginX = ORIGIN.x * CAR_FRAME_WIDTH;
  const destOriginY = ORIGIN.y * CAR_FRAME_HEIGHT;
  const frame = new Uint8Array(CAR_FRAME_WIDTH * CAR_FRAME_HEIGHT * 4);

  for (let y = 0; y < CAR_FRAME_HEIGHT; y += 1) {
    const srcY = cellCenterY + (y + 0.5 - destOriginY) / scale;
    const srcYi = Math.floor(srcY);
    for (let x = 0; x < CAR_FRAME_WIDTH; x += 1) {
      const srcX = cellCenterX + (x + 0.5 - destOriginX) / scale;
      const srcXi = Math.floor(srcX);
      const destIndex = (y * CAR_FRAME_WIDTH + x) * 4;
      if (srcXi < cellX0 || srcXi > cellX1 || srcYi < cropY0 || srcYi > cropY1) {
        continue;
      }
      if (srcXi < 0 || srcXi >= source.width || srcYi < 0 || srcYi >= source.height) {
        continue;
      }
      const p = pixelAt(source.pixels, source.width, srcXi, srcYi);
      if (!isContent(p.r, p.g, p.b, p.a)) {
        continue;
      }
      frame[destIndex] = p.r;
      frame[destIndex + 1] = p.g;
      frame[destIndex + 2] = p.b;
      frame[destIndex + 3] = 255;
    }
  }
  return frame;
}

function shadowFromFrames(frames: readonly Uint8Array[]): { width: number; height: number } {
  let maxW = 0;
  let maxH = 0;
  for (const frame of frames) {
    let minX = CAR_FRAME_WIDTH;
    let minY = CAR_FRAME_HEIGHT;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < CAR_FRAME_HEIGHT; y += 1) {
      for (let x = 0; x < CAR_FRAME_WIDTH; x += 1) {
        const a = frame[(y * CAR_FRAME_WIDTH + x) * 4 + 3] ?? 0;
        if (a > CONTENT_ALPHA) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX >= minX) {
      maxW = Math.max(maxW, maxX - minX + 1);
      maxH = Math.max(maxH, maxY - minY + 1);
    }
  }
  return {
    width: Math.max(8, Math.round(maxW * 0.72)),
    height: Math.max(6, Math.round(maxH * 0.38)),
  };
}

function sharedScale(
  source: { width: number; height: number; pixels: Uint8Array },
  cropY0: number,
  cropY1: number,
): number {
  let maxW = 1;
  let maxH = 1;
  for (let i = 0; i < CAR_SPRITE_FRAMES; i += 1) {
    const cell = cellBounds(source.width, i);
    const box = contentBox(source.pixels, source.width, cell.x0, cropY0, cell.x1, cropY1);
    if (box === null) {
      continue;
    }
    maxW = Math.max(maxW, box.x1 - box.x0 + 1);
    maxH = Math.max(maxH, box.y1 - box.y0 + 1);
  }
  const fit = Math.max(1, Math.min(CAR_FRAME_WIDTH, CAR_FRAME_HEIGHT) - FIT_PAD * 2);
  return Math.min(fit / maxW, fit / maxH);
}

function importCar(sourcePath: string): { frames: Uint8Array[]; shadow: { width: number; height: number } } {
  const source = readRgba(sourcePath);
  const rows = contentRowRange(source.pixels, source.width, source.height);
  const scale = sharedScale(source, rows.y0, rows.y1);
  const frames: Uint8Array[] = [];
  for (let outputIndex = 0; outputIndex < CAR_SPRITE_FRAMES; outputIndex += 1) {
    const sourceIndex = sourceIndexForOutput(outputIndex);
    const cell = cellBounds(source.width, sourceIndex);
    frames.push(extractFrame(source, cell.x0, cell.x1, rows.y0, rows.y1, scale));
  }
  return { frames, shadow: shadowFromFrames(frames) };
}

function main(): void {
  mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
  const sheets: CarSheetManifest[] = [];

  for (const def of FLEET_CARS) {
    const sourcePath = join(SOURCE_DIRECTORY, def.source);
    const imported = importCar(sourcePath);
    const image = `${def.id}.png`;
    const strip = packStrip(imported.frames, CAR_FRAME_WIDTH, CAR_FRAME_HEIGHT);
    writePng(join(OUTPUT_DIRECTORY, image), strip);
    sheets.push({
      id: def.id,
      displayName: def.displayName,
      archetype: def.archetype,
      image,
      shadow: imported.shadow,
      stats: withCollisionBox(def.stats, collisionBoxForCarId(def.id)),
      perk: def.perk,
      homePlanetId: def.homePlanetId,
      worldAdvantage: def.worldAdvantage,
    });
    console.log(`  ${def.id.padEnd(16)} ${strip.width}x${strip.height}  shadow ${imported.shadow.width}x${imported.shadow.height}`);
  }

  const roster = writeMatrixManifest();
  console.log(`\n${sheets.length} fleet PNG(s) imported @ ${PIXELS_PER_UNIT} px/unit`);
  console.log(`cars.json rewritten from matrix_car ({N}_hero): ${roster.carCount} row(s)`);
}

main();
