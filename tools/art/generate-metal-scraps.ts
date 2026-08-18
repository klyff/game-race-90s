/**
 * Writes 20 stand-in metal scraps into `public/assets/debris/scrap-01.png` …
 * `scrap-20.png`. Owner art dropped in that folder is left alone.
 *
 * Art is 48×48 RGBA, chunky steel silhouettes so a ram has something to throw
 * before the real pieces land.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const SIZE = 48;
const COUNT = 20;

type Rgba = readonly [number, number, number, number];

const STEEL: readonly Rgba[] = [
  [232, 236, 242, 255],
  [168, 176, 188, 255],
  [110, 118, 130, 255],
  [74, 80, 92, 255],
  [42, 46, 54, 255],
];
const RUST: Rgba = [138, 90, 64, 255];
const EDGE: Rgba = [28, 30, 36, 255];

function emptyFrame(): Uint8Array {
  return new Uint8Array(SIZE * SIZE * 4);
}

function plot(frame: Uint8Array, x: number, y: number, colour: Rgba): void {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= SIZE || py >= SIZE) {
    return;
  }
  const index = (py * SIZE + px) * 4;
  frame[index] = colour[0];
  frame[index + 1] = colour[1];
  frame[index + 2] = colour[2];
  frame[index + 3] = colour[3];
}

function fillRect(
  frame: Uint8Array,
  x: number,
  y: number,
  w: number,
  h: number,
  colour: Rgba,
): void {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      plot(frame, px, py, colour);
    }
  }
}

function fillPoly(frame: Uint8Array, points: readonly (readonly [number, number])[], colour: Rgba): void {
  const ys = points.map(p => p[1]);
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxY = Math.min(SIZE - 1, Math.ceil(Math.max(...ys)));
  for (let y = minY; y <= maxY; y += 1) {
    const hits: number[] = [];
    for (let i = 0; i < points.length; i += 1) {
      const [ax, ay] = points[i]!;
      const [bx, by] = points[(i + 1) % points.length]!;
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        hits.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
    }
    hits.sort((a, b) => a - b);
    for (let i = 0; i + 1 < hits.length; i += 2) {
      const x0 = Math.max(0, Math.floor(hits[i]!));
      const x1 = Math.min(SIZE - 1, Math.ceil(hits[i + 1]!));
      for (let x = x0; x <= x1; x += 1) {
        plot(frame, x, y, colour);
      }
    }
  }
}

function outlinePoly(frame: Uint8Array, points: readonly (readonly [number, number])[], colour: Rgba): void {
  for (let i = 0; i < points.length; i += 1) {
    const [ax, ay] = points[i]!;
    const [bx, by] = points[(i + 1) % points.length]!;
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
    for (let s = 0; s <= steps; s += 1) {
      plot(frame, ax + ((bx - ax) * s) / steps, ay + ((by - ay) * s) / steps, colour);
    }
  }
}

function steel(index: number): Rgba {
  return STEEL[index % STEEL.length]!;
}

function drawScrap(index: number): Uint8Array {
  const frame = emptyFrame();
  const mid = steel(1);
  const dark = steel(3);
  const lite = steel(0);
  const shade = steel(4);

  const drawers: Array<(f: Uint8Array) => void> = [
    f => {
      const p: Array<[number, number]> = [[10, 12], [38, 10], [40, 20], [14, 28], [8, 20]];
      fillPoly(f, p, mid);
      outlinePoly(f, p, EDGE);
      fillRect(f, 14, 14, 18, 3, lite);
    },
    f => {
      fillRect(f, 16, 10, 16, 28, dark);
      fillRect(f, 18, 12, 12, 24, mid);
      fillRect(f, 20, 18, 8, 8, shade);
      fillRect(f, 22, 20, 4, 4, lite);
    },
    f => {
      const p: Array<[number, number]> = [[8, 22], [18, 8], [32, 12], [40, 20], [34, 36], [16, 38], [6, 30]];
      fillPoly(f, p, dark);
      outlinePoly(f, p, EDGE);
      fillRect(f, 18, 16, 10, 8, RUST);
    },
    f => {
      fillRect(f, 12, 20, 24, 8, mid);
      fillRect(f, 12, 20, 24, 2, lite);
      fillRect(f, 12, 26, 24, 2, shade);
    },
    f => {
      const p: Array<[number, number]> = [[10, 36], [24, 8], [38, 36]];
      fillPoly(f, p, mid);
      outlinePoly(f, p, EDGE);
      fillRect(f, 22, 20, 4, 10, lite);
    },
    f => {
      for (let a = 0; a < 32; a += 1) {
        const t = (a / 32) * Math.PI * 2;
        plot(f, 24 + Math.cos(t) * 12, 24 + Math.sin(t) * 12, EDGE);
        plot(f, 24 + Math.cos(t) * 8, 24 + Math.sin(t) * 8, mid);
      }
      fillRect(f, 22, 22, 4, 4, shade);
    },
    f => {
      const p: Array<[number, number]> = [[8, 16], [28, 10], [40, 18], [36, 28], [12, 32]];
      fillPoly(f, p, dark);
      outlinePoly(f, p, EDGE);
      fillRect(f, 16, 18, 16, 3, lite);
    },
    f => {
      fillRect(f, 12, 12, 24, 24, mid);
      fillRect(f, 12, 12, 24, 3, lite);
      fillRect(f, 18, 18, 12, 12, shade);
      outlinePoly(f, [[12, 12], [36, 12], [36, 36], [12, 36]], EDGE);
    },
    f => {
      const p: Array<[number, number]> = [[24, 8], [40, 24], [24, 40], [8, 24]];
      fillPoly(f, p, mid);
      outlinePoly(f, p, EDGE);
      fillRect(f, 22, 22, 4, 4, lite);
    },
    f => {
      for (let i = 0; i < 5; i += 1) {
        fillRect(f, 14 + i * 4, 16 + (i % 2) * 6, 6, 14, i % 2 === 0 ? mid : dark);
      }
    },
    f => {
      const p: Array<[number, number]> = [[10, 20], [24, 8], [38, 20], [32, 36], [16, 36]];
      fillPoly(f, p, dark);
      outlinePoly(f, p, EDGE);
      fillRect(f, 20, 18, 8, 8, RUST);
    },
    f => {
      fillRect(f, 10, 20, 28, 8, mid);
      for (let i = 0; i < 5; i += 1) {
        fillRect(f, 12 + i * 5, 22, 3, 4, shade);
      }
      fillRect(f, 10, 20, 28, 2, lite);
    },
    f => {
      const p: Array<[number, number]> = [[12, 14], [30, 10], [38, 22], [28, 36], [10, 32], [14, 22]];
      fillPoly(f, p, steel(2));
      outlinePoly(f, p, EDGE);
      fillRect(f, 18, 18, 8, 6, RUST);
    },
    f => {
      const p: Array<[number, number]> = [[16, 8], [28, 10], [26, 40], [14, 38]];
      fillPoly(f, p, mid);
      outlinePoly(f, p, EDGE);
      fillRect(f, 18, 12, 6, 4, lite);
    },
    f => {
      fillRect(f, 12, 14, 8, 22, dark);
      fillRect(f, 12, 14, 24, 8, mid);
      fillRect(f, 14, 16, 20, 4, lite);
    },
    f => {
      fillRect(f, 16, 16, 16, 16, mid);
      fillRect(f, 20, 20, 8, 8, shade);
      outlinePoly(f, [[16, 16], [32, 16], [32, 32], [16, 32]], EDGE);
      fillRect(f, 16, 16, 16, 2, lite);
    },
    f => {
      const p: Array<[number, number]> = [[10, 28], [18, 10], [30, 12], [40, 26], [28, 38], [14, 36]];
      fillPoly(f, p, dark);
      outlinePoly(f, p, EDGE);
      fillRect(f, 20, 20, 10, 3, lite);
    },
    f => {
      fillRect(f, 14, 18, 20, 6, mid);
      fillRect(f, 14, 24, 6, 10, mid);
      fillRect(f, 28, 12, 6, 12, mid);
      outlinePoly(f, [[14, 18], [34, 18], [34, 24], [20, 24], [20, 34], [14, 34]], EDGE);
    },
    f => {
      fillRect(f, 10, 14, 28, 20, mid);
      fillRect(f, 10, 14, 28, 3, lite);
      fillRect(f, 12, 20, 4, 4, shade);
      fillRect(f, 32, 20, 4, 4, shade);
      fillRect(f, 22, 26, 4, 4, shade);
      outlinePoly(f, [[10, 14], [38, 14], [38, 34], [10, 34]], EDGE);
    },
    f => {
      const p: Array<[number, number]> = [[8, 24], [20, 10], [36, 16], [40, 30], [24, 40], [10, 34]];
      fillPoly(f, p, steel(2));
      outlinePoly(f, p, EDGE);
      fillRect(f, 18, 20, 12, 4, lite);
      fillRect(f, 26, 26, 6, 6, RUST);
    },
  ];

  drawers[index]?.(frame);
  return frame;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const payload = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(payload));
  return Buffer.concat([length, payload, crc]);
}

function encodePng(width: number, height: number, pixels: Uint8Array): Buffer {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    raw.set(pixels.subarray(y * width * 4, (y + 1) * width * 4), row + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array()),
  ]);
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', '..', 'public', 'assets', 'debris');
mkdirSync(outDir, { recursive: true });

let written = 0;
for (let index = 0; index < COUNT; index += 1) {
  const file = `scrap-${String(index + 1).padStart(2, '0')}.png`;
  const path = join(outDir, file);
  if (existsSync(path)) {
    console.log(`kept existing ${file}`);
    continue;
  }
  writeFileSync(path, encodePng(SIZE, SIZE, drawScrap(index)));
  written += 1;
}

console.log(
  written === 0
    ? `no new scraps (owner art already in ${outDir})`
    : `wrote ${written} metal scraps (48x48) to ${outDir}`,
);
