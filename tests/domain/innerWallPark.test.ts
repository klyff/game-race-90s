import { describe, expect, it } from 'vitest';
import { innerWallParkPose } from '../../src/domain/camera/innerWallPark.ts';
import { thunderBasin } from '../../src/data/tracks/thunder-basin.track.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import { trackFullHalfWidth } from '../../src/domain/track/TrackDefinition.ts';

describe('innerWallParkPose', () => {
  const spline = new TrackSpline(thunderBasin.controlPoints);

  it('parks left (+normal) on the west hairpin', () => {
    const pose = innerWallParkPose(spline, thunderBasin, 1330, 2);
    expect(pose.lateralOffset).toBeGreaterThan(0);
    expect(Math.abs(pose.lateralOffset)).toBeCloseTo(trackFullHalfWidth(thunderBasin) - 2, 5);
  });

  it('uses the infield (left) on a straight', () => {
    const pose = innerWallParkPose(spline, thunderBasin, 200, 2);
    expect(pose.lateralOffset).toBeGreaterThan(0);
  });
});
