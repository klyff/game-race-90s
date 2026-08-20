import type { TrackDefinition } from '../../domain/track/TrackDefinition.ts';

/**
 * THUNDER BASIN II — World 1, track 2.
 *
 * Bigger quarry loop than Basin I. Counter-clockwise. The start straight
 * stays a readable grid — no lip in the first ~200 units:
 *
 *   1. long start straight (west → east) — 10° after the pack is up
 *   2. east bowl into a north plateau
 *   3. rolling S along the north rim
 *   4. west medium straight — the 20° lip before the hairpin
 *   5. southwest hairpin folding back onto the start
 *
 * Ramp set (owner): one 10° and one 20°. Authored like Basin I so gen:tracks
 * never overwrites the lips. Traps from `npm run gen:traps`.
 */
export const thunderBasinTwo: TrackDefinition = {
  id: 'thunder-basin-2',
  displayName: 'Thunder Basin II',

  controlPoints: [
    // 1. Long start straight, heading +X. First 200u is clean grid + run-up.
    { x: -300, y: -190 },
    { x: -100, y: -191 },
    { x: 100, y: -190 },
    { x: 280, y: -188 },

    // 2. East bowl: wide climb into the north plateau.
    { x: 370, y: -130 },
    { x: 400, y: -20 },
    { x: 360, y: 90 },

    // 3. North rim S, heading -X.
    { x: 240, y: 145 },
    { x: 100, y: 110 },
    { x: -40, y: 155 },
    { x: -180, y: 115 },

    // 4. West medium straight into the hairpin — 20° here.
    { x: -290, y: 70 },
    { x: -350, y: 10 },

    // 5. Southwest hairpin easing onto the start straight (no Catmull bulge).
    { x: -395, y: -55 },
    { x: -375, y: -135 },
    { x: -335, y: -178 },
    { x: -310, y: -188 },
  ],

  halfWidth: 20,
  shoulderWidth: 9,

  laps: 3,
  checkpointCount: 8,
  startLineDistance: 0,

  gridLateralOffsets: [-9, 9],
  gridRowSpacing: 11,
  surfaceGrip: 1,

  // 10° mid start straight after the run-up; 20° on the west approach.
  rampZones: [
    { triggerDistance: 420, triggerLength: 12, launchSpeed: 11, inclineDegrees: 10 },
    { triggerDistance: 1520, triggerLength: 10, launchSpeed: 13, inclineDegrees: 20 },
  ],
};
