import { describe, expect, it } from 'vitest';
import {
  GARAGE_ART_SIZE,
  garageBayRect,
  garageBodyBounds,
  garageHeroLayout,
  garageViewPoint,
  HERO_WINDSHIELD,
} from '../../src/adapters/render/GarageLayout.ts';
import type { Size } from '../../src/adapters/render/SplashLayout.ts';

const HERO: Size = { width: 1024, height: 1024 };

const VIEWPORTS: readonly Size[] = [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
  { width: 800, height: 600 },
  { width: 2560, height: 1080 },
];

describe('garageHeroLayout', () => {
  it('pins the windshield origin to the bay viewing point', () => {
    for (const view of VIEWPORTS) {
      const placed = garageHeroLayout(view, GARAGE_ART_SIZE, HERO);
      const target = garageViewPoint(view, GARAGE_ART_SIZE);
      expect(placed.originX).toBe(HERO_WINDSHIELD.x);
      expect(placed.originY).toBe(HERO_WINDSHIELD.y);
      expect(placed.x).toBeCloseTo(target.x, 8);
      expect(placed.y).toBeCloseTo(target.y, 8);
    }
  });

  it('fills the opened floor bay without covering the whole screen', () => {
    const view = { width: 1280, height: 720 };
    const bay = garageBayRect(view, GARAGE_ART_SIZE);
    const placed = garageHeroLayout(view, GARAGE_ART_SIZE, HERO);
    expect(placed.width).toBeGreaterThan(bay.width * 0.55);
    expect(placed.width).toBeLessThan(view.width);
    expect(placed.height).toBeLessThan(view.height);
    expect(placed.y).toBeGreaterThan(bay.y);
    expect(placed.y).toBeLessThan(bay.y + bay.height);
  });

  it('keeps the painted body inside the bay so arrows can hug the car', () => {
    const view = { width: 1280, height: 720 };
    const bay = garageBayRect(view, GARAGE_ART_SIZE);
    const hero = garageHeroLayout(view, GARAGE_ART_SIZE, HERO);
    const body = garageBodyBounds(hero);
    expect(body.x).toBeGreaterThan(bay.x);
    expect(body.x + body.width).toBeLessThan(bay.x + bay.width);
    expect(body.width).toBeLessThan(bay.width * 0.95);
  });

  it('stays finite on a one-frame zero resize', () => {
    const placed = garageHeroLayout({ width: 0, height: 0 }, { width: 0, height: 0 }, { width: 0, height: 0 });
    expect(Number.isFinite(placed.x)).toBe(true);
    expect(Number.isFinite(placed.y)).toBe(true);
    expect(Number.isFinite(placed.width)).toBe(true);
    expect(Number.isFinite(placed.height)).toBe(true);
  });
});
