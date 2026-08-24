import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { overlayCellBorders, packPreviewGrid, writePng } from './raster/png.ts';
import {
  contentBox,
  isOpaque,
  loadGameFrames,
  missingFrameFiles,
  pixelAt,
  readRgba,
} from './redrawn-io.ts';
import { ANCHOR_FRAMES, HQ_SIZE, LOOKALIKE_MAX_MAD, MATRIX_ANCHOR_FRAMES, STRIP_MARGIN_PX } from './strip-contract.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REDRAWN_ROOT = join(REPO_ROOT, 'tools', 'spritegen', 'redrawn');

const PREVIEW_ZOOM = 4;
const PREVIEW_BACKGROUND: readonly [number, number, number, number] = [38, 42, 48, 255];
const PREVIEW_BORDER: readonly [number, number, number] = [58, 64, 72];

function parseArgs(argv: readonly string[]): string {
  const carId = argv.filter((token) => token !== '--' && !token.startsWith('--'))[0];
  if (carId === undefined) {
    throw new Error('usage: npm run gen:qa-strip -- <carId>');
  }
  return carId;
}

function marginHits(pixels: Uint8Array, frameSize: number): number {
  let hits = 0;
  for (let y = 0; y < frameSize; y += 1) {
    for (let x = 0; x < frameSize; x += 1) {
      const onEdge =
        x < STRIP_MARGIN_PX ||
        y < STRIP_MARGIN_PX ||
        x >= frameSize - STRIP_MARGIN_PX ||
        y >= frameSize - STRIP_MARGIN_PX;
      if (onEdge && isOpaque(pixelAt(pixels, frameSize, x, y).a)) {
        hits += 1;
      }
    }
  }
  return hits;
}

function meanAbsDiff(a: Uint8Array, b: Uint8Array, frameSize: number): number {
  let sum = 0;
  let count = 0;
  for (let y = 0; y < frameSize; y += 1) {
    for (let x = 0; x < frameSize; x += 1) {
      const pa = pixelAt(a, frameSize, x, y);
      const pb = pixelAt(b, frameSize, x, y);
      if (!isOpaque(pa.a) && !isOpaque(pb.a)) {
        continue;
      }
      sum += Math.abs(pa.r - pb.r) + Math.abs(pa.g - pb.g) + Math.abs(pa.b - pb.b);
      count += 1;
    }
  }
  if (count === 0) {
    return 0;
  }
  return sum / (count * 3);
}

function checkHq(directory: string, name: string, errors: string[]): void {
  const path = join(directory, name);
  if (!existsSync(path)) {
    errors.push(`missing ${name}`);
    return;
  }
  const image = readRgba(path);
  if (image.width !== HQ_SIZE || image.height !== HQ_SIZE) {
    errors.push(`${name} is ${image.width}×${image.height}, expected ${HQ_SIZE}×${HQ_SIZE}`);
  }
}

function main(): void {
  const carId = parseArgs(process.argv.slice(2));
  const directory = join(REDRAWN_ROOT, carId);
  if (!existsSync(directory)) {
    throw new Error(`missing ${directory}`);
  }

  const missing = missingFrameFiles(directory);
  if (missing.length > 0) {
    throw new Error(`redrawn frames missing in ${directory}: ${missing.join(', ')}`);
  }

  const { frames, frameSize } = loadGameFrames(directory);
  const errors: string[] = [];

  for (let i = 0; i < frames.length; i += 1) {
    const frame = frames[i]!;
    if (contentBox(frame, frameSize, frameSize) === null) {
      errors.push(`frame ${String(i).padStart(2, '0')} is blank`);
      continue;
    }
    const hits = marginHits(frame, frameSize);
    if (hits > 0) {
      errors.push(`frame ${String(i).padStart(2, '0')} paints ${hits} px inside the ${STRIP_MARGIN_PX}px margin`);
    }
  }

  const front = frames[0]!;
  const rear = frames[16]!;
  const mad = meanAbsDiff(front, rear, frameSize);
  if (mad < LOOKALIKE_MAX_MAD) {
    errors.push(
      `frames 00 and 16 look like the same pose (MAD ${mad.toFixed(1)} < ${LOOKALIKE_MAX_MAD}). Front must oppose rear.`,
    );
  } else {
    console.log(`00 vs 16 MAD ${mad.toFixed(1)} (ok, ≥ ${LOOKALIKE_MAX_MAD})`);
  }

  checkHq(directory, 'hq-right.png', errors);
  checkHq(directory, 'hq-left.png', errors);

  const anchors = ANCHOR_FRAMES.map((index) => frames[index]!);
  const grid = packPreviewGrid(
    anchors,
    frameSize,
    frameSize,
    4,
    PREVIEW_ZOOM,
    PREVIEW_BACKGROUND,
  );
  overlayCellBorders(grid, frameSize * PREVIEW_ZOOM, frameSize * PREVIEW_ZOOM, PREVIEW_BORDER);
  const qaPath = join(directory, 'qa-anchors.png');
  writePng(qaPath, grid);
  console.log(`wrote ${qaPath}  (32-frame ${ANCHOR_FRAMES.join('/')} · matrix ${MATRIX_ANCHOR_FRAMES.join('/')})`);

  if (errors.length > 0) {
    throw new Error(`qa-strip ${carId} failed:\n- ${errors.join('\n- ')}`);
  }
  console.log(`qa-strip ${carId} passed  ${frameSize}×${frameSize}`);
}

main();
