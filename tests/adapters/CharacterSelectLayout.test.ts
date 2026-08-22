import { describe, expect, it } from 'vitest';
import {
  cellIndexAt,
  characterSelectPanes,
  containInRect,
  FACE_COLUMNS,
} from '../../src/adapters/render/CharacterSelectLayout.ts';
import type { Size } from '../../src/adapters/render/SplashLayout.ts';

const VIEW: Size = { width: 1920, height: 1080 };
const COUNT = 21;

function inside(outer: { x: number; y: number; width: number; height: number }, inner: {
  x: number;
  y: number;
  width: number;
  height: number;
}): void {
  expect(inner.x).toBeGreaterThanOrEqual(outer.x - 0.01);
  expect(inner.y).toBeGreaterThanOrEqual(outer.y - 0.01);
  expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width + 0.01);
  expect(inner.y + inner.height).toBeLessThanOrEqual(outer.y + outer.height + 0.01);
}

describe('characterSelectPanes', () => {
  it('keeps title-safe panes inside 90% of the viewport', () => {
    const panes = characterSelectPanes(VIEW, COUNT);
    const titleSafe = {
      x: VIEW.width * 0.05,
      y: VIEW.height * 0.05,
      width: VIEW.width * 0.9,
      height: VIEW.height * 0.9,
    };
    inside(titleSafe, panes.safe);
    inside(panes.safe, panes.stage);
    inside(panes.safe, panes.grid);
    inside(panes.stage, panes.bodySlot);
  });

  it('lays a 7×3 grid for 21 faces', () => {
    const panes = characterSelectPanes(VIEW, COUNT);
    expect(FACE_COLUMNS).toBe(7);
    expect(panes.cells).toHaveLength(21);
    expect(panes.cells[0]?.x).toBeCloseTo(panes.grid.x, 8);
    expect(panes.cells[6]?.x).toBeGreaterThan(panes.cells[0]!.x);
    expect(panes.cells[7]?.y).toBeGreaterThan(panes.cells[0]!.y);
    expect(panes.cardSize).toBeGreaterThan(48);
  });

  it('contains a tall body inside the stage without cropping', () => {
    const panes = characterSelectPanes(VIEW, COUNT);
    const body = containInRect(panes.bodySlot, { width: 599, height: 1478 });
    inside(panes.bodySlot, body);
    expect(body.height).toBeCloseTo(panes.bodySlot.height, 5);
    expect(body.width).toBeLessThan(panes.bodySlot.width);
  });

  it('hits the cell under a pointer', () => {
    const panes = characterSelectPanes(VIEW, COUNT);
    const first = panes.cells[0]!;
    const last = panes.cells[20]!;
    expect(cellIndexAt(panes, first.x + 4, first.y + 4)).toBe(0);
    expect(cellIndexAt(panes, last.x + last.width / 2, last.y + last.height / 2)).toBe(20);
    expect(cellIndexAt(panes, 0, 0)).toBeUndefined();
  });

  it('stays finite on a one-frame zero resize', () => {
    const panes = characterSelectPanes({ width: 0, height: 0 }, COUNT);
    expect(Number.isFinite(panes.cardSize)).toBe(true);
    expect(panes.cells).toHaveLength(21);
  });
});
