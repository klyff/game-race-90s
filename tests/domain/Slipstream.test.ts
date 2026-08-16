import { describe, it, expect } from 'vitest';
import {
  draftFromCandidate,
  slipstreamFactor,
  SLIPSTREAM_DEFAULTS,
} from '../../src/domain/race/Slipstream.ts';
import type { DraftCandidate } from '../../src/domain/race/Slipstream.ts';
import { createVehicleState } from '../../src/domain/vehicle/Vehicle.ts';
import type { VehicleState } from '../../src/domain/vehicle/Vehicle.ts';
import { add, fromAngle, scale, vec2 } from '../../src/domain/math/Vec2.ts';

const { minimumGap, peakGap, maximumGap, wakeHalfWidth } = SLIPSTREAM_DEFAULTS;

/** A candidate directly ahead of the origin-facing-+X follower, at a given gap. */
function candidateAtGap(gap: number, headingOffset = 0, lateralOffset = 0): DraftCandidate {
  return {
    position: vec2(gap, lateralOffset),
    heading: headingOffset,
  };
}

describe('Slipstream', () => {
  it('directly behind at the peak gap gives the maximum', () => {
    const follower = createVehicleState(vec2(0, 0), 0);
    const candidate = candidateAtGap(peakGap);

    const factor = draftFromCandidate(follower, candidate);

    expect(factor).toBeCloseTo(1, 9);
  });

  it('zero when the candidate is behind the follower', () => {
    const follower = createVehicleState(vec2(0, 0), 0);
    const candidate: DraftCandidate = { position: vec2(-6, 0), heading: 0 };

    const factor = draftFromCandidate(follower, candidate);

    expect(factor).toBe(0);
  });

  it('zero beyond maximumGap, and zero at/inside minimumGap', () => {
    const follower = createVehicleState(vec2(0, 0), 0);

    expect(draftFromCandidate(follower, candidateAtGap(maximumGap))).toBe(0);
    expect(draftFromCandidate(follower, candidateAtGap(maximumGap + 4))).toBe(0);
    expect(draftFromCandidate(follower, candidateAtGap(minimumGap))).toBe(0);
    expect(draftFromCandidate(follower, candidateAtGap(minimumGap - 1))).toBe(0);
    expect(draftFromCandidate(follower, candidateAtGap(0.5))).toBe(0);
  });

  it('rises to a single peak at peakGap and falls back to 0 across the gap', () => {
    const follower = createVehicleState(vec2(0, 0), 0);

    const step = 0.5;
    const samples: Array<{ gap: number; factor: number }> = [];
    for (let gap = 0; gap <= 20 + 1e-9; gap += step) {
      samples.push({ gap, factor: draftFromCandidate(follower, candidateAtGap(gap)) });
    }

    // Exactly one sample lands on peakGap (the grid was chosen so it does), and it
    // must be the unique maximum.
    const peakSample = samples.find(s => Math.abs(s.gap - peakGap) < 1e-9);
    expect(peakSample).toBeDefined();
    expect(peakSample!.factor).toBeCloseTo(1, 9);

    let seenPeak = false;
    for (let i = 1; i < samples.length; i++) {
      const previous = samples[i - 1]!;
      const current = samples[i]!;
      if (Math.abs(previous.gap - peakGap) < 1e-9) {
        seenPeak = true;
      }
      if (!seenPeak) {
        // Rising (or flat-zero) phase before the peak.
        expect(current.factor).toBeGreaterThanOrEqual(previous.factor - 1e-12);
      } else {
        // Falling (or flat-zero) phase after the peak.
        expect(current.factor).toBeLessThanOrEqual(previous.factor + 1e-12);
      }
    }

    // And it does fall all the way back to 0 by the end of the sampled range.
    expect(samples[samples.length - 1]!.factor).toBe(0);
  });

  it('fades out laterally, strictly decreasing to 0 at wakeHalfWidth, and is symmetric left/right', () => {
    const follower = createVehicleState(vec2(0, 0), 0);

    const offsets = [0, 0.5, 1, 1.6, 2.2, 2.8, wakeHalfWidth];
    const factors = offsets.map(offset => draftFromCandidate(follower, candidateAtGap(peakGap, 0, offset)));

    for (let i = 1; i < factors.length; i++) {
      expect(factors[i]!).toBeLessThan(factors[i - 1]!);
    }
    expect(factors[factors.length - 1]).toBe(0);

    // Symmetry: a leftward offset and the same-magnitude rightward offset draft equally.
    for (const offset of offsets) {
      const left = draftFromCandidate(follower, candidateAtGap(peakGap, 0, offset));
      const right = draftFromCandidate(follower, candidateAtGap(peakGap, 0, -offset));
      expect(left).toBeCloseTo(right, 12);
    }
  });

  it('an oncoming car gives nothing, even directly ahead at the peak gap', () => {
    const follower = createVehicleState(vec2(0, 0), 0);
    const candidate = candidateAtGap(peakGap, Math.PI);

    const factor = draftFromCandidate(follower, candidate);

    expect(factor).toBe(0);
  });

  it('a crossing car at 90 degrees gives nothing', () => {
    const follower = createVehicleState(vec2(0, 0), 0);
    const candidate = candidateAtGap(peakGap, Math.PI / 2);

    const factor = draftFromCandidate(follower, candidate);

    expect(factor).toBe(0);
  });

  it('heading works in a rotated frame, not just along +X', () => {
    const canonicalFollower = createVehicleState(vec2(0, 0), 0);
    const canonicalFactor = draftFromCandidate(canonicalFollower, candidateAtGap(peakGap));

    const rotatedHeading = Math.PI / 3;
    const rotatedFollower = createVehicleState(vec2(0, 0), rotatedHeading);
    const rotatedCandidate: DraftCandidate = {
      position: add(rotatedFollower.position, scale(fromAngle(rotatedHeading), peakGap)),
      heading: rotatedHeading,
    };

    const rotatedFactor = draftFromCandidate(rotatedFollower, rotatedCandidate);

    expect(rotatedFactor).toBeCloseTo(1, 6);
    expect(rotatedFactor).toBeCloseTo(canonicalFactor, 6);
  });

  it('slipstreamFactor takes the maximum of the field, not the sum', () => {
    const follower = createVehicleState(vec2(0, 0), 0);
    const nearer = candidateAtGap(4);
    const farther = candidateAtGap(10);

    const nearerAlone = draftFromCandidate(follower, nearer);
    const fartherAlone = draftFromCandidate(follower, farther);
    expect(nearerAlone).toBeGreaterThan(0);
    expect(fartherAlone).toBeGreaterThan(0);
    expect(nearerAlone).not.toBeCloseTo(fartherAlone, 3);

    const combined = slipstreamFactor(follower, [nearer, farther]);

    expect(combined).toBeCloseTo(Math.max(nearerAlone, fartherAlone), 12);
    expect(combined).toBeLessThan(nearerAlone + fartherAlone);
    expect(combined).toBeLessThanOrEqual(1);
  });

  it('an empty candidate list gives 0', () => {
    const follower = createVehicleState(vec2(0, 0), 0);

    expect(slipstreamFactor(follower, [])).toBe(0);
  });

  it('non-finite input gives 0, never NaN', () => {
    const follower = createVehicleState(vec2(0, 0), 0);

    const nanPositionCandidate: DraftCandidate = { position: vec2(NaN, 0), heading: 0 };
    expect(draftFromCandidate(follower, nanPositionCandidate)).toBe(0);

    const nanHeadingFollower: VehicleState = { ...follower, heading: NaN };
    expect(draftFromCandidate(nanHeadingFollower, candidateAtGap(peakGap))).toBe(0);

    const infinitePositionCandidate: DraftCandidate = { position: vec2(Infinity, 0), heading: 0 };
    expect(draftFromCandidate(follower, infinitePositionCandidate)).toBe(0);

    expect(slipstreamFactor(follower, [nanPositionCandidate])).toBe(0);
  });

  it('is pure: inputs are not mutated', () => {
    const follower: VehicleState = {
      position: vec2(1, 2),
      velocity: vec2(3, 4),
      heading: 0.7,
      yawSpin: 0.1,
    };
    const candidate: DraftCandidate = { position: vec2(1 + peakGap, 2), heading: 0.7 };

    const followerCopy = { ...follower, position: { ...follower.position }, velocity: { ...follower.velocity } };
    const candidateCopy = { ...candidate, position: { ...candidate.position } };

    draftFromCandidate(follower, candidate);
    slipstreamFactor(follower, [candidate]);

    expect(follower).toEqual(followerCopy);
    expect(candidate).toEqual(candidateCopy);
  });
});
