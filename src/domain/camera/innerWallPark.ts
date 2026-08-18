import { add, angleOf, scale } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';
import { trackFullHalfWidth } from '../track/TrackDefinition.ts';
import type { TrackDefinition } from '../track/TrackDefinition.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';
import { CAMERA_STRAIGHT_CURVATURE } from './CameraPreset.ts';

export interface InnerWallParkPose {
  readonly position: Vec2;
  readonly heading: number;
  readonly lateralOffset: number;
}

/**
 * Inner-wall pose at `distance`. Left-hand corners (positive curvature) park
 * on +normal. Straights use the infield (left / +normal on a CCW circuit).
 */
export function innerWallParkPose(
  spline: TrackSpline,
  track: TrackDefinition,
  distance: number,
  carRadius: number,
): InnerWallParkPose {
  const frame = spline.frameAt(distance);
  const wallLimit = Math.max(0, trackFullHalfWidth(track) - Math.max(0, carRadius));
  const innerSign =
    Math.abs(frame.curvature) < CAMERA_STRAIGHT_CURVATURE ? 1 : Math.sign(frame.curvature) || 1;
  const lateralOffset = innerSign * wallLimit;
  return {
    position: add(frame.position, scale(frame.normal, lateralOffset)),
    heading: angleOf(frame.tangent),
    lateralOffset,
  };
}
