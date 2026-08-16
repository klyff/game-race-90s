import { PALETTE_ROLE, SHADE_STEP } from '../../src/domain/constants.ts';
import type { PaletteRole, ShadeStep } from '../../src/domain/constants.ts';
import type { CarPalette } from './schema.ts';

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/**
 * Multipliers that turn one authored base colour into a four-step ramp.
 * Centralised here so every car shares the same contrast, whatever hues the
 * art agents pick.
 */
const RAMP_FACTORS: Readonly<Record<ShadeStep, number>> = {
  [SHADE_STEP.HIGHLIGHT]: 1.34,
  [SHADE_STEP.BASE]: 1,
  [SHADE_STEP.SHADE]: 0.7,
  [SHADE_STEP.DARK]: 0.46,
};

export function parseHex(hex: string): Rgb {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    throw new Error(`Invalid hex colour "${hex}" — expected #rrggbb`);
  }
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Scales a colour's luminance. Darkening multiplies; brightening blends towards
 * white so that already-bright hues do not clip to a flat grey.
 */
function scaleColor(base: Rgb, factor: number): Rgb {
  if (factor <= 1) {
    return { r: clampByte(base.r * factor), g: clampByte(base.g * factor), b: clampByte(base.b * factor) };
  }
  const towardsWhite = Math.min(1, factor - 1) * 0.62;
  return {
    r: clampByte(base.r + (255 - base.r) * towardsWhite),
    g: clampByte(base.g + (255 - base.g) * towardsWhite),
    b: clampByte(base.b + (255 - base.b) * towardsWhite),
  };
}

export type RampTable = Readonly<Record<PaletteRole, Readonly<Record<ShadeStep, Rgb>>>>;

export interface ResolvedPalette {
  /** Per-role, per-shade-step colour lookup used while rasterizing. */
  readonly ramps: RampTable;
  /** Flattened list of every colour a frame may contain, for quantization. */
  readonly quantizeSet: readonly Rgb[];
  readonly outline: Rgb;
}

export function resolvePalette(palette: CarPalette): ResolvedPalette {
  const bases: Readonly<Record<PaletteRole, string>> = {
    [PALETTE_ROLE.BODY]: palette.body,
    [PALETTE_ROLE.ACCENT]: palette.accent,
    [PALETTE_ROLE.GLASS]: palette.glass,
    [PALETTE_ROLE.TIRE]: palette.tire,
    [PALETTE_ROLE.LIGHT]: palette.light,
  };

  const ramps = {} as Record<PaletteRole, Record<ShadeStep, Rgb>>;
  const quantizeSet: Rgb[] = [];
  for (const role of Object.values(PALETTE_ROLE)) {
    const base = parseHex(bases[role]);
    const ramp = {} as Record<ShadeStep, Rgb>;
    for (const step of Object.values(SHADE_STEP)) {
      const color = scaleColor(base, RAMP_FACTORS[step]);
      ramp[step] = color;
      quantizeSet.push(color);
    }
    ramps[role] = ramp;
  }

  return { ramps, quantizeSet, outline: parseHex(palette.outline) };
}

/** Nearest colour in the car's own palette. Kills anti-aliased in-betweens. */
export function quantize(color: Rgb, candidates: readonly Rgb[]): Rgb {
  let best = candidates[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const dr = color.r - candidate.r;
    const dg = color.g - candidate.g;
    const db = color.b - candidate.b;
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}
