import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

export interface Bitmap {
  readonly width: number;
  readonly height: number;
  /** RGBA, 8 bits per channel. */
  readonly pixels: Uint8Array;
}

export function writePng(path: string, bitmap: Bitmap): void {
  const png = new PNG({ width: bitmap.width, height: bitmap.height });
  png.data = Buffer.from(bitmap.pixels.buffer, bitmap.pixels.byteOffset, bitmap.pixels.byteLength);
  writeFileSync(path, PNG.sync.write(png));
}

/** Lays frames out left-to-right into a single strip, the format Phaser loads. */
export function packStrip(frames: readonly Uint8Array[], frameWidth: number, frameHeight: number): Bitmap {
  const width = frameWidth * frames.length;
  const pixels = new Uint8Array(width * frameHeight * 4);

  frames.forEach((frame, frameIndex) => {
    const columnOffset = frameIndex * frameWidth;
    for (let y = 0; y < frameHeight; y += 1) {
      const sourceRow = y * frameWidth * 4;
      const targetRow = (y * width + columnOffset) * 4;
      pixels.set(frame.subarray(sourceRow, sourceRow + frameWidth * 4), targetRow);
    }
  });

  return { width, height: frameHeight, pixels };
}

/**
 * Arranges frames into a grid and magnifies them with nearest-neighbour, so a
 * human or an art agent can eyeball every angle at a readable size.
 */
export function packPreviewGrid(
  frames: readonly Uint8Array[],
  frameWidth: number,
  frameHeight: number,
  columns: number,
  zoom: number,
  background: readonly [number, number, number, number],
): Bitmap {
  const rows = Math.ceil(frames.length / columns);
  const width = columns * frameWidth * zoom;
  const height = rows * frameHeight * zoom;
  const pixels = new Uint8Array(width * height * 4);

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = background[0];
    pixels[i + 1] = background[1];
    pixels[i + 2] = background[2];
    pixels[i + 3] = background[3];
  }

  frames.forEach((frame, frameIndex) => {
    const cellX = (frameIndex % columns) * frameWidth * zoom;
    const cellY = Math.floor(frameIndex / columns) * frameHeight * zoom;

    for (let y = 0; y < frameHeight * zoom; y += 1) {
      const sourceY = Math.floor(y / zoom);
      for (let x = 0; x < frameWidth * zoom; x += 1) {
        const sourceIndex = (sourceY * frameWidth + Math.floor(x / zoom)) * 4;
        if (frame[sourceIndex + 3] === 0) continue;
        const targetIndex = ((cellY + y) * width + cellX + x) * 4;
        pixels[targetIndex] = frame[sourceIndex]!;
        pixels[targetIndex + 1] = frame[sourceIndex + 1]!;
        pixels[targetIndex + 2] = frame[sourceIndex + 2]!;
        pixels[targetIndex + 3] = 255;
      }
    }
  });

  return { width, height, pixels };
}

/** Draws a thin grid separating preview cells, so frame bounds are visible. */
export function overlayCellBorders(
  bitmap: Bitmap,
  cellWidth: number,
  cellHeight: number,
  color: readonly [number, number, number],
): void {
  const paint = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) return;
    const index = (y * bitmap.width + x) * 4;
    bitmap.pixels[index] = color[0];
    bitmap.pixels[index + 1] = color[1];
    bitmap.pixels[index + 2] = color[2];
    bitmap.pixels[index + 3] = 255;
  };

  for (let x = 0; x < bitmap.width; x += cellWidth) {
    for (let y = 0; y < bitmap.height; y += 1) paint(x, y);
  }
  for (let y = 0; y < bitmap.height; y += cellHeight) {
    for (let x = 0; x < bitmap.width; x += 1) paint(x, y);
  }
}

/** Stacks equally wide bitmaps top to bottom into one image. */
export function stackVertically(parts: readonly Bitmap[]): Bitmap {
  if (parts.length === 0) throw new Error('stackVertically needs at least one bitmap');
  const width = Math.max(...parts.map((part) => part.width));
  const height = parts.reduce((total, part) => total + part.height, 0);
  const pixels = new Uint8Array(width * height * 4);

  let cursorY = 0;
  for (const part of parts) {
    for (let y = 0; y < part.height; y += 1) {
      const sourceRow = y * part.width * 4;
      const targetRow = ((cursorY + y) * width) * 4;
      pixels.set(part.pixels.subarray(sourceRow, sourceRow + part.width * 4), targetRow);
    }
    cursorY += part.height;
  }

  return { width, height, pixels };
}
