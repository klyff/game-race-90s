import type { TrackDefinition } from '../../domain/track/TrackDefinition.ts';

/**
 * THUNDER BASIN II — World 1, track 2.
 *
 * Bigger quarry loop than Basin I. Counter-clockwise. Built so the pack has
 * room to hot-approach a 45° lip and still recover:
 *
 *   1. long start straight (west → east) — the 45° big-air slab at speed
 *   2. east bowl into a north plateau
 *   3. rolling S along the north rim
 *   4. west medium straight — the 30° lip before the hairpin
 *   5. southwest hairpin folding back onto the start
 *
 * Ramp set (owner): one 30° and one 45°. Authored like Basin I so gen:tracks
 * never overwrites the lips. Traps from `npm run gen:traps`.
 */
export const thunderBasinTwo: TrackDefinition = {
  id: 'thunder-basin-2',
  displayName: 'Thunder Basin II',

  controlPoints: [
    // 1. Long start straight, heading +X. 45° sits mid-run once cars are up.
    { x: -300, y: -190 },
    { x: -100, y: -192 },
    { x: 100, y: -190 },
    { x: 280, y: -185 },

    // 2. East bowl: wide climb into the north plateau.
    { x: 370, y: -130 },
    { x: 400, y: -20 },
    { x: 360, y: 90 },

    // 3. North rim S, heading -X.
    { x: 240, y: 145 },
    { x: 100, y: 110 },
    { x: -40, y: 155 },
    { x: -180, y: 115 },

    // 4. West medium straight into the hairpin — 30° here.
    { x: -290, y: 70 },
    { x: -350, y: 10 },

    // 5. Southwest hairpin back onto the start straight.
    { x: -400, y: -60 },
    { x: -385, y: -140 },
    { x: -320, y: -180 },
  ],

  halfWidth: 20,
  shoulderWidth: 9,

  laps: 3,
  checkpointCount: 8,
  startLineDistance: 0,

  gridLateralOffsets: [-9, 9],
  gridRowSpacing: 11,
  surfaceGrip: 1,

  // 45° mid start straight (needs speed); 30° on the west approach.
  rampZones: [
    { triggerDistance: 280, triggerLength: 12, launchSpeed: 12, inclineDegrees: 45 },
    { triggerDistance: 1520, triggerLength: 10, launchSpeed: 13, inclineDegrees: 30 },
  ],
};
