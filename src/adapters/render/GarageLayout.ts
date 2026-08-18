/**
 * Garage hero placement. Pure: no Phaser.
 *
 * The workshop art (`public/assets/ui/garage.png`, 1024×576) has a lit floor
 * bay in the middle. The matrix vitrine sits ON that floor, behind the menus,
 * with its windshield pinned to the viewing point — not the sprite centre.
 * Transparent padding around the paint is ignored when scaling.
 */

import { coverRect, pointIn } from './SplashLayout.ts';
import type { Point, Rect, Size } from './SplashLayout.ts';

const MIN = 1;

function sane(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : MIN;
}

function sanitize(size: Size): Size {
  return { width: sane(size.width), height: sane(size.height) };
}

/** Authored garage plate. Fractions below are relative to this image. */
export const GARAGE_ART_SIZE: Size = { width: 1024, height: 576 };

/**
 * Lit concrete bay with the hazard stripes — the empty floor the car parks on.
 * Measured from the bright cells of `garage.png`, not the viewport.
 */
export const GARAGE_BAY = {
  left: 0.3,
  top: 0.46,
  right: 0.7,
  bottom: 0.84,
} as const;

/** Where the player looks: centre of the bay, a little high so the cabin faces us. */
export const GARAGE_VIEW = { x: 0.5, y: 0.42 } as const;

/** Cabin glass in a 1700×1254 matrix hero. Three-quarter vitrine, glass above centre. */
export const HERO_WINDSHIELD = { x: 0.5, y: 0.4 } as const;

/** Painted body inside the hero canvas (the rest is transparent padding). */
export const HERO_OPAQUE = {
  left: 0.16,
  top: 0.17,
  right: 0.84,
  bottom: 0.82,
} as const;

export interface GarageHeroLayout {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly originX: number;
  readonly originY: number;
}

/** The floor bay in viewport pixels after COVER-scaling the workshop art. */
export function garageBayRect(viewport: Size, image: Size): Rect {
  const art = coverRect(sanitize(viewport), sanitize(image));
  return {
    x: art.x + art.width * GARAGE_BAY.left,
    y: art.y + art.height * GARAGE_BAY.top,
    width: art.width * (GARAGE_BAY.right - GARAGE_BAY.left),
    height: art.height * (GARAGE_BAY.bottom - GARAGE_BAY.top),
  };
}

/** Windshield target in viewport pixels. */
export function garageViewPoint(viewport: Size, image: Size): Point {
  return pointIn(garageBayRect(viewport, image), GARAGE_VIEW.x, GARAGE_VIEW.y);
}

/**
 * Place a matrix hero so the painted car fills the bay and the windshield
 * sits on the viewing point. `x`/`y` are the origin (glass), not the sprite centre.
 */
export function garageHeroLayout(viewport: Size, image: Size, hero: Size): GarageHeroLayout {
  const bay = garageBayRect(viewport, image);
  const view = garageViewPoint(viewport, image);
  const sheet = sanitize(hero);
  const bodyW = sheet.width * (HERO_OPAQUE.right - HERO_OPAQUE.left);
  const bodyH = sheet.height * (HERO_OPAQUE.bottom - HERO_OPAQUE.top);
  const scale = Math.min(bay.width / bodyW, bay.height / bodyH);
  return {
    x: view.x,
    y: view.y,
    width: sheet.width * scale,
    height: sheet.height * scale,
    originX: HERO_WINDSHIELD.x,
    originY: HERO_WINDSHIELD.y,
  };
}
