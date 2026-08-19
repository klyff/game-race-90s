import { describe, it, expect } from 'vitest';
import {
  coverScale,
  coverRect,
  pointIn,
  SPLASH_REGION,
  voidRect,
  selectAnchor,
  promptAnchor,
} from '../../src/adapters/render/SplashLayout.ts';
import type { Size, Rect, Point } from '../../src/adapters/render/SplashLayout.ts';

// The authored splash art: public/assets/ui/splash.jpeg, 1408x768.
const IMAGE: Size = { width: 1408, height: 768 };

// A spread of viewports chosen to be very different from the art's aspect ratio and
// from each other: wide, tall, square, tiny, huge. Used across several assertions below
// because the regression this module guards against only shows up when the viewport
// diverges from the art's 1408:768 aspect.
const VIEWPORT_TABLE: readonly Size[] = [
  { width: 1920, height: 600 }, // very wide (ultrawide-ish)
  { width: 800, height: 1200 }, // very tall (portrait/mobile)
  { width: 1000, height: 1000 }, // square
  { width: 100, height: 80 }, // tiny
  { width: 4000, height: 2200 }, // huge
  { width: 1408, height: 768 }, // exact match
  { width: 1280, height: 800 }, // common laptop viewport
];

function assertFinite(value: number): void {
  expect(Number.isNaN(value)).toBe(false);
  expect(Number.isFinite(value)).toBe(true);
}

function assertRectFinite(rect: Rect): void {
  assertFinite(rect.x);
  assertFinite(rect.y);
  assertFinite(rect.width);
  assertFinite(rect.height);
}

function assertPointFinite(point: Point): void {
  assertFinite(point.x);
  assertFinite(point.y);
}

/** Is `point` inside `rect` (inclusive of the boundary)? */
function isPointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/** Convert a viewport-space point back into image-relative fractions, via the cover rect. */
function toImageFraction(point: Point, rect: Rect): Point {
  return {
    x: (point.x - rect.x) / rect.width,
    y: (point.y - rect.y) / rect.height,
  };
}

describe('SplashLayout', () => {
  describe('coverScale / coverRect: cover, not contain', () => {
    it('scales from width when the viewport is wider than the art', () => {
      // 1920x600 is much wider (aspect 3.2) than 1408x768 (aspect ~1.83): the width
      // ratio must win, so the image overflows vertically.
      const viewport: Size = { width: 1920, height: 600 };
      const expectedScale = viewport.width / IMAGE.width;
      expect(coverScale(viewport, IMAGE)).toBeCloseTo(expectedScale, 10);

      const rect = coverRect(viewport, IMAGE);
      expect(rect.height).toBeGreaterThan(viewport.height); // vertical overflow
    });

    it('scales from height when the viewport is taller than the art', () => {
      // 800x1200 is much taller (aspect 0.667) than the art: the height ratio must win,
      // so the image overflows horizontally. This is the case a `min` (contain) instead
      // of a `max` (cover) would get backwards.
      const viewport: Size = { width: 800, height: 1200 };
      const expectedScale = viewport.height / IMAGE.height;
      expect(coverScale(viewport, IMAGE)).toBeCloseTo(expectedScale, 10);

      const rect = coverRect(viewport, IMAGE);
      expect(rect.width).toBeGreaterThan(viewport.width); // horizontal overflow
    });

    it('fully covers the viewport for a spread of very different aspect ratios', () => {
      // This is the assertion that would catch a `min` where a `max` belongs: if cover
      // picked the smaller scale, the rect would fall short of the viewport on some side.
      for (const viewport of VIEWPORT_TABLE) {
        const rect = coverRect(viewport, IMAGE);
        expect(rect.x).toBeLessThanOrEqual(0.0001);
        expect(rect.y).toBeLessThanOrEqual(0.0001);
        expect(rect.x + rect.width).toBeGreaterThanOrEqual(viewport.width - 0.0001);
        expect(rect.y + rect.height).toBeGreaterThanOrEqual(viewport.height - 0.0001);
      }
    });
  });

  describe('coverRect: centred', () => {
    it('splits the horizontal overflow evenly (left crop equals right crop)', () => {
      const viewport: Size = { width: 800, height: 1200 };
      const rect = coverRect(viewport, IMAGE);
      const leftCrop = -rect.x;
      const rightCrop = rect.x + rect.width - viewport.width;
      expect(leftCrop).toBeCloseTo(rightCrop, 10);
    });

    it('splits the vertical overflow evenly (top crop equals bottom crop)', () => {
      const viewport: Size = { width: 1920, height: 600 };
      const rect = coverRect(viewport, IMAGE);
      const topCrop = -rect.y;
      const bottomCrop = rect.y + rect.height - viewport.height;
      expect(topCrop).toBeCloseTo(bottomCrop, 10);
    });

    it('is centred for every viewport in the table', () => {
      for (const viewport of VIEWPORT_TABLE) {
        const rect = coverRect(viewport, IMAGE);
        const leftCrop = -rect.x;
        const rightCrop = rect.x + rect.width - viewport.width;
        const topCrop = -rect.y;
        const bottomCrop = rect.y + rect.height - viewport.height;
        expect(leftCrop).toBeCloseTo(rightCrop, 8);
        expect(topCrop).toBeCloseTo(bottomCrop, 8);
      }
    });
  });

  describe('coverRect: exact match', () => {
    it('gives scale 1 and an untranslated rect when the viewport equals the art size', () => {
      const viewport: Size = { width: 1408, height: 768 };
      expect(coverScale(viewport, IMAGE)).toBe(1);

      const rect = coverRect(viewport, IMAGE);
      expect(rect).toEqual({ x: 0, y: 0, width: 1408, height: 768 });
    });
  });

  describe('pointIn', () => {
    it('addresses a point by fraction of the rect', () => {
      const rect: Rect = { x: 10, y: 20, width: 100, height: 200 };
      expect(pointIn(rect, 0, 0)).toEqual({ x: 10, y: 20 });
      expect(pointIn(rect, 1, 1)).toEqual({ x: 110, y: 220 });
      expect(pointIn(rect, 0.5, 0.5)).toEqual({ x: 60, y: 120 });
    });
  });

  describe('voidRect', () => {
    it('sits inside the image-covering rect, at the documented SPLASH_REGION fractions', () => {
      const viewport: Size = { width: 1408, height: 768 };
      const rect = coverRect(viewport, IMAGE);
      const region = voidRect(viewport, IMAGE);
      expect(region.x).toBeCloseTo(rect.x + rect.width * SPLASH_REGION.VOID.left, 8);
      expect(region.y).toBeCloseTo(rect.y + rect.height * SPLASH_REGION.VOID.top, 8);
      expect(region.width).toBeCloseTo(
        rect.width * (SPLASH_REGION.VOID.right - SPLASH_REGION.VOID.left),
        8,
      );
      expect(region.height).toBeCloseTo(
        rect.height * (SPLASH_REGION.VOID.bottom - SPLASH_REGION.VOID.top),
        8,
      );
    });

    it('stays within the image-covering rect for every viewport in the table', () => {
      for (const viewport of VIEWPORT_TABLE) {
        const rect = coverRect(viewport, IMAGE);
        const region = voidRect(viewport, IMAGE);
        expect(region.x).toBeGreaterThanOrEqual(rect.x - 0.0001);
        expect(region.y).toBeGreaterThanOrEqual(rect.y - 0.0001);
        expect(region.x + region.width).toBeLessThanOrEqual(
          rect.x + rect.width + 0.0001,
        );
        expect(region.y + region.height).toBeLessThanOrEqual(
          rect.y + rect.height + 0.0001,
        );
      }
    });
  });

  describe('anchors stay inside the void across very different viewports', () => {
    it('places selectAnchor and promptAnchor inside voidRect, with prompt below select', () => {
      for (const viewport of VIEWPORT_TABLE) {
        const region = voidRect(viewport, IMAGE);
        const select = selectAnchor(viewport, IMAGE);
        const prompt = promptAnchor(viewport, IMAGE);

        expect(isPointInRect(select, region)).toBe(true);
        expect(isPointInRect(prompt, region)).toBe(true);
        expect(prompt.y).toBeGreaterThan(select.y);
        const art = coverRect(viewport, IMAGE);
        expect(prompt.x).toBeCloseTo(art.x + art.width * 0.5, 8);
      }
    });
  });

  describe('the prompt never lands on the road or on the painted logo', () => {
    it('keeps promptAnchor between image-relative y 0.25 and y 0.60 for every viewport', () => {
      for (const viewport of VIEWPORT_TABLE) {
        const rect = coverRect(viewport, IMAGE);
        const prompt = promptAnchor(viewport, IMAGE);
        const fraction = toImageFraction(prompt, rect);

        // Below the top-quarter painted logo...
        expect(fraction.y).toBeGreaterThan(0.25);
        // ...and above the bottom-third road/cars/fire (SPLASH_REGION.VOID.bottom = 0.60).
        expect(fraction.y).toBeLessThan(SPLASH_REGION.VOID.bottom);
      }
    });
  });

  describe('aspect ratio is preserved', () => {
    it('keeps rect.width / rect.height equal to the art aspect ratio for every viewport', () => {
      const artAspect = IMAGE.width / IMAGE.height;
      for (const viewport of VIEWPORT_TABLE) {
        const rect = coverRect(viewport, IMAGE);
        expect(rect.width / rect.height).toBeCloseTo(artAspect, 6);
      }
    });
  });

  describe('degenerate input', () => {
    // Documented behaviour: a zero, negative, or non-finite width/height is clamped to a
    // safe minimum (1px) rather than propagating NaN/Infinity. A transient 0x0 viewport
    // (e.g. a backgrounded tab mid-resize) must not crash or vanish game objects; it just
    // produces a degenerate-but-finite layout for that one frame.

    it('clamps a zero-size viewport instead of producing NaN or Infinity', () => {
      const viewport: Size = { width: 0, height: 0 };
      const rect = coverRect(viewport, IMAGE);
      assertRectFinite(rect);
      expect(coverScale(viewport, IMAGE)).toBeGreaterThan(0);
    });

    it('clamps a negative-size viewport instead of producing NaN or Infinity', () => {
      const viewport: Size = { width: -100, height: -50 };
      const rect = coverRect(viewport, IMAGE);
      assertRectFinite(rect);
    });

    it('clamps a non-finite viewport instead of producing NaN or Infinity', () => {
      const viewport: Size = { width: NaN, height: Infinity };
      const rect = coverRect(viewport, IMAGE);
      assertRectFinite(rect);
    });

    it('clamps a zero-size image instead of producing NaN or Infinity', () => {
      const image: Size = { width: 0, height: 0 };
      const viewport: Size = { width: 1280, height: 800 };
      const rect = coverRect(viewport, image);
      assertRectFinite(rect);
    });

    it('clamps a negative or non-finite image instead of producing NaN or Infinity', () => {
      const viewport: Size = { width: 1280, height: 800 };
      const rectA = coverRect(viewport, { width: -10, height: -20 });
      const rectB = coverRect(viewport, { width: NaN, height: Infinity });
      assertRectFinite(rectA);
      assertRectFinite(rectB);
    });

    it('never yields NaN/Infinity anchors when both viewport and image are degenerate', () => {
      const viewport: Size = { width: 0, height: -1 };
      const image: Size = { width: NaN, height: 0 };
      assertPointFinite(selectAnchor(viewport, image));
      assertPointFinite(promptAnchor(viewport, image));
      assertRectFinite(voidRect(viewport, image));
    });
  });
});
