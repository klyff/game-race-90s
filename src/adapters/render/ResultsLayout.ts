/**
 * Post-race ceremony layout. Pure: no Phaser, no wall-clock, no RNG.
 *
 * The pub art is busy, so every plate lives inside a 8% title-safe inset and the
 * winner / podium / purse must read at a glance. Ranking is a single column —
 * splitting it into two spreadsheets was the thing that made the board look like
 * a debug dump.
 */

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Centre-origin plate, matching `paintRoundedPlaque`. */
export interface Plate {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PodiumSlot {
  readonly x: number;
  readonly top: number;
  readonly cardMax: number;
  readonly carMax: number;
  readonly step: Plate;
}

export interface ResultsLayout {
  readonly title: Plate;
  readonly header: Point;
  readonly winner: Point;
  readonly first: PodiumSlot;
  readonly second: PodiumSlot;
  readonly third: PodiumSlot;
  readonly ranking: Plate;
  readonly payout: Plate;
  readonly rankingCaption: Point;
  readonly rankingColumns: Point;
  readonly rankingLine0: Point;
  readonly payoutCaption: Point;
  readonly payoutText: Point;
  readonly prompt: Plate;
  readonly promptText: Point;
  readonly rankLine: number;
  readonly rankSlots: number;
}

const MIN = 1;
const INSET = 0.08;
const RANK_LINE = 18;
const WINNER_CARD = 140;
const OTHER_CARD = 104;
const WINNER_CAR = 128;
const OTHER_CAR = 104;

function sane(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : MIN;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface ResultsLayoutSpec {
  readonly rankCount: number;
  readonly payoutLines: number;
}

/**
 * Places the ceremony for a viewport. Degenerate sizes clamp to 1×1 so a
 * one-frame zero resize cannot NaN the scene.
 */
export function layoutResults(view: Size, spec: ResultsLayoutSpec): ResultsLayout {
  const width = sane(view.width);
  const height = sane(view.height);
  const padX = width * INSET;
  const padY = height * INSET;
  const ranks = clamp(Math.floor(Number.isFinite(spec.rankCount) ? spec.rankCount : 0), 0, 10);
  const payLines = Math.max(1, Math.floor(Number.isFinite(spec.payoutLines) ? spec.payoutLines : 1));

  const titleW = Math.min(560, (width - padX * 2) * 0.62);
  const titleH = Math.min(100, height * 0.14);
  const title: Plate = { x: width / 2, y: padY + titleH / 2, width: titleW, height: titleH };

  const promptH = 36;
  const prompt: Plate = {
    x: width / 2,
    y: height - padY - promptH / 2,
    width: Math.min(340, (width - padX * 2) * 0.42),
    height: promptH,
  };

  const boardGap = 14;
  const boardW = Math.min(380, ((width - padX * 2) - boardGap) / 2);
  const rankNeed = 44 + ranks * RANK_LINE;
  const payNeed = 36 + payLines * 20;
  const boardH = clamp(Math.max(rankNeed, payNeed), 132, height * 0.34);
  const rankSlots = clamp(Math.floor((boardH - 44) / RANK_LINE), 4, 10);
  const boardBottom = prompt.y - promptH / 2 - 12;
  const boardCy = boardBottom - boardH / 2;
  const ranking: Plate = {
    x: width / 2 - boardW / 2 - boardGap / 2,
    y: boardCy,
    width: boardW,
    height: boardH,
  };
  const payout: Plate = {
    x: width / 2 + boardW / 2 + boardGap / 2,
    y: boardCy,
    width: boardW,
    height: boardH,
  };

  const podiumTop = title.y + titleH / 2 + 8;
  const podiumFloor = ranking.y - boardH / 2 - 10;
  const avail = Math.max(150, podiumFloor - podiumTop);
  const natural = WINNER_CARD + 8 + WINNER_CAR + 8 + 20 + 22;
  const scale = clamp(Math.min(height / 820, avail / natural), 0.55, 1.02);
  const stepH = Math.max(16, 20 * scale);
  const raise = Math.max(18, 28 * scale);

  const first = slot(width * 0.5, podiumTop, WINNER_CARD * scale, WINNER_CAR * scale, stepH, podiumFloor);
  const second = slot(
    width * 0.28,
    podiumTop + raise,
    OTHER_CARD * scale,
    OTHER_CAR * scale,
    stepH * 0.85,
    podiumFloor,
  );
  const third = slot(
    width * 0.72,
    podiumTop + raise * 1.15,
    OTHER_CARD * scale,
    OTHER_CAR * scale,
    stepH * 0.75,
    podiumFloor,
  );

  const rankLeft = ranking.x - ranking.width / 2 + 16;
  const rankTop = ranking.y - ranking.height / 2 + 10;
  const payLeft = payout.x - payout.width / 2 + 16;
  const payTop = payout.y - payout.height / 2 + 10;

  return {
    title,
    header: { x: title.x, y: title.y - 18 },
    winner: { x: title.x, y: title.y + 16 },
    first,
    second,
    third,
    ranking,
    payout,
    rankingCaption: { x: rankLeft, y: rankTop },
    rankingColumns: { x: rankLeft, y: rankTop + 20 },
    rankingLine0: { x: rankLeft, y: rankTop + 20 + RANK_LINE },
    payoutCaption: { x: payLeft, y: payTop },
    payoutText: { x: payLeft, y: payTop + 22 },
    prompt,
    promptText: { x: prompt.x, y: prompt.y },
    rankLine: RANK_LINE,
    rankSlots,
  };
}

function slot(
  x: number,
  top: number,
  cardMax: number,
  carMax: number,
  stepH: number,
  floor: number,
): PodiumSlot {
  return {
    x,
    top,
    cardMax,
    carMax,
    step: {
      x,
      y: floor - stepH / 2,
      width: Math.max(72, cardMax * 0.92),
      height: stepH,
    },
  };
}

/** Title-safe inset used by the ceremony. Exported so tests lock the number. */
export const RESULTS_SAFE_INSET = INSET;
