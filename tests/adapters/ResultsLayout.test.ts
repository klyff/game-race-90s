import { describe, expect, it } from 'vitest';
import { layoutResults, RESULTS_SAFE_INSET } from '../../src/adapters/render/ResultsLayout.ts';
import type { Plate, Point, Size } from '../../src/adapters/render/ResultsLayout.ts';

const VIEWPORTS: readonly Size[] = [
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
  { width: 1280, height: 800 },
  { width: 800, height: 600 },
  { width: 2560, height: 1080 },
];

function assertFinite(value: number): void {
  expect(Number.isFinite(value)).toBe(true);
}

function plateBox(plate: Plate): { left: number; right: number; top: number; bottom: number } {
  return {
    left: plate.x - plate.width / 2,
    right: plate.x + plate.width / 2,
    top: plate.y - plate.height / 2,
    bottom: plate.y + plate.height / 2,
  };
}

function overlaps(a: Plate, b: Plate): boolean {
  const A = plateBox(a);
  const B = plateBox(b);
  return A.left < B.right && A.right > B.left && A.top < B.bottom && A.bottom > B.top;
}

function inSafe(point: Point, view: Size): boolean {
  const padX = view.width * RESULTS_SAFE_INSET;
  const padY = view.height * RESULTS_SAFE_INSET;
  return point.x >= padX && point.x <= view.width - padX && point.y >= padY && point.y <= view.height - padY;
}

function plateInSafe(plate: Plate, view: Size): boolean {
  const box = plateBox(plate);
  const padX = view.width * RESULTS_SAFE_INSET;
  const padY = view.height * RESULTS_SAFE_INSET;
  return (
    box.left >= padX - 1 &&
    box.right <= view.width - padX + 1 &&
    box.top >= padY - 1 &&
    box.bottom <= view.height - padY + 1
  );
}

describe('layoutResults', () => {
  it('keeps plates inside the 8% title-safe inset on common viewports', () => {
    for (const view of VIEWPORTS) {
      const layout = layoutResults(view, { rankCount: 10, payoutLines: 8 });
      expect(plateInSafe(layout.title, view)).toBe(true);
      expect(plateInSafe(layout.ranking, view)).toBe(true);
      expect(plateInSafe(layout.payout, view)).toBe(true);
      expect(plateInSafe(layout.prompt, view)).toBe(true);
      expect(inSafe(layout.header, view)).toBe(true);
      expect(inSafe(layout.winner, view)).toBe(true);
    }
  });

  it('raises first above second and third, and orders 2-1-3 left to right', () => {
    const layout = layoutResults({ width: 1280, height: 720 }, { rankCount: 8, payoutLines: 7 });
    expect(layout.second.x).toBeLessThan(layout.first.x);
    expect(layout.first.x).toBeLessThan(layout.third.x);
    expect(layout.first.top).toBeLessThan(layout.second.top);
    expect(layout.first.top).toBeLessThan(layout.third.top);
    expect(layout.first.cardMax).toBeGreaterThan(layout.second.cardMax);
  });

  it('does not let ranking, purse and prompt overlap', () => {
    for (const view of VIEWPORTS) {
      const layout = layoutResults(view, { rankCount: 10, payoutLines: 8 });
      expect(overlaps(layout.ranking, layout.payout)).toBe(false);
      expect(overlaps(layout.ranking, layout.prompt)).toBe(false);
      expect(overlaps(layout.payout, layout.prompt)).toBe(false);
      expect(overlaps(layout.title, layout.ranking)).toBe(false);
      expect(layout.ranking.x).toBeLessThan(layout.payout.x);
    }
  });

  it('fits at least four championship rows inside the ranking plate', () => {
    for (const view of VIEWPORTS) {
      const layout = layoutResults(view, { rankCount: 10, payoutLines: 8 });
      expect(layout.rankSlots).toBeGreaterThanOrEqual(4);
      expect(layout.rankSlots).toBeLessThanOrEqual(10);
    }
  });

  it('stays finite when the viewport is a one-frame zero', () => {
    const layout = layoutResults({ width: 0, height: 0 }, { rankCount: 0, payoutLines: 0 });
    for (const plate of [layout.title, layout.ranking, layout.payout, layout.prompt, layout.first.step]) {
      assertFinite(plate.x);
      assertFinite(plate.y);
      assertFinite(plate.width);
      assertFinite(plate.height);
    }
  });
});
