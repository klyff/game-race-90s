import { describe, expect, it } from 'vitest';
import { zoomToFitFraction, zoomToFitHalfBounds } from '../../src/domain/camera/analyzeTrackCameras.ts';

describe('zoomToFitFraction', () => {
  it('matches half-bounds at 0.5', () => {
    expect(zoomToFitFraction(2000, 1000, 1440, 900, 0.5)).toBe(
      zoomToFitHalfBounds(2000, 1000, 1440, 900),
    );
  });

  it('zooms in slightly at 45% of the map versus 50%', () => {
    const fortyFive = zoomToFitFraction(2000, 1000, 1440, 900, 0.45);
    const fifty = zoomToFitFraction(2000, 1000, 1440, 900, 0.5);
    expect(fortyFive).toBeGreaterThan(fifty);
  });
});
