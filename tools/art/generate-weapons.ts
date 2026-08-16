/**
 * Writes 32-yaw contact sheets for missile / oil / mine into
 * `public/assets/weapons/*.png`.
 *
 * Same 8×4 layout the race scene already loads (`WEAPON_SHEET`): 32 frames of
 * 221×221, matching the owner missile contact sheet. Art is authored at 32×32
 * and nearest-neighbour scaled so the pixels stay chunky.
 *
 * If `missile-special-1.png` is present, that owner sheet is left as
 * `missile.png` (this tool only writes oil / mine in that case).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const FRAME = 32;
const FRAME_OUT = 221;
const COLUMNS = 8;
const ROWS = 4;
const FRAME_COUNT = 32;
const CENTRE = (FRAME - 1) / 2;

type Rgba = readonly [number, number, number, number];

function emptyFrame(): Uint8Array {
  return new Uint8Array(FRAME * FRAME * 4);
}

function plot(frame: Uint8Array, x: number, y: number, colour: Rgba): void {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= FRAME || py >= FRAME) {
    return;
  }
  const index = (py * FRAME + px) * 4;
  const alpha = colour[3];
  if (alpha >= 255) {
    frame[index] = colour[0];
    frame[index + 1] = colour[1];
    frame[index + 2] = colour[2];
    frame[index + 3] = 255;
    return;
  }
  const destA = frame[index + 3] ?? 0;
  if (destA === 0) {
    frame[index] = colour[0];
    frame[index + 1] = colour[1];
    frame[index + 2] = colour[2];
    frame[index + 3] = alpha;
    return;
  }
  const outA = alpha + destA * (1 - alpha / 255);
  const mix = alpha / outA;
  frame[index] = Math.round(colour[0] * mix + (frame[index] ?? 0) * (1 - mix));
  frame[index + 1] = Math.round(colour[1] * mix + (frame[index + 1] ?? 0) * (1 - mix));
  frame[index + 2] = Math.round(colour[2] * mix + (frame[index + 2] ?? 0) * (1 - mix));
  frame[index + 3] = Math.round(outA);
}

function rotate(x: number, y: number, angle: number): readonly [number, number] {
  const dx = x - CENTRE;
  const dy = y - CENTRE;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [CENTRE + dx * cos - dy * sin, CENTRE + dx * sin + dy * cos];
}

function stamp(
  frame: Uint8Array,
  localX: number,
  localY: number,
  angle: number,
  colour: Rgba,
): void {
  const [x, y] = rotate(localX, localY, angle);
  plot(frame, x, y, colour);
}

function drawMissile(angle: number): Uint8Array {
  const frame = emptyFrame();
  const body: Rgba = [255, 214, 70, 255];
  const shade: Rgba = [210, 120, 24, 255];
  const nose: Rgba = [255, 72, 48, 255];
  const fin: Rgba = [48, 56, 72, 255];
  const highlight: Rgba = [255, 244, 180, 255];
  const exhaust: Rgba = [255, 140, 40, 200];

  for (let x = 7; x <= 24; x += 1) {
    const half = x < 10 ? 1 : x > 21 ? 1 : 2;
    for (let y = -half; y <= half; y += 1) {
      const colour = y < 0 ? highlight : y > 0 ? shade : body;
      stamp(frame, CENTRE + (x - CENTRE), CENTRE + y, angle, colour);
    }
  }
  stamp(frame, 26, CENTRE, angle, nose);
  stamp(frame, 25, CENTRE - 1, angle, nose);
  stamp(frame, 25, CENTRE + 1, angle, nose);
  stamp(frame, 8, CENTRE - 3, angle, fin);
  stamp(frame, 8, CENTRE + 3, angle, fin);
  stamp(frame, 7, CENTRE - 2, angle, fin);
  stamp(frame, 7, CENTRE + 2, angle, fin);
  stamp(frame, 6, CENTRE, angle, exhaust);
  stamp(frame, 5, CENTRE, angle, [255, 90, 20, 160]);
  return frame;
}

function drawOil(angle: number): Uint8Array {
  const frame = emptyFrame();
  const puddle: Rgba = [12, 8, 6, 240];
  const sheen: Rgba = [28, 70, 32, 220];
  const rainbow: Rgba = [40, 140, 90, 200];
  const highlight: Rgba = [90, 200, 110, 190];
  const edge: Rgba = [8, 6, 4, 210];

  for (let y = -7; y <= 7; y += 1) {
    const span = Math.max(3, 11 - Math.abs(y) - (Math.abs(y) > 5 ? 2 : 0));
    for (let x = -span; x <= span; x += 1) {
      const radial = Math.hypot(x / 11, y / 7);
      if (radial > 1) {
        continue;
      }
      const swirl = Math.sin(angle * 0.4 + x * 0.35 + y * 0.2);
      const colour =
        radial > 0.88 ? edge : radial < 0.22 ? highlight : swirl > 0.35 ? rainbow : swirl < -0.2 ? sheen : puddle;
      plot(frame, CENTRE + x, CENTRE + y * 0.62, colour);
    }
  }
  return frame;
}

function drawMine(angle: number): Uint8Array {
  const frame = emptyFrame();
  const shell: Rgba = [36, 38, 44, 255];
  const shade: Rgba = [20, 22, 26, 255];
  const rim: Rgba = [90, 96, 110, 255];
  const spike: Rgba = [200, 40, 48, 255];
  const ledOn: Rgba = [255, 60, 50, 255];
  const ledOff: Rgba = [120, 24, 24, 255];
  const blink = Math.floor((angle / ((Math.PI * 2) / FRAME_COUNT)) % 4) < 2;

  for (let y = -5; y <= 5; y += 1) {
    for (let x = -5; x <= 5; x += 1) {
      if (x * x + y * y > 26) {
        continue;
      }
      const colour = x * x + y * y > 18 ? rim : y > 1 ? shade : shell;
      stamp(frame, CENTRE + x, CENTRE + y, angle, colour);
    }
  }

  for (let spikeIndex = 0; spikeIndex < 6; spikeIndex += 1) {
    const spikeAngle = (spikeIndex * Math.PI) / 3;
    const sx = Math.cos(spikeAngle);
    const sy = Math.sin(spikeAngle);
    stamp(frame, CENTRE + sx * 7, CENTRE + sy * 7, angle, spike);
    stamp(frame, CENTRE + sx * 8, CENTRE + sy * 8, angle, spike);
  }

  const led = blink ? ledOn : ledOff;
  stamp(frame, CENTRE, CENTRE, angle, led);
  stamp(frame, CENTRE - 1, CENTRE, angle, led);
  stamp(frame, CENTRE + 1, CENTRE, angle, led);
  stamp(frame, CENTRE, CENTRE - 1, angle, led);
  return frame;
}

function scaleFrame(frame: Uint8Array): Uint8Array {
  const out = new Uint8Array(FRAME_OUT * FRAME_OUT * 4);
  for (let y = 0; y < FRAME_OUT; y += 1) {
    const sourceY = Math.min(FRAME - 1, Math.floor((y * FRAME) / FRAME_OUT));
    for (let x = 0; x < FRAME_OUT; x += 1) {
      const sourceX = Math.min(FRAME - 1, Math.floor((x * FRAME) / FRAME_OUT));
      const source = (sourceY * FRAME + sourceX) * 4;
      const target = (y * FRAME_OUT + x) * 4;
      out[target] = frame[source] ?? 0;
      out[target + 1] = frame[source + 1] ?? 0;
      out[target + 2] = frame[source + 2] ?? 0;
      out[target + 3] = frame[source + 3] ?? 0;
    }
  }
  return out;
}

function packSheet(frames: readonly Uint8Array[]): { width: number; height: number; pixels: Uint8Array } {
  const width = FRAME_OUT * COLUMNS;
  const height = FRAME_OUT * ROWS;
  const pixels = new Uint8Array(width * height * 4);
  frames.forEach((frame, frameIndex) => {
    const scaled = scaleFrame(frame);
    const cellX = (frameIndex % COLUMNS) * FRAME_OUT;
    const cellY = Math.floor(frameIndex / COLUMNS) * FRAME_OUT;
    for (let y = 0; y < FRAME_OUT; y += 1) {
      for (let x = 0; x < FRAME_OUT; x += 1) {
        const source = (y * FRAME_OUT + x) * 4;
        const target = ((cellY + y) * width + cellX + x) * 4;
        pixels[target] = scaled[source] ?? 0;
        pixels[target + 1] = scaled[source + 1] ?? 0;
        pixels[target + 2] = scaled[source + 2] ?? 0;
        pixels[target + 3] = scaled[source + 3] ?? 0;
      }
    }
  });
  return { width, height, pixels };
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const payload = Buffer.concat([typeBytes, Buffer.from(data)]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(payload));
  return Buffer.concat([length, payload, crc]);
}

/** Minimal RGBA PNG writer so this tool does not need `pngjs` installed. */
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

function renderSheet(draw: (angle: number) => Uint8Array): Buffer {
  const frames = Array.from({ length: FRAME_COUNT }, (_, index) => {
    const angle = (index * Math.PI * 2) / FRAME_COUNT;
    return draw(angle);
  });
  const sheet = packSheet(frames);
  return encodePng(sheet.width, sheet.height, sheet.pixels);
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', '..', 'public', 'assets', 'weapons');
mkdirSync(outDir, { recursive: true });

const sheets = [
  { file: 'missile.png', draw: drawMissile },
  { file: 'oil.png', draw: drawOil },
  { file: 'mine.png', draw: drawMine },
];

let written = 0;
for (const sheet of sheets) {
  const path = join(outDir, sheet.file);
  if (existsSync(path)) {
    console.log(`kept existing ${sheet.file}`);
    continue;
  }
  writeFileSync(path, renderSheet(sheet.draw));
  written += 1;
}

console.log(
  written === 0
    ? `no new sheets (owner art already in ${outDir})`
    : `wrote ${written} weapon sheets (${FRAME_OUT}x${FRAME_OUT} × ${FRAME_COUNT}) to ${outDir}`,
);
