import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { CAR_SPRITE_FRAMES } from '../../src/domain/constants.ts';
import { REDRAWN_FRAME_SIZE } from './strip-contract.ts';

export const CONTENT_ALPHA = 10;

export function frameFileName(index: number): string {
  return `${String(index).padStart(2, '0')}.png`;
}

export function framePath(directory: string, index: number): string {
  return join(directory, frameFileName(index));
}

export function readRgba(path: string): { width: number; height: number; pixels: Uint8Array } {
  const png = PNG.sync.read(readFileSync(path));
  return { width: png.width, height: png.height, pixels: new Uint8Array(png.data) };
}

export function pixelAt(
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

export function isOpaque(a: number): boolean {
  return a > CONTENT_ALPHA;
}

export function contentBox(
  pixels: Uint8Array,
  width: number,
  height: number,
): { x0: number; y0: number; x1: number; y1: number } | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isOpaque(pixelAt(pixels, width, x, y).a)) {
        continue;
      }
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) {
    return null;
  }
  return { x0: minX, y0: minY, x1: maxX, y1: maxY };
}

export function translateFrame(
  pixels: Uint8Array,
  width: number,
  height: number,
  dx: number,
  dy: number,
): Uint8Array {
  if (dx === 0 && dy === 0) {
    return pixels;
  }
  const next = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const srcY = y - dy;
    if (srcY < 0 || srcY >= height) {
      continue;
    }
    for (let x = 0; x < width; x += 1) {
      const srcX = x - dx;
      if (srcX < 0 || srcX >= width) {
        continue;
      }
      const dest = (y * width + x) * 4;
      const src = (srcY * width + srcX) * 4;
      next[dest] = pixels[src] ?? 0;
      next[dest + 1] = pixels[src + 1] ?? 0;
      next[dest + 2] = pixels[src + 2] ?? 0;
      next[dest + 3] = pixels[src + 3] ?? 0;
    }
  }
  return next;
}

export function missingFrameFiles(directory: string): string[] {
  const missing: string[] = [];
  for (let i = 0; i < CAR_SPRITE_FRAMES; i += 1) {
    const path = framePath(directory, i);
    if (!existsSync(path)) {
      missing.push(frameFileName(i));
    }
  }
  return missing;
}

export interface GameFrames {
  readonly frames: readonly Uint8Array[];
  readonly frameSize: number;
}

export function loadGameFrames(directory: string): GameFrames {
  const missing = missingFrameFiles(directory);
  if (missing.length > 0) {
    throw new Error(
      `redrawn frames missing in ${directory}: ${missing.join(', ')}. Draw 00–31.png first.`,
    );
  }

  const first = readRgba(framePath(directory, 0));
  if (first.width !== first.height) {
    throw new Error(`${frameFileName(0)} must be square, got ${first.width}×${first.height}`);
  }
  const frameSize = first.width;
  if (frameSize !== REDRAWN_FRAME_SIZE && frameSize !== 64) {
    throw new Error(
      `${frameFileName(0)} is ${frameSize}×${frameSize}, expected ${REDRAWN_FRAME_SIZE} or 64`,
    );
  }

  const frames: Uint8Array[] = [first.pixels];
  for (let i = 1; i < CAR_SPRITE_FRAMES; i += 1) {
    const image = readRgba(framePath(directory, i));
    if (image.width !== frameSize || image.height !== frameSize) {
      throw new Error(
        `${frameFileName(i)} is ${image.width}×${image.height}, expected ${frameSize}×${frameSize}`,
      );
    }
    frames.push(image.pixels);
  }
  return { frames, frameSize };
}

export function shadowFromFrames(
  frames: readonly Uint8Array[],
  frameSize: number,
): { width: number; height: number } {
  let maxW = 0;
  let maxH = 0;
  for (const frame of frames) {
    const box = contentBox(frame, frameSize, frameSize);
    if (box === null) {
      continue;
    }
    maxW = Math.max(maxW, box.x1 - box.x0 + 1);
    maxH = Math.max(maxH, box.y1 - box.y0 + 1);
  }
  return {
    width: Math.max(8, Math.round(maxW * 0.72)),
    height: Math.max(6, Math.round(maxH * 0.38)),
  };
}
