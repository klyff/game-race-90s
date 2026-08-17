import { describe, it, expect } from 'vitest';
import {
  CARD_FLIP_SECONDS,
  CARD_GROW_FADE_SECONDS,
  CARD_GROW_SCALE,
  CARD_SEQUENCE_DELAY_SECONDS,
  CORNER_ORDER,
  CORNER_WAIT_SECONDS,
  SPARKLE_START_SECONDS,
  cardBeatSeconds,
  cardStartAt,
  clampToViewport,
  cornerCenter,
  cornerSize,
  cornersAppearAt,
  sequenceEndAt,
  showcaseCenter,
  showcaseRect,
} from '../../src/adapters/render/SplashAttract.ts';
import { coverRect, voidRect } from '../../src/adapters/render/SplashLayout.ts';
import type { Size } from '../../src/adapters/render/SplashLayout.ts';
import { SPLASH_CARDS } from '../../src/data/cards/SplashCards.ts';

const IMAGE: Size = { width: 1408, height: 768 };

const VIEWPORTS: readonly Size[] = [
  { width: 1920, height: 600 },
  { width: 800, height: 1200 },
  { width: 1000, height: 1000 },
  { width: 1408, height: 768 },
  { width: 1280, height: 800 },
];

describe('SplashAttract timing', () => {
  it('starts sparkles at 7 seconds, then the first card after a short lead-in', () => {
    expect(SPARKLE_START_SECONDS).toBe(7);
    expect(cardStartAt(0)).toBeCloseTo(SPARKLE_START_SECONDS + CARD_SEQUENCE_DELAY_SECONDS, 8);
    expect(cardStartAt(0)).toBeGreaterThan(SPARKLE_START_SECONDS);
  });

  it('plays Aline, Enzo, Emma, Klyff in that order, 3s grow-and-fade each', () => {
    expect(SPLASH_CARDS.map((card) => card.id)).toEqual(['aline', 'enzo', 'emma', 'klyff']);
    expect(CARD_GROW_FADE_SECONDS).toBe(3);
    expect(CARD_GROW_SCALE).toBeCloseTo(1.3, 8);
    expect(cardStartAt(1) - cardStartAt(0)).toBeCloseTo(cardBeatSeconds(), 8);
    expect(cardStartAt(2) - cardStartAt(1)).toBeCloseTo(cardBeatSeconds(), 8);
    expect(cardStartAt(3) - cardStartAt(2)).toBeCloseTo(cardBeatSeconds(), 8);
  });

  it('parks the four cards in the corners 10s after the last fade', () => {
    expect(CORNER_WAIT_SECONDS).toBe(10);
    const lastFadeEnd = cardStartAt(3) + CARD_FLIP_SECONDS + CARD_GROW_FADE_SECONDS;
    expect(sequenceEndAt()).toBeCloseTo(lastFadeEnd, 8);
    expect(cornersAppearAt()).toBeCloseTo(sequenceEndAt() + 10, 8);
  });
});

describe('SplashAttract showcase layout', () => {
  it('fits a square inside the void for every viewport', () => {
    for (const viewport of VIEWPORTS) {
      const region = voidRect(viewport, IMAGE);
      const card = showcaseRect(viewport, IMAGE);
      expect(card.width).toBeCloseTo(card.height, 8);
      expect(card.x).toBeGreaterThanOrEqual(region.x - 0.0001);
      expect(card.y).toBeGreaterThanOrEqual(region.y - 0.0001);
      expect(card.x + card.width).toBeLessThanOrEqual(region.x + region.width + 0.0001);
      expect(card.y + card.height).toBeLessThanOrEqual(region.y + region.height + 0.0001);
    }
  });

  it('centres the showcase card in the void', () => {
    const viewport: Size = { width: 1408, height: 768 };
    const region = voidRect(viewport, IMAGE);
    const center = showcaseCenter(viewport, IMAGE);
    expect(center.x).toBeCloseTo(region.x + region.width / 2, 8);
    expect(center.y).toBeCloseTo(region.y + region.height / 2, 8);
  });
});

describe('SplashAttract corner layout', () => {
  it('assigns one rest spot per card, in showcase order', () => {
    expect(CORNER_ORDER).toHaveLength(SPLASH_CARDS.length);
    expect(new Set(CORNER_ORDER).size).toBe(4);
  });

  it('keeps every corner card fully on screen', () => {
    for (const viewport of VIEWPORTS) {
      const size = cornerSize(viewport, IMAGE);
      for (const corner of CORNER_ORDER) {
        const raw = cornerCenter(viewport, IMAGE, corner);
        const point = clampToViewport(raw, size, viewport);
        expect(point.x - size / 2).toBeGreaterThanOrEqual(-0.0001);
        expect(point.y - size / 2).toBeGreaterThanOrEqual(-0.0001);
        expect(point.x + size / 2).toBeLessThanOrEqual(viewport.width + 0.0001);
        expect(point.y + size / 2).toBeLessThanOrEqual(viewport.height + 0.0001);
      }
    }
  });

  it('places corners on the authored splash, not the raw viewport origin', () => {
    const viewport: Size = { width: 800, height: 1200 };
    const art = coverRect(viewport, IMAGE);
    const topLeft = cornerCenter(viewport, IMAGE, 'top-left');
    expect(topLeft.x).toBeGreaterThan(art.x);
    expect(topLeft.y).toBeGreaterThan(art.y);
  });
});
