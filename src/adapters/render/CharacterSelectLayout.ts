/**
 * CHOOSE YOUR FACE panes. Pure: no Phaser.
 *
 * Title-safe margins (6% x, 7% y) sit inside the 90% TV safe zone. Left stage
 * holds the standing body; right grid is 7×3 so 21 regulars fill exactly.
 */

import { containSize } from './FitBox.ts';
import type { Point, Rect, Size } from './SplashLayout.ts';

export const FACE_COLUMNS = 7;
export const FACE_CARD_FILL = 0.88;
export const FACE_FOCUS_SCALE = 1.08;

const MIN = 1;
const SAFE_X = 0.06;
const SAFE_Y = 0.07;
const TITLE_BAND = 0.08;
const FOOTER_BAND = 0.06;
const STAGE_SHARE = 0.38;
const GRID_SHARE = 0.56;
const NAME_BAND = 0.16;
const STAGE_INSET = 0.06;

function sane(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : MIN;
}

function sanitize(size: Size): Size {
  return { width: sane(size.width), height: sane(size.height) };
}

export interface CharacterSelectPanes {
  readonly safe: Rect;
  readonly title: Point;
  readonly footer: Point;
  readonly stage: Rect;
  readonly bodySlot: Rect;
  readonly name: Point;
  readonly tagline: Point;
  readonly grid: Rect;
  readonly cells: readonly Rect[];
  readonly cardSize: number;
}

function inset(rect: Rect, padX: number, padY: number): Rect {
  return {
    x: rect.x + padX,
    y: rect.y + padY,
    width: Math.max(MIN, rect.width - padX * 2),
    height: Math.max(MIN, rect.height - padY * 2),
  };
}

export function characterSelectPanes(viewport: Size, count: number): CharacterSelectPanes {
  const view = sanitize(viewport);
  const safe: Rect = {
    x: view.width * SAFE_X,
    y: view.height * SAFE_Y,
    width: view.width * (1 - SAFE_X * 2),
    height: view.height * (1 - SAFE_Y * 2),
  };
  const titleBand = safe.height * TITLE_BAND;
  const footerBand = safe.height * FOOTER_BAND;
  const content: Rect = {
    x: safe.x,
    y: safe.y + titleBand,
    width: safe.width,
    height: Math.max(MIN, safe.height - titleBand - footerBand),
  };
  const stage: Rect = {
    x: content.x,
    y: content.y,
    width: content.width * STAGE_SHARE,
    height: content.height,
  };
  const grid: Rect = {
    x: content.x + content.width * (1 - GRID_SHARE),
    y: content.y,
    width: content.width * GRID_SHARE,
    height: content.height,
  };
  const nameBand = stage.height * NAME_BAND;
  const bodySlot = inset(
    {
      x: stage.x,
      y: stage.y,
      width: stage.width,
      height: Math.max(MIN, stage.height - nameBand),
    },
    stage.width * STAGE_INSET,
    stage.height * STAGE_INSET,
  );
  const slots = Math.max(0, Math.floor(count));
  const rows = Math.max(1, Math.ceil(Math.max(slots, 1) / FACE_COLUMNS));
  const cellW = grid.width / FACE_COLUMNS;
  const cellH = grid.height / rows;
  const cells: Rect[] = [];
  for (let index = 0; index < slots; index += 1) {
    const col = index % FACE_COLUMNS;
    const row = Math.floor(index / FACE_COLUMNS);
    cells.push({
      x: grid.x + cellW * col,
      y: grid.y + cellH * row,
      width: cellW,
      height: cellH,
    });
  }
  return {
    safe,
    title: { x: view.width / 2, y: safe.y + titleBand * 0.5 },
    footer: { x: view.width / 2, y: safe.y + safe.height - footerBand * 0.5 },
    stage,
    bodySlot,
    name: { x: stage.x + stage.width / 2, y: stage.y + stage.height - nameBand * 0.62 },
    tagline: { x: stage.x + stage.width / 2, y: stage.y + stage.height - nameBand * 0.22 },
    grid,
    cells,
    cardSize: Math.min(cellW, cellH) * FACE_CARD_FILL,
  };
}

/** Letterbox `image` inside `box` without cropping. */
export function containInRect(box: Rect, image: Size): Rect {
  const fit = containSize(image, { width: box.width, height: box.height });
  return {
    x: box.x + (box.width - fit.width) / 2,
    y: box.y + (box.height - fit.height) / 2,
    width: fit.width,
    height: fit.height,
  };
}

export function cellIndexAt(panes: CharacterSelectPanes, x: number, y: number): number | undefined {
  for (let index = 0; index < panes.cells.length; index += 1) {
    const cell = panes.cells[index];
    if (cell === undefined) {
      continue;
    }
    if (x >= cell.x && x < cell.x + cell.width && y >= cell.y && y < cell.y + cell.height) {
      return index;
    }
  }
  return undefined;
}
