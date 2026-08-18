import { describe, expect, it } from 'vitest';
import { boxFromPoses, centerInBox, containScale, innerCell } from '../../tools/spritegen/strip-fit.ts';

describe('shared box then old contain', () => {
  const inner = innerCell(64, 4);

  it('locks one box from the largest consumed pose, not per frame', () => {
    const box = boxFromPoses([
      { width: 900, height: 350 },
      { width: 700, height: 650 },
      { width: 400, height: 200 },
    ]);
    expect(box).toEqual({ width: 900, height: 650 });
  });

  it('applies the old contain once to that box', () => {
    const box = { width: 900, height: 650 };
    const scale = containScale(box, inner);
    expect(scale).toBe(inner / 900);
    expect(box.width * scale).toBe(inner);
    expect(box.height * scale).toBeLessThan(inner);
  });

  it('centres a smaller pose inside the shared box', () => {
    const box = { width: 900, height: 650 };
    const pad = centerInBox({ width: 400, height: 200 }, box);
    expect(pad.x).toBe(250);
    expect(pad.y).toBe(225);
  });

  it('does not enlarge a compact pose to kiss two edges', () => {
    const box = boxFromPoses([
      { width: 1000, height: 400 },
      { width: 600, height: 550 },
    ]);
    const scale = containScale(box, inner);
    expect(600 * scale).toBeLessThan(inner);
    expect(1000 * scale).toBe(inner);
  });
});
