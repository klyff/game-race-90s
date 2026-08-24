/**
 * North-up minimap projection: Y-flip, letterbox, heading, closed outline.
 */

import { describe, it, expect } from 'vitest';
import { findTrack } from '../../src/data/tracks/registry.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import { distance } from '../../src/domain/math/Vec2.ts';
import {
  createMinimapViewport,
  minimapHeading,
  MINIMAP_OUTLINE_SAMPLES,
  MINIMAP_PADDING_PX,
  sampleCentreline,
  startLineWorld,
  worldToMinimap,
} from '../../src/adapters/render/MinimapProjection.ts';

const thunder = findTrack('thunder-basin');
const thunderSpline = new TrackSpline(thunder.controlPoints);

const chrome = findTrack('chrome-verge-1');
const chromeSpline = new TrackSpline(chrome.controlPoints);

const squarePoints = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];
const squareSpline = new TrackSpline(squarePoints);

describe('createMinimapViewport', () => {
  it('returns a finite fallback when there are no points', () => {
    const view = createMinimapViewport([], 200, 200);
    expect(view.scale).toBe(1);
    expect(Number.isFinite(view.offsetX)).toBe(true);
    expect(Number.isFinite(view.offsetY)).toBe(true);
  });

  it('keeps every outline sample inside the padded rectangle', () => {
    const outline = sampleCentreline(thunderSpline);
    const view = createMinimapViewport(outline, 200, 200, {
      worldMargin: thunder.halfWidth,
    });
    for (const point of outline) {
      const pixel = worldToMinimap(view, point);
      expect(pixel.x).toBeGreaterThanOrEqual(MINIMAP_PADDING_PX - 0.5);
      expect(pixel.y).toBeGreaterThanOrEqual(MINIMAP_PADDING_PX - 0.5);
      expect(pixel.x).toBeLessThanOrEqual(200 - MINIMAP_PADDING_PX + 0.5);
      expect(pixel.y).toBeLessThanOrEqual(200 - MINIMAP_PADDING_PX + 0.5);
    }
  });
});

describe('worldToMinimap', () => {
  it('flips world +Y to screen up (smaller y)', () => {
    const view = createMinimapViewport(squarePoints, 200, 200);
    const south = worldToMinimap(view, { x: 50, y: 0 });
    const north = worldToMinimap(view, { x: 50, y: 100 });
    expect(north.y).toBeLessThan(south.y);
  });

  it('maps world +X to the right', () => {
    const view = createMinimapViewport(squarePoints, 200, 200);
    const west = worldToMinimap(view, { x: 0, y: 50 });
    const east = worldToMinimap(view, { x: 100, y: 50 });
    expect(east.x).toBeGreaterThan(west.x);
  });
});

describe('letterbox', () => {
  it('fits a wide circuit without stretching it tall', () => {
    const outline = sampleCentreline(chromeSpline);
    const view = createMinimapViewport(outline, 200, 200, {
      worldMargin: chrome.halfWidth,
    });
    const xs = outline.map(point => worldToMinimap(view, point).x);
    const ys = outline.map(point => worldToMinimap(view, point).y);
    const usedW = Math.max(...xs) - Math.min(...xs);
    const usedH = Math.max(...ys) - Math.min(...ys);
    expect(usedW).toBeGreaterThan(usedH);
    expect(usedW / usedH).toBeGreaterThan(1.3);
    expect(usedH).toBeLessThan(200 - MINIMAP_PADDING_PX * 2 - 8);
  });
});

describe('minimapHeading', () => {
  it('leaves +X as Phaser 0 (right)', () => {
    expect(minimapHeading(0)).toBe(0);
  });

  it('sends world +Y (CCW) to screen up (Phaser -π/2)', () => {
    expect(minimapHeading(Math.PI / 2)).toBeCloseTo(-Math.PI / 2, 10);
  });

  it('treats non-finite headings as 0', () => {
    expect(minimapHeading(Number.NaN)).toBe(0);
  });
});

describe('sampleCentreline', () => {
  it('returns the requested count and closes the loop', () => {
    const outline = sampleCentreline(thunderSpline, MINIMAP_OUTLINE_SAMPLES);
    expect(outline).toHaveLength(MINIMAP_OUTLINE_SAMPLES);
    const first = outline[0]!;
    const last = outline[outline.length - 1]!;
    const step = distance(first, outline[1]!);
    expect(distance(last, first)).toBeLessThan(step * 2.5);
  });

  it('returns empty for a degenerate sample count', () => {
    expect(sampleCentreline(squareSpline, 2)).toEqual([]);
  });
});

describe('startLineWorld', () => {
  it('crosses the centreline at roughly 2 × halfWidth', () => {
    const [left, right] = startLineWorld(thunderSpline, thunder.startLineDistance, thunder.halfWidth);
    const mid = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
    const onLine = thunderSpline.positionAt(thunder.startLineDistance);
    expect(distance(mid, onLine)).toBeLessThan(2);
    expect(distance(left, right)).toBeCloseTo(thunder.halfWidth * 2, 5);
  });
});
