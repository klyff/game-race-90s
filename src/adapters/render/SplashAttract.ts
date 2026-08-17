/**
 * Timing and placement for the splash attract: sparkles, the four-card
 * showcase in the void, then the same cards parked in the screen corners.
 *
 * Pure module — no Phaser, no wall-clock. SplashScene reads these numbers
 * and drives tweens; tests lock the 7s / 3s / 10s contract the owner asked for.
 */

import type { Point, Rect, Size } from './SplashLayout.ts';
import { coverRect, pointIn, voidRect } from './SplashLayout.ts';
import { SPLASH_CARDS } from '../../data/cards/SplashCards.ts';

/** Seconds after the splash opens before sparkles start. */
export const SPARKLE_START_SECONDS = 7;

/** Breath after sparkles appear before Aline flips in. */
export const CARD_SEQUENCE_DELAY_SECONDS = 0.6;

/** How long each showcase card grows and fades after it has flipped in. */
export const CARD_GROW_FADE_SECONDS = 3;

/** Playing-card flip that reveals the face, before the grow/fade. */
export const CARD_FLIP_SECONDS = 0.45;

/** Breath between one card finishing its fade and the next flipping in. */
export const CARD_GAP_SECONDS = 0.2;

/** How much the showcase card grows while fading (1 → 1.3). */
export const CARD_GROW_SCALE = 1.3;

/** Seconds after the last showcase card fades before the corner cards appear. */
export const CORNER_WAIT_SECONDS = 10;

const SHOWCASE_PAD = 0.08;
const CORNER_SIZE_FRACTION = 0.16;
const CORNER_INSET_FRACTION = 0.035;

export type CornerId = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export const CORNER_ORDER: readonly CornerId[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
];

/** One card's full showcase: flip in, then grow-and-fade. */
export function cardBeatSeconds(): number {
  return CARD_FLIP_SECONDS + CARD_GROW_FADE_SECONDS + CARD_GAP_SECONDS;
}

/** When the card at `index` starts flipping, measured from splash open. */
export function cardStartAt(index: number): number {
  return SPARKLE_START_SECONDS + CARD_SEQUENCE_DELAY_SECONDS + index * cardBeatSeconds();
}

/** When the last showcase card has finished fading. */
export function sequenceEndAt(): number {
  const last = SPLASH_CARDS.length - 1;
  return cardStartAt(last) + CARD_FLIP_SECONDS + CARD_GROW_FADE_SECONDS;
}

/** When the four corner cards begin to appear. */
export function cornersAppearAt(): number {
  return sequenceEndAt() + CORNER_WAIT_SECONDS;
}

/**
 * Square that fits inside the dark void, centred. Height is the tight
 * dimension of the authored hole, so the card never spills onto the
 * painted credit or the road.
 */
export function showcaseRect(viewport: Size, image: Size): Rect {
  const region = voidRect(viewport, image);
  const pad = Math.min(region.width, region.height) * SHOWCASE_PAD;
  const size = Math.max(1, Math.min(region.width, region.height) - pad * 2);
  return {
    x: region.x + (region.width - size) / 2,
    y: region.y + (region.height - size) / 2,
    width: size,
    height: size,
  };
}

export function showcaseCenter(viewport: Size, image: Size): Point {
  return pointIn(showcaseRect(viewport, image), 0.5, 0.5);
}

/**
 * Image-relative rest spots. These sit on the explosion ring and the
 * vehicle tops — the four corners of the authored splash, not the
 * browser window, so a tall or ultrawide viewport does not park a card
 * on the cropped logo or in empty overflow.
 */
export const SPLASH_CORNERS = {
  'top-left': { x: 0.13, y: 0.26 },
  'top-right': { x: 0.87, y: 0.26 },
  'bottom-left': { x: 0.13, y: 0.82 },
  'bottom-right': { x: 0.87, y: 0.82 },
} as const;

export function cornerSize(viewport: Size, image: Size): number {
  const rect = coverRect(viewport, image);
  return Math.max(1, Math.min(rect.width, rect.height) * CORNER_SIZE_FRACTION);
}

export function cornerCenter(viewport: Size, image: Size, corner: CornerId): Point {
  const rect = coverRect(viewport, image);
  const spot = SPLASH_CORNERS[corner];
  return pointIn(rect, spot.x, spot.y);
}

/** Inset used only as a clamp so a card never sits half off the viewport. */
export function clampToViewport(point: Point, size: number, viewport: Size): Point {
  const inset = Math.min(viewport.width, viewport.height) * CORNER_INSET_FRACTION;
  const half = size / 2;
  const minX = inset + half;
  const maxX = viewport.width - inset - half;
  const minY = inset + half;
  const maxY = viewport.height - inset - half;
  return {
    x: clamp(point.x, Math.min(minX, maxX), Math.max(minX, maxX)),
    y: clamp(point.y, Math.min(minY, maxY), Math.max(minY, maxY)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
