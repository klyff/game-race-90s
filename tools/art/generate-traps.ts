/**
 * 64×64 isometric trap props: wooden crate (+ smash strip), dirty gasoline drum
 * (+ stacks), wood chips. Hard edges, limited palette, light top-left, transparent
 * ground. Pin sits low-centre so the sprite reads next to a car.
 *
 * Trap stills use isometric 2:1 as **X=+2, Y=+1** per stair (wide-flat lid,
 * slim tall body). The √2 world-circle inflate made a chubby puck — don't.
 *
 * Run: npm run gen:traps-art
 *   or: node --experimental-strip-types tools/art/generate-traps.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
const SIZE = 64;
/**
 * Isometric 2:1: each stair is X=+2, Y=+1.
 * A lid that walks `k` stairs is `4k` wide and `2k` tall.
 */
const STEP_X = 2;
const STEP_Y = 1;
/** Stairs north→east. k=7 → lid 28×14, stairs read as 2:1 at 1×. */
const CRATE_K = 7;
/** Vertical drop of the crate walls. */
const CRATE_WALL = 14;
/** Slim drum: lid ellipse width:height = 2:1. No √2 fattening. */
const DRUM_RX = 8;
const DRUM_RY = DRUM_RX * (STEP_Y / STEP_X);
const DRUM_BODY = 28;
const PIN_X = 32;
const PIN_Y = 50;
const CHIP = 16;

type Rgba = readonly [number, number, number, number];

const OUTLINE: Rgba = [28, 18, 12, 255];

// Wood ramp — warm midtones, cool-shifted shadow (skill: hue shift).
const WOOD_LIT: Rgba = [210, 158, 88, 255];
const WOOD: Rgba = [168, 112, 54, 255];
const WOOD_MID: Rgba = [132, 84, 40, 255];
const WOOD_SHADE: Rgba = [92, 56, 32, 255];
const WOOD_DEEP: Rgba = [58, 36, 24, 255];
const GRAIN: Rgba = [148, 96, 46, 255];

const IRON: Rgba = [120, 124, 132, 255];
const IRON_LIT: Rgba = [168, 172, 180, 255];
const IRON_DARK: Rgba = [64, 66, 74, 255];
const RUST: Rgba = [138, 78, 36, 255];

const RED_LIT: Rgba = [210, 78, 52, 255];
const RED: Rgba = [168, 42, 32, 255];
const RED_MID: Rgba = [128, 34, 28, 255];
const RED_DARK: Rgba = [78, 22, 20, 255];
const RED_DIRT: Rgba = [110, 48, 28, 255];

const YELLOW: Rgba = [240, 200, 58, 255];
const YELLOW_LIT: Rgba = [255, 230, 120, 255];
const YELLOW_DARK: Rgba = [176, 128, 28, 255];

function empty(size: number = SIZE): Uint8Array {
  return new Uint8Array(size * size * 4);
}

function set(frame: Uint8Array, size: number, x: number, y: number, colour: Rgba): void {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }
  const index = (y * size + x) * 4;
  frame[index] = colour[0];
  frame[index + 1] = colour[1];
  frame[index + 2] = colour[2];
  frame[index + 3] = 255;
}

function getA(frame: Uint8Array, size: number, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return 0;
  }
  return frame[(y * size + x) * 4 + 3] ?? 0;
}

function strokeOutline(frame: Uint8Array, size: number = SIZE): void {
  const ink: Array<readonly [number, number]> = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (getA(frame, size, x, y) === 0) {
        continue;
      }
      if (
        getA(frame, size, x - 1, y) === 0 ||
        getA(frame, size, x + 1, y) === 0 ||
        getA(frame, size, x, y - 1) === 0 ||
        getA(frame, size, x, y + 1) === 0
      ) {
        ink.push([x, y]);
      }
    }
  }
  for (const [x, y] of ink) {
    set(frame, size, x, y, OUTLINE);
  }
}

function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/** Horizontal circle under X=+2, Y=+1 → ellipse twice as wide as tall. */
function inIsoCircle(x: number, y: number, cx: number, cy: number, rx: number): boolean {
  return rx > 0 && inEllipse(x, y, cx, cy, rx, rx * (STEP_Y / STEP_X));
}

function crateCorners(): {
  readonly topN: { x: number; y: number };
  readonly topE: { x: number; y: number };
  readonly topS: { x: number; y: number };
  readonly topW: { x: number; y: number };
  readonly botE: { x: number; y: number };
  readonly botS: { x: number; y: number };
  readonly botW: { x: number; y: number };
} {
  const topN = { x: PIN_X, y: PIN_Y - 2 * CRATE_K * STEP_Y - CRATE_WALL };
  const topE = { x: PIN_X + CRATE_K * STEP_X, y: topN.y + CRATE_K * STEP_Y };
  const topS = { x: PIN_X, y: topN.y + 2 * CRATE_K * STEP_Y };
  const topW = { x: PIN_X - CRATE_K * STEP_X, y: topN.y + CRATE_K * STEP_Y };
  return {
    topN,
    topE,
    topS,
    topW,
    botE: { x: topE.x, y: topE.y + CRATE_WALL },
    botS: { x: topS.x, y: topS.y + CRATE_WALL },
    botW: { x: topW.x, y: topW.y + CRATE_WALL },
  };
}

/**
 * Integer 2:1 diamond (X=+2, Y=+1). Row `i` from the north tip spans
 * `PIN_X ± 2*i` until the waist, then tapers. No float edges — those read as 45°.
 */
function forIsoDiamond(
  n: { readonly x: number; readonly y: number },
  k: number,
  visit: (x: number, y: number, row: number) => void,
): void {
  const height = 2 * k;
  for (let row = 0; row <= height; row += 1) {
    const half = row <= k ? 2 * row : 2 * (height - row);
    const y = n.y + row;
    for (let x = n.x - half; x <= n.x + half; x += 1) {
      visit(x, y, row);
    }
  }
}

/**
 * Parallelogram side: 2:1 lid edge, then `wall` straight down.
 * `toward` is +1 for the left face (W→S, x grows), −1 for the right (E→S).
 */
function forIsoWall(
  peak: { readonly x: number; readonly y: number },
  k: number,
  wall: number,
  toward: 1 | -1,
  visit: (x: number, y: number, drop: number) => void,
): void {
  for (let stair = 0; stair <= k; stair += 1) {
    const xEdge = peak.x + toward * 2 * stair;
    const yEdge = peak.y + stair;
    const xInner = peak.x;
    const x0 = Math.min(xInner, xEdge);
    const x1 = Math.max(xInner, xEdge);
    for (let drop = 0; drop < wall; drop += 1) {
      for (let x = x0; x <= x1; x += 1) {
        visit(x, yEdge + drop, drop);
      }
    }
  }
}

/**
 * Iso crate — lid stairs X=+2, Y=+1. Wide-flat diamond, tall slim walls.
 * Ground pin ≈ (32, 50). Must read as a BOX at 1×, not a cone.
 */
function drawCrate(smash: number = 0): Uint8Array {
  const frame = empty();
  // Smash: 0 intact, 1 crack, 2 split, 3 burst, 4 debris only.
  const open = smash >= 2;
  const burst = smash >= 3;
  const onlyChips = smash >= 4;

  const { topN, topE, topS, topW, botE, botS, botW } = crateCorners();

  if (!onlyChips) {
    // Right face first (behind), then left, then lid — painters order.
    forIsoWall(topE, CRATE_K, CRATE_WALL, -1, (x, y, drop) => {
      if (burst && drop > 8 && x < topE.x - 4) {
        return;
      }
      const colour =
        drop % 5 === 0 ? WOOD_DEEP : x >= topE.x - 3 ? WOOD_DEEP : WOOD_SHADE;
      set(frame, SIZE, x, y, colour);
    });

    forIsoWall(topW, CRATE_K, CRATE_WALL, 1, (x, y, drop) => {
      if (burst && drop > 8 && x > topW.x + 4) {
        return;
      }
      const colour = drop % 5 === 0 ? GRAIN : x <= topW.x + 3 ? WOOD_LIT : WOOD;
      set(frame, SIZE, x, y, colour);
    });

    forIsoDiamond(topN, CRATE_K, (x, y) => {
      if (open && Math.abs(x - PIN_X) < 2 + smash && y >= topN.y + 4 && y <= topS.y - 2) {
        return;
      }
      if (smash === 1 && Math.abs(x - PIN_X) <= 1 && y >= topN.y + 4 && y <= topS.y - 2) {
        set(frame, SIZE, x, y, WOOD_DEEP);
        return;
      }
      let colour: Rgba = WOOD;
      if ((x - 2 * y) % 6 === 0 || (x + 2 * y) % 6 === 0) {
        colour = GRAIN;
      } else if (x < PIN_X - 4) {
        colour = WOOD_LIT;
      } else if (x > PIN_X + 4) {
        colour = WOOD_MID;
      }
      set(frame, SIZE, x, y, colour);
    });

    const brackets: Array<readonly [number, number, Rgba]> = [
      [topN.x - 1, topN.y + 1, IRON_LIT],
      [topN.x, topN.y + 1, IRON],
      [topN.x + 1, topN.y + 1, IRON],
      [topW.x + 1, topW.y, IRON_LIT],
      [topW.x + 1, topW.y + 1, IRON],
      [topE.x - 1, topE.y, IRON],
      [topE.x - 1, topE.y + 1, IRON_DARK],
      [botW.x + 2, botW.y - 1, IRON],
      [botW.x + 3, botW.y - 1, IRON_DARK],
      [botE.x - 2, botE.y - 1, IRON_DARK],
      [botE.x - 3, botE.y - 1, IRON_DARK],
      [botS.x - 1, botS.y - 1, IRON_DARK],
      [botS.x, botS.y - 1, IRON],
    ];
    for (const [x, y, colour] of brackets) {
      if (getA(frame, SIZE, x, y) !== 0) {
        set(frame, SIZE, x, y, colour);
      }
    }
    set(frame, SIZE, topW.x + 4, topW.y + 3, RUST);
    set(frame, SIZE, topE.x - 4, topE.y + 4, RUST);
  }

  if (smash >= 1) {
    const chips: Array<readonly [number, number, Rgba]> = [
      [10, 18 + smash * 2, WOOD_LIT],
      [12, 16 + smash, WOOD],
      [50, 20 + smash, WOOD_SHADE],
      [52, 26 + smash, WOOD_MID],
      [26, 10 + smash * 2, WOOD_LIT],
      [38, 11 + smash, WOOD],
      [20, 54 - smash, WOOD_DEEP],
      [42, 55 - smash, WOOD_SHADE],
      [30, 8 + smash, WOOD],
      [34, 56 - smash * 2, WOOD_MID],
    ];
    for (const [x, y, colour] of chips) {
      set(frame, SIZE, x, y, colour);
      set(frame, SIZE, x + 1, y, colour);
      if (smash >= 2) {
        set(frame, SIZE, x, y + 1, WOOD_MID);
      }
    }
  }

  strokeOutline(frame);
  return frame;
}

function drawCrateStack(height: 2 | 3): Uint8Array {
  const frame = empty();
  const layers = height;
  for (let layer = 0; layer < layers; layer += 1) {
    const single = drawCrate(0);
    const dy = (layers - 1 - layer) * -11;
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        if (getA(single, SIZE, x, y) === 0) {
          continue;
        }
        const ty = y + dy;
        if (ty < 0 || ty >= SIZE) {
          continue;
        }
        const src = (y * SIZE + x) * 4;
        const colour: Rgba = [
          single[src] ?? 0,
          single[src + 1] ?? 0,
          single[src + 2] ?? 0,
          255,
        ];
        set(frame, SIZE, x, ty, colour);
      }
    }
  }
  strokeOutline(frame);
  return frame;
}

/**
 * Dirty red iso drum — slim standing cylinder.
 * Lid / hoops use the same X=+2, Y=+1 ellipse (2 wide, 1 tall). Not a puck.
 */
function drawGasoline(): Uint8Array {
  const frame = empty();
  const cx = PIN_X;
  const rx = DRUM_RX;
  const ry = DRUM_RY;
  const topCy = 18;
  const botCy = topCy + DRUM_BODY;

  const bodyColour = (x: number, y: number, hoop: boolean): Rgba => {
    if (hoop) {
      return x <= cx - 2 ? RED_MID : RED_DARK;
    }
    if (y >= botCy + ry - 2) {
      return RED_DARK;
    }
    if (x <= cx - 3) {
      return RED_LIT;
    }
    if (x >= cx + 3) {
      return RED_DARK;
    }
    return RED;
  };

  const hoopAt = (cy: number, x: number, y: number): boolean => {
    if (!inIsoCircle(x, y, cx, cy, rx)) {
      return false;
    }
    const onRim =
      !inIsoCircle(x, y, cx, cy, rx - 1.15) || x <= cx - rx + 1 || x >= cx + rx - 1;
    return onRim && y >= cy - 1;
  };

  for (let y = botCy - ry; y <= botCy + ry; y += 1) {
    for (let x = cx - rx; x <= cx + rx; x += 1) {
      if (inIsoCircle(x, y, cx, botCy, rx) && y >= botCy) {
        set(frame, SIZE, x, y, x >= cx ? RED_DARK : RED_MID);
      }
    }
  }

  for (let y = topCy; y <= botCy; y += 1) {
    for (let x = cx - rx; x <= cx + rx; x += 1) {
      set(frame, SIZE, x, y, bodyColour(x, y, false));
    }
  }

  for (const cy of [topCy + 7, topCy + 14]) {
    for (let y = cy - ry; y <= cy + ry; y += 1) {
      for (let x = cx - rx; x <= cx + rx; x += 1) {
        if (getA(frame, SIZE, x, y) === 0) {
          continue;
        }
        if (hoopAt(cy, x, y)) {
          set(frame, SIZE, x, y, bodyColour(x, y, true));
        }
      }
    }
  }

  // Full 2:1 lid disk. Small and flat — the body is the height.
  for (let y = topCy - ry; y <= topCy + ry; y += 1) {
    for (let x = cx - rx; x <= cx + rx; x += 1) {
      if (!inIsoCircle(x, y, cx, topCy, rx)) {
        continue;
      }
      let colour: Rgba = YELLOW;
      if (y <= topCy - 3 && x <= cx + 1) {
        colour = YELLOW_LIT;
      }
      if (x >= cx + 2) {
        colour = YELLOW_DARK;
      }
      set(frame, SIZE, x, y, colour);
    }
  }

  set(frame, SIZE, cx + 2, topCy - 4, YELLOW_DARK);
  set(frame, SIZE, cx + 3, topCy - 4, OUTLINE);
  set(frame, SIZE, cx + 2, topCy - 3, OUTLINE);

  const markY = topCy + 10;
  for (let y = markY - 3; y <= markY + 3; y += 1) {
    for (let x = cx - 3; x <= cx + 3; x += 1) {
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - markY);
      if (dx + dy <= 3 && getA(frame, SIZE, x, y) !== 0) {
        set(frame, SIZE, x, y, YELLOW);
      }
      if (dx + dy <= 1 && getA(frame, SIZE, x, y) !== 0) {
        set(frame, SIZE, x, y, OUTLINE);
      }
    }
  }

  const rust: Array<readonly [number, number]> = [
    [cx - 5, topCy + 6],
    [cx - 4, topCy + 7],
    [cx - 5, botCy - 3],
    [cx + 4, topCy + 5],
    [cx + 5, topCy + 11],
    [cx + 4, botCy - 1],
    [cx + 3, botCy + 2],
    [cx - 3, botCy + 2],
  ];
  for (const [x, y] of rust) {
    if (getA(frame, SIZE, x, y) !== 0) {
      set(frame, SIZE, x, y, RUST);
    }
  }
  set(frame, SIZE, cx - 4, topCy + 12, RED_DIRT);
  set(frame, SIZE, cx + 4, topCy + 14, RED_DIRT);

  strokeOutline(frame);
  return frame;
}

function drawGasolineStack(height: 2 | 3): Uint8Array {
  const frame = empty();
  const single = drawGasoline();
  for (let layer = 0; layer < height; layer += 1) {
    const dy = (height - 1 - layer) * -Math.round(DRUM_BODY * 0.55);
    const dx = layer % 2 === 0 ? 0 : 1;
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        if (getA(single, SIZE, x, y) === 0) {
          continue;
        }
        const ty = y + dy;
        const tx = x + dx;
        if (ty < 0 || ty >= SIZE || tx < 0 || tx >= SIZE) {
          continue;
        }
        const src = (y * SIZE + x) * 4;
        set(frame, SIZE, tx, ty, [
          single[src] ?? 0,
          single[src + 1] ?? 0,
          single[src + 2] ?? 0,
          255,
        ]);
      }
    }
  }
  strokeOutline(frame);
  return frame;
}

function drawWoodChip(variant: number): Uint8Array {
  const frame = empty(CHIP);
  // Longer splinters — must read as wood at 1×, not a grey speck.
  const shapes: Array<Array<readonly [number, number, Rgba]>> = [
    [
      [3, 7, WOOD_LIT],
      [4, 7, WOOD],
      [5, 7, WOOD],
      [6, 7, WOOD_MID],
      [7, 7, WOOD_SHADE],
      [4, 8, WOOD],
      [5, 8, WOOD_MID],
      [6, 8, WOOD_SHADE],
      [5, 9, WOOD_DEEP],
    ],
    [
      [5, 4, WOOD_LIT],
      [5, 5, WOOD],
      [6, 5, WOOD_LIT],
      [5, 6, WOOD_MID],
      [6, 6, WOOD],
      [5, 7, WOOD_SHADE],
      [6, 7, WOOD_MID],
      [6, 8, WOOD_DEEP],
      [7, 8, WOOD_SHADE],
      [7, 9, WOOD_DEEP],
    ],
    [
      [4, 6, WOOD],
      [5, 6, WOOD_LIT],
      [6, 6, WOOD],
      [7, 6, WOOD_MID],
      [3, 7, WOOD_MID],
      [4, 7, WOOD],
      [5, 7, WOOD_SHADE],
      [6, 7, WOOD_MID],
      [7, 7, WOOD_DEEP],
      [8, 7, WOOD_SHADE],
      [5, 8, WOOD_DEEP],
      [6, 8, WOOD_SHADE],
    ],
    [
      [6, 5, WOOD_LIT],
      [7, 5, WOOD],
      [8, 5, WOOD_MID],
      [5, 6, WOOD],
      [6, 6, WOOD_MID],
      [7, 6, WOOD_SHADE],
      [8, 6, WOOD_DEEP],
      [6, 7, WOOD_SHADE],
      [7, 7, WOOD_DEEP],
      [7, 8, WOOD_DEEP],
    ],
    [
      [4, 5, GRAIN],
      [5, 5, WOOD_LIT],
      [6, 5, WOOD],
      [4, 6, WOOD],
      [5, 6, WOOD_MID],
      [6, 6, WOOD_SHADE],
      [7, 6, WOOD_MID],
      [5, 7, WOOD_SHADE],
      [6, 7, WOOD_DEEP],
      [7, 7, WOOD_SHADE],
      [6, 8, WOOD_DEEP],
      [8, 8, RUST],
    ],
    [
      [7, 4, WOOD_LIT],
      [8, 5, WOOD],
      [6, 5, WOOD],
      [7, 5, WOOD_MID],
      [5, 6, WOOD_MID],
      [6, 6, WOOD_SHADE],
      [7, 6, WOOD_DEEP],
      [8, 6, WOOD_SHADE],
      [6, 7, WOOD_DEEP],
      [7, 7, WOOD_SHADE],
      [8, 7, WOOD_DEEP],
      [7, 8, WOOD_DEEP],
      [9, 8, WOOD_SHADE],
    ],
  ];
  for (const [x, y, colour] of shapes[variant % shapes.length]!) {
    set(frame, CHIP, x, y, colour);
  }
  strokeOutline(frame, CHIP);
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

function scaleNearest(
  frame: Uint8Array,
  size: number,
  factor: number,
): { width: number; height: number; pixels: Uint8Array } {
  const width = size * factor;
  const height = size * factor;
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sy = Math.floor(y / factor);
    for (let x = 0; x < width; x += 1) {
      const sx = Math.floor(x / factor);
      const source = (sy * size + sx) * 4;
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
const outDir = join(here, '..', '..', 'public', 'assets', 'traps');
mkdirSync(outDir, { recursive: true });

const outputs: Array<{ file: string; size: number; frame: Uint8Array }> = [
  { file: 'crate.png', size: SIZE, frame: drawCrate(0) },
  { file: 'crate-smash-01.png', size: SIZE, frame: drawCrate(1) },
  { file: 'crate-smash-02.png', size: SIZE, frame: drawCrate(2) },
  { file: 'crate-smash-03.png', size: SIZE, frame: drawCrate(3) },
  { file: 'crate-smash-04.png', size: SIZE, frame: drawCrate(4) },
  { file: 'crate-stack-2.png', size: SIZE, frame: drawCrateStack(2) },
  { file: 'crate-stack-3.png', size: SIZE, frame: drawCrateStack(3) },
  { file: 'gasoline.png', size: SIZE, frame: drawGasoline() },
  { file: 'gasoline-stack-2.png', size: SIZE, frame: drawGasolineStack(2) },
  { file: 'gasoline-stack-3.png', size: SIZE, frame: drawGasolineStack(3) },
];

for (let i = 1; i <= 6; i += 1) {
  outputs.push({
    file: `wood-chip-${String(i).padStart(2, '0')}.png`,
    size: CHIP,
    frame: drawWoodChip(i - 1),
  });
}

for (const out of outputs) {
  writeFileSync(join(outDir, out.file), encodePng(out.size, out.size, out.frame));
}

// Preview strip for 1× readability check at 4× nearest-neighbour.
const previewItems = [
  drawCrate(0),
  drawCrate(2),
  drawCrate(4),
  drawGasoline(),
  drawGasolineStack(2),
  drawCrateStack(2),
];
const factor = 3;
const cell = SIZE * factor;
const previewWidth = cell * previewItems.length;
const preview = new Uint8Array(previewWidth * cell * 4);
for (let index = 0; index < previewItems.length; index += 1) {
  const scaled = scaleNearest(previewItems[index]!, SIZE, factor);
  for (let y = 0; y < cell; y += 1) {
    for (let x = 0; x < cell; x += 1) {
      const source = (y * scaled.width + x) * 4;
      const target = (y * previewWidth + index * cell + x) * 4;
      preview[target] = scaled.pixels[source] ?? 0;
      preview[target + 1] = scaled.pixels[source + 1] ?? 0;
      preview[target + 2] = scaled.pixels[source + 2] ?? 0;
      preview[target + 3] = scaled.pixels[source + 3] ?? 0;
    }
  }
}
writeFileSync(join(here, 'traps-preview-3x.png'), encodePng(previewWidth, cell, preview));

console.log(`Wrote ${outputs.length} trap sprites → ${outDir}`);
console.log(`Preview: ${join(here, 'traps-preview-3x.png')}`);
