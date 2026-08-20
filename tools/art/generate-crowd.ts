/**
 * 64×64 start-line crowd: rock, punk, piriguete, cheer (idle/wave),
 * adult flasher (shirt / lift). Hard edges, light top-left, transparent
 * ground. Figure ~24 px tall, feet on pin (32, 50). Always drawn facing
 * the camera — no yaw strip.
 *
 * Run: npm run gen:crowd
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const SIZE = 64;
const PIN_X = 32;
const PIN_Y = 50;

type Rgba = readonly [number, number, number, number];

const OUTLINE: Rgba = [22, 14, 12, 255];
const SKIN: Rgba = [214, 168, 126, 255];
const SKIN_LIT: Rgba = [232, 196, 156, 255];
const SKIN_SHADE: Rgba = [176, 122, 90, 255];
const SKIN_DEEP: Rgba = [148, 96, 72, 255];
const HAIR_DARK: Rgba = [42, 28, 22, 255];
const HAIR_LIT: Rgba = [72, 48, 36, 255];
const BOOT: Rgba = [36, 28, 26, 255];
const JEAN: Rgba = [52, 68, 110, 255];
const JEAN_LIT: Rgba = [78, 96, 142, 255];
const LEATHER: Rgba = [48, 32, 30, 255];
const LEATHER_LIT: Rgba = [78, 52, 46, 255];
const MOHAWK: Rgba = [196, 48, 72, 255];
const MOHAWK_LIT: Rgba = [228, 86, 98, 255];
const SPIKE: Rgba = [188, 192, 200, 255];
const DRESS: Rgba = [176, 48, 96, 255];
const DRESS_LIT: Rgba = [214, 78, 124, 255];
const DRESS_SHADE: Rgba = [120, 28, 68, 255];
const HEEL: Rgba = [28, 18, 22, 255];
const CHEER: Rgba = [236, 214, 72, 255];
const CHEER_LIT: Rgba = [248, 232, 120, 255];
const CHEER_SHADE: Rgba = [168, 140, 36, 255];
const SHIRT: Rgba = [248, 240, 228, 255];
const SHIRT_SHADE: Rgba = [196, 180, 164, 255];
const SHADOW: Rgba = [18, 14, 12, 90];

type CrowdDraw = 'rock' | 'punk' | 'piriguete' | 'cheer-idle' | 'cheer-wave' | 'flasher-idle' | 'flasher-flash';

function set(frame: Uint8Array, x: number, y: number, colour: Rgba): void {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) {
    return;
  }
  const i = (y * SIZE + x) * 4;
  frame[i] = colour[0];
  frame[i + 1] = colour[1];
  frame[i + 2] = colour[2];
  frame[i + 3] = colour[3];
}

function getA(frame: Uint8Array, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) {
    return 0;
  }
  return frame[(y * SIZE + x) * 4 + 3] ?? 0;
}

function fillRect(frame: Uint8Array, x0: number, y0: number, x1: number, y1: number, colour: Rgba): void {
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      set(frame, x, y, colour);
    }
  }
}

function fillEllipse(
  frame: Uint8Array,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  colour: Rgba,
): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        set(frame, x, y, colour);
      }
    }
  }
}

function strokeOutline(frame: Uint8Array): void {
  const ink: Array<readonly [number, number]> = [];
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (getA(frame, x, y) === 0 || getA(frame, x, y) < 200) {
        continue;
      }
      if (
        getA(frame, x - 1, y) === 0 ||
        getA(frame, x + 1, y) === 0 ||
        getA(frame, x, y - 1) === 0 ||
        getA(frame, x, y + 1) === 0
      ) {
        ink.push([x, y]);
      }
    }
  }
  for (const [x, y] of ink) {
    set(frame, x, y, OUTLINE);
  }
}

function shadeLeft(frame: Uint8Array, x0: number, y0: number, y1: number, lit: Rgba): void {
  for (let y = y0; y <= y1; y += 1) {
    set(frame, x0, y, lit);
  }
}

function drawLegs(frame: Uint8Array, jeans: boolean, heels: boolean): void {
  const pant = jeans ? JEAN : DRESS_SHADE;
  const pantLit = jeans ? JEAN_LIT : DRESS;
  fillRect(frame, PIN_X - 3, 42, PIN_X - 1, 48, pant);
  fillRect(frame, PIN_X + 1, 42, PIN_X + 3, 48, pant);
  shadeLeft(frame, PIN_X - 3, 42, 48, pantLit);
  shadeLeft(frame, PIN_X + 1, 42, 48, pantLit);
  if (heels) {
    fillRect(frame, PIN_X - 3, 49, PIN_X - 1, 50, HEEL);
    fillRect(frame, PIN_X + 1, 49, PIN_X + 3, 50, HEEL);
    set(frame, PIN_X - 3, 50, HEEL);
    set(frame, PIN_X + 3, 50, HEEL);
  } else {
    fillRect(frame, PIN_X - 3, 49, PIN_X - 1, 50, BOOT);
    fillRect(frame, PIN_X + 1, 49, PIN_X + 3, 50, BOOT);
  }
}

function drawTorso(
  frame: Uint8Array,
  colour: Rgba,
  lit: Rgba,
  shade: Rgba,
  wide: boolean,
): void {
  const left = PIN_X - (wide ? 5 : 4);
  const right = PIN_X + (wide ? 5 : 4);
  fillRect(frame, left, 33, right, 41, colour);
  shadeLeft(frame, left, 33, 41, lit);
  fillRect(frame, right - 1, 34, right, 41, shade);
}

function drawHead(frame: Uint8Array): void {
  fillEllipse(frame, PIN_X, 29, 3.4, 3.8, SKIN);
  fillRect(frame, PIN_X - 2, 28, PIN_X - 1, 30, SKIN_LIT);
  set(frame, PIN_X + 2, 29, SKIN_SHADE);
  set(frame, PIN_X - 1, 30, SKIN);
  set(frame, PIN_X + 1, 30, SKIN);
}

function drawLongHair(frame: Uint8Array): void {
  fillRect(frame, PIN_X - 4, 25, PIN_X + 4, 28, HAIR_DARK);
  fillRect(frame, PIN_X - 4, 29, PIN_X - 3, 36, HAIR_DARK);
  fillRect(frame, PIN_X + 3, 29, PIN_X + 4, 36, HAIR_DARK);
  set(frame, PIN_X - 3, 26, HAIR_LIT);
  set(frame, PIN_X - 2, 25, HAIR_LIT);
}

function drawShortHair(frame: Uint8Array): void {
  fillRect(frame, PIN_X - 3, 25, PIN_X + 3, 27, HAIR_DARK);
  set(frame, PIN_X - 2, 25, HAIR_LIT);
}

function drawMohawk(frame: Uint8Array): void {
  fillRect(frame, PIN_X - 1, 20, PIN_X + 1, 26, MOHAWK);
  set(frame, PIN_X, 20, MOHAWK_LIT);
  set(frame, PIN_X, 21, MOHAWK_LIT);
  fillRect(frame, PIN_X - 3, 26, PIN_X + 3, 27, HAIR_DARK);
}

function drawArmsDown(frame: Uint8Array, sleeve: Rgba): void {
  fillRect(frame, PIN_X - 6, 34, PIN_X - 5, 41, sleeve);
  fillRect(frame, PIN_X + 5, 34, PIN_X + 6, 41, sleeve);
  fillRect(frame, PIN_X - 6, 41, PIN_X - 5, 43, SKIN);
  fillRect(frame, PIN_X + 5, 41, PIN_X + 6, 43, SKIN);
}

function drawArmsWave(frame: Uint8Array, sleeve: Rgba): void {
  fillRect(frame, PIN_X - 7, 26, PIN_X - 5, 34, sleeve);
  fillRect(frame, PIN_X + 5, 26, PIN_X + 7, 34, sleeve);
  fillRect(frame, PIN_X - 8, 24, PIN_X - 6, 26, SKIN);
  fillRect(frame, PIN_X + 6, 24, PIN_X + 8, 26, SKIN);
}

function drawArmsLiftShirt(frame: Uint8Array): void {
  fillRect(frame, PIN_X - 6, 28, PIN_X - 5, 33, SKIN);
  fillRect(frame, PIN_X + 5, 28, PIN_X + 6, 33, SKIN);
  fillRect(frame, PIN_X - 5, 26, PIN_X + 5, 28, SHIRT);
}

function draw(kind: CrowdDraw): Uint8Array {
  const frame = new Uint8Array(SIZE * SIZE * 4);
  fillEllipse(frame, PIN_X, PIN_Y, 7, 3.2, SHADOW);

  if (kind === 'rock') {
    drawLegs(frame, true, false);
    drawTorso(frame, LEATHER, LEATHER_LIT, BOOT, true);
    drawArmsDown(frame, LEATHER);
    drawHead(frame);
    drawLongHair(frame);
  } else if (kind === 'punk') {
    drawLegs(frame, true, false);
    drawTorso(frame, LEATHER, LEATHER_LIT, BOOT, true);
    drawArmsDown(frame, LEATHER);
    set(frame, PIN_X - 6, 33, SPIKE);
    set(frame, PIN_X + 6, 33, SPIKE);
    drawHead(frame);
    drawMohawk(frame);
  } else if (kind === 'piriguete') {
    drawLegs(frame, false, true);
    fillRect(frame, PIN_X - 4, 38, PIN_X + 4, 42, DRESS);
    drawTorso(frame, DRESS, DRESS_LIT, DRESS_SHADE, false);
    drawArmsDown(frame, SKIN);
    drawHead(frame);
    drawLongHair(frame);
  } else if (kind === 'cheer-idle' || kind === 'cheer-wave') {
    drawLegs(frame, false, false);
    fillRect(frame, PIN_X - 3, 40, PIN_X + 3, 42, CHEER_SHADE);
    drawTorso(frame, CHEER, CHEER_LIT, CHEER_SHADE, false);
    if (kind === 'cheer-wave') {
      drawArmsWave(frame, CHEER);
    } else {
      drawArmsDown(frame, CHEER);
    }
    drawHead(frame);
    drawShortHair(frame);
  } else if (kind === 'flasher-idle') {
    drawLegs(frame, false, true);
    fillRect(frame, PIN_X - 4, 38, PIN_X + 4, 42, DRESS);
    drawTorso(frame, SHIRT, SHIRT, SHIRT_SHADE, false);
    drawArmsDown(frame, SKIN);
    drawHead(frame);
    drawLongHair(frame);
  } else {
    drawLegs(frame, false, true);
    fillRect(frame, PIN_X - 4, 38, PIN_X + 4, 42, DRESS);
    fillRect(frame, PIN_X - 4, 33, PIN_X + 4, 41, SKIN);
    fillRect(frame, PIN_X - 4, 33, PIN_X - 3, 40, SKIN_LIT);
    set(frame, PIN_X - 2, 37, SKIN_DEEP);
    set(frame, PIN_X + 2, 37, SKIN_DEEP);
    set(frame, PIN_X - 2, 36, SKIN_SHADE);
    set(frame, PIN_X + 2, 36, SKIN_SHADE);
    drawArmsLiftShirt(frame);
    drawHead(frame);
    drawLongHair(frame);
  }

  strokeOutline(frame);
  return frame;
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
const outDir = join(here, '..', '..', 'public', 'assets', 'crowd');
mkdirSync(outDir, { recursive: true });

const outputs: Array<{ file: string; kind: CrowdDraw }> = [
  { file: 'rock.png', kind: 'rock' },
  { file: 'punk.png', kind: 'punk' },
  { file: 'piriguete.png', kind: 'piriguete' },
  { file: 'cheer-idle.png', kind: 'cheer-idle' },
  { file: 'cheer-wave.png', kind: 'cheer-wave' },
  { file: 'flasher-idle.png', kind: 'flasher-idle' },
  { file: 'flasher-flash.png', kind: 'flasher-flash' },
];

for (const out of outputs) {
  writeFileSync(join(outDir, out.file), encodePng(SIZE, SIZE, draw(out.kind)));
}

console.log(`Wrote ${outputs.length} crowd sprites → ${outDir}`);
