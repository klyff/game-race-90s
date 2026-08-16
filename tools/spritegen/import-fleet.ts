import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import {
  CAR_FRAME_HEIGHT,
  CAR_FRAME_WIDTH,
  CAR_SPRITE_FRAMES,
} from '../../src/domain/constants.ts';
import type { CarSetManifest, CarSheetManifest } from '../../src/data/cars/CarManifest.ts';
import { FLEET_CARS } from './fleet.ts';
import { packStrip, writePng } from './raster/png.ts';

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

function extractFrame(
  source: { width: number; height: number; pixels: Uint8Array },
  cellX0: number,
  cellX1: number,
  cropY0: number,
  cropY1: number,
): Uint8Array {
  const box =
    contentBox(source.pixels, source.width, cellX0, cropY0, cellX1, cropY1) ?? {
      x0: cellX0,
      y0: cropY0,
      x1: cellX1,
      y1: cropY1,
    };
  const srcW = box.x1 - box.x0 + 1;
  const srcH = box.y1 - box.y0 + 1;
  const fit = Math.max(1, Math.min(CAR_FRAME_WIDTH, CAR_FRAME_HEIGHT) - FIT_PAD * 2);
  const scale = Math.min(fit / srcW, fit / srcH, 1);
  const destW = Math.max(1, Math.round(srcW * scale));
  const destH = Math.max(1, Math.round(srcH * scale));
  const offsetX = Math.floor((CAR_FRAME_WIDTH - destW) / 2);
  const offsetY = Math.floor((CAR_FRAME_HEIGHT - destH) / 2);

  const frame = new Uint8Array(CAR_FRAME_WIDTH * CAR_FRAME_HEIGHT * 4);
  for (let y = 0; y < destH; y += 1) {
    const srcY = box.y0 + Math.min(srcH - 1, Math.floor((y + 0.5) / scale));
    for (let x = 0; x < destW; x += 1) {
      const srcX = box.x0 + Math.min(srcW - 1, Math.floor((x + 0.5) / scale));
      const p = pixelAt(source.pixels, source.width, srcX, srcY);
      const destIndex = ((offsetY + y) * CAR_FRAME_WIDTH + (offsetX + x)) * 4;
      frame[destIndex] = p.r;
      frame[destIndex + 1] = p.g;
      frame[destIndex + 2] = p.b;
      frame[destIndex + 3] = p.a;
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

function importCar(sourcePath: string): { frames: Uint8Array[]; shadow: { width: number; height: number } } {
  const source = readRgba(sourcePath);
  const rows = contentRowRange(source.pixels, source.width, source.height);
  const frames: Uint8Array[] = [];
  for (let i = 0; i < CAR_SPRITE_FRAMES; i += 1) {
    const cellX0 = Math.round((i * source.width) / CAR_SPRITE_FRAMES);
    const cellX1 = Math.round(((i + 1) * source.width) / CAR_SPRITE_FRAMES) - 1;
    frames.push(extractFrame(source, cellX0, cellX1, rows.y0, rows.y1));
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
      stats: def.stats,
      perk: def.perk,
      homePlanetId: def.homePlanetId,
      worldAdvantage: def.worldAdvantage,
    });
    console.log(`  ${def.id.padEnd(16)} ${strip.width}x${strip.height}  shadow ${imported.shadow.width}x${imported.shadow.height}`);
  }

  const manifest: CarSetManifest = {
    frameWidth: CAR_FRAME_WIDTH,
    frameHeight: CAR_FRAME_HEIGHT,
    frameCount: CAR_SPRITE_FRAMES,
    pixelsPerUnit: PIXELS_PER_UNIT,
    origin: ORIGIN,
    cars: sheets,
  };
  writeFileSync(join(OUTPUT_DIRECTORY, 'cars.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\n${sheets.length} car(s) imported @ ${PIXELS_PER_UNIT} px/unit`);
}

main();
