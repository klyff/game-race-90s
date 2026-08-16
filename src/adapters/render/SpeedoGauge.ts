import Phaser from 'phaser';
import { SEGMENT_LAYOUT, segmentsForText } from './SevenSegment.ts';

/**
 * The Top Gear (SNES) style speedometer: a curved bar of colour-graded blocks that fills
 * from the left as speed climbs, sitting beside a black panel holding a big red
 * seven-segment number.
 *
 * Like `ExplosionEffect` and `TyreMarks`, this owns its Phaser game objects and redraws
 * them every frame rather than creating or destroying anything after construction — the
 * bar is always 28 (or however many) blocks and the panel is always 3 digit cells, so
 * there is nothing to allocate once the gauge exists.
 *
 * **No per-entity state.** There is exactly one speedometer in this game, and this class
 * holds exactly the game objects it owns and nothing keyed by a car, a player, or any
 * other identity. `TyreMarks` once cached "the" wheel trail as if there could only ever
 * be one car, and that broke the instant a fifth car appeared (WORKLOG T-039). The fix
 * here is simpler: never let that shape of bug exist in the first place by never keying
 * anything on an entity at all.
 */

/**
 * Fraction of the bar's width over which the climb happens — the "knee".
 *
 * The reference gauge climbs through a tight quarter-circle over roughly the first
 * FIFTH of the bar's length and is dead flat for the rest. Spreading that same climb
 * across the WHOLE bar (the old quarter-sine profile) was the defect: on screen it
 * read as a straight diagonal line of dashes, not an arc, which is exactly what the
 * owner rejected ("if you don't do an arc exactly, you made a almost half
 * round-square"). Confining the rise to one fifth and flattening the rest is what
 * produces that round-square knee followed by a long flat run.
 */
const KNEE_FRACTION = 0.2;

/** Default block count along the curved bar. Fewer, bigger blocks read as chunkier
 * squares than many thin ones. */
const DEFAULT_SEGMENT_COUNT = 24;

/** Default side length of one square block, pixels. */
const DEFAULT_SEGMENT_SIZE = 14;

/** Default gap between adjacent blocks, pixels. */
const DEFAULT_SEGMENT_GAP = 3;

/**
 * Default height the bar climbs from its left end to its (flat) right end, pixels.
 *
 * This is the full drop of the knee's quarter-circle (see `barProfileAt`), not a
 * height spread over the whole bar — the climb now happens entirely within the first
 * `KNEE_FRACTION` of the width, so this constant only needs to look right against the
 * knee's own (much narrower) span, not against the bar's full length.
 */
const DEFAULT_ARC_HEIGHT = 58;

/** Default width of one seven-segment digit cell, pixels. */
const DEFAULT_DIGIT_WIDTH = 30;

/** Default height of one seven-segment digit cell, pixels. */
const DEFAULT_DIGIT_HEIGHT = 46;

/** Default gap between adjacent digit cells, pixels. */
const DEFAULT_DIGIT_GAP = 6;

/** The speed readout is always three characters (see `HudFormat.formatSpeedDigits`). */
const DIGIT_COUNT = 3;

/** Colour gradient stops the bar travels through, left to right: green -> yellow -> orange -> dark red. */
const COLOUR_STOPS: readonly number[] = [0x3cf03c, 0xe8e83c, 0xe8802c, 0x8c1414];

/**
 * How much of a lit block's colour survives in its unlit state, per RGB channel.
 * Kept well above 0 so the unlit tail of the bar still reads as a dim ghost of the
 * scale — a fully blacked-out tail would look like missing blocks, not "not lit yet".
 */
const UNLIT_SEGMENT_SCALE = 0.34;

/** Red of the lit seven-segment digit strokes, matching a classic LED speedo. */
const LIT_DIGIT_COLOUR = 0xff2020;

/**
 * Colour of an UNLIT seven-segment stroke. Drawn very dark rather than hidden: a
 * fully invisible unlit segment loses the classic "ghost digits" look of a real
 * seven-segment display (the faint outline of every stroke that isn't lit), while a
 * colour much brighter than this starts to look like a broken/stuck display instead
 * of an off one.
 */
const UNLIT_DIGIT_COLOUR = 0x2a0505;

/** Fill colour of the panel behind the digits. */
const PANEL_COLOUR = 0x000000;

/** Opacity of the panel background. Not fully opaque so it still reads as a game object
 * sitting over the HUD rather than a hole punched in the screen. */
const PANEL_ALPHA = 0.82;

/** Space between the panel's edge and the digit cells / label it contains, pixels. */
const PANEL_PADDING = 8;

/** Width reserved for the lowercase "mph" label to the right of the last digit, pixels. */
const MPH_LABEL_WIDTH = 30;

/** Gap between the last digit cell and the "mph" label, pixels. */
const MPH_LABEL_GAP = 4;

/**
 * How far the panel's left edge is pulled back into the arc's own width, as a fraction
 * of the panel's width. The reference has the panel's body sitting mostly to the right
 * of the bar, overlapping only the bar's flattened right-hand tail — this fraction
 * controls how much of that overlap there is.
 */
const PANEL_OVERLAP_FRACTION = 0.6;

/**
 * Fixed pixel gap between the bottom edge of the arc's FLAT run and the top edge of
 * the digit panel.
 *
 * This used to be a FRACTION of the arc's bounding-box height, back when the curve
 * sloped all the way across and "partway down the box" landed somewhere on that slope.
 * Now the flat run pins the blocks to `y ∈ [0, segmentSize]` in the arc's local box for
 * the whole tail (four fifths of the width), so "just below the flat run" is simply
 * that bottom edge (`segmentSize`) plus a small constant gap — a fraction of the box
 * height no longer means anything sensible once most of the box height is knee, not
 * flat run.
 */
const PANEL_TOP_GAP = 6;

export interface SpeedoGaugeOptions {
  /** Number of blocks in the curved bar. Default 24. */
  readonly segmentCount?: number;
  /** Side length of one square block, pixels. Default 14. */
  readonly segmentSize?: number;
  /** Gap between adjacent blocks, pixels. Default 3. */
  readonly segmentGap?: number;
  /** Height the bar's knee climbs from its base to flat, pixels. Default 58. */
  readonly arcHeight?: number;
  /** Width of one seven-segment digit cell, pixels. Default 26. */
  readonly digitWidth?: number;
  /** Height of one seven-segment digit cell, pixels. Default 40. */
  readonly digitHeight?: number;
  /** Gap between adjacent digit cells, pixels. Default 6. */
  readonly digitGap?: number;
}

/**
 * Linearly interpolates between two 24-bit hex colours in RGB space, channel by channel.
 */
function lerpColour(fromHex: number, toHex: number, t: number): number {
  const fromR = (fromHex >> 16) & 0xff;
  const fromG = (fromHex >> 8) & 0xff;
  const fromB = fromHex & 0xff;

  const toR = (toHex >> 16) & 0xff;
  const toG = (toHex >> 8) & 0xff;
  const toB = toHex & 0xff;

  const r = Math.round(fromR + (toR - fromR) * t);
  const g = Math.round(fromG + (toG - fromG) * t);
  const b = Math.round(fromB + (toB - fromB) * t);

  return (r << 16) | (g << 8) | b;
}

/**
 * The bar's colour at position `t` (0 at the left end, 1 at the right end), sampled from
 * `COLOUR_STOPS`. Colour is a function of POSITION alone, never of whether the block
 * happens to be lit right now — the gradient is a property of the scale, not of the
 * current speed.
 */
function colourAtT(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const segmentCount = COLOUR_STOPS.length - 1;
  const scaledT = clamped * segmentCount;
  const segment = Math.min(segmentCount - 1, Math.floor(scaledT));
  const localT = scaledT - segment;
  return lerpColour(COLOUR_STOPS[segment] as number, COLOUR_STOPS[segment + 1] as number, localT);
}

/** Darkens a colour to its UNLIT state: each channel scaled to `UNLIT_SEGMENT_SCALE`. */
function dimColour(colour: number): number {
  const r = Math.round(((colour >> 16) & 0xff) * UNLIT_SEGMENT_SCALE);
  const g = Math.round(((colour >> 8) & 0xff) * UNLIT_SEGMENT_SCALE);
  const b = Math.round((colour & 0xff) * UNLIT_SEGMENT_SCALE);
  return (r << 16) | (g << 8) | b;
}

/**
 * The knee's tangent is vertical at its own base (`u = 0`, see `barProfileAt`), so its
 * analytic slope is unbounded there. Rotating a block by an unbounded angle is
 * rotating it to nothing usable on screen, so the angle is clamped to something steep
 * but finite — 80 degrees leans the first block hard without spinning it past
 * vertical, which is what the owner's reference shows for the tightest part of the
 * knee.
 */
const MAX_KNEE_ANGLE_RAD = (80 * Math.PI) / 180;

/** One block's position and rotation, in the arc's own local coordinate space. */
export interface BarPoint {
  /** Height climbed above the flat baseline, pixels. 0 on the flat run. */
  readonly y: number;
  /** Local tangent angle, radians, for rotating a block to follow the curve. */
  readonly angleRad: number;
}

/**
 * The bar's shape at curve parameter `t` (0 at the left end, 1 at the right end):
 * a quarter-circle climb through the first `KNEE_FRACTION` of the width, then dead
 * flat for the rest. That piecewise shape — steep knee, then flat — is what the
 * reference actually shows; spreading the same climb across the whole width (the old
 * `y = arcHeight * (1 - sin(t * PI / 2))` profile) read on screen as a straight
 * diagonal line of dashes instead of an arc.
 *
 * Within the knee, let `u = t / KNEE_FRACTION` run 0..1. The profile
 * `y = arcHeight * (1 - sqrt(1 - (1 - u)^2))` is a genuine quarter circle: at `u = 0`
 * it gives `y = arcHeight` (the knee's base) and at `u = 1` it gives `y = 0` (where it
 * meets the flat run), with a vertical tangent at the base and a horizontal one at the
 * top — the "almost half round-square" the owner described.
 *
 * Differentiating that quarter circle analytically (rather than by comparing a block
 * to its neighbours, which would stay correct only for the `segmentSize`/`segmentGap`/
 * `arcHeight` it was tuned against and silently drift wrong the moment any of those
 * constants change) gives, with `kneeWidth = KNEE_FRACTION * xMax`:
 *
 *   dy/dx = -(arcHeight * (1 - u)) / (kneeWidth * sqrt(1 - (1 - u)^2))
 *
 * The sign is deliberately negative: the bar climbs left-to-right in a y-DOWN screen
 * space, so `y` FALLS as `x` rises through the knee (leaning like the left side of a
 * rising slope). Getting this backwards would mirror the lean of every knee block.
 *
 * Pure and Phaser-free so the geometry can be unit-tested and printed as a table
 * without touching a scene.
 */
export function barProfileAt(t: number, arcHeight: number, xMax: number): BarPoint {
  if (t >= KNEE_FRACTION) {
    return { y: 0, angleRad: 0 };
  }

  const u = t / KNEE_FRACTION;
  const oneMinusU = 1 - u;
  // Guards against floating-point error pushing the argument slightly negative near
  // u=1 (e.g. -1e-17): Math.sqrt of a negative number is NaN, and a NaN y or angle
  // makes the block vanish from the screen with no error.
  const sqrtArg = Math.max(0, 1 - oneMinusU * oneMinusU);
  const y = arcHeight * (1 - Math.sqrt(sqrtArg));

  const kneeWidth = KNEE_FRACTION * xMax;
  if (kneeWidth <= 0) {
    return { y, angleRad: 0 };
  }

  const dydx = -(arcHeight * oneMinusU) / (kneeWidth * Math.sqrt(sqrtArg));
  // At u=0 the denominator is 0 and dydx is -Infinity; Math.atan(-Infinity) is a
  // well-defined -PI/2 (not NaN), and the clamp below pulls it in to the finite
  // MAX_KNEE_ANGLE_RAD anyway.
  const angleRad = Math.max(-MAX_KNEE_ANGLE_RAD, Math.min(MAX_KNEE_ANGLE_RAD, Math.atan(dydx)));
  return { y, angleRad };
}

/** `0xRRGGBB` -> `'#rrggbb'`, for a Phaser text colour string. */
function toCssColour(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}

export class SpeedoGauge {
  private readonly container: Phaser.GameObjects.Container;

  /** One rectangle per bar block, left to right. */
  private readonly segmentRects: readonly Phaser.GameObjects.Rectangle[];
  /** Each block's LIT colour, precomputed once from its fixed position on the gradient. */
  private readonly segmentLitColours: readonly number[];
  /** Each block's UNLIT colour, precomputed once (a dimmed version of its lit colour). */
  private readonly segmentUnlitColours: readonly number[];

  /** `digitCellRects[cell][i]` is the rectangle for `SEGMENT_LAYOUT[i]` of digit `cell`. */
  private readonly digitCellRects: readonly (readonly Phaser.GameObjects.Rectangle[])[];

  private readonly totalWidth: number;
  private readonly totalHeight: number;

  constructor(scene: Phaser.Scene, options: SpeedoGaugeOptions = {}) {
    const segmentCount = options.segmentCount ?? DEFAULT_SEGMENT_COUNT;
    const segmentSize = options.segmentSize ?? DEFAULT_SEGMENT_SIZE;
    const segmentGap = options.segmentGap ?? DEFAULT_SEGMENT_GAP;
    const arcHeight = options.arcHeight ?? DEFAULT_ARC_HEIGHT;
    const digitWidth = options.digitWidth ?? DEFAULT_DIGIT_WIDTH;
    const digitHeight = options.digitHeight ?? DEFAULT_DIGIT_HEIGHT;
    const digitGap = options.digitGap ?? DEFAULT_DIGIT_GAP;

    this.container = scene.add.container(0, 0);

    // ---- The curved bar ----
    // A tight quarter-circle knee over the first KNEE_FRACTION of the width, then dead
    // flat for the rest — see `barProfileAt` for the derivation. This replaced a
    // quarter-sine spread across the WHOLE bar, which flattened out visually into a
    // straight diagonal line of dashes instead of reading as an arc.
    const xMax = segmentCount > 1 ? (segmentCount - 1) * (segmentSize + segmentGap) : 0;
    const arcWidth = xMax + segmentSize;
    const arcBoxHeight = arcHeight + segmentSize;

    const segmentRects: Phaser.GameObjects.Rectangle[] = [];
    const litColours: number[] = [];
    const unlitColours: number[] = [];

    for (let i = 0; i < segmentCount; i += 1) {
      const t = segmentCount > 1 ? i / (segmentCount - 1) : 0;
      const x = i * (segmentSize + segmentGap);
      const { y, angleRad } = barProfileAt(t, arcHeight, xMax);

      const litColour = colourAtT(t);
      const unlitColour = dimColour(litColour);
      litColours.push(litColour);
      unlitColours.push(unlitColour);

      // Rectangles are positioned by centre (Phaser's default origin for a shape), so
      // rotating in place makes the block lean around its own middle rather than
      // swinging its corner out from under its neighbour.
      const rect = scene.add.rectangle(
        x + segmentSize / 2,
        y + segmentSize / 2,
        segmentSize,
        segmentSize,
        unlitColour,
      );
      rect.setRotation(angleRad);
      this.container.add(rect);
      segmentRects.push(rect);
    }

    this.segmentRects = segmentRects;
    this.segmentLitColours = litColours;
    this.segmentUnlitColours = unlitColours;

    // ---- The digital panel ----
    const digitsWidth = DIGIT_COUNT * digitWidth + (DIGIT_COUNT - 1) * digitGap;
    const panelWidth = digitsWidth + PANEL_PADDING * 2 + MPH_LABEL_GAP + MPH_LABEL_WIDTH;
    const panelHeight = digitHeight + PANEL_PADDING * 2;

    // Pulled left into the arc's own width so the panel overlaps the bar's flattened
    // right-hand tail rather than sitting clear of it, and dropped down to just below
    // that flat run — which now sits pinned at the TOP of the arc's box
    // (`y ∈ [0, segmentSize]`) for the whole tail, not partway down a slope.
    const panelX = arcWidth - panelWidth * PANEL_OVERLAP_FRACTION;
    const panelY = segmentSize + PANEL_TOP_GAP;

    const panelBackground = scene.add.rectangle(
      panelX + panelWidth / 2,
      panelY + panelHeight / 2,
      panelWidth,
      panelHeight,
      PANEL_COLOUR,
      PANEL_ALPHA,
    );
    this.container.add(panelBackground);

    const digitCellRects: Phaser.GameObjects.Rectangle[][] = [];
    for (let cell = 0; cell < DIGIT_COUNT; cell += 1) {
      const cellX = panelX + PANEL_PADDING + cell * (digitWidth + digitGap);
      const cellY = panelY + PANEL_PADDING;

      const cellRects: Phaser.GameObjects.Rectangle[] = [];
      for (const seg of SEGMENT_LAYOUT) {
        const segX = cellX + seg.x * digitWidth + (seg.width * digitWidth) / 2;
        const segY = cellY + seg.y * digitHeight + (seg.height * digitHeight) / 2;
        const rect = scene.add.rectangle(
          segX,
          segY,
          seg.width * digitWidth,
          seg.height * digitHeight,
          UNLIT_DIGIT_COLOUR,
        );
        this.container.add(rect);
        cellRects.push(rect);
      }
      digitCellRects.push(cellRects);
    }
    this.digitCellRects = digitCellRects;

    const lastCellRight = panelX + PANEL_PADDING + (DIGIT_COUNT - 1) * (digitWidth + digitGap) + digitWidth;
    const mphLabel = scene.add
      .text(lastCellRight + MPH_LABEL_GAP, panelY + panelHeight - PANEL_PADDING, 'mph', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: toCssColour(LIT_DIGIT_COLOUR),
      })
      .setOrigin(0, 1);
    this.container.add(mphLabel);

    // Bottom-right corner of everything drawn, so a caller can right-align the whole
    // assembly without knowing the arc and panel overlap.
    this.totalWidth = Math.max(arcWidth, panelX + panelWidth);
    this.totalHeight = Math.max(arcBoxHeight, panelY + panelHeight);
  }

  /** Total size of the whole gauge, so the caller can right-align it. */
  get size(): { readonly width: number; readonly height: number } {
    return { width: this.totalWidth, height: this.totalHeight };
  }

  /** Places the gauge with its TOP-LEFT at (x, y). Called from the scene's layout(). */
  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  /**
   * Per-frame update. `digits` is exactly 3 chars (see `HudFormat.formatSpeedDigits`);
   * `fraction` is 0..1. Recolours the existing rectangles — never creates or destroys a
   * game object here, however speed or digits change.
   */
  update(digits: string, fraction: number): void {
    const clampedFraction = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0;
    const litCount = Math.round(clampedFraction * this.segmentRects.length);

    for (let i = 0; i < this.segmentRects.length; i += 1) {
      const colour = i < litCount ? this.segmentLitColours[i] : this.segmentUnlitColours[i];
      this.segmentRects[i]?.setFillStyle(colour);
    }

    // Defensive: a caller that ever passed something other than 3 characters would
    // otherwise shift or drop digit cells. Falls back to blank rather than crashing.
    const safeDigits = typeof digits === 'string' && digits.length === DIGIT_COUNT ? digits : ' '.repeat(DIGIT_COUNT);
    const patterns = segmentsForText(safeDigits);

    for (let cell = 0; cell < this.digitCellRects.length; cell += 1) {
      const litSegments = patterns[cell] ?? [];
      const cellRects = this.digitCellRects[cell];
      if (cellRects === undefined) continue;

      for (let s = 0; s < SEGMENT_LAYOUT.length; s += 1) {
        const isLit = litSegments.includes(SEGMENT_LAYOUT[s]!.segment);
        cellRects[s]?.setFillStyle(isLit ? LIT_DIGIT_COLOUR : UNLIT_DIGIT_COLOUR);
      }
    }
  }

  setDepth(depth: number): void {
    this.container.setDepth(depth);
  }

  destroy(): void {
    this.container.destroy();
  }
}
