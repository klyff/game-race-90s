import type { TrackDefinition } from '../../domain/track/TrackDefinition.ts';

/**
 * THUNDER BASIN I — World 1, track 1.
 *
 * Driven counter-clockwise. Layout teaches the handling model:
 *
 *   1. long bottom straight (west → east) — top speed, and the 10° intro slab
 *   2. wide east sweeper — grip edge
 *   3. S-chicane along the top — steerRate
 *   4. approach straight into the west hairpin — the 20° rock lip
 *   5. tight hairpin — brakeForce / enginePower on exit
 *
 * Ramp set (owner): two 10° teaching lips and one 20° exam. No steeper
 * walls. Traps (crates/drums) come from `npm run gen:traps`.
 */
export const thunderBasin: TrackDefinition = {
  id: 'thunder-basin',
  displayName: 'Thunder Basin',

  controlPoints: [
    // 1. Bottom straight, heading +X. Start line + 10° slab mid-run.
    { x: -250, y: -160 },
    { x: -80, y: -162 },
    { x: 90, y: -160 },
    { x: 200, y: -158 },

    // 2. East sweeper: wide 180° left-hander, radius ~110.
    { x: 280, y: -130 },
    { x: 320, y: -40 },
    { x: 270, y: 40 },

    // 3. S-chicane along the top, heading -X, descending into the approach.
    { x: 160, y: 55 },
    { x: 60, y: 10 },
    { x: -40, y: 50 },
    { x: -140, y: 10 },

    // 4. Approach straight to the hairpin — 20° slab lives here.
    { x: -230, y: -25 },
    { x: -300, y: -55 },

    // 5. West hairpin, points packed ~50 units for a slow apex.
    { x: -355, y: -85 },
    { x: -360, y: -130 },
    { x: -320, y: -155 },
  ],

  halfWidth: 20,
  shoulderWidth: 9,

  laps: 3,
  checkpointCount: 8,
  startLineDistance: 0,

  gridLateralOffsets: [-9, 9],
  gridRowSpacing: 11,

  // 10° mid bottom straight; 10° after the sweeper; 20° on the hairpin approach.
  rampZones: [
    { triggerDistance: 200, triggerLength: 12, launchSpeed: 11, inclineDegrees: 10 },
    { triggerDistance: 720, triggerLength: 10, launchSpeed: 11, inclineDegrees: 10 },
    { triggerDistance: 1240, triggerLength: 10, launchSpeed: 13, inclineDegrees: 20 },
  ],
};
