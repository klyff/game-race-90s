/**
 * Writes one placeholder planet-select illustration per world into
 * `public/assets/ui/planets/<slug>.jpeg`, for the nine planets that do not
 * yet have Prompt A commissioned art (only `thunder-basin.jpeg` is real,
 * see `docs/CLAUDE_HANDOFF.md`). No image-generation tool is available to
 * write real art here — this generates a low-resolution (384x216, 16:9)
 * banded-gradient sky + silhouette stand-in per planet's `{PLANET}` mood
 * from `docs/art-briefs/planets.md`, deliberately chunky so it reads as
 * pixel art once `PlanetSelectScene` stretches it to fill the screen.
 *
 * Written with `pngjs` (decision 5: no `sharp`/`node-canvas`), so despite the
 * `.jpeg` filename the bytes are PNG-encoded — browsers decode by content,
 * not by extension, so `Phaser.Loader`'s `load.image` still displays it.
 * Thunder Basin is skipped: it already has real Prompt A art.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const WIDTH = 384;
const HEIGHT = 216;
/** Gradient banding steps — coarse on purpose, per the brief's "dithered
 * gradients rather than smooth ones". */
const GRADIENT_BANDS = 7;

type Rgb = readonly [number, number, number];
type SilhouetteStyle = 'jagged' | 'towers' | 'trees' | 'flat';

interface SelectSpec {
  readonly slug: string;
  readonly skyTop: Rgb;
  readonly skyBottom: Rgb;
  readonly silhouette: Rgb;
  readonly silhouetteShade: Rgb;
  readonly accent: Rgb;
  /** Fraction of the image height, from the bottom, where the horizon sits on average. */
  readonly baseHeightFraction: number;
  readonly amplitudeFraction: number;
  readonly style: SilhouetteStyle;
  readonly accentDensity: number;
  /** A big circle low in the sky — a moon or a gas giant. */
  readonly orb?: { readonly color: Rgb; readonly xFraction: number; readonly yFraction: number; readonly radiusFraction: number };
}

const SPECS: readonly SelectSpec[] = [
  {
    slug: 'chrome-verge',
    skyTop: [58, 40, 30],
    skyBottom: [196, 110, 40],
    silhouette: [30, 30, 32],
    silhouetteShade: [16, 16, 18],
    accent: [255, 140, 30],
    baseHeightFraction: 0.4,
    amplitudeFraction: 0.32,
    style: 'towers',
    accentDensity: 0.006,
  },
  {
    slug: 'bogmire-deep',
    skyTop: [22, 34, 26],
    skyBottom: [60, 84, 60],
    silhouette: [10, 16, 12],
    silhouetteShade: [6, 10, 7],
    accent: [80, 220, 110],
    baseHeightFraction: 0.3,
    amplitudeFraction: 0.5,
    style: 'trees',
    accentDensity: 0.01,
  },
  {
    slug: 'cryo-hollow',
    skyTop: [10, 12, 26],
    skyBottom: [140, 190, 220],
    silhouette: [150, 190, 214],
    silhouetteShade: [96, 138, 168],
    accent: [230, 245, 255],
    baseHeightFraction: 0.45,
    amplitudeFraction: 0.38,
    style: 'jagged',
    accentDensity: 0.012,
  },
  {
    slug: 'ferro-rust',
    skyTop: [64, 44, 30],
    skyBottom: [176, 138, 90],
    silhouette: [110, 52, 22],
    silhouetteShade: [64, 30, 12],
    accent: [220, 220, 210],
    baseHeightFraction: 0.34,
    amplitudeFraction: 0.4,
    style: 'jagged',
    accentDensity: 0.004,
  },
  {
    slug: 'vulkanis',
    skyTop: [30, 6, 6],
    skyBottom: [200, 60, 20],
    silhouette: [16, 10, 10],
    silhouetteShade: [8, 5, 5],
    accent: [255, 150, 30],
    baseHeightFraction: 0.42,
    amplitudeFraction: 0.55,
    style: 'jagged',
    accentDensity: 0.006,
  },
  {
    slug: 'neon-kasbah',
    skyTop: [14, 12, 30],
    skyBottom: [70, 50, 60],
    silhouette: [70, 46, 30],
    silhouetteShade: [40, 26, 18],
    accent: [255, 60, 200],
    baseHeightFraction: 0.36,
    amplitudeFraction: 0.3,
    style: 'towers',
    accentDensity: 0.014,
    orb: { color: [230, 220, 190], xFraction: 0.78, yFraction: 0.3, radiusFraction: 0.09 },
  },
  {
    slug: 'ash-reach',
    skyTop: [90, 90, 92],
    skyBottom: [150, 150, 148],
    silhouette: [70, 70, 68],
    silhouetteShade: [46, 46, 44],
    accent: [200, 200, 196],
    baseHeightFraction: 0.24,
    amplitudeFraction: 0.14,
    style: 'flat',
    accentDensity: 0.002,
  },
  {
    slug: 'voidport',
    skyTop: [4, 4, 10],
    skyBottom: [40, 26, 60],
    silhouette: [16, 20, 28],
    silhouetteShade: [8, 10, 15],
    accent: [255, 220, 90],
    baseHeightFraction: 0.2,
    amplitudeFraction: 0.05,
    style: 'flat',
    accentDensity: 0.01,
    orb: { color: [130, 70, 160], xFraction: 0.72, yFraction: 0.34, radiusFraction: 0.22 },
  },
  {
    slug: 'verdant-fault',
    skyTop: [40, 70, 30],
    skyBottom: [190, 180, 90],
    silhouette: [18, 40, 18],
    silhouetteShade: [10, 24, 10],
    accent: [230, 220, 140],
    baseHeightFraction: 0.38,
    amplitudeFraction: 0.42,
    style: 'trees',
    accentDensity: 0.01,
  },
];

function hash(x: number, y: number, salt: number): number {
  const n = Math.imul(x + salt * 13, 374761393) + Math.imul(y + salt * 17, 668265263);
  const mixed = (n ^ (n >>> 13)) * 1274126177;
  return ((mixed ^ (mixed >>> 16)) >>> 0) / 4294967296;
}

/** Smoothed 1D noise across the width: averages a few neighbouring hash
 * samples so the silhouette rolls rather than static-hisses. */
function smoothNoise1d(x: number, salt: number, period: number): number {
  const samples = [-2, -1, 0, 1, 2].map((offset) => hash(Math.floor((x + offset * period) / period), 0, salt));
  return samples.reduce((sum, value) => sum + value, 0) / samples.length;
}

/** How calm this column should be: the brief asks for the centre-left third
 * kept uncluttered so UI can sit over it, with the spectacle on the right. */
function calmFactor(xFraction: number): number {
  if (xFraction >= 0.12 && xFraction < 0.5) return 0.4;
  return 1;
}

function silhouetteHeightAt(spec: SelectSpec, x: number, salt: number): number {
  const xFraction = x / WIDTH;
  const calm = calmFactor(xFraction);
  const base = spec.baseHeightFraction * HEIGHT;
  const amplitude = spec.amplitudeFraction * HEIGHT * calm;

  switch (spec.style) {
    case 'towers': {
      // Stepped skyline: wide flat plateaus at varying heights, not smooth noise.
      const towerWidth = 18;
      const towerIndex = Math.floor(x / towerWidth);
      const towerHeight = hash(towerIndex, 0, salt) * amplitude;
      return base + towerHeight;
    }
    case 'trees': {
      // Mostly a low flat baseline with occasional thin tall spikes.
      const spikeWidth = 6;
      const spikeIndex = Math.floor(x / spikeWidth);
      const isSpike = hash(spikeIndex, 1, salt) > 0.72;
      return base + (isSpike ? hash(spikeIndex, 2, salt) * amplitude : amplitude * 0.08);
    }
    case 'flat':
      return base + smoothNoise1d(x, salt, 24) * amplitude;
    case 'jagged':
    default: {
      // Two octaves — a coarse ridge line plus finer chatter — so peaks read
      // as jagged rock rather than the flat-topped steps `towers` produces.
      const coarse = smoothNoise1d(x, salt, 22) * amplitude;
      const fine = smoothNoise1d(x, salt + 31, 5) * amplitude * 0.35;
      return base + Math.max(0, coarse) + fine;
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Quantised (banded) lerp between two colours — coarse gradient steps
 * instead of a smooth ramp, per the brief's dithered-gradient style. */
function bandedGradient(top: Rgb, bottom: Rgb, t: number): Rgb {
  const banded = Math.floor(t * GRADIENT_BANDS) / (GRADIENT_BANDS - 1);
  return [
    Math.round(lerp(top[0], bottom[0], banded)),
    Math.round(lerp(top[1], bottom[1], banded)),
    Math.round(lerp(top[2], bottom[2], banded)),
  ];
}

function writeIllustration(spec: SelectSpec, outDir: string): void {
  const png = new PNG({ width: WIDTH, height: HEIGHT });
  const salt = spec.slug.length * 17 + 5;

  const heights = new Array<number>(WIDTH);
  for (let x = 0; x < WIDTH; x += 1) {
    heights[x] = silhouetteHeightAt(spec, x, salt);
  }

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const i = (y * WIDTH + x) * 4;
      const silhouetteTop = HEIGHT - heights[x]!;

      let colour: Rgb;
      if (y < silhouetteTop) {
        colour = bandedGradient(spec.skyTop, spec.skyBottom, y / Math.max(1, silhouetteTop));
        if (spec.orb) {
          const dx = x - spec.orb.xFraction * WIDTH;
          const dy = y - spec.orb.yFraction * HEIGHT;
          const radius = spec.orb.radiusFraction * HEIGHT;
          if (Math.hypot(dx, dy) < radius) colour = spec.orb.color;
        }
      } else {
        const depthIntoSilhouette = (y - silhouetteTop) / Math.max(1, HEIGHT - silhouetteTop);
        colour = depthIntoSilhouette > 0.6 ? spec.silhouetteShade : spec.silhouette;
      }

      const speckle = hash(x, y, salt + 9);
      if (speckle < spec.accentDensity) {
        colour = spec.accent;
      }

      png.data[i] = colour[0];
      png.data[i + 1] = colour[1];
      png.data[i + 2] = colour[2];
      png.data[i + 3] = 255;
    }
  }

  writeFileSync(join(outDir, `${spec.slug}.jpeg`), PNG.sync.write(png));
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', '..', 'public', 'assets', 'ui', 'planets');
mkdirSync(outDir, { recursive: true });
for (const spec of SPECS) {
  writeIllustration(spec, outDir);
}
console.log(`wrote ${SPECS.length} placeholder select illustrations (${WIDTH}x${HEIGHT}) to ${outDir}`);
