/**
 * Seven-segment digit geometry and patterns for the speedometer HUD.
 *
 * The owner asked for a Top Gear (SNES) style speedometer: a big red seven-segment
 * number on a black panel. Phaser ships no seven-segment font and this project ships no
 * font files at all, so every digit is drawn as up to seven rectangles chosen at render
 * time. This module owns the two things that make that possible:
 *
 *  1. Which of the seven segments (a..g) are lit for a given character (`segmentsFor`,
 *     `isSegmentLit`, `segmentsForText`).
 *  2. Where each segment's rectangle sits inside a digit cell, as fractions of the
 *     cell's width/height (`SEGMENT_LAYOUT`), so the caller can multiply by whatever
 *     pixel size it wants and get a Phaser rectangle.
 *
 * Segment naming follows the standard seven-segment convention:
 *
 *  ```
 *   aaa
 *  f   b
 *  f   b
 *   ggg
 *  e   c
 *  e   c
 *   ddd
 *  ```
 *
 * Pure module: no `phaser` import, no DOM, no wall-clock or RNG. Every function returns
 * a fresh (or frozen, shared, immutable) object and mutates nothing, so it is trivially
 * unit-testable and safe to call every frame from a HUD redraw.
 */

/** The seven segments of a digit cell, in the standard a..g order. */
export const SEGMENT = {
  A: 'a',
  B: 'b',
  C: 'c',
  D: 'd',
  E: 'e',
  F: 'f',
  G: 'g',
} as const;

export type SegmentName = (typeof SEGMENT)[keyof typeof SEGMENT];

/** A segment's rectangle inside a digit cell, in cell-relative fractions (0..1). */
export interface SegmentRect {
  readonly segment: SegmentName;
  readonly x: number; // 0..1 of the cell width
  readonly y: number; // 0..1 of the cell height
  readonly width: number; // 0..1 of the cell width
  readonly height: number; // 0..1 of the cell height
  /** True when this segment lies horizontally (a, d, g); false for the verticals. */
  readonly horizontal: boolean;
}

/**
 * Thickness of a segment's short dimension, as a fraction of the cell width. ~0.18 reads
 * as a chunky pixel-art stroke at typical HUD digit sizes (Top Gear's speedo digits are
 * thick, not wire-thin) while still leaving room for the two stacked vertical segments
 * per side.
 */
const STROKE = 0.18;

/**
 * How far the horizontal segments (a, d, g) are pulled in from the cell's left/right
 * edges, as a fraction of the cell width.
 *
 * WHY: the vertical segments (f/b, e/c) already occupy the full `STROKE` width at each
 * edge. A horizontal segment drawn edge-to-edge would fully overlap that corner square,
 * so the two corner pixels read as one solid rectangle instead of two distinct strokes
 * meeting at a corner — on a chunky pixel-art digit that flattens the classic
 * seven-segment corner notch into a blob. Pulling the horizontal in by half a stroke
 * keeps the corner meeting visually a corner rather than a filled square, while still
 * overlapping the vertical enough that no gap appears.
 */
const CORNER_INSET = STROKE / 2;

/** Shared width/x for the three horizontal segments (a, d, g): inset on both sides. */
const HORIZONTAL_X = CORNER_INSET;
const HORIZONTAL_WIDTH = 1 - 2 * CORNER_INSET;

/** Y of the middle horizontal (g)'s top edge: centred on the cell, `STROKE` tall. */
const MIDDLE_Y = 0.5 - STROKE / 2;

/** Y span shared by both verticals on a given side (upper pair f/b, lower pair e/c). */
const UPPER_VERTICAL_Y = STROKE; // just below `a`
const UPPER_VERTICAL_HEIGHT = MIDDLE_Y - STROKE; // down to the top of `g`
const LOWER_VERTICAL_Y = MIDDLE_Y + STROKE; // just below `g`
const LOWER_VERTICAL_HEIGHT = 1 - STROKE - LOWER_VERTICAL_Y; // up to the top of `d`

/** X of the right-side verticals (b, c): flush with the cell's right edge. */
const RIGHT_VERTICAL_X = 1 - STROKE;

/**
 * Every segment's geometry, always all seven, always in a..g order.
 *
 * Frozen so the shared instance can never drift between calls: callers read fractions
 * out of this every frame and must never be able to mutate it into a different layout.
 */
export const SEGMENT_LAYOUT: readonly SegmentRect[] = Object.freeze([
  Object.freeze({
    segment: SEGMENT.A,
    x: HORIZONTAL_X,
    y: 0,
    width: HORIZONTAL_WIDTH,
    height: STROKE,
    horizontal: true,
  }),
  Object.freeze({
    segment: SEGMENT.B,
    x: RIGHT_VERTICAL_X,
    y: UPPER_VERTICAL_Y,
    width: STROKE,
    height: UPPER_VERTICAL_HEIGHT,
    horizontal: false,
  }),
  Object.freeze({
    segment: SEGMENT.C,
    x: RIGHT_VERTICAL_X,
    y: LOWER_VERTICAL_Y,
    width: STROKE,
    height: LOWER_VERTICAL_HEIGHT,
    horizontal: false,
  }),
  Object.freeze({
    segment: SEGMENT.D,
    x: HORIZONTAL_X,
    y: 1 - STROKE,
    width: HORIZONTAL_WIDTH,
    height: STROKE,
    horizontal: true,
  }),
  Object.freeze({
    segment: SEGMENT.E,
    x: 0,
    y: LOWER_VERTICAL_Y,
    width: STROKE,
    height: LOWER_VERTICAL_HEIGHT,
    horizontal: false,
  }),
  Object.freeze({
    segment: SEGMENT.F,
    x: 0,
    y: UPPER_VERTICAL_Y,
    width: STROKE,
    height: UPPER_VERTICAL_HEIGHT,
    horizontal: false,
  }),
  Object.freeze({
    segment: SEGMENT.G,
    x: HORIZONTAL_X,
    y: MIDDLE_Y,
    width: HORIZONTAL_WIDTH,
    height: STROKE,
    horizontal: true,
  }),
]);

/**
 * Lit-segment patterns for '0'..'9' and ' ' (blank), each in a..g order.
 *
 * These are the textbook seven-segment patterns; every entry lists only the letters
 * that are actually lit, already sorted a..g, so `segmentsFor` never has to re-sort.
 */
const DIGIT_PATTERNS: Readonly<Record<string, readonly SegmentName[]>> = {
  '0': [SEGMENT.A, SEGMENT.B, SEGMENT.C, SEGMENT.D, SEGMENT.E, SEGMENT.F],
  '1': [SEGMENT.B, SEGMENT.C],
  '2': [SEGMENT.A, SEGMENT.B, SEGMENT.D, SEGMENT.E, SEGMENT.G],
  '3': [SEGMENT.A, SEGMENT.B, SEGMENT.C, SEGMENT.D, SEGMENT.G],
  '4': [SEGMENT.B, SEGMENT.C, SEGMENT.F, SEGMENT.G],
  '5': [SEGMENT.A, SEGMENT.C, SEGMENT.D, SEGMENT.F, SEGMENT.G],
  '6': [SEGMENT.A, SEGMENT.C, SEGMENT.D, SEGMENT.E, SEGMENT.F, SEGMENT.G],
  '7': [SEGMENT.A, SEGMENT.B, SEGMENT.C],
  '8': [SEGMENT.A, SEGMENT.B, SEGMENT.C, SEGMENT.D, SEGMENT.E, SEGMENT.F, SEGMENT.G],
  '9': [SEGMENT.A, SEGMENT.B, SEGMENT.C, SEGMENT.D, SEGMENT.F, SEGMENT.G],
  ' ': [],
};

/** Every pattern above, frozen once at module load — the arrays handed out are shared. */
for (const key of Object.keys(DIGIT_PATTERNS)) {
  Object.freeze(DIGIT_PATTERNS[key]);
}

/** Shared empty pattern for any character with no lit segments. */
const BLANK_PATTERN: readonly SegmentName[] = Object.freeze([]);

/**
 * Which segments are lit for one character.
 *
 * Accepts '0'..'9' and ' ' (blank). Any other character — including multi-character
 * strings, letters, punctuation, or (defensively) a non-string value smuggled through a
 * bad cast — is treated as blank rather than throwing, because a formatter upstream must
 * never be able to crash the HUD over a stray character.
 */
export function segmentsFor(character: string): readonly SegmentName[] {
  if (typeof character !== 'string') {
    return BLANK_PATTERN;
  }
  const pattern = DIGIT_PATTERNS[character];
  return pattern ?? BLANK_PATTERN;
}

/** True when `segment` is lit for `character`. Convenience for a per-segment draw loop. */
export function isSegmentLit(character: string, segment: SegmentName): boolean {
  return segmentsFor(character).includes(segment);
}

/**
 * The lit segments for each character of `text`, one entry per character, left to right.
 * Non-digit, non-space characters yield an empty (blank) entry so the caller's cell count
 * always matches the string length and the digits never shift position.
 */
export function segmentsForText(text: string): readonly (readonly SegmentName[])[] {
  if (typeof text !== 'string') {
    return [];
  }
  return text.split('').map((character) => segmentsFor(character));
}
