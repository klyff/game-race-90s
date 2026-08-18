import type { TrackDefinition } from '../../domain/track/TrackDefinition.ts';

/**
 * THUNDER BASIN — the v1 circuit.
 *
 * Driven counter-clockwise, so the two big direction changes are left-handers
 * and curvature reads positive through them.
 *
 * The layout exists to exercise the handling model rather than to look pretty:
 *
 *   1. a long bottom straight, west to east — top speed, and the only place
 *      where `maxSpeed` differences between cars really show
 *   2. a wide east sweeper — a corner fast enough to be taken at the edge of
 *      grip, where a low-grip car has to lift and a high-grip car does not
 *   3. an S-chicane along the top — quick direction changes that punish the
 *      twitchy cars and reward `steerRate`
 *   4. a tight west hairpin — slow enough that `enginePower` and `brakeForce`
 *      decide the exit, and the one corner where a heavy car loses real time
 *
 * Scale: cars are about 4 units long, so a 20-unit half-width is roughly ten car
 * widths — generous on purpose, because the whole point is to have room to drift.
 */
export const thunderBasin: TrackDefinition = {
  id: 'thunder-basin',
  displayName: 'Thunder Basin',

  controlPoints: [
    // 1. Bottom straight, heading +X. The start line sits on it.
    { x: -230, y: -160 },
    { x: -60, y: -162 },
    { x: 110, y: -160 },

    // 2. East sweeper: a wide 180 degree left-hander, radius around 110. Points
    //    are spaced far apart, which is exactly what makes it a fast corner.
    { x: 250, y: -135 },
    { x: 300, y: -55 },
    { x: 255, y: 25 },

    // 3. S-chicane along the top, heading -X and descending, so that the west
    //    end arrives low enough for the hairpin to double back on itself.
    { x: 150, y: 45 },
    { x: 60, y: 5 },
    { x: -30, y: 45 },
    { x: -120, y: 5 },

    // 4. Approach to the hairpin: nearly straight, heading -X.
    { x: -215, y: -30 },
    { x: -290, y: -58 },

    // 5. The hairpin. Points packed roughly 50 units apart on purpose — corner
    //    radius follows control point spacing, so tight geometry needs tight
    //    spacing. It folds 180 degrees back onto the bottom straight, leaving
    //    about 100 units between entry and exit (comfortably clear of the
    //    58-unit wall-to-wall width), and is the slowest point on the lap.
    { x: -345, y: -85 },
    { x: -352, y: -130 },
    { x: -310, y: -155 },
  ],

  halfWidth: 20,
  shoulderWidth: 9,

  laps: 3,
  checkpointCount: 8,
  startLineDistance: 0,

  // Four cars, two by two, staggered like a real grid.
  gridLateralOffsets: [-9, 9],
  gridRowSpacing: 11,

  // Rock slabs, not painted ramps: mid-straight hop, sweeper exit, hairpin approach.
  rampZones: [
    { triggerDistance: 200, triggerLength: 12, launchSpeed: 12, inclineDegrees: 45 },
    { triggerDistance: 680, triggerLength: 10, launchSpeed: 13, inclineDegrees: 30 },
    { triggerDistance: 1180, triggerLength: 10, launchSpeed: 11, inclineDegrees: 15 },
  ],

  // Shoulder drums, not on the racing line: long straight, sweeper exit, hairpin approach.
  gasolineBarrels: [
    { distance: 90, lateral: 22 },
    { distance: 450, lateral: -22 },
    { distance: 1050, lateral: 22 },
  ],
};
