import { describe, expect, it } from 'vitest';
import { findTrack } from '../../../src/data/tracks/registry.ts';
import { TrackSpline } from '../../../src/domain/track/TrackSpline.ts';
import { AIDriver, LAST_LAP_BACKMARKER_SPEED } from '../../../src/domain/vehicle/AIDriver.ts';
import { createVehicleState } from '../../../src/domain/vehicle/Vehicle.ts';
import { scale, angleOf } from '../../../src/domain/math/Vec2.ts';
import { profileFor } from '../../../src/domain/ai/DriverRoster.ts';
import { CANDIDATE_KIND } from '../../../src/domain/ai/CandidateGenerator.ts';
import { FEASIBILITY, type RolloutResult } from '../../../src/domain/ai/PredictiveRollout.ts';
import { raceCore, scoreFuture } from '../../../src/domain/ai/OutcomeEvaluator.ts';

const track = findTrack('thunder-basin');
const spline = new TrackSpline(track.controlPoints);
const stats = {
  mass: 1000,
  enginePower: 34,
  brakeForce: 46,
  maxSpeed: 78,
  grip: 30,
  steerRate: 2.5,
  steerSpeedFalloff: 0.45,
  armor: 0.4,
  ammoCapacity: 10,
  collisionRadius: 1.7,
  aimRadius: 3.5,
};

function rollingState(speed: number) {
  const pos = spline.positionAt(40);
  const projection = spline.project(pos);
  const heading = angleOf(projection.tangent);
  const state = {
    ...createVehicleState(projection.position, heading),
    velocity: scale(projection.tangent, speed),
  };
  return { state, projection };
}

describe('last-lap pack split', () => {
  it('P1 floors it on the last lap instead of braking to protect the lead', () => {
    const driver = new AIDriver();
    const { state, projection } = rollingState(48);
    const command = driver.command(state, projection, stats, spline, undefined, [], 0, undefined, track, true, 1);
    expect(command.throttle).toBe(1);
    expect(command.brake).toBe(0);
  });

  it(`P4 crawls toward ${LAST_LAP_BACKMARKER_SPEED} u/s on the last lap`, () => {
    const driver = new AIDriver();
    const { state, projection } = rollingState(50);
    const command = driver.command(state, projection, stats, spline, undefined, [], 0, undefined, track, true, 4);
    expect(command.throttle).toBe(0);
    expect(command.brake).toBeGreaterThan(0);
    expect(command.boost).toBe(false);
  });

  it('last-lap podium raceCore fears contact less than a normal lap', () => {
    const outcome = {
      progressGain: 0.6,
      positionGain: 0.5,
      exitSpeed: 0.6,
      passProbability: 0.5,
      attackEffect: 0.4,
      defensiveEffect: 0.1,
      weaponOpportunity: 0.2,
      ramAdvantage: 0.2,
      offTrackRisk: 0,
      wallRisk: 0.1,
      accidentalCollision: 0.5,
      selfLoss: 0.3,
      predictionUncertainty: 0.12,
    };
    expect(raceCore(outcome, 0.6, true)).toBeGreaterThan(raceCore(outcome, 0.6, false));
  });

  it('last-lap podium futures keep a close pass instead of rejecting it', () => {
    const pass = {
      id: 'PASS_LEFT',
      kind: CANDIDATE_KIND.PASS_LEFT,
      targetLateral: 4,
      speedScale: 1,
    };
    const tight: RolloutResult = {
      feasible: FEASIBILITY.FEASIBLE,
      rejectReason: null,
      progress: 18,
      exitSpeed: 58,
      offTrack: 0,
      wall: 0.15,
      minRivalSep: -1.2,
      targetSep: 0.4,
      samples: [],
    };
    const ctx = {
      profile: profileFor('ALINE'),
      rammingCapability: 0.5,
      weaponCapability: 0.5,
      canAim: false,
      missiles: 0,
      memory: 0,
      switchPenalty: 0,
      aheadGap: 8,
      behindGap: 14,
    };
    const normal = scoreFuture(pass, tight, ctx, 24)?.score ?? -99;
    const heat = scoreFuture(pass, tight, { ...ctx, lastLap: true, podium: true }, 24)?.score ?? -99;
    expect(heat).toBeGreaterThan(normal);
  });
});
