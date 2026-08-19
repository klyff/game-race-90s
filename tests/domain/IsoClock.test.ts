import { describe, it, expect } from 'vitest';
import {
  clockYawFromWorldHeading,
  frameIndexForClockHeading,
  nearestClockIndexFromWorldChord,
  screenDeltaFromHeading,
} from '../../src/domain/math/IsoClock.ts';
import { findTrack } from '../../src/data/tracks/registry.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import { angleOf } from '../../src/domain/math/Vec2.ts';
import { ISO_X, ISO_Y } from '../../src/domain/constants.ts';

function wrapTau(radians: number): number {
  const tau = Math.PI * 2;
  const wrapped = radians % tau;
  return wrapped < 0 ? wrapped + tau : wrapped;
}

describe('IsoClock', () => {
  it('projects world +X down-right on the 2:1 screen', () => {
    const screen = screenDeltaFromHeading(0);
    expect(screen.x).toBeCloseTo(ISO_X, 10);
    expect(screen.y).toBeCloseTo(ISO_Y, 10);
  });

  it('projects world NE (π/4) straight down — 6h, indice[0]', () => {
    const screen = screenDeltaFromHeading(Math.PI / 4);
    expect(screen.x).toBeCloseTo(0, 10);
    expect(screen.y).toBeGreaterThan(0);
    expect(clockYawFromWorldHeading(Math.PI / 4)).toBeCloseTo(0, 10);
    expect(frameIndexForClockHeading(Math.PI / 4, 30)).toBe(0);
  });

  it('maps world +X to ~296.6° clockwise — hero a025 on a 30-frame strip', () => {
    const yaw = wrapTau(clockYawFromWorldHeading(0));
    expect((yaw * 180) / Math.PI).toBeCloseTo(296.565, 2);
    expect(frameIndexForClockHeading(0, 30)).toBe(25);
  });

  it('maps world SW to 12h — rear to the camera', () => {
    expect(frameIndexForClockHeading((5 * Math.PI) / 4, 30)).toBe(15);
  });

  it('picks Basin start from the projected 50 m chord — nearest array index 25', () => {
    const track = findTrack('thunder-basin');
    const spline = new TrackSpline(track.controlPoints);
    const from = spline.positionAt(track.startLineDistance);
    const to = spline.positionAt(spline.wrap(track.startLineDistance + 50));
    expect(nearestClockIndexFromWorldChord(from, to, 30)).toBe(25);
  });

  it('walks Basin curves to neighboring indices, never a 180° flip', () => {
    const track = findTrack('thunder-basin');
    const spline = new TrackSpline(track.controlPoints);
    let previous = nearestClockIndexFromWorldChord(
      spline.positionAt(0),
      spline.positionAt(spline.wrap(50)),
      30,
    );
    expect(previous).toBe(25);

    const step = 8;
    for (let distance = 0; distance < spline.totalLength; distance += step) {
      const heading = angleOf(spline.frameAt(distance).tangent);
      const index = frameIndexForClockHeading(heading, 30);
      const jump = Math.min((index - previous + 30) % 30, (previous - index + 30) % 30);
      expect(jump).toBeLessThanOrEqual(3);
      previous = index;
    }
  });

  it('keeps clock yaw within half a frame of the chosen index', () => {
    const frames = 30;
    const arc = (Math.PI * 2) / frames;
    let maxError = 0;
    for (let i = 0; i < 500; i += 1) {
      const heading = (i - 250) * 0.1;
      const index = frameIndexForClockHeading(heading, frames);
      let delta = wrapTau(clockYawFromWorldHeading(heading)) - index * arc;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      maxError = Math.max(maxError, Math.abs(delta));
    }
    expect(maxError).toBeLessThanOrEqual(arc / 2 + 1e-10);
  });
});
