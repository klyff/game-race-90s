/**
 * Score predicted OUTCOMES, then apply personality as a bounded bias.
 * RaceCore cannot be removed. Impossible futures are rejected, not penalised.
 */

import type { DriverProfile } from './DriverProfile.ts';
import { clamp01 } from './math.ts';
import { decisionTraits, personalityBias } from './PersonalityTraits.ts';
import type { PathCandidate } from './CandidateGenerator.ts';
import { CANDIDATE_KIND } from './CandidateGenerator.ts';
import { FEASIBILITY, type RolloutResult } from './PredictiveRollout.ts';
import { TACTICAL_INTENTION, type TacticalIntention } from './UtilityEvaluator.ts';

export interface OutcomeVector {
  readonly progressGain: number;
  readonly positionGain: number;
  readonly exitSpeed: number;
  readonly passProbability: number;
  readonly attackEffect: number;
  readonly defensiveEffect: number;
  readonly weaponOpportunity: number;
  readonly ramAdvantage: number;
  readonly offTrackRisk: number;
  readonly wallRisk: number;
  readonly accidentalCollision: number;
  readonly selfLoss: number;
  readonly predictionUncertainty: number;
}

export interface ScoredFuture {
  readonly candidate: PathCandidate;
  readonly rollout: RolloutResult;
  readonly outcome: OutcomeVector;
  readonly raceCore: number;
  readonly tactical: number;
  readonly score: number;
  readonly intention: TacticalIntention;
}

export interface ScoreContext {
  readonly profile: DriverProfile;
  readonly rammingCapability: number;
  readonly weaponCapability: number;
  readonly canAim: boolean;
  readonly missiles: number;
  readonly memory: number;
  readonly switchPenalty: number;
  readonly aheadGap: number | null;
  readonly behindGap: number | null;
}

export function outcomeFromRollout(
  candidate: PathCandidate,
  rollout: RolloutResult,
  context: ScoreContext,
  horizonProgressCap: number,
): OutcomeVector {
  const progressGain = clamp01(rollout.progress / Math.max(4, horizonProgressCap));
  const exitSpeed = clamp01(rollout.exitSpeed / 90);
  const accidental = rollout.minRivalSep < 0 ? clamp01(-rollout.minRivalSep / 6) : 0;
  const onTarget = rollout.targetSep < 0.8;
  const pass =
    (candidate.kind === CANDIDATE_KIND.PASS_LEFT ||
      candidate.kind === CANDIDATE_KIND.PASS_RIGHT ||
      candidate.kind === CANDIDATE_KIND.GAP) &&
    (context.aheadGap ?? 40) < 22
      ? clamp01(0.35 + progressGain * 0.5 - accidental * 0.4)
      : clamp01(progressGain * 0.2);
  const ram =
    onTarget && (candidate.kind === CANDIDATE_KIND.KEEP || candidate.kind === CANDIDATE_KIND.LINE)
      ? clamp01(context.rammingCapability * 0.7 - accidental * 0.2)
      : onTarget
        ? clamp01(0.25 * context.rammingCapability)
        : -clamp01(accidental);
  const defend =
    candidate.kind === CANDIDATE_KIND.DEFEND && (context.behindGap ?? 40) < 18
      ? clamp01(0.55 + (1 - progressGain) * 0.2)
      : 0.12;
  const weapon =
    context.canAim && context.missiles > 0
      ? clamp01(context.weaponCapability * 0.5 + (candidate.kind === CANDIDATE_KIND.KEEP ? 0.15 : 0))
      : 0.04;

  return {
    progressGain,
    positionGain: pass,
    exitSpeed,
    passProbability: pass,
    attackEffect: clamp01(Math.max(0, ram) * 0.6 + weapon * 0.4),
    defensiveEffect: defend,
    weaponOpportunity: weapon,
    ramAdvantage: ram * 2 - 1,
    offTrackRisk: rollout.offTrack,
    wallRisk: rollout.wall,
    accidentalCollision: accidental,
    selfLoss: clamp01(accidental * (1.05 - context.rammingCapability) + rollout.offTrack * 0.4),
    predictionUncertainty: clamp01(0.12 + (1 - context.profile.opponentPrediction) * 0.2),
  };
}

export function raceCore(outcome: OutcomeVector, raceFocus: number): number {
  return (
    outcome.progressGain * (1.15 + raceFocus * 0.25) +
    outcome.positionGain * 0.35 +
    outcome.exitSpeed * 0.45 -
    outcome.offTrackRisk * 1.1 -
    outcome.wallRisk * 0.55 -
    outcome.accidentalCollision * 0.9 -
    outcome.selfLoss * 0.7
  );
}

export function tacticalBias(outcome: OutcomeVector, profile: DriverProfile): number {
  return (
    personalityBias(profile.overtake) * outcome.passProbability +
    personalityBias(profile.attack) * outcome.attackEffect +
    personalityBias(profile.defend) * outcome.defensiveEffect +
    personalityBias(profile.ram) * Math.max(0, outcome.ramAdvantage) -
    personalityBias(1 - profile.ram) * Math.max(0, -outcome.ramAdvantage) * 0.25 +
    personalityBias(profile.weapon) * outcome.weaponOpportunity +
    personalityBias(profile.block) * outcome.defensiveEffect * 0.65
  );
}

export function scoreFuture(
  candidate: PathCandidate,
  rollout: RolloutResult,
  context: ScoreContext,
  horizonProgressCap: number,
): ScoredFuture | null {
  if (rollout.feasible === FEASIBILITY.IMPOSSIBLE) {
    return null;
  }
  const outcome = outcomeFromRollout(candidate, rollout, context, horizonProgressCap);
  const traits = decisionTraits(context.profile);
  const core = raceCore(outcome, traits.raceFocus);
  const tactical = tacticalBias(outcome, context.profile);
  const downside = outcome.offTrackRisk + outcome.wallRisk + outcome.accidentalCollision + outcome.selfLoss;
  const riskPenalty = (1.45 - traits.riskTolerance) * downside;
  if (rollout.feasible === FEASIBILITY.MARGINAL && traits.riskTolerance < 0.72 && downside > 0.85) {
    return null;
  }
  const score =
    core +
    tactical * 0.55 +
    context.memory * 0.2 -
    riskPenalty -
    outcome.predictionUncertainty -
    context.switchPenalty;
  return {
    candidate,
    rollout,
    outcome,
    raceCore: core,
    tactical,
    score,
    intention: labelIntention(candidate, outcome, context),
  };
}

export function labelIntention(
  candidate: PathCandidate,
  outcome: OutcomeVector,
  context: ScoreContext,
): TacticalIntention {
  if (outcome.ramAdvantage > 0.35 && context.profile.ram > 0.55) {
    return TACTICAL_INTENTION.RAM;
  }
  if (outcome.weaponOpportunity > 0.45 && context.canAim) {
    return TACTICAL_INTENTION.USE_WEAPON;
  }
  if (outcome.passProbability > 0.45) {
    return TACTICAL_INTENTION.OVERTAKE;
  }
  if (outcome.defensiveEffect > 0.45 && candidate.kind === CANDIDATE_KIND.DEFEND) {
    return context.profile.block > context.profile.defend
      ? TACTICAL_INTENTION.BLOCK
      : TACTICAL_INTENTION.DEFEND;
  }
  return TACTICAL_INTENTION.RACE;
}
