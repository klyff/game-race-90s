/**
 * North-up world-to-minimap projection. Pure: no Phaser.
 *
 * World +Y is up; screen +Y is down — the same flip as
 * `tools/trackgen/circuit-maps.ts`, so a circuit silhouette here matches the
 * offline top-down maps. The track letterboxes inside the target rectangle.
 */

import type { Vec2 } from '../../domain/math/Vec2.ts';
import { add, scale } from '../../domain/math/Vec2.ts';
import type { TrackSpline } from '../../domain/track/TrackSpline.ts';

/** Centreline samples for a HUD-sized outline. Enough for hairpins, cheap to stroke. */
export const MINIMAP_OUTLINE_SAMPLES = 160;

/** Inner padding so the road and car marks stay off the plate edge. */
export const MINIMAP_PADDING_PX = 14;

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

  const innerW = Math.max(1, safeWidth - padding * 2);
  const innerH = Math.max(1, safeHeight - padding * 2);
  const scale = Math.min(innerW / (maxX - minX), innerH / (maxY - minY));
  const usedW = (maxX - minX) * scale;
  const usedH = (maxY - minY) * scale;
  return {
    width: safeWidth,
    height: safeHeight,
    scale,
    offsetX: (safeWidth - usedW) / 2 - minX * scale,
    offsetY: (safeHeight + usedH) / 2 + minY * scale,
  };
}

export function worldToMinimap(view: MinimapViewport, point: Vec2): Vec2 {
  return {
    x: point.x * view.scale + view.offsetX,
    y: view.offsetY - point.y * view.scale,
  };
}

/**
 * Phaser rotation: 0 = +X (right), clockwise-positive.
 * World heading: 0 = +X, counter-clockwise. Y is flipped on the map, so the
 * screen angle is simply `-heading`.
 */
export function minimapHeading(worldHeading: number): number {
  if (!Number.isFinite(worldHeading) || worldHeading === 0) {
    return 0;
  }
  return -worldHeading;
}
