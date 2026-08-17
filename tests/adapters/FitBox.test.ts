import { describe, expect, it } from 'vitest';
import { containSize } from '../../src/adapters/render/FitBox.ts';

describe('containSize', () => {
  it('keeps a square photo square inside a tall slot', () => {
    const fit = containSize({ width: 1024, height: 1024 }, { width: 72, height: 90 });
    expect(fit.width).toBe(72);
    expect(fit.height).toBe(72);
  });

  it('keeps a square photo square inside a wide slot', () => {
    const fit = containSize({ width: 1254, height: 1254 }, { width: 140, height: 100 });
    expect(fit.width).toBe(100);
    expect(fit.height).toBe(100);
  });

  it('letterboxes a wide image instead of stretching it', () => {
    const fit = containSize({ width: 200, height: 100 }, { width: 80, height: 80 });
    expect(fit.width).toBe(80);
    expect(fit.height).toBe(40);
  });

  it('pillarboxes a tall image instead of stretching it', () => {
    const fit = containSize({ width: 100, height: 200 }, { width: 80, height: 80 });
    expect(fit.width).toBe(40);
    expect(fit.height).toBe(80);
  });
});
