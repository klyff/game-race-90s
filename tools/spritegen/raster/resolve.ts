import { quantize } from '../color.ts';
import type { ResolvedPalette } from '../color.ts';
import type { Framebuffer } from './Framebuffer.ts';

/**
 * Minimum share of supersamples that must be covered for an output pixel to be
 * opaque. Thresholding coverage instead of blending alpha is what keeps sprite
 * edges crisp: a pixel is either in the car or out of it, never a soft fringe.
 */
const COVERAGE_THRESHOLD = 0.5;

/**
 * Collapses a supersampled framebuffer into one RGBA sprite frame:
 * box-downsample, hard palette quantization, then a silhouette outline.
 */
export function resolveFrame(
  source: Framebuffer,
  outputWidth: number,
  outputHeight: number,
  supersample: number,
  palette: ResolvedPalette,
): Uint8Array {
  const pixels = new Uint8Array(outputWidth * outputHeight * 4);
  const samplesPerPixel = supersample * supersample;

  for (let oy = 0; oy < outputHeight; oy += 1) {
    for (let ox = 0; ox < outputWidth; ox += 1) {
      let covered = 0;
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;

      for (let sy = 0; sy < supersample; sy += 1) {
        const sourceRow = (oy * supersample + sy) * source.width;
        for (let sx = 0; sx < supersample; sx += 1) {
          const index = sourceRow + ox * supersample + sx;
          if (source.alpha[index] === 0) continue;
          covered += 1;
          const rgbIndex = index * 3;
          sumR += source.rgb[rgbIndex]!;
          sumG += source.rgb[rgbIndex + 1]!;
          sumB += source.rgb[rgbIndex + 2]!;
        }
      }

      if (covered / samplesPerPixel < COVERAGE_THRESHOLD) continue;

      const averaged = { r: sumR / covered, g: sumG / covered, b: sumB / covered };
      const snapped = quantize(averaged, palette.quantizeSet);
      const target = (oy * outputWidth + ox) * 4;
      pixels[target] = snapped.r;
      pixels[target + 1] = snapped.g;
      pixels[target + 2] = snapped.b;
      pixels[target + 3] = 255;
    }
  }

  return applyOutline(pixels, outputWidth, outputHeight, palette);
}

/**
 * Grows a 1 px outline outwards from the silhouette. Read from a snapshot so a
 * freshly written outline pixel cannot seed further outline pixels.
 */
function applyOutline(
  pixels: Uint8Array,
  width: number,
  height: number,
  palette: ResolvedPalette,
): Uint8Array {
  const filled = pixels.slice();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      if (pixels[index + 3] !== 0) continue;

      const hasOpaqueNeighbour =
        (x > 0 && pixels[index - 4 + 3] !== 0) ||
        (x < width - 1 && pixels[index + 4 + 3] !== 0) ||
        (y > 0 && pixels[index - width * 4 + 3] !== 0) ||
        (y < height - 1 && pixels[index + width * 4 + 3] !== 0);
      if (!hasOpaqueNeighbour) continue;

      filled[index] = palette.outline.r;
      filled[index + 1] = palette.outline.g;
      filled[index + 2] = palette.outline.b;
      filled[index + 3] = 255;
    }
  }

  return filled;
}
