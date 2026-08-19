import { describe, expect, it } from 'vitest';
import { profileFor } from '../../../src/domain/ai/DriverRoster.ts';
import { CANDIDATE_KIND, type PathCandidate } from '../../../src/domain/ai/CandidateGenerator.ts';
import { FEASIBILITY, type RolloutResult } from '../../../src/domain/ai/PredictiveRollout.ts';
import { scoreFuture } from '../../../src/domain/ai/OutcomeEvaluator.ts';
import type { DriverProfile } from '../../../src/domain/ai/DriverProfile.ts';

function rollout(progress: number, sep: number): RolloutResult {
  return {
    feasible: FEASIBILITY.FEASIBLE,
    rejectReason: null,
    progress,
    exitSpeed: 55,
    offTrack: 0,
    wall: 0.2,
    minRivalSep: sep,
    targetSep: sep,
    samples: [],
  };
}

function context(profile: DriverProfile) {
  return {
    profile,
    rammingCapability: 0.7,
    weaponCapability: 0.8,
    canAim: true,
    missiles: 3,
    memory: 0,
    switchPenalty: 0,
    aheadGap: 9,
    behindGap: 12,
  };
}

describe('outcome personality bias', () => {
  it('ranks the same futures differently across reference profiles', () => {
    const keep: PathCandidate = { id: 'KEEP', kind: CANDIDATE_KIND.KEEP, targetLateral: 0, speedScale: 1 };
    const pass: PathCandidate = {
      id: 'PASS_LEFT',
      kind: CANDIDATE_KIND.PASS_LEFT,
      targetLateral: 4,
      speedScale: 1,
    };
    const defend: PathCandidate = {
      id: 'DEFEND',
      kind: CANDIDATE_KIND.DEFEND,
      targetLateral: 1,
      speedScale: 0.9,
    };
    const names = ['KLYFF', 'BERSERKER', 'GUARDIAN', 'GUNSLINGER'] as const;
    const table: Record<string, Record<string, number>> = {};
    for (const name of names) {
      const profile = profileFor(name);
      const ctx = context(profile);
      table[name] = {
        KEEP: scoreFuture(keep, rollout(18, 4), ctx, 24)?.score ?? -99,
        PASS_LEFT: scoreFuture(pass, rollout(19, 2.5), ctx, 24)?.score ?? -99,
        DEFEND: scoreFuture(defend, rollout(17.5, 3), ctx, 24)?.score ?? -99,
      };
    }
    const klyff = table.KLYFF;
    const berserker = table.BERSERKER;
    const guardian = table.GUARDIAN;
    expect(klyff).toBeDefined();
    expect(berserker).toBeDefined();
    expect(guardian).toBeDefined();
    if (klyff === undefined || berserker === undefined || guardian === undefined) {
      return;
    }
    expect((guardian.DEFEND ?? 0) - (guardian.PASS_LEFT ?? 0)).toBeGreaterThan(
      (klyff.DEFEND ?? 0) - (klyff.PASS_LEFT ?? 0),
    );
    expect(berserker.PASS_LEFT).not.toBe(klyff.PASS_LEFT);
  });

  it('rejects impossible rollouts before personality', () => {
    const keep: PathCandidate = { id: 'KEEP', kind: CANDIDATE_KIND.KEEP, targetLateral: 0, speedScale: 1 };
    const dead: RolloutResult = {
      feasible: FEASIBILITY.IMPOSSIBLE,
      rejectReason: 'TRACK_BOUNDARY',
      progress: 30,
      exitSpeed: 70,
      offTrack: 1,
      wall: 1,
      minRivalSep: 10,
      targetSep: 10,
      samples: [],
    };
    expect(scoreFuture(keep, dead, context(profileFor('BERSERKER')), 24)).toBeNull();
  });
});
