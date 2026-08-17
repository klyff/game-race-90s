import { describe, expect, it } from 'vitest';
import { interceptPoint, predictPosition, predictionTime } from '../../../src/domain/ai/Intercept.ts';

describe('intercept', () => {
  it('aims ahead of the current position', () => {
    const now = { x: 0, y: 0 };
    const velocity = { x: 10, y: 0 };
    const predicted = predictPosition(now, velocity, 0.5);
    expect(predicted.x).toBeCloseTo(5);
  });

  it('gives better predictors a longer horizon', () => {
    const poor = predictionTime(12, 20, 0.2);
    const ace = predictionTime(12, 20, 1);
    expect(ace).toBeGreaterThan(poor);
  });

  it('intercept is not the current target position', () => {
    const point = interceptPoint({ x: 10, y: 0 }, { x: 20, y: 0 }, 20, 8, 0.9);
    expect(point.x).toBeGreaterThan(10);
  });
});
