/**
 * 64×64 isometric trap props: wooden crate (+ smash strip), dirty gasoline drum
 * (+ stacks), wood chips. Hard edges, limited palette, light top-left, transparent
 * ground. Pin sits low-centre so the sprite reads next to a car.
 *
 * Run: npm run gen:traps-art
 *   or: node --experimental-strip-types tools/art/generate-traps.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const SIZE = 64;
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

/**
 * Iso crate — classic 2:1 box (diamond lid + two parallelogram faces).
 * Ground pin ≈ (32, 52). Must read as a BOX at 1×, not a cone.
 */
function drawCrate(smash: number = 0): Uint8Array {
  const frame = empty();
  // Smash: 0 intact, 1 crack, 2 split, 3 burst, 4 debris only.
  const open = smash >= 2;
  const burst = smash >= 3;
  const onlyChips = smash >= 4;

  // Box geometry (iso 2:1). Top diamond corners.
  const topN = { x: 32, y: 16 };
  const topE = { x: 48, y: 24 };
  const topS = { x: 32, y: 32 };
  const topW = { x: 16, y: 24 };
  const height = 20; // vertical drop of side faces

  const fillPoly = (
    points: readonly { readonly x: number; readonly y: number }[],
    colourAt: (x: number, y: number) => Rgba | null,
  ): void => {
    let minY = SIZE;
    let maxY = 0;
    for (const p of points) {
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    for (let y = minY; y <= maxY; y += 1) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i += 1) {
        const a = points[i]!;
        const b = points[(i + 1) % points.length]!;
        if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
          const t = (y - a.y) / (b.y - a.y);
          xs.push(a.x + t * (b.x - a.x));
        }
      }
      xs.sort((u, v) => u - v);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const x0 = Math.ceil(xs[i]!);
        const x1 = Math.floor(xs[i + 1]!);
        for (let x = x0; x <= x1; x += 1) {
          const colour = colourAt(x, y);
          if (colour !== null) {
            set(frame, SIZE, x, y, colour);
          }
        }
      }
    }
  };

  if (!onlyChips) {
    // Right face first (behind), then left, then top — painters order for iso.
    fillPoly(
      [
        topE,
        topS,
        { x: topS.x, y: topS.y + height },
        { x: topE.x, y: topE.y + height },
      ],
      (x, y) => {
        if (burst && y > topS.y + 12 && x < topE.x - 4) {
          return null;
        }
        if ((y - topE.y) % 5 === 0) {
          return WOOD_DEEP;
        }
        return x >= topE.x - 3 ? WOOD_DEEP : WOOD_SHADE;
      },
    );

    fillPoly(
      [
        topW,
        topS,
        { x: topS.x, y: topS.y + height },
        { x: topW.x, y: topW.y + height },
      ],
      (x, y) => {
        if (burst && y > topS.y + 12 && x > topW.x + 4) {
          return null;
        }
        if ((y - topW.y) % 5 === 0) {
          return GRAIN;
        }
        return x <= topW.x + 3 ? WOOD_LIT : WOOD;
      },
    );

    fillPoly([topN, topE, topS, topW], (x, y) => {
      if (open && Math.abs(x - 32) < 2 + smash && y >= 20 && y <= 30) {
        return null;
      }
      if (smash === 1 && Math.abs(x - 32) <= 1 && y >= 20 && y <= 30) {
        return WOOD_DEEP;
      }
      // Plank seams across the lid.
      const seam = (x + y * 2) % 7 === 0;
      if (seam) {
        return GRAIN;
      }
      if (x < 28) {
        return WOOD_LIT;
      }
      if (x > 36) {
        return WOOD_MID;
      }
      return WOOD;
    });

    // Iron corner brackets — readable metal squares on the silhouette corners.
    const brackets: Array<readonly [number, number, Rgba]> = [
      [topN.x - 1, topN.y + 1, IRON_LIT],
      [topN.x, topN.y + 1, IRON],
      [topN.x + 1, topN.y + 1, IRON],
      [topW.x + 1, topW.y, IRON_LIT],
      [topW.x + 1, topW.y + 1, IRON],
      [topE.x - 1, topE.y, IRON],
      [topE.x - 1, topE.y + 1, IRON_DARK],
      [topW.x + 2, topW.y + height - 1, IRON],
      [topW.x + 3, topW.y + height - 1, IRON_DARK],
      [topE.x - 2, topE.y + height - 1, IRON_DARK],
      [topE.x - 3, topE.y + height - 1, IRON_DARK],
      [topS.x - 1, topS.y + height - 1, IRON_DARK],
      [topS.x, topS.y + height - 1, IRON],
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
    const dy = (layers - 1 - layer) * -14;
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

/** Dirty red iso drum — 3/4 lean, yellow rim, rust blotches. Not the HUD front-on barrel. */
function drawGasoline(): Uint8Array {
  const frame = empty();
  const cx = 32;

  // Body cylinder, iso lean: wider mid, shadowed right.
  for (let y = 18; y <= 52; y += 1) {
    const t = (y - 18) / 34;
    const half = Math.floor(11 + Math.sin(t * Math.PI) * 2);
    const hoop = y === 24 || y === 25 || y === 34 || y === 35 || y === 44 || y === 45;
    for (let x = cx - half; x <= cx + half; x += 1) {
      let colour: Rgba = x <= cx - 4 ? RED_LIT : x >= cx + 4 ? RED_DARK : RED;
      if (hoop) {
        colour = x <= cx - 3 ? RED_MID : RED_DARK;
      }
      if (y >= 50) {
        colour = RED_DARK;
      }
      set(frame, SIZE, x, y, colour);
    }
  }

  // Yellow lid ellipse.
  for (let y = 12; y <= 22; y += 1) {
    for (let x = 18; x <= 46; x += 1) {
      if (!inEllipse(x, y, cx, 17, 13, 5)) {
        continue;
      }
      let colour: Rgba = YELLOW;
      if (y <= 15 && x <= 34) {
        colour = YELLOW_LIT;
      }
      if (y >= 19 || x >= 40) {
        colour = YELLOW_DARK;
      }
      set(frame, SIZE, x, y, colour);
    }
  }
  // Bung.
  set(frame, SIZE, 36, 16, YELLOW_DARK);
  set(frame, SIZE, 37, 16, OUTLINE);
  set(frame, SIZE, 36, 17, OUTLINE);

  // Hazard diamond on body.
  for (let y = 30; y <= 38; y += 1) {
    for (let x = 28; x <= 36; x += 1) {
      const dx = Math.abs(x - 32);
      const dy = Math.abs(y - 34);
      if (dx + dy <= 4) {
        set(frame, SIZE, x, y, YELLOW);
      }
      if (dx + dy <= 2) {
        set(frame, SIZE, x, y, OUTLINE);
      }
    }
  }

  const rust: Array<readonly [number, number]> = [
    [22, 28],
    [23, 29],
    [24, 40],
    [21, 42],
    [40, 27],
    [42, 32],
    [41, 46],
    [38, 48],
    [26, 48],
    [30, 50],
  ];
  for (const [x, y] of rust) {
    if (getA(frame, SIZE, x, y) !== 0) {
      set(frame, SIZE, x, y, RUST);
    }
  }
  set(frame, SIZE, 25, 36, RED_DIRT);
  set(frame, SIZE, 39, 38, RED_DIRT);

  strokeOutline(frame);
  return frame;
}

function drawGasolineStack(height: 2 | 3): Uint8Array {
  const frame = empty();
  const single = drawGasoline();
  for (let layer = 0; layer < height; layer += 1) {
    const dy = (height - 1 - layer) * -12;
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
