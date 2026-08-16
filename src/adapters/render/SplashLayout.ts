/**
 * Splash screen layout: place UI anchors against the authored splash art, not the viewport.
 *
 * The splash background (`public/assets/ui/splash.jpeg`, 1408x768) has a fixed composition:
 * the "ROCK'N 90s" logo and credit are painted into the top of the image, and a dark
 * explosion void sits in the centre — the only region with enough contrast for readable
 * text. The bottom third is road, cars and fire and must stay clear.
 *
 * The Phaser canvas runs `Scale.RESIZE` at the full browser window, so the viewport aspect
 * ratio is arbitrary and essentially never matches the art's 1408:768. The art is scaled to
 * COVER the viewport (fill it entirely, crop the overflow, never letterbox) and centred.
 *
 * THE BUG THIS MODULE EXISTS TO PREVENT: if UI text is positioned against the viewport
 * directly, it drifts off the dark void the moment the window is unusually tall or narrow,
 * landing unreadable on top of fire or road. Every anchor here is instead computed against
 * the COVER-scaled image's rect, so it tracks the art rather than the window.
 *
 * Pure module: no `phaser` import, no DOM, no wall-clock or RNG. Every function returns a
 * fresh object and mutates nothing, so it is trivially unit-testable and safe to call every
 * frame from a resize handler.
 */

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Smallest size (px) a dimension is clamped to when the input is zero, negative, or
 * non-finite.
 *
 * WHY clamp instead of throw: viewport size comes from `window.innerWidth/innerHeight`
 * via Phaser's resize event, which can transiently report 0 during layout (e.g. a
 * hidden/backgrounded tab, or a container mid-reflow). Throwing there would crash the
 * splash screen for a one-frame glitch. Clamping to a degenerate-but-finite 1x1 size keeps
 * every downstream computation finite (never NaN/Infinity); the resulting layout is
 * visibly wrong for that one frame but self-corrects on the next resize event, which is
 * the safer failure mode for a game loop.
 */
const MIN_DIMENSION = 1;

/** Replace a zero, negative, or non-finite dimension with `MIN_DIMENSION`. See above. */
function sanitizeSize(size: Size): Size {
  const width =
    Number.isFinite(size.width) && size.width > 0 ? size.width : MIN_DIMENSION;
  const height =
    Number.isFinite(size.height) && size.height > 0 ? size.height : MIN_DIMENSION;
  return { width, height };
}

/** Scale that makes `image` cover `viewport` entirely: max(vw/iw, vh/ih). */
export function coverScale(viewport: Size, image: Size): number {
  const v = sanitizeSize(viewport);
  const i = sanitizeSize(image);
  return Math.max(v.width / i.width, v.height / i.height);
}

/**
 * The COVER-scaled, centred rect the image occupies in viewport coordinates.
 * x/y may be NEGATIVE — that is correct and expected, it is the cropped overflow.
 */
export function coverRect(viewport: Size, image: Size): Rect {
  const v = sanitizeSize(viewport);
  const i = sanitizeSize(image);
  const scale = coverScale(viewport, image);
  const width = i.width * scale;
  const height = i.height * scale;
  // Centred crop: overflow (or letterbox, which never happens under COVER) is split evenly.
  const x = (v.width - width) / 2;
  const y = (v.height - height) / 2;
  return { x, y, width, height };
}

/** A point inside `rect`, addressed by fractions of its width and height. */
export function pointIn(rect: Rect, fractionX: number, fractionY: number): Point {
  return {
    x: rect.x + rect.width * fractionX,
    y: rect.y + rect.height * fractionY,
  };
}

/**
 * Image-relative fractions of the authored composition. Frozen `as const`.
 * These are the numbers a future art revision changes, and the only ones.
 */
export const SPLASH_REGION = {
  /**
   * The dark explosion void: the only region with contrast enough for text.
   *
   * `top` is 0.32 rather than where the darkness actually begins, around 0.28. The
   * painted "PRODUCED BY ZHAS STUDIO AND KLYFF" credit sits on the void's upper edge, and
   * a car name anchored to 0.28 was measured crowding it on screen. This region means
   * "safe to draw over", not "dark", and the credit is neither.
   */
  VOID: { left: 0.36, top: 0.32, right: 0.72, bottom: 0.6 },
} as const;

/**
 * Anchor placement, as fractions of the void rect (not the image or viewport). Keeping
 * these as named constants next to `SPLASH_REGION` (instead of inlining them into
 * `selectAnchor`/`promptAnchor`) means a single place documents the whole authored
 * composition.
 */
const ANCHOR_FRACTION_X = 0.5;
const SELECT_ANCHOR_FRACTION_Y = 0.4;
const PROMPT_ANCHOR_FRACTION_Y = 0.88;

/** The dark void as a rect in viewport coordinates. */
export function voidRect(viewport: Size, image: Size): Rect {
  const rect = coverRect(viewport, image);
  const { left, top, right, bottom } = SPLASH_REGION.VOID;
  return {
    x: rect.x + rect.width * left,
    y: rect.y + rect.height * top,
    width: rect.width * (right - left),
    height: rect.height * (bottom - top),
  };
}

/** Where the car-select block is centred: upper part of the void. */
export function selectAnchor(viewport: Size, image: Size): Point {
  return pointIn(voidRect(viewport, image), ANCHOR_FRACTION_X, SELECT_ANCHOR_FRACTION_Y);
}

/** Where the blinking "PRESS SPACE TO ROCK'N THE 90s" prompt is centred: lower part of the void. */
export function promptAnchor(viewport: Size, image: Size): Point {
  return pointIn(voidRect(viewport, image), ANCHOR_FRACTION_X, PROMPT_ANCHOR_FRACTION_Y);
}
