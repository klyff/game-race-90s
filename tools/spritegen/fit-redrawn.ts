import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAR_SPRITE_FRAMES } from '../../src/domain/constants.ts';
import { writePng } from './raster/png.ts';
import {
  contentBox,
  frameFileName,
  isOpaque,
  pixelAt,
  readRgba,
} from './redrawn-io.ts';
import { marauder } from './cars/marauder.car.ts';
import { poseExtents, poseRectPx, unionExtents } from './pose-footprint.ts';
import { findCarModel } from './registry.ts';
import type { CarModelDef } from './schema.ts';
import {
  HQ_SIZE,
  REDRAWN_FRAME_SIZE,
  REDRAWN_PIXELS_PER_UNIT,
  STRIP_ORIGIN,
} from './strip-contract.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REDRAWN_ROOT = join(REPO_ROOT, 'tools', 'spritegen', 'redrawn');

const PIN_X = STRIP_ORIGIN.x * REDRAWN_FRAME_SIZE;
const PIN_Y = STRIP_ORIGIN.y * REDRAWN_FRAME_SIZE;

function modelForRedrawn(carId: string): CarModelDef {
  if (carId === 'car-1') {
    return marauder;
  }
  return findCarModel(carId);
}

function parseArgs(argv: readonly string[]): string {
  const carId = argv.filter((token) => token !== '--' && !token.startsWith('--'))[0];
  if (carId === undefined) {
    throw new Error('usage: npm run gen:fit-redrawn -- <carId>');
  }
  return carId;
}

function chroma(r: number, g: number, b: number): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function luma(r: number, g: number, b: number): number {
  return (r + g + b) / 3;
}

function isGreenKey(r: number, g: number, b: number): boolean {
  return g > 180 && g > r + 40 && g > b + 40;
}

function isPaper(r: number, g: number, b: number): boolean {
  return luma(r, g, b) > 220 && chroma(r, g, b) < 28;
}

function punchBackdrop(width: number, height: number, pixels: Uint8Array): Uint8Array {
  const out = new Uint8Array(pixels);
  let greenHits = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (isGreenKey(pixels[i] ?? 0, pixels[i + 1] ?? 0, pixels[i + 2] ?? 0)) {
      greenHits += 1;
    }
  }
  if (greenHits > width * height * 0.08) {
    for (let i = 0; i < out.length; i += 4) {
      if (isGreenKey(out[i] ?? 0, out[i + 1] ?? 0, out[i + 2] ?? 0)) {
        out[i + 3] = 0;
      }
    }
    return out;
  }

  const seen = new Uint8Array(width * height);
  const queue: number[] = [];
  const push = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }
    const index = y * width + x;
    if (seen[index] === 1) {
      return;
    }
    const p = pixelAt(out, width, x, y);
    if (!isPaper(p.r, p.g, p.b)) {
      return;
    }
    seen[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  while (queue.length > 0) {
    const index = queue.pop()!;
    const x = index % width;
    const y = (index - x) / width;
    const dest = index * 4;
    out[dest + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  return out;
}

function nearest(
  source: Uint8Array,
  srcW: number,
  srcH: number,
  destW: number,
  destH: number,
  scale: number,
  originX: number,
  originY: number,
  srcCx: number,
  srcCy: number,
): Uint8Array {
  const dest = new Uint8Array(destW * destH * 4);
  for (let y = 0; y < destH; y += 1) {
    const srcY = Math.floor(srcCy + (y + 0.5 - originY) / scale);
    for (let x = 0; x < destW; x += 1) {
      const srcX = Math.floor(srcCx + (x + 0.5 - originX) / scale);
      if (srcX < 0 || srcY < 0 || srcX >= srcW || srcY >= srcH) {
        continue;
      }
      const p = pixelAt(source, srcW, srcX, srcY);
      if (!isOpaque(p.a)) {
        continue;
      }
      const destIndex = (y * destW + x) * 4;
      dest[destIndex] = p.r;
      dest[destIndex + 1] = p.g;
      dest[destIndex + 2] = p.b;
      dest[destIndex + 3] = 255;
    }
  }
  return dest;
}

interface Crop {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

/** Tight crop of opaque pixels. No destination box involved. */
function consumePose(
  name: string,
  width: number,
  height: number,
  punched: Uint8Array,
): Crop {
  const box = contentBox(punched, width, height);
  if (box === null) {
    throw new Error(`${name} is blank after backdrop punch`);
  }
  const cropW = box.x1 - box.x0 + 1;
  const cropH = box.y1 - box.y0 + 1;
  const pixels = new Uint8Array(cropW * cropH * 4);
  for (let y = 0; y < cropH; y += 1) {
    for (let x = 0; x < cropW; x += 1) {
      const src = pixelAt(punched, width, box.x0 + x, box.y0 + y);
      const dest = (y * cropW + x) * 4;
      pixels[dest] = src.r;
      pixels[dest + 1] = src.g;
      pixels[dest + 2] = src.b;
      pixels[dest + 3] = src.a;
    }
  }
  return { name, width: cropW, height: cropH, pixels };
}

/** Contain the painted crop into this index's projected rect (fixed world size). */
function fitPoseToFootprint(crop: Crop, frame: number, def: CarModelDef): Uint8Array {
  const rect = poseRectPx(poseExtents(def, frame), PIN_X, PIN_Y, REDRAWN_PIXELS_PER_UNIT);
  const scale = Math.min(rect.width / crop.width, rect.height / crop.height);
  return nearest(
    crop.pixels,
    crop.width,
    crop.height,
    REDRAWN_FRAME_SIZE,
    REDRAWN_FRAME_SIZE,
    scale,
    rect.x + rect.width / 2,
    rect.y + rect.height / 2,
    crop.width / 2,
    crop.height / 2,
  );
}

function fitHq(
  punched: { width: number; height: number; pixels: Uint8Array },
): Uint8Array {
  const box = contentBox(punched.pixels, punched.width, punched.height);
  if (box === null) {
    throw new Error('HQ has no opaque car after backdrop punch');
  }
  const pad = 24;
  const srcW = box.x1 - box.x0 + 1;
  const srcH = box.y1 - box.y0 + 1;
  const scale = Math.min((HQ_SIZE - pad * 2) / srcW, (HQ_SIZE - pad * 2) / srcH);
  return nearest(
    punched.pixels,
    punched.width,
    punched.height,
    HQ_SIZE,
    HQ_SIZE,
    scale,
    HQ_SIZE / 2,
    HQ_SIZE / 2,
    (box.x0 + box.x1 + 1) / 2,
    (box.y0 + box.y1 + 1) / 2,
  );
}

function main(): void {
  const carId = parseArgs(process.argv.slice(2));
  const directory = join(REDRAWN_ROOT, carId);
  const rawDirectory = join(directory, 'raw');
  if (!existsSync(rawDirectory)) {
    throw new Error(`missing ${rawDirectory}`);
  }

  // 1. Consume every pose. No destination box yet.
  const poses: Crop[] = [];
  for (let i = 0; i < CAR_SPRITE_FRAMES; i += 1) {
    const name = frameFileName(i);
    const path = join(rawDirectory, name);
    if (!existsSync(path)) {
      throw new Error(`missing raw frame ${path}`);
    }
    const image = readRgba(path);
    const punched = punchBackdrop(image.width, image.height, image.pixels);
    poses.push(consumePose(name, image.width, image.height, punched));
  }

  mkdirSync(directory, { recursive: true });

  // 2–3. Box from the fixed world solids, not from the painted fill.
  const def = modelForRedrawn(carId);
  const union = unionExtents(def);
  const boxW = (union.maxSx - union.minSx) * REDRAWN_PIXELS_PER_UNIT;
  const boxH = (union.maxSy - union.minSy) * REDRAWN_PIXELS_PER_UNIT;

  // 4. Each index is centred in its projected rect inside that box.
  for (let i = 0; i < poses.length; i += 1) {
    const pose = poses[i]!;
    writePng(join(directory, pose.name), {
      width: REDRAWN_FRAME_SIZE,
      height: REDRAWN_FRAME_SIZE,
      pixels: fitPoseToFootprint(pose, i, def),
    });
  }
  console.log(
    `fitted ${poses.length} frames  geo box ${boxW.toFixed(1)}×${boxH.toFixed(1)}  ppu ${REDRAWN_PIXELS_PER_UNIT}  pin ${PIN_X.toFixed(1)},${PIN_Y.toFixed(1)} → ${directory}`,
  );

  for (const hqName of ['hq-right.png', 'hq-left.png']) {
    const path = join(rawDirectory, hqName);
    if (!existsSync(path)) {
      continue;
    }
    const image = readRgba(path);
    const pixels = punchBackdrop(image.width, image.height, image.pixels);
    writePng(join(directory, hqName), {
      width: HQ_SIZE,
      height: HQ_SIZE,
      pixels: fitHq({ width: image.width, height: image.height, pixels }),
    });
    console.log(`fitted ${hqName}`);
  }

  const extras = readdirSync(rawDirectory).filter(
    (name) => !/^\d{2}\.png$/.test(name) && name !== 'hq-right.png' && name !== 'hq-left.png',
  );
  if (extras.length > 0) {
    console.log(`ignored extra raw files: ${extras.join(', ')}`);
  }
}

main();
