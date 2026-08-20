import type { TrackDefinition } from '../../domain/track/TrackDefinition.ts';

/**
 * CHROME VERGE I — World 2, track 1.
 *
 * Stretched CCW pipe loop. W2 soft-gate is the nitro tank on straights:
 * two long pipes, two wide sweepers, no hairpin on the grid.
 *
 *   1. south pipe (west → east) — clean first ~200u, then a 10° lip
 *   2. east flare — fast sweeper, keep speed
 *   3. north pipe (east → west) — nitro dump into the 20°
 *   4. west flare — wide fold back onto the start, extra ease so Catmull
 *      does not bulge a wall into the grid
 *
 * Authored so `gen:tracks` never overwrites the lips. Traps from `gen:traps`.
 */
export const chromeVergeOne: TrackDefinition = {
  id: 'chrome-verge-1',
  displayName: 'Chrome Verge I',

  controlPoints: [
    // 1. South pipe, heading +X. First 200u is grid + run-up.
    { x: -480, y: -180 },
    { x: -360, y: -180 },
    { x: -240, y: -180 },
    { x: 0, y: -180 },
    { x: 240, y: -180 },
    { x: 460, y: -178 },

    // 2. East flare — wide, not a hairpin.
    { x: 560, y: -120 },
    { x: 600, y: 0 },
    { x: 550, y: 110 },

    // 3. North pipe, heading -X — 20° lives here.
    { x: 420, y: 160 },
    { x: 160, y: 164 },
    { x: -80, y: 162 },
    { x: -340, y: 158 },

    // 4. West flare, then four colinear points on the south pipe heading.
    { x: -460, y: 100 },
    { x: -530, y: -10 },
    { x: -540, y: -80 },
    { x: -535, y: -140 },
    { x: -520, y: -168 },
    { x: -505, y: -178 },
    { x: -495, y: -180 },
    { x: -488, y: -180 },
    { x: -483, y: -180 },
  ],

  halfWidth: 22,
  shoulderWidth: 9,

  laps: 3,
  checkpointCount: 8,
  startLineDistance: 0,

  gridLateralOffsets: [-9, 9],
  gridRowSpacing: 11,
  surfaceGrip: 1,

  // 10° after the south-pipe run-up; 20° mid north pipe after the flare.
  rampZones: [
    { triggerDistance: 420, triggerLength: 12, launchSpeed: 11, inclineDegrees: 10 },
    { triggerDistance: 1860, triggerLength: 12, launchSpeed: 13, inclineDegrees: 20 },
  ],
};
