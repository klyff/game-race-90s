import { describe, expect, it } from 'vitest';
import { dedupCandidates, generatePathCandidates, MIN_MEANINGFUL_LATERAL } from '../../../src/domain/ai/CandidateGenerator.ts';

describe('candidate generator', () => {
  it('starts from the live lateral, not only the racing line', () => {
    const unique = generatePathCandidates(-3.1, 0.4, 9, null);
    expect(unique.some(candidate => Math.abs(candidate.targetLateral + 3.1) < 0.01)).toBe(true);
    expect(unique.length).toBeGreaterThanOrEqual(6);
    expect(unique.length).toBeLessThanOrEqual(12);
  });

  it('collapses geometrically equivalent laterals', () => {
    const unique = dedupCandidates(
      [
        { id: 'A', kind: 'KEEP', targetLateral: 2, speedScale: 1 },
        { id: 'B', kind: 'LINE', targetLateral: 2.2, speedScale: 1 },
        { id: 'C', kind: 'PASS_LEFT', targetLateral: 6, speedScale: 1 },
      ],
      MIN_MEANINGFUL_LATERAL,
    );
    expect(unique).toHaveLength(2);
  });

  it('drops SLOW futures when a ramp or last lap needs race speed', () => {
    const unique = generatePathCandidates(0, 0, 9, null, 1);
    expect(unique.every(candidate => candidate.speedScale >= 1)).toBe(true);
  });
});
