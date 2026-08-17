/**
 * Uniform scale so an image fits inside a box without stretching.
 * The source pixel ratio stays intact; leftover space is empty, not cropped.
 */

export interface FitSize {
  readonly width: number;
  readonly height: number;
}

const MIN = 1;

function sane(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : MIN;
}

/** Largest size that fits `source` inside `max` at the source aspect ratio. */
export function containSize(source: FitSize, max: FitSize): FitSize {
  const sw = sane(source.width);
  const sh = sane(source.height);
  const scale = Math.min(sane(max.width) / sw, sane(max.height) / sh);
  return { width: sw * scale, height: sh * scale };
}
