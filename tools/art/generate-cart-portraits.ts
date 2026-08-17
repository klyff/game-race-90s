import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { cartPortraitFile, parseCarSetManifest } from '../../src/data/cars/CarManifest.ts';
import { CAR_FRAME_HEIGHT, CAR_FRAME_WIDTH, CAR_SPRITE_FRAMES } from '../../src/domain/constants.ts';
import { writePng } from '../spritegen/raster/png.ts';
import type { Bitmap } from '../spritegen/raster/png.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CARS_DIRECTORY = join(REPO_ROOT, 'public', 'assets', 'cars');
const PORTRAIT_SIZE = 300;
const HERO_FRAME = 0;
const CONTENT_ALPHA = 10;
const CONTENT_LUMA = 15;
const FIT_PAD = 8;

function readRgba(path: string): Bitmap {
  const png = PNG.sync.read(readFileSync(path));
  return { width: png.width, height: png.height, pixels: new Uint8Array(png.data) };
}

function isContent(r: number, g: number, b: number, a: number): boolean {
  return a > CONTENT_ALPHA && r + g + b > CONTENT_LUMA;
}

function extractFrame(sheet: Bitmap, frameIndex: number): Bitmap {
  const pixels = new Uint8Array(CAR_FRAME_WIDTH * CAR_FRAME_HEIGHT * 4);
  const sourceX = frameIndex * CAR_FRAME_WIDTH;
  for (let y = 0; y < CAR_FRAME_HEIGHT; y += 1) {
    const source = (y * sheet.width + sourceX) * 4;
    pixels.set(sheet.pixels.subarray(source, source + CAR_FRAME_WIDTH * 4), y * CAR_FRAME_WIDTH * 4);
  }
  return { width: CAR_FRAME_WIDTH, height: CAR_FRAME_HEIGHT, pixels };
}

function opaqueBounds(frame: Bitmap): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = frame.width;
  let y0 = frame.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const i = (y * frame.width + x) * 4;
      if (!isContent(frame.pixels[i] ?? 0, frame.pixels[i + 1] ?? 0, frame.pixels[i + 2] ?? 0, frame.pixels[i + 3] ?? 0)) {
        continue;
      }
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  if (x1 < x0) {
    return { x0: 0, y0: 0, x1: frame.width - 1, y1: frame.height - 1 };
  }
  return { x0, y0, x1, y1 };
}

function portraitFromFrame(frame: Bitmap): Bitmap {
  const box = opaqueBounds(frame);
  const srcW = box.x1 - box.x0 + 1;
  const srcH = box.y1 - box.y0 + 1;
  const inner = PORTRAIT_SIZE - FIT_PAD * 2;
  const scale = Math.max(1, Math.floor(Math.min(inner / srcW, inner / srcH)));
  const dstW = srcW * scale;
  const dstH = srcH * scale;
  const originX = Math.floor((PORTRAIT_SIZE - dstW) / 2);
  const originY = Math.floor((PORTRAIT_SIZE - dstH) / 2);
  const pixels = new Uint8Array(PORTRAIT_SIZE * PORTRAIT_SIZE * 4);

  for (let y = 0; y < dstH; y += 1) {
    const sourceY = box.y0 + Math.floor(y / scale);
    for (let x = 0; x < dstW; x += 1) {
      const sourceX = box.x0 + Math.floor(x / scale);
      const source = (sourceY * frame.width + sourceX) * 4;
      const target = ((originY + y) * PORTRAIT_SIZE + originX + x) * 4;
      pixels[target] = frame.pixels[source] ?? 0;
      pixels[target + 1] = frame.pixels[source + 1] ?? 0;
      pixels[target + 2] = frame.pixels[source + 2] ?? 0;
      pixels[target + 3] = frame.pixels[source + 3] ?? 0;
    }
  }
  return { width: PORTRAIT_SIZE, height: PORTRAIT_SIZE, pixels };
}

const manifest = parseCarSetManifest(JSON.parse(readFileSync(join(CARS_DIRECTORY, 'cars.json'), 'utf8')));
for (const car of manifest.cars) {
  const sheet = readRgba(join(CARS_DIRECTORY, car.image));
  if (sheet.width < CAR_FRAME_WIDTH * CAR_SPRITE_FRAMES) {
    throw new Error(`${car.image} is too narrow for ${CAR_SPRITE_FRAMES} frames`);
  }
  const out = join(CARS_DIRECTORY, cartPortraitFile(car.id));
  if (existsSync(out)) {
    console.log(`kept existing ${cartPortraitFile(car.id)}`);
    continue;
  }
  const portrait = portraitFromFrame(extractFrame(sheet, HERO_FRAME));
  writePng(out, portrait);
  console.log(out);
}
