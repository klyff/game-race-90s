/**
 * Garage hero placement. Pure: no Phaser.
 *
 * `assets/ui/garages/garage-01.png`…`garage-10.png` (1024×576) share an open floor bay. The matrix
 * vitrine parks ON that floor, behind the menus, windshield on the viewing
 * point — not the sprite centre. Transparent padding is ignored when scaling.
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

/** Authored workshop plate. Bay fractions are relative to this image. */
export const GARAGE_ART_SIZE: Size = { width: 1024, height: 576 };

/**
 * Cleared concrete bay (hazard stripes). Wider than the first cut — the
 * owner opened the floor so the vitrine can sit in the light.
 */
export const GARAGE_BAY = {
  left: 0.2,
  top: 0.4,
  right: 0.8,
  bottom: 0.86,
} as const;

/** Windshield target inside the bay: centre, toward the back wall / lamps. */
export const GARAGE_VIEW = { x: 0.5, y: 0.28 } as const;

/** Cabin glass in a 1700×1254 matrix hero. */
export const HERO_WINDSHIELD = { x: 0.5, y: 0.4 } as const;

/** Painted body inside the hero canvas. */
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

export function garageBayRect(viewport: Size, image: Size): Rect {
  const art = coverRect(sanitize(viewport), sanitize(image));
  return {
    x: art.x + art.width * GARAGE_BAY.left,
    y: art.y + art.height * GARAGE_BAY.top,
    width: art.width * (GARAGE_BAY.right - GARAGE_BAY.left),
    height: art.height * (GARAGE_BAY.bottom - GARAGE_BAY.top),
  };
}

export function garageViewPoint(viewport: Size, image: Size): Point {
  return pointIn(garageBayRect(viewport, image), GARAGE_VIEW.x, GARAGE_VIEW.y);
}

/**
 * Place a matrix hero so the painted car fills the bay and the windshield
 * sits on the viewing point. `x`/`y` are the glass origin, not the centre.
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

/** Painted body inside the scaled hero — used to park the carousel arrows. */
export function garageBodyBounds(hero: GarageHeroLayout): Rect {
  return {
    x: hero.x - (hero.originX - HERO_OPAQUE.left) * hero.width,
    y: hero.y - (hero.originY - HERO_OPAQUE.top) * hero.height,
    width: (HERO_OPAQUE.right - HERO_OPAQUE.left) * hero.width,
    height: (HERO_OPAQUE.bottom - HERO_OPAQUE.top) * hero.height,
  };
}
