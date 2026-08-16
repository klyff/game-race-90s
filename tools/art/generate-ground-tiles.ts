/**
 * Writes one 128×128 seamless SNES-era ground tile per planet into
 * `public/assets/ground/<slug>.png`. Palettes match `planetThemes.ts`.
 *
 * These are stand-ins until the owner drops the full Prompt B 1024² tiles.
 * They tile on all four edges (the noise wraps) and stay coarse so they
 * survive the race camera's 1.5–2.0× zoom.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const SIZE = 128;

interface Swatch {
  readonly slug: string;
  readonly a: readonly [number, number, number];
  readonly b: readonly [number, number, number];
  readonly accent: readonly [number, number, number];
  readonly accentChance: number;
}

const SWATCHES: readonly Swatch[] = [
  { slug: 'thunder-basin', a: [90, 42, 22], b: [140, 72, 36], accent: [70, 32, 16], accentChance: 0.08 },
  { slug: 'chrome-verge', a: [42, 42, 40], b: [28, 28, 30], accent: [90, 70, 40], accentChance: 0.06 },
  { slug: 'bogmire-deep', a: [14, 26, 12], b: [22, 40, 18], accent: [40, 90, 30], accentChance: 0.07 },
  { slug: 'cryo-hollow', a: [184, 212, 224], b: [140, 180, 200], accent: [220, 236, 244], accentChance: 0.1 },
  { slug: 'ferro-rust', a: [138, 58, 24], b: [90, 40, 16], accent: [180, 90, 40], accentChance: 0.09 },
  { slug: 'vulkanis', a: [22, 12, 12], b: [36, 20, 16], accent: [200, 50, 10], accentChance: 0.08 },
  { slug: 'neon-kasbah', a: [200, 168, 120], b: [168, 140, 90], accent: [220, 60, 180], accentChance: 0.05 },
  { slug: 'ash-reach', a: [106, 106, 104], b: [80, 80, 78], accent: [140, 140, 136], accentChance: 0.07 },
  { slug: 'voidport', a: [26, 32, 48], b: [18, 22, 36], accent: [200, 180, 40], accentChance: 0.04 },
  { slug: 'verdant-fault', a: [42, 74, 34], b: [28, 52, 24], accent: [80, 120, 50], accentChance: 0.08 },
];

function hash(x: number, y: number, salt: number): number {
  const n = Math.imul(x + salt * 13, 374761393) + Math.imul(y + salt * 17, 668265263);
  const mixed = (n ^ (n >>> 13)) * 1274126177;
  return ((mixed ^ (mixed >>> 16)) >>> 0) / 4294967296;
}

function wrap(value: number): number {
  return ((value % SIZE) + SIZE) % SIZE;
}

function writeTile(swatch: Swatch, outDir: string): void {
  const png = new PNG({ width: SIZE, height: SIZE });
  const salt = swatch.slug.length * 31;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const n = hash(wrap(x), wrap(y), salt);
      const n2 = hash(wrap(x + 8), wrap(y + 5), salt + 3);
      const cell = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
      const pick = n > 0.55 ? swatch.a : swatch.b;
      const useAccent = n2 < swatch.accentChance;
      const colour = useAccent ? swatch.accent : pick;
      const dither = cell ? 8 : 0;
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
console.log(`wrote ${SWATCHES.length} ground tiles to ${outDir}`);
