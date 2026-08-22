/**
 * Walk Thunder Basin: world heading → strip index on the official 30-clock.
 *
 *   node --experimental-strip-types tools/art/car-rotate/race_clock_walk.ts
 */
import { findTrack } from '../../../src/data/tracks/registry.ts';
import { TrackSpline } from '../../../src/domain/track/TrackSpline.ts';
import {
  frameIndexForClockHeading,
  nearestClockIndexFromWorldChord,
} from '../../../src/domain/math/IsoClock.ts';
import { angleOf } from '../../../src/domain/math/Vec2.ts';

function main(): void {
  const track = findTrack('thunder-basin');
  const spline = new TrackSpline(track.controlPoints);
  const from = spline.positionAt(track.startLineDistance);
  const to = spline.positionAt(spline.wrap(track.startLineDistance + 50));
  const start30 = nearestClockIndexFromWorldChord(from, to, 30);
  const start26 = nearestClockIndexFromWorldChord(from, to, 26);
  const startHeading = angleOf(spline.frameAt(track.startLineDistance).tangent);
  console.log(`Basin start heading ${(startHeading * 180 / Math.PI).toFixed(1)}°`);
  console.log(`  nogo 30  → indice[${start30}]  (want 25)`);
  console.log(`  prod 26  → indice[${start26}]  (compact wheel — wrong contract)`);
  console.log('');
  console.log('s     hdg°   idx30  idx26');
  let previous = start30;
  let maxJump = 0;
  const step = 20;
  for (let distance = 0; distance < spline.totalLength; distance += step) {
    const heading = angleOf(spline.frameAt(distance).tangent);
    const idx30 = frameIndexForClockHeading(heading, 30);
    const idx26 = frameIndexForClockHeading(heading, 26);
    const jump = Math.min((idx30 - previous + 30) % 30, (previous - idx30 + 30) % 30);
    maxJump = Math.max(maxJump, jump);
    if (distance % 80 === 0) {
      console.log(
        `${String(Math.round(distance)).padStart(5)}  ${(heading * 180 / Math.PI).toFixed(1).padStart(6)}  ` +
          `${String(idx30).padStart(5)}  ${String(idx26).padStart(5)}`,
      );
    }
    previous = idx30;
  }
  console.log(`max neighbour jump (30): ${maxJump}`);
  if (start30 !== 25) {
    throw new Error(`start must be 25 on the 30-clock, got ${start30}`);
  }
}

main();
