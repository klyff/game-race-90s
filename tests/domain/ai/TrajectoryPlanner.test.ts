import { describe, expect, it } from 'vitest';
import { candidateOffsets, scoreCandidate, trajectoryScore } from '../../../src/domain/ai/TrajectoryPlanner.ts';
import { TACTICAL_INTENTION } from '../../../src/domain/ai/UtilityEvaluator.ts';
import type { TrackDefinition } from '../../../src/domain/track/TrackDefinition.ts';

const track = {
  id: 'test',
  displayName: 'Test',
  controlPoints: [],
  halfWidth: 8,
  shoulderWidth: 4,
  laps: 3,
  checkpointCount: 4,
  startLineDistance: 0,
  gridLateralOffsets: [0],
  gridRowSpacing: 8,
} as TrackDefinition;

describe('trajectory planner', () => {
  it('emits 7 distinct lateral candidates around the baseline', () => {
    const offsets = candidateOffsets(0, 10);
    expect(offsets).toHaveLength(7);
    expect(new Set(offsets).size).toBe(7);
    expect(offsets.some(offset => offset < 0)).toBe(true);
    expect(offsets.some(offset => offset > 0)).toBe(true);
  });

  it('penalises accidental overlap more than a RAM on the target', () => {
    const nearby = [
      { carId: 'target', lateralOffset: 2, gap: 8, isTarget: true },
      { carId: 'other', lateralOffset: -3, gap: 8, isTarget: false },
    ];
    const ramOnTarget = scoreCandidate(2, 0, track, 10, TACTICAL_INTENTION.RAM, nearby, 2);
    const ramOnOther = scoreCandidate(-3, 0, track, 10, TACTICAL_INTENTION.RAM, nearby, 2);
    expect(ramOnOther.collisionPenalty).toBeGreaterThan(ramOnTarget.collisionPenalty);
    expect(trajectoryScore(ramOnTarget, TACTICAL_INTENTION.RAM)).toBeGreaterThan(
      trajectoryScore(ramOnOther, TACTICAL_INTENTION.RAM),
    );
  });
});
