/**
 * Camera-aligned minimap: iso basis, letterbox, heading, closed outline.
 */

import { describe, it, expect } from 'vitest';
import { findTrack } from '../../src/data/tracks/registry.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import { ISO_X, ISO_Y } from '../../src/domain/constants.ts';
import { distance } from '../../src/domain/math/Vec2.ts';
import {
  createMinimapViewport,
  minimapHeading,
  MINIMAP_HALO_PX,
  MINIMAP_OUTLINE_SAMPLES,
  MINIMAP_PADDING_PX,
  nudgeViewportToTopLeft,
  sampleCentreline,
  startLineWorld,
  worldToIso,
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

describe('worldToIso', () => {
  it('matches the chase-camera ground plane', () => {
    expect(worldToIso({ x: 10, y: 4 })).toEqual({
      x: (10 - 4) * ISO_X,
      y: (10 + 4) * ISO_Y,
    });
  });
});

describe('worldToMinimap', () => {
  it('sends travel toward the camera (world +X+Y) down the plate', () => {
    const view = createMinimapViewport(squarePoints, 200, 200);
    const farther = worldToMinimap(view, { x: 40, y: 40 });
    const nearer = worldToMinimap(view, { x: 80, y: 80 });
    expect(nearer.y).toBeGreaterThan(farther.y);
    expect(nearer.x).toBeCloseTo(farther.x, 5);
  });

  it('sends world +Y down and left, matching the iso view', () => {
    const view = createMinimapViewport(squarePoints, 200, 200);
    const origin = worldToMinimap(view, { x: 50, y: 0 });
    const plusY = worldToMinimap(view, { x: 50, y: 100 });
    expect(plusY.y).toBeGreaterThan(origin.y);
    expect(plusY.x).toBeLessThan(origin.x);
  });

  it('sends world +X down and right, matching the iso view', () => {
    const view = createMinimapViewport(squarePoints, 200, 200);
    const origin = worldToMinimap(view, { x: 0, y: 50 });
    const plusX = worldToMinimap(view, { x: 100, y: 50 });
    expect(plusX.x).toBeGreaterThan(origin.x);
    expect(plusX.y).toBeGreaterThan(origin.y);
  });
});

describe('letterbox', () => {
  it('fits a circuit without stretching the iso diamond', () => {
    const outline = sampleCentreline(chromeSpline);
    const view = createMinimapViewport(outline, 200, 200, {
      worldMargin: chrome.halfWidth,
    });
    const pixels = outline.map(point => worldToMinimap(view, point));
    const iso = outline.map(point => worldToIso(point));
    const usedW = Math.max(...pixels.map(p => p.x)) - Math.min(...pixels.map(p => p.x));
    const usedH = Math.max(...pixels.map(p => p.y)) - Math.min(...pixels.map(p => p.y));
    const isoW = Math.max(...iso.map(p => p.x)) - Math.min(...iso.map(p => p.x));
    const isoH = Math.max(...iso.map(p => p.y)) - Math.min(...iso.map(p => p.y));
    const inner = 200 - MINIMAP_PADDING_PX * 2;
    expect(usedW).toBeLessThanOrEqual(inner + 0.5);
    expect(usedH).toBeLessThanOrEqual(inner + 0.5);
    expect(usedW / usedH).toBeCloseTo(isoW / isoH, 5);
  });
});

describe('minimapHeading', () => {
  it('points world +X+Y travel straight down the plate', () => {
    expect(minimapHeading(Math.PI / 4)).toBeCloseTo(Math.PI / 2, 10);
  });

  it('points world +X down-right', () => {
    expect(minimapHeading(0)).toBeCloseTo(Math.atan2(ISO_Y, ISO_X), 10);
  });

  it('points world +Y down-left', () => {
    expect(minimapHeading(Math.PI / 2)).toBeCloseTo(Math.atan2(ISO_Y, -ISO_X), 10);
  });

  it('treats non-finite headings as 0', () => {
    expect(minimapHeading(Number.NaN)).toBe(0);
  });
});

describe('nudgeViewportToTopLeft', () => {
  it('parks the outline so the halo sits on the top-left', () => {
    const outline = sampleCentreline(thunderSpline);
    const fitted = createMinimapViewport(outline, 200, 200, {
      worldMargin: thunder.halfWidth,
    });
    const inset = MINIMAP_HALO_PX + 2;
    const view = nudgeViewportToTopLeft(fitted, outline, inset);
    const xs = outline.map(point => worldToMinimap(view, point).x);
    const ys = outline.map(point => worldToMinimap(view, point).y);
    expect(Math.min(...xs)).toBeCloseTo(inset, 5);
    expect(Math.min(...ys)).toBeCloseTo(inset, 5);
  });

  it('leaves an empty view alone', () => {
    const view = createMinimapViewport([], 200, 200);
    expect(nudgeViewportToTopLeft(view, [], MINIMAP_HALO_PX)).toBe(view);
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
