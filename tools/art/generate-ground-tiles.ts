/**
 * Writes one 256×256 seamless SNES-era ground tile per planet into
 * `public/assets/ground/<slug>.png`. Palettes match `planetThemes.ts`.
 *
 * These are stand-ins until the owner drops the full Prompt B 1024² tiles
 * commissioned per `docs/art-briefs/planets.md` — no image-generation tool is
 * available to write those here. This generator goes beyond flat hash noise
 * (v1) to give each surface some structure matching its `{SURFACE}` brief:
 * cracked hardpan/basalt/root cracks (a tileable Worley-noise cell edge),
 * grating/ripple streaks, staggered deck plating, or cellular blotches —
 * picked per planet by `Swatch.pattern`. They still tile on all four edges
 * (everything below is toroidal) and stay coarse so they survive the race
 * camera's 1.5–2.0× zoom.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const SIZE = 256;

type Pattern = 'crack' | 'blotch' | 'grating' | 'ripple' | 'plate' | 'speckle';

interface Swatch {
  readonly slug: string;
  readonly a: readonly [number, number, number];
  readonly b: readonly [number, number, number];
  readonly accent: readonly [number, number, number];
  readonly accentChance: number;
  readonly pattern: Pattern;
}

const SWATCHES: readonly Swatch[] = [
  { slug: 'thunder-basin', a: [90, 42, 22], b: [140, 72, 36], accent: [60, 26, 12], accentChance: 0.06, pattern: 'crack' },
  { slug: 'chrome-verge', a: [42, 42, 40], b: [28, 28, 30], accent: [90, 70, 40], accentChance: 0.05, pattern: 'grating' },
  { slug: 'bogmire-deep', a: [14, 26, 12], b: [22, 40, 18], accent: [60, 130, 40], accentChance: 0.07, pattern: 'blotch' },
  { slug: 'cryo-hollow', a: [184, 212, 224], b: [140, 180, 200], accent: [220, 236, 244], accentChance: 0.08, pattern: 'ripple' },
  { slug: 'ferro-rust', a: [138, 58, 24], b: [90, 40, 16], accent: [180, 90, 40], accentChance: 0.09, pattern: 'speckle' },
  { slug: 'vulkanis', a: [22, 12, 12], b: [36, 20, 16], accent: [220, 60, 10], accentChance: 0.05, pattern: 'crack' },
  { slug: 'neon-kasbah', a: [200, 168, 120], b: [168, 140, 90], accent: [220, 60, 180], accentChance: 0.05, pattern: 'speckle' },
  { slug: 'ash-reach', a: [106, 106, 104], b: [80, 80, 78], accent: [150, 150, 146], accentChance: 0.08, pattern: 'blotch' },
  { slug: 'voidport', a: [26, 32, 48], b: [18, 22, 36], accent: [210, 190, 50], accentChance: 0.03, pattern: 'plate' },
  { slug: 'verdant-fault', a: [42, 74, 34], b: [28, 52, 24], accent: [90, 130, 55], accentChance: 0.07, pattern: 'crack' },
];

function hash(x: number, y: number, salt: number): number {
  const n = Math.imul(x + salt * 13, 374761393) + Math.imul(y + salt * 17, 668265263);
  const mixed = (n ^ (n >>> 13)) * 1274126177;
  return ((mixed ^ (mixed >>> 16)) >>> 0) / 4294967296;
}

function wrap(value: number): number {
  return ((value % SIZE) + SIZE) % SIZE;
}

/** Toroidal Worley (cellular) noise: for pixel (x, y), returns the distance to
 * the nearest and second-nearest jittered seed point among a grid of cells
 * `cellSize` apart. The seed for a cell is looked up by its WRAPPED index (so
 * the same physical point is seen consistently from either side of the tile
 * edge) but placed at its UNWRAPPED position (so distance across the seam is
 * correct) — the standard trick for tileable cellular noise. */
function worley(x: number, y: number, cellSize: number, salt: number): { nearest: number; secondNearest: number } {
  const cells = SIZE / cellSize;
  const cx = Math.floor(x / cellSize);
  const cy = Math.floor(y / cellSize);
  let nearest = Infinity;
  let secondNearest = Infinity;

  for (let dcy = -1; dcy <= 1; dcy += 1) {
    for (let dcx = -1; dcx <= 1; dcx += 1) {
      const wrappedCx = ((cx + dcx) % cells + cells) % cells;
      const wrappedCy = ((cy + dcy) % cells + cells) % cells;
      const offsetX = hash(wrappedCx, wrappedCy, salt) * cellSize;
      const offsetY = hash(wrappedCx, wrappedCy, salt + 101) * cellSize;
      const seedX = (cx + dcx) * cellSize + offsetX;
      const seedY = (cy + dcy) * cellSize + offsetY;
      const distance = Math.hypot(seedX - x, seedY - y);
      if (distance < nearest) {
        secondNearest = nearest;
        nearest = distance;
      } else if (distance < secondNearest) {
        secondNearest = distance;
      }
    }
  }

  return { nearest, secondNearest };
}

/** True on a thin edge between two Worley cells — a crack or a root line. */
function onCrackEdge(x: number, y: number, cellSize: number, salt: number, widthPx: number): boolean {
  const { nearest, secondNearest } = worley(x, y, cellSize, salt);
  return secondNearest - nearest < widthPx;
}

/** Even/odd parity of the nearest Worley cell — a patchwork of blotches
 * (algae mats, pumice clumps) rather than the edges between them. */
function blotchParity(x: number, y: number, cellSize: number, salt: number): boolean {
  const cells = SIZE / cellSize;
  const cx = ((Math.floor(x / cellSize) % cells) + cells) % cells;
  const cy = ((Math.floor(y / cellSize) % cells) + cells) % cells;
  return hash(cx, cy, salt + 7) > 0.5;
}

function writeTile(swatch: Swatch, outDir: string): void {
  const png = new PNG({ width: SIZE, height: SIZE });
  const salt = swatch.slug.length * 31;

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const n = hash(wrap(x), wrap(y), salt);
      const n2 = hash(wrap(x + 8), wrap(y + 5), salt + 3);
      const cell = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
      const dither = cell ? 8 : 0;

      let base = n > 0.55 ? swatch.a : swatch.b;
      let useAccent = n2 < swatch.accentChance;

      switch (swatch.pattern) {
        case 'crack':
          if (onCrackEdge(x, y, 32, salt, 1.6)) useAccent = true;
          break;
        case 'blotch':
          base = blotchParity(x, y, 40, salt) ? swatch.a : swatch.b;
          break;
        case 'grating': {
          // Vertical steel ribs every 16px, a rust-bleed accent seam beside each.
          const localX = wrap(x) % 16;
          if (localX === 0) useAccent = true;
          else if (localX <= 2) base = swatch.b;
          break;
        }
        case 'ripple': {
          // Horizontal wind-ripple bands, offset per row so it does not read as
          // perfectly regular graph paper.
          const rowShift = Math.floor(wrap(y) / 24) % 2 === 0 ? 0 : 8;
          const localY = wrap(y + rowShift) % 24;
          if (localY <= 1) base = swatch.b;
          break;
        }
        case 'plate': {
          // Staggered deck plates with a dark grout seam and an occasional rivet.
          const plateW = 32;
          const plateH = 24;
          const row = Math.floor(wrap(y) / plateH);
          const rowOffset = row % 2 === 0 ? 0 : plateW / 2;
          const localX = wrap(x + rowOffset) % plateW;
          const localY = wrap(y) % plateH;
          if (localX <= 2 || localY <= 2) {
            base = [
              Math.round(base[0] * 0.35),
              Math.round(base[1] * 0.35),
              Math.round(base[2] * 0.35),
            ];
          } else if (localX <= 5 && localY <= 5 && n2 < 0.5) {
            useAccent = true;
          }
          break;
        }
        case 'speckle':
        default:
          break;
      }

      const colour = useAccent ? swatch.accent : base;
      const i = (y * SIZE + x) * 4;
      png.data[i] = Math.min(255, colour[0] + dither);
      png.data[i + 1] = Math.min(255, colour[1] + dither);
      png.data[i + 2] = Math.min(255, colour[2] + dither);
      png.data[i + 3] = 255;
    }
  }
  writeFileSync(join(outDir, `${swatch.slug}.png`), PNG.sync.write(png));
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', '..', 'public', 'assets', 'ground');
mkdirSync(outDir, { recursive: true });
for (const swatch of SWATCHES) {
  writeTile(swatch, outDir);
}
console.log(`wrote ${SWATCHES.length} ground tiles (${SIZE}x${SIZE}) to ${outDir}`);
