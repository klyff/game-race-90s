/**
 * 32×32 HUD / hazard stills: turbo, missile, mine, oil barrel, jump spring,
 * gasoline barrel. Authored at native pixels, hard edges, shared outline.
 *
 * Light is top-left. No anti-alias, no semi-transparent fringe.
 * Run: node --experimental-strip-types tools/art/generate-hud-icons.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const SIZE = 32;

type Rgba = readonly [number, number, number, number];

const OUTLINE: Rgba = [26, 18, 14, 255];
const YELLOW: Rgba = [240, 200, 58, 255];
const YELLOW_LIGHT: Rgba = [255, 236, 140, 255];
const YELLOW_DARK: Rgba = [196, 148, 28, 255];
const GRAY_LIGHT: Rgba = [122, 126, 132, 255];
const GRAY: Rgba = [86, 90, 96, 255];
const GRAY_DARK: Rgba = [48, 50, 56, 255];
const RUST: Rgba = [138, 86, 40, 255];
const RED_LIGHT: Rgba = [210, 72, 52, 255];
const RED: Rgba = [168, 42, 32, 255];
const RED_DARK: Rgba = [96, 24, 20, 255];
const ORANGE: Rgba = [255, 140, 40, 255];
const ORANGE_LIGHT: Rgba = [255, 216, 92, 255];
const ORANGE_DARK: Rgba = [196, 64, 20, 255];
const GOLD: Rgba = [255, 214, 70, 255];
const GOLD_DARK: Rgba = [210, 120, 24, 255];
const NOSE: Rgba = [255, 72, 48, 255];
const SILVER: Rgba = [200, 204, 212, 255];
const SILVER_LIGHT: Rgba = [240, 244, 248, 255];
const SILVER_DARK: Rgba = [110, 114, 124, 255];
const SPRING: Rgba = [36, 36, 40, 255];
const BUFFER: Rgba = [232, 236, 240, 255];
const LED: Rgba = [255, 60, 50, 255];

function empty(): Uint8Array {
  return new Uint8Array(SIZE * SIZE * 4);
}

function set(frame: Uint8Array, x: number, y: number, colour: Rgba): void {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) {
    return;
  }
  const index = (y * SIZE + x) * 4;
  frame[index] = colour[0];
  frame[index + 1] = colour[1];
  frame[index + 2] = colour[2];
  frame[index + 3] = 255;
}

function getA(frame: Uint8Array, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) {
    return 0;
  }
  return frame[(y * SIZE + x) * 4 + 3] ?? 0;
}

/** 1px outline on any opaque pixel that touches empty. */
function strokeOutline(frame: Uint8Array): void {
  const ink: Array<readonly [number, number]> = [];
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (getA(frame, x, y) === 0) {
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

function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function drawBarrel(
  bodyLight: Rgba,
  bodyMid: Rgba,
  bodyDark: Rgba,
  emblem: 'drop' | 'flame',
): Uint8Array {
  const frame = empty();
  const cx = 16;

  // Cylinder first so the lid disc sits on top. 1–2px cell margin after outline.
  for (let y = 8; y <= 30; y += 1) {
    const hoop = y === 11 || y === 12 || y === 19 || y === 20 || y === 27 || y === 28;
    let half = hoop ? 14 : 13;
    if (y === 8) {
      half = 12;
    } else if (y === 9) {
      half = 13;
    } else if (y === 29) {
      half = hoop ? 13 : 12;
    } else if (y === 30) {
      half = 10;
    }
    for (let x = cx - half; x <= cx + half; x += 1) {
      let colour: Rgba = x <= cx - 5 ? bodyLight : x >= cx + 5 ? bodyDark : bodyMid;
      if (y === 8) {
        colour = x <= cx - 2 ? bodyMid : bodyDark;
      } else if (y >= 29) {
        colour = x <= cx - 1 ? bodyMid : bodyDark;
      }
      if (hoop) {
        // Dark wrap; top-left of each ring catches the light.
        colour = bodyDark;
        if (x <= cx - 5 && (y === 11 || y === 19 || y === 27)) {
          colour = bodyMid;
        }
      }
      set(frame, x, y, colour);
    }
  }

  // Yellow lid — 3/4 elevated ellipse, bung on the right.
  for (let y = 1; y <= 9; y += 1) {
    for (let x = 2; x <= 30; x += 1) {
      if (!inEllipse(x, y, cx, 5, 14, 4)) {
        continue;
      }
      let colour: Rgba = YELLOW;
      if (y <= 3 && x <= 18) {
        colour = YELLOW_LIGHT;
      }
      if (y >= 7 || x >= 26) {
        colour = YELLOW_DARK;
      }
      set(frame, x, y, colour);
    }
  }
  set(frame, 21, 4, YELLOW_DARK);
  set(frame, 22, 4, YELLOW_DARK);
  set(frame, 21, 5, YELLOW_DARK);
  set(frame, 22, 5, OUTLINE);

  const rust: Array<readonly [number, number]> = [
    [5, 14],
    [6, 15],
    [8, 16],
    [4, 22],
    [7, 24],
    [9, 23],
    [10, 26],
    [24, 14],
    [26, 16],
    [27, 18],
    [25, 22],
    [28, 23],
    [23, 25],
    [20, 29],
    [11, 29],
    [6, 20],
  ];
  for (const [x, y] of rust) {
    if (getA(frame, x, y) !== 0) {
      set(frame, x, y, RUST);
    }
  }

  for (let y = 14; y <= 20; y += 1) {
    for (let x = 12; x <= 20; x += 1) {
      if ((x - 16) * (x - 16) + (y - 17) * (y - 17) <= 13) {
        const rim = (x - 16) * (x - 16) + (y - 17) * (y - 17) >= 10;
        set(frame, x, y, rim ? YELLOW_DARK : y <= 15 && x <= 16 ? YELLOW_LIGHT : YELLOW);
      }
    }
  }
  if (emblem === 'drop') {
    set(frame, 16, 15, OUTLINE);
    set(frame, 15, 16, OUTLINE);
    set(frame, 16, 16, OUTLINE);
    set(frame, 17, 16, OUTLINE);
    set(frame, 14, 17, OUTLINE);
    set(frame, 15, 17, OUTLINE);
    set(frame, 16, 17, OUTLINE);
    set(frame, 17, 17, OUTLINE);
    set(frame, 18, 17, OUTLINE);
    set(frame, 15, 18, OUTLINE);
    set(frame, 16, 18, OUTLINE);
    set(frame, 17, 18, OUTLINE);
    set(frame, 16, 19, OUTLINE);
  } else {
    set(frame, 16, 14, OUTLINE);
    set(frame, 15, 15, OUTLINE);
    set(frame, 16, 15, OUTLINE);
    set(frame, 17, 15, OUTLINE);
    set(frame, 14, 16, OUTLINE);
    set(frame, 16, 16, OUTLINE);
    set(frame, 18, 16, OUTLINE);
    set(frame, 14, 17, OUTLINE);
    set(frame, 15, 17, OUTLINE);
    set(frame, 16, 17, OUTLINE);
    set(frame, 17, 17, OUTLINE);
    set(frame, 18, 17, OUTLINE);
    set(frame, 15, 18, OUTLINE);
    set(frame, 16, 18, OUTLINE);
    set(frame, 17, 18, OUTLINE);
    set(frame, 16, 19, OUTLINE);
  }

  strokeOutline(frame);
  return frame;
}

function drawTurbo(): Uint8Array {
  const frame = empty();
  // Fat standing canister, fills the cell like the drum.
  for (let y = 4; y <= 24; y += 1) {
    const top = y <= 6;
    const half = top ? 8 : y >= 23 ? 7 : 9;
    for (let x = 16 - half; x <= 16 + half; x += 1) {
      let colour: Rgba = x <= 11 ? ORANGE_LIGHT : x >= 21 ? ORANGE_DARK : ORANGE;
      if (y === 7 || y === 22) {
        colour = SILVER_DARK;
      }
      set(frame, x, y, colour);
    }
  }
  for (let x = 9; x <= 23; x += 1) {
    set(frame, x, 3, SILVER);
  }
  set(frame, 16, 2, SILVER_LIGHT);
  set(frame, 15, 2, SILVER);
  set(frame, 17, 2, SILVER);
  // Flame mark on the body.
  set(frame, 16, 12, YELLOW);
  set(frame, 16, 13, YELLOW);
  set(frame, 15, 14, ORANGE_LIGHT);
  set(frame, 16, 14, YELLOW);
  set(frame, 17, 14, ORANGE_LIGHT);
  set(frame, 14, 15, ORANGE);
  set(frame, 16, 15, YELLOW);
  set(frame, 18, 15, ORANGE);
  set(frame, 16, 16, ORANGE);
  // Nozzle flame at the foot.
  set(frame, 14, 25, YELLOW);
  set(frame, 15, 25, ORANGE_LIGHT);
  set(frame, 16, 25, YELLOW);
  set(frame, 17, 25, ORANGE_LIGHT);
  set(frame, 18, 25, YELLOW);
  set(frame, 15, 26, ORANGE);
  set(frame, 16, 26, ORANGE_LIGHT);
  set(frame, 17, 26, ORANGE);
  set(frame, 14, 27, ORANGE_DARK);
  set(frame, 16, 27, ORANGE);
  set(frame, 18, 27, ORANGE_DARK);
  set(frame, 16, 28, ORANGE_DARK);
  strokeOutline(frame);
  return frame;
}

function drawMissile(): Uint8Array {
  const frame = empty();
  // Fat diagonal rocket, nose top-right, exhaust bottom-left. Fills the cell.
  for (let i = 0; i < 22; i += 1) {
    const x = 3 + i;
    const y = 24 - Math.floor(i * 0.7);
    const nose = i >= 16;
    const tail = i < 4;
    const colour: Rgba = nose ? NOSE : tail ? GOLD_DARK : GOLD;
    const half = nose ? 1 : tail ? 2 : 3;
    for (let dy = -half; dy <= half; dy += 1) {
      let paint = colour;
      if (!nose && dy < 0) {
        paint = GOLD;
      } else if (!nose && dy > 1) {
        paint = GOLD_DARK;
      }
      if (nose && dy !== 0) {
        paint = NOSE;
      }
      set(frame, x, y + dy, paint);
    }
    if (!nose && i > 5 && i < 15) {
      set(frame, x, y - 4, GOLD);
    }
  }
  set(frame, 26, 8, NOSE);
  set(frame, 27, 8, NOSE);
  set(frame, 26, 7, NOSE);
  set(frame, 25, 7, NOSE);
  set(frame, 27, 9, NOSE);
  // Fins
  set(frame, 5, 20, SILVER);
  set(frame, 6, 19, SILVER_LIGHT);
  set(frame, 4, 21, SILVER_DARK);
  set(frame, 5, 26, SILVER);
  set(frame, 6, 27, SILVER_LIGHT);
  set(frame, 4, 25, SILVER_DARK);
  set(frame, 7, 18, SILVER);
  set(frame, 7, 28, SILVER);
  // Exhaust
  set(frame, 3, 25, ORANGE);
  set(frame, 2, 26, YELLOW);
  set(frame, 3, 26, ORANGE_LIGHT);
  set(frame, 4, 26, ORANGE);
  set(frame, 1, 27, ORANGE_DARK);
  set(frame, 2, 27, ORANGE);
  set(frame, 3, 27, YELLOW);
  set(frame, 2, 28, ORANGE_DARK);
  strokeOutline(frame);
  return frame;
}

function drawMine(): Uint8Array {
  const frame = empty();
  const cx = 16;
  const cy = 16;
  for (let y = 7; y <= 25; y += 1) {
    for (let x = 5; x <= 27; x += 1) {
      const dx = x - cx;
      const dy = (y - cy) * 1.12;
      if (dx * dx + dy * dy > 100) {
        continue;
      }
      const colour = x <= 10 ? GRAY_LIGHT : x >= 22 ? GRAY_DARK : GRAY;
      set(frame, x, y, colour);
    }
  }
  const spikes: Array<readonly [number, number]> = [
    [16, 3],
    [16, 4],
    [24, 6],
    [25, 7],
    [28, 16],
    [27, 16],
    [24, 25],
    [16, 28],
    [16, 27],
    [8, 25],
    [4, 16],
    [5, 16],
    [8, 6],
    [7, 7],
  ];
  for (const [x, y] of spikes) {
    set(frame, x, y, NOSE);
  }
  set(frame, 16, 16, LED);
  set(frame, 15, 16, LED);
  set(frame, 17, 16, LED);
  set(frame, 16, 15, LED);
  set(frame, 16, 17, LED);
  strokeOutline(frame);
  return frame;
}

function drawJump(): Uint8Array {
  const frame = empty();
  const rubber: Rgba = [64, 34, 30, 255];
  const rubberLit: Rgba = [98, 56, 50, 255];

  // Slight 3/4 lean: axis walks 15 → 16 as we go down.
  const axisAt = (y: number): number => 15 + Math.floor((y - 2) / 14);

  const band = (y: number, left: number, right: number, colour: Rgba): void => {
    for (let x = left; x <= right; x += 1) {
      set(frame, x, y, colour);
    }
  };

  const coilBand = (y: number, left: number, right: number): void => {
    for (let x = left; x <= right; x += 1) {
      set(frame, x, y, x <= left + 2 ? SILVER_DARK : SPRING);
    }
  };

  // Chrome piston rod first; coils and hardware paint over it.
  for (let y = 4; y <= 28; y += 1) {
    const a = axisAt(y);
    set(frame, a - 2, y, SILVER_LIGHT);
    set(frame, a - 1, y, SILVER);
    set(frame, a, y, SILVER);
    set(frame, a + 1, y, SILVER);
    set(frame, a + 2, y, SILVER_DARK);
  }

  // Fat helical coils: 2px rings, 1px chrome pinch. Alternate left/right wrap.
  coilBand(6, 3, 24);
  coilBand(7, 2, 25);
  coilBand(9, 4, 27);
  coilBand(10, 3, 28);

  // Rubber/metal spring-buffer insert mid-body.
  band(12, 4, 25, BUFFER);
  set(frame, 5, 12, SILVER_LIGHT);
  set(frame, 6, 12, SILVER);
  for (let x = 3; x <= 26; x += 1) {
    set(frame, x, 13, x <= 5 ? rubberLit : x >= 24 ? SPRING : rubber);
  }
  for (let x = 2; x <= 27; x += 1) {
    set(frame, x, 14, x <= 4 ? rubberLit : x >= 25 ? SPRING : rubber);
  }
  for (let x = 3; x <= 26; x += 1) {
    set(frame, x, 15, x <= 5 ? rubberLit : x >= 24 ? SPRING : rubber);
  }
  band(16, 4, 25, BUFFER);

  coilBand(18, 5, 27);
  coilBand(19, 4, 28);
  coilBand(21, 6, 28);
  coilBand(22, 5, 29);

  // Top mount plate + adjuster knob (slot on the clicker).
  band(1, 13, 18, SILVER);
  set(frame, 14, 1, SILVER_LIGHT);
  set(frame, 16, 1, GRAY);
  band(2, 12, 19, SILVER_DARK);
  set(frame, 16, 2, SPRING);
  band(3, 7, 23, GRAY);
  set(frame, 7, 3, SILVER);
  set(frame, 8, 3, SILVER_LIGHT);
  band(4, 6, 24, SPRING);
  set(frame, 6, 4, SILVER_DARK);
  set(frame, 7, 4, GRAY);
  band(5, 8, 22, SPRING);

  // Bottom perch / collar + rust fleck, then visible thread ridges.
  band(23, 6, 28, SILVER_DARK);
  band(24, 5, 29, GRAY);
  set(frame, 6, 24, SILVER);
  set(frame, 7, 24, SILVER_LIGHT);
  set(frame, 26, 24, RUST);
  band(25, 8, 24, SILVER);
  band(26, 8, 24, SILVER_DARK);
  band(27, 9, 23, SILVER);
  band(28, 11, 21, SPRING);
  band(29, 12, 20, SPRING);
  set(frame, 16, 28, SILVER_DARK);
  set(frame, 15, 29, SILVER_DARK);
  set(frame, 16, 29, GRAY);
  set(frame, 17, 29, SILVER_DARK);

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

function scaleNearest(frame: Uint8Array, factor: number): { width: number; height: number; pixels: Uint8Array } {
  const width = SIZE * factor;
  const height = SIZE * factor;
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sy = Math.floor(y / factor);
    for (let x = 0; x < width; x += 1) {
      const sx = Math.floor(x / factor);
      const source = (sy * SIZE + sx) * 4;
      const target = (y * width + x) * 4;
      pixels[target] = frame[source] ?? 0;
      pixels[target + 1] = frame[source + 1] ?? 0;
      pixels[target + 2] = frame[source + 2] ?? 0;
      pixels[target + 3] = frame[source + 3] ?? 0;
    }
  }
  return { width, height, pixels };
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', '..', 'public', 'assets', 'ui', 'hud');
mkdirSync(outDir, { recursive: true });

const icons = [
  { file: 'hud-turbo.png', frame: drawTurbo() },
  { file: 'hud-missile.png', frame: drawMissile() },
  { file: 'hud-mine.png', frame: drawMine() },
  { file: 'hud-oil.png', frame: drawBarrel(GRAY_LIGHT, GRAY, GRAY_DARK, 'drop') },
  { file: 'hud-jump.png', frame: drawJump() },
  { file: 'world-gasoline.png', frame: drawBarrel(RED_LIGHT, RED, RED_DARK, 'flame') },
];

for (const icon of icons) {
  writeFileSync(join(outDir, icon.file), encodePng(SIZE, SIZE, icon.frame));
}

const preview = new Uint8Array(SIZE * 4 * icons.length * SIZE * 4);
const previewWidth = SIZE * 4 * icons.length;
for (let index = 0; index < icons.length; index += 1) {
  const scaled = scaleNearest(icons[index]!.frame, 4);
  for (let y = 0; y < SIZE * 4; y += 1) {
    for (let x = 0; x < SIZE * 4; x += 1) {
      const source = (y * scaled.width + x) * 4;
      const target = (y * previewWidth + index * SIZE * 4 + x) * 4;
      preview[target] = scaled.pixels[source] ?? 0;
      preview[target + 1] = scaled.pixels[source + 1] ?? 0;
      preview[target + 2] = scaled.pixels[source + 2] ?? 0;
      preview[target + 3] = scaled.pixels[source + 3] ?? 0;
    }
  }
}
const previewPath = join(here, 'hud-icons-preview-4x.png');
writeFileSync(previewPath, encodePng(previewWidth, SIZE * 4, preview));

console.log(`wrote ${icons.length} 32×32 HUD icons to ${outDir}`);
console.log(`preview 4×: ${previewPath}`);
