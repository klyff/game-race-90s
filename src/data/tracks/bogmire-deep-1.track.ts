import type { TrackDefinition } from '../../domain/track/TrackDefinition.ts';

/**
 * BOGMIRE DEEP I — World 3, track 1. Promoted from generated so ramps stick.
 *
 * One teaching lip (15°) and one void experiment (45°, hot launch) so cars
 * that overshoot the ribbon explode instead of landing on asphalt.
 */
export const bogmireDeepOne: TrackDefinition = {
  id: 'bogmire-deep-1',
  displayName: 'Bogmire Deep I',
  controlPoints: [
    { x: 331, y: 0 },
    { x: 278, y: 71 },
    { x: 176, y: 104 },
    { x: 115, y: 139 },
    { x: 49, y: 196 },
    { x: -70, y: 279 },
    { x: -125, y: 152 },
    { x: -172, y: 101 },
    { x: -215, y: 55 },
    { x: -375, y: 0 },
    { x: -324, y: -83 },
    { x: -174, y: -103 },
    { x: -119, y: -145 },
    { x: -49, y: -197 },
    { x: 68, y: -273 },
    { x: 120, y: -146 },
    { x: 186, y: -110 },
    { x: 243, y: -62 },
  ],
  halfWidth: 20,
  shoulderWidth: 9,
  laps: 3,
  checkpointCount: 8,
  startLineDistance: 0,
  gridLateralOffsets: [-9, 9],
  gridRowSpacing: 11,
  surfaceGrip: 0.72,
  rampZones: [
    { triggerDistance: 220, triggerLength: 12, launchSpeed: 11, inclineDegrees: 15 },
    { triggerDistance: 980, triggerLength: 12, launchSpeed: 20, inclineDegrees: 45 },
  ],
};
