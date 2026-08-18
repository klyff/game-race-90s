/**
 * FIT.md for a partial raw drop (anchors first).
 * Does not need a registry model or all 32 frames.
 *
 *   npm run gen:fit-raw -- car_2
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writePng } from './raster/png.ts';
import { contentBox, isOpaque, pixelAt, readRgba } from './redrawn-io.ts';
import { REDRAWN_FRAME_SIZE, STRIP_MARGIN_PX, STRIP_ORIGIN } from './strip-contract.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REDRAWN_ROOT = join(REPO_ROOT, 'tools', 'spritegen', 'redrawn');

const PIN_X = STRIP_ORIGIN.x * REDRAWN_FRAME_SIZE;
const PIN_Y = STRIP_ORIGIN.y * REDRAWN_FRAME_SIZE;
const INNER = REDRAWN_FRAME_SIZE - STRIP_MARGIN_PX * 2;

/** CLOCK.md painted budgets. Empty space past this is correct. */
function poseBudget(frame: number): { width: number; height: number } {
  if (frame === 4 || frame === 20) {
    return { width: 50, height: 58 };
  }
  if (frame === 12 || frame === 28) {
    return { width: 90, height: 38 };
  }
  return { width: 90, height: 60 };
}

function chroma(r: number, g: number, b: number): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function luma(r: number, g: number, b: number): number {
  return (r + g + b) / 3;
}

function isPaper(r: number, g: number, b: number): boolean {
  return luma(r, g, b) > 220 && chroma(r, g, b) < 28;
}

function isInkBlack(r: number, g: number, b: number): boolean {
  return luma(r, g, b) < 18 && chroma(r, g, b) < 12;
}

function punchBackdrop(width: number, height: number, pixels: Uint8Array): Uint8Array {
  const out = new Uint8Array(pixels);
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
    if (!isPaper(p.r, p.g, p.b) && !isInkBlack(p.r, p.g, p.b)) {
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
    out[index * 4 + 3] = 0;
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

function parseArgs(argv: readonly string[]): string {
  const carId = argv.filter((token) => token !== '--' && !token.startsWith('--'))[0];
  if (carId === undefined) {
    throw new Error('usage: npm run gen:fit-raw -- <carId>');
  }
  return carId;
}

function main(): void {
  const carId = parseArgs(process.argv.slice(2));
  const directory = join(REDRAWN_ROOT, carId);
  const rawDirectory = join(directory, 'raw');
  if (!existsSync(rawDirectory)) {
    throw new Error(`missing ${rawDirectory}`);
  }

  const names = readdirSync(rawDirectory).filter((name) => /^\d{2}\.png$/.test(name)).sort();
  if (names.length === 0) {
    throw new Error(`no raw NN.png frames in ${rawDirectory}`);
  }

  mkdirSync(directory, { recursive: true });

  for (const name of names) {
    const frame = Number.parseInt(name.slice(0, 2), 10);
    const image = readRgba(join(rawDirectory, name));
    const punched = punchBackdrop(image.width, image.height, image.pixels);
    const box = contentBox(punched, image.width, image.height);
    if (box === null) {
      throw new Error(`${name} is blank after backdrop punch`);
    }
    const cropW = box.x1 - box.x0 + 1;
    const cropH = box.y1 - box.y0 + 1;
    const crop = new Uint8Array(cropW * cropH * 4);
    for (let y = 0; y < cropH; y += 1) {
      for (let x = 0; x < cropW; x += 1) {
        const src = pixelAt(punched, image.width, box.x0 + x, box.y0 + y);
        const dest = (y * cropW + x) * 4;
        crop[dest] = src.r;
        crop[dest + 1] = src.g;
        crop[dest + 2] = src.b;
        crop[dest + 3] = src.a;
      }
    }

    const budget = poseBudget(frame);
    const scale = Math.min(budget.width / cropW, budget.height / cropH);
    const pixels = nearest(
      crop,
      cropW,
      cropH,
      REDRAWN_FRAME_SIZE,
      REDRAWN_FRAME_SIZE,
      scale,
      PIN_X,
      PIN_Y,
      cropW / 2,
      cropH / 2,
    );
    writePng(join(directory, name), {
      width: REDRAWN_FRAME_SIZE,
      height: REDRAWN_FRAME_SIZE,
      pixels,
    });
    console.log(
      `fitted ${name}  crop ${cropW}×${cropH}  budget ${budget.width}×${budget.height}  scale ${scale.toFixed(3)}`,
    );
  }

  console.log(`fitted ${names.length} raw frames → ${directory}  pin ${PIN_X.toFixed(1)},${PIN_Y.toFixed(1)}  inner ${INNER}`);
}

main();
