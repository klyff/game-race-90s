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

/** Default block count along the curved bar. */
const DEFAULT_SEGMENT_COUNT = 28;

/** Default side length of one square block, pixels. */
const DEFAULT_SEGMENT_SIZE = 12;

/** Default gap between adjacent blocks, pixels. */
const DEFAULT_SEGMENT_GAP = 4;

/**
 * Default height the bar climbs from its left end to its (flat) right end, pixels.
 *
 * Sized against the bar's WIDTH, not picked for looks: the reference gauge rises about
 * 0.19 of its own length, and at a shallower ratio the quarter-sine flattens into what
 * reads on screen as a straight diagonal line of dashes rather than a curve. Measured on
 * a build at ratio 0.14 and it was indistinguishable from a straight line, so the two
 * numbers here are deliberately kept in that proportion: 28 blocks at a 16 px pitch give
 * a 432 px bar, and 80/432 is 0.185.
 */
const DEFAULT_ARC_HEIGHT = 80;

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
 * Where the panel's top edge sits, as a fraction of the arc's own bounding-box height.
 * The arc's right end is near the TOP of its box (see the curve derivation below), so
 * starting the panel partway down leaves the bar's flat tip visible above the panel
 * while the panel's body still overlaps the bar's lower-right curve, as the reference
 * does.
 */
const PANEL_VERTICAL_START_FRACTION = 0.55;

export interface SpeedoGaugeOptions {
  /** Number of blocks in the curved bar. Default 28. */
  readonly segmentCount?: number;
  /** Side length of one square block, pixels. Default 9. */
  readonly segmentSize?: number;
  /** Gap between adjacent blocks, pixels. Default 3. */
  readonly segmentGap?: number;
  /** Height the bar climbs from left to right, pixels. Default 46. */
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
 * Rotation for the block at curve parameter `t` (0..1), in radians.
 *
 * The bar's blocks sit on `y = arcHeight * (1 - sin(t * PI / 2))`, and `t` is itself
 * `x / xMax`. Differentiating analytically gives the exact local slope:
 *
 *   dy/dx = -(arcHeight * PI) / (2 * xMax) * cos(t * PI / 2)
 *
 * This is deliberately NOT computed by comparing a block to its neighbours (a finite
 * difference): that version stays correct only for the `segmentSize`/`segmentGap`/
 * `arcHeight` it happened to be tuned against, and silently drifts wrong the moment any
 * of those constants change. The analytic slope is correct for any combination of them.
 */
function slopeAngle(t: number, arcHeight: number, xMax: number): number {
  if (xMax <= 0) {
    return 0;
  }
  const dydx = -((arcHeight * Math.PI) / (2 * xMax)) * Math.cos((t * Math.PI) / 2);
  return Math.atan(dydx);
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
    // A quarter sine profile is used because its slope is steepest at t=0 and exactly
    // zero at t=1: the bar climbs hardest right at the start and flattens out completely
    // by the end, which is exactly the reference's "steep then flat" silhouette. A
    // straight ramp cannot flatten, and a full sine wave would climb, then descend again.
    const xMax = segmentCount > 1 ? (segmentCount - 1) * (segmentSize + segmentGap) : 0;
    const arcWidth = xMax + segmentSize;
    const arcBoxHeight = arcHeight + segmentSize;

    const segmentRects: Phaser.GameObjects.Rectangle[] = [];
    const litColours: number[] = [];
    const unlitColours: number[] = [];

    for (let i = 0; i < segmentCount; i += 1) {
      const t = segmentCount > 1 ? i / (segmentCount - 1) : 0;
      const x = i * (segmentSize + segmentGap);
      const y = arcHeight * (1 - Math.sin((t * Math.PI) / 2));

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
      rect.setRotation(slopeAngle(t, arcHeight, xMax));
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

    // Pulled left into the arc's own width and dropped partway down its height, so the
    // panel overlaps the bar's flattened right-hand tail rather than sitting clear of it.
    const panelX = arcWidth - panelWidth * PANEL_OVERLAP_FRACTION;
    const panelY = arcBoxHeight * PANEL_VERTICAL_START_FRACTION;

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
