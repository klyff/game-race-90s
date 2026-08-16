import type { Rgb } from '../color.ts';

export interface ScreenVertex {
  readonly x: number;
  readonly y: number;
  readonly depth: number;
}

const EPSILON = 1e-9;

/**
 * Orthographic depth-buffered software rasterizer.
 *
 * A depth buffer rather than a painter's-algorithm sort, because car parts
 * interpenetrate (wheels sit inside the hull) and any per-face ordering is
 * wrong for those cases. Under an orthographic projection a planar quad's depth
 * is affine in screen space, so depth interpolates with a plane equation and
 * stays exact.
 */
export class Framebuffer {
  readonly width: number;
  readonly height: number;
  readonly rgb: Uint8ClampedArray;
  readonly alpha: Uint8Array;
  private readonly depth: Float32Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.rgb = new Uint8ClampedArray(width * height * 3);
    this.alpha = new Uint8Array(width * height);
    this.depth = new Float32Array(width * height);
    this.clear();
  }

  clear(): void {
    this.rgb.fill(0);
    this.alpha.fill(0);
    this.depth.fill(Number.POSITIVE_INFINITY);
  }

  /**
   * Solves `depth = a*x + b*y + c` from the quad's corners. Returns null when
   * the quad is edge-on to the camera and therefore has no screen-space plane.
   */
  private static depthPlane(
    quad: readonly [ScreenVertex, ScreenVertex, ScreenVertex, ScreenVertex],
  ): { a: number; b: number; c: number } | null {
    const triangles: Array<readonly [number, number, number]> = [
      [0, 1, 2],
      [0, 2, 3],
      [1, 2, 3],
      [0, 1, 3],
    ];
    for (const [i, j, k] of triangles) {
      const p0 = quad[i]!;
      const p1 = quad[j]!;
      const p2 = quad[k]!;
      const d1x = p1.x - p0.x;
      const d1y = p1.y - p0.y;
      const d2x = p2.x - p0.x;
      const d2y = p2.y - p0.y;
      const determinant = d1x * d2y - d1y * d2x;
      if (Math.abs(determinant) < EPSILON) continue;
      const d1d = p1.depth - p0.depth;
      const d2d = p2.depth - p0.depth;
      const a = (d1d * d2y - d2d * d1y) / determinant;
      const b = (d2d * d1x - d1d * d2x) / determinant;
      return { a, b, c: p0.depth - a * p0.x - b * p0.y };
    }
    return null;
  }

  fillQuad(
    quad: readonly [ScreenVertex, ScreenVertex, ScreenVertex, ScreenVertex],
    color: Rgb,
  ): void {
    const plane = Framebuffer.depthPlane(quad);
    if (plane === null) return;

    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const vertex of quad) {
      if (vertex.y < minY) minY = vertex.y;
      if (vertex.y > maxY) maxY = vertex.y;
    }

    const firstRow = Math.max(0, Math.ceil(minY - 0.5));
    const lastRow = Math.min(this.height - 1, Math.floor(maxY - 0.5));

    for (let py = firstRow; py <= lastRow; py += 1) {
      const scanY = py + 0.5;

      // Convex quad: at most two edge crossings, so the span is [min, max].
      let spanLeft = Number.POSITIVE_INFINITY;
      let spanRight = Number.NEGATIVE_INFINITY;
      for (let edge = 0; edge < 4; edge += 1) {
        const a = quad[edge]!;
        const b = quad[(edge + 1) % 4]!;
        if (a.y <= scanY === b.y <= scanY) continue;
        const t = (scanY - a.y) / (b.y - a.y);
        const x = a.x + t * (b.x - a.x);
        if (x < spanLeft) spanLeft = x;
        if (x > spanRight) spanRight = x;
      }
      if (spanRight < spanLeft) continue;

      const firstColumn = Math.max(0, Math.ceil(spanLeft - 0.5));
      const lastColumn = Math.min(this.width - 1, Math.floor(spanRight - 0.5));
      const rowOffset = py * this.width;

      for (let px = firstColumn; px <= lastColumn; px += 1) {
        const pixelDepth = plane.a * (px + 0.5) + plane.b * scanY + plane.c;
        const index = rowOffset + px;
        if (pixelDepth >= this.depth[index]!) continue;
        this.depth[index] = pixelDepth;
        this.alpha[index] = 255;
        const rgbIndex = index * 3;
        this.rgb[rgbIndex] = color.r;
        this.rgb[rgbIndex + 1] = color.g;
        this.rgb[rgbIndex + 2] = color.b;
      }
    }
  }
}
