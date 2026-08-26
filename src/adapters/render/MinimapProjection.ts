/**
 * Camera-aligned world-to-minimap projection. Pure: no Phaser.
 *
 * The live chase camera is isometric, not cartographic north-up. World +X and
 * +Y both grow screen-down (`IsoProjection`), so a north-up Y-flip made cars
 * that race toward the bottom of the play view climb the HUD map. The minimap
 * uses the same ground-plane basis as the camera, letterboxes that diamond,
 * then the HUD nudges it top-left so the halo lines up with the text stack.
 */

import { ISO_X, ISO_Y } from '../../domain/constants.ts';
import type { Vec2 } from '../../domain/math/Vec2.ts';
import { add, scale } from '../../domain/math/Vec2.ts';
import type { TrackSpline } from '../../domain/track/TrackSpline.ts';

/** Centreline samples for a HUD-sized outline. Enough for hairpins, cheap to stroke. */
export const MINIMAP_OUTLINE_SAMPLES = 160;

/** Inner padding so the road, halo and car marks stay inside the view. */
export const MINIMAP_PADDING_PX = 14;

/** Extra dark ribbon beyond the road stroke — the backing instead of a plate. */
export const MINIMAP_HALO_PX = 10;

export interface MinimapViewport {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

export interface MinimapRacer {
  readonly position: Vec2;
  readonly heading: number;
  /** The car the camera follows — drawn as the player mark. */
  readonly isFocus: boolean;
  /** Finished or a lap down: same mark, lower alpha. */
  readonly faded: boolean;
}

export interface MinimapSnapshot {
  readonly outline: readonly Vec2[];
  readonly startLine: readonly [Vec2, Vec2];
  /** World-space padding around the centreline (usually track halfWidth). */
  readonly worldMargin: number;
  readonly racers: readonly MinimapRacer[];
}

/** Flatten a world point onto the same iso ground plane the chase camera uses. */
export function worldToIso(point: Vec2): Vec2 {
  return {
    x: (point.x - point.y) * ISO_X,
    y: (point.x + point.y) * ISO_Y,
  };
}

export function sampleCentreline(
  spline: TrackSpline,
  sampleCount: number = MINIMAP_OUTLINE_SAMPLES,
): readonly Vec2[] {
  if (spline.totalLength <= 0 || sampleCount < 3) {
    return [];
  }
  const points: Vec2[] = new Array(sampleCount);
  for (let i = 0; i < sampleCount; i += 1) {
    points[i] = spline.positionAt((i / sampleCount) * spline.totalLength);
  }
  return points;
}

/** Start/finish tick: a short segment across the road at `startLineDistance`. */
export function startLineWorld(
  spline: TrackSpline,
  startLineDistance: number,
  halfWidth: number,
): readonly [Vec2, Vec2] {
  const frame = spline.frameAt(startLineDistance);
  const reach = Math.max(0, halfWidth);
  return [add(frame.position, scale(frame.normal, reach)), add(frame.position, scale(frame.normal, -reach))];
}

export function createMinimapViewport(
  points: readonly Vec2[],
  width: number,
  height: number,
  options?: { readonly padding?: number; readonly worldMargin?: number },
): MinimapViewport {
  const padding = options?.padding ?? MINIMAP_PADDING_PX;
  const worldMargin = options?.worldMargin ?? 0;
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1;

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    minX = Math.min(minX, point.x - worldMargin);
    maxX = Math.max(maxX, point.x + worldMargin);
    minY = Math.min(minY, point.y - worldMargin);
    maxY = Math.max(maxY, point.y + worldMargin);
  }

  if (!Number.isFinite(minX) || maxX <= minX || maxY <= minY) {
    return {
      width: safeWidth,
      height: safeHeight,
      scale: 1,
      offsetX: safeWidth / 2,
      offsetY: safeHeight / 2,
    };
  }

  let minIsoX = Number.POSITIVE_INFINITY;
  let maxIsoX = Number.NEGATIVE_INFINITY;
  let minIsoY = Number.POSITIVE_INFINITY;
  let maxIsoY = Number.NEGATIVE_INFINITY;
  const corners: readonly Vec2[] = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
  for (const corner of corners) {
    const iso = worldToIso(corner);
    minIsoX = Math.min(minIsoX, iso.x);
    maxIsoX = Math.max(maxIsoX, iso.x);
    minIsoY = Math.min(minIsoY, iso.y);
    maxIsoY = Math.max(maxIsoY, iso.y);
  }

  const innerW = Math.max(1, safeWidth - padding * 2);
  const innerH = Math.max(1, safeHeight - padding * 2);
  const scale = Math.min(innerW / (maxIsoX - minIsoX), innerH / (maxIsoY - minIsoY));
  const usedW = (maxIsoX - minIsoX) * scale;
  const usedH = (maxIsoY - minIsoY) * scale;
  return {
    width: safeWidth,
    height: safeHeight,
    scale,
    offsetX: (safeWidth - usedW) / 2 - minIsoX * scale,
    offsetY: (safeHeight - usedH) / 2 - minIsoY * scale,
  };
}

export function worldToMinimap(view: MinimapViewport, point: Vec2): Vec2 {
  const iso = worldToIso(point);
  return {
    x: iso.x * view.scale + view.offsetX,
    y: iso.y * view.scale + view.offsetY,
  };
}

/**
 * Slide the letterboxed circuit so the outline hugs the top-left, leaving
 * `inset` pixels for the halo. The HUD then parks the container on the same
 * left edge as the position/lap stack.
 */
export function nudgeViewportToTopLeft(
  view: MinimapViewport,
  points: readonly Vec2[],
  inset: number,
): MinimapViewport {
  if (points.length === 0 || !Number.isFinite(inset)) {
    return view;
  }
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  for (const point of points) {
    const pixel = worldToMinimap(view, point);
    minX = Math.min(minX, pixel.x);
    minY = Math.min(minY, pixel.y);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return view;
  }
  return {
    ...view,
    offsetX: view.offsetX + (inset - minX),
    offsetY: view.offsetY + (inset - minY),
  };
}

/**
 * Phaser rotation of the focus mark: 0 = +X (right), clockwise-positive.
 * World heading is CCW from +X; after the iso basis, travel that goes down
 * the chase view also points down on the plate.
 */
export function minimapHeading(worldHeading: number): number {
  if (!Number.isFinite(worldHeading)) {
    return 0;
  }
  const alongX = Math.cos(worldHeading);
  const alongY = Math.sin(worldHeading);
  return Math.atan2((alongX + alongY) * ISO_Y, (alongX - alongY) * ISO_X);
}
