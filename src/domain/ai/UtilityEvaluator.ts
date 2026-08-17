/**
 * Utility AI. Personality is desire; capability is physical feasibility.
 *
 * U(action) = desire × opportunity × capability × tactical + memory − risk
 *
 * Never add raw mass / maxSpeed / grip into a score.
 */

import type { DriverProfile } from './DriverProfile.ts';
import type { VehicleCapabilities } from './VehicleCapabilityModel.ts';
import {
  evaluateOpportunities,
  raceTacticalValue,
  type RaceSituation,
  type SituationOpportunities,
} from './SituationEvaluator.ts';
import { memoryEffect, type OpponentMemoryEntry } from './OpponentMemory.ts';
import { clamp01, hashUnit } from './math.ts';

export const TACTICAL_INTENTION = {
  RACE: 'RACE',
  OVERTAKE: 'OVERTAKE',
  ATTACK: 'ATTACK',
  DEFEND: 'DEFEND',
  RAM: 'RAM',
  USE_WEAPON: 'USE_WEAPON',
  BLOCK: 'BLOCK',
  EVADE: 'EVADE',
  RECOVER: 'RECOVER',
} as const;

export type TacticalIntention = (typeof TACTICAL_INTENTION)[keyof typeof TACTICAL_INTENTION];

export const ATTACK_METHODS = [
  TACTICAL_INTENTION.RAM,
  TACTICAL_INTENTION.USE_WEAPON,
  TACTICAL_INTENTION.BLOCK,
] as const;

export interface UtilityTerms {
  readonly personality: number;
  readonly opportunity: number;
  readonly vehicleCapability: number;
  readonly tacticalValue: number;
  readonly memory: number;
  readonly riskPenalty: number;
  readonly final: number;
}

export interface ScoredIntention {
  readonly intention: TacticalIntention;
  readonly terms: UtilityTerms;
}

export interface UtilityResult {
  readonly scores: readonly ScoredIntention[];
  readonly selected: TacticalIntention;
  readonly attackMethod: TacticalIntention | null;
  readonly targetId: string | null;
}

export function combineUtility(
  personality: number,
  opportunity: number,
  vehicleCapability: number,
  tacticalValue: number,
  memory: number,
  riskPenalty: number,
): UtilityTerms {
  const final =
    clamp01(personality) * clamp01(opportunity) * clamp01(vehicleCapability) * clamp01(tacticalValue) +
    memory -
    riskPenalty;
  return {
    personality: clamp01(personality),
    opportunity: clamp01(opportunity),
    vehicleCapability: clamp01(vehicleCapability),
    tacticalValue: clamp01(tacticalValue),
    memory,
    riskPenalty,
    final,
  };
}

function score(
  intention: TacticalIntention,
  personality: number,
  opportunity: number,
  capability: number,
  tactical: number,
  memory: number,
  risk: number,
  noise: number,
): ScoredIntention {
  const terms = combineUtility(personality, opportunity, capability, tactical, memory, risk);
  return { intention, terms: { ...terms, final: terms.final + noise } };
}

export function evaluateUtilities(
  profile: DriverProfile,
  capabilities: VehicleCapabilities,
  situation: RaceSituation,
  memory: OpponentMemoryEntry | null,
  noiseSeed = '',
): UtilityResult {
  const opportunities = evaluateOpportunities(situation);
  const mem = memory === null ? 0 : memoryEffect(memory, profile.opponentMemory);
  const fightTactical = raceTacticalValue(situation, true);
  const raceTactical = raceTacticalValue(situation, false);
  const stretchCut = opportunities.finalStretch > 0.5 ? 0.55 : 1;
  const noise = (id: string): number =>
    noiseSeed.length === 0 ? 0 : (hashUnit(`${noiseSeed}:${id}`, 0x51ed) - 0.5) * 0.03;

  const scores: ScoredIntention[] = [
    score(
      TACTICAL_INTENTION.RACE,
      0.85,
      opportunities.race,
      capabilities.overtakingCapability,
      raceTactical,
      0,
      situation.offRoad ? 0.08 : 0.02,
      noise('RACE'),
    ),
    score(
      TACTICAL_INTENTION.OVERTAKE,
      profile.overtake,
      opportunities.overtake,
      capabilities.overtakingCapability,
      fightTactical,
      mem * 0.15,
      0.08,
      noise('OVERTAKE'),
    ),
    score(
      TACTICAL_INTENTION.DEFEND,
      profile.defend,
      opportunities.defend,
      capabilities.defensiveCapability,
      raceTactical,
      mem * 0.2,
      0.05,
      noise('DEFEND'),
    ),
    score(
      TACTICAL_INTENTION.RAM,
      profile.ram,
      opportunities.ram,
      capabilities.rammingCapability,
      fightTactical * stretchCut,
      mem * 0.55,
      riskForRam(capabilities, situation),
      noise('RAM'),
    ),
    score(
      TACTICAL_INTENTION.USE_WEAPON,
      profile.weapon,
      opportunities.weapon,
      capabilities.weaponCapability,
      fightTactical * stretchCut,
      mem * 0.45,
      situation.missiles <= 0 ? 0.4 : 0.06,
      noise('USE_WEAPON'),
    ),
    score(
      TACTICAL_INTENTION.BLOCK,
      profile.block,
      opportunities.block,
      capabilities.blockingCapability,
      raceTactical,
      mem * 0.25,
      0.07,
      noise('BLOCK'),
    ),
    score(
      TACTICAL_INTENTION.EVADE,
      0.7,
      opportunities.evade,
      capabilities.defensiveCapability,
      0.7,
      0,
      0.02,
      noise('EVADE'),
    ),
    score(
      TACTICAL_INTENTION.RECOVER,
      0.9,
      opportunities.recover,
      0.8,
      0.85,
      0,
      0,
      noise('RECOVER'),
    ),
  ];

  const attack = pickAttackMethod(scores, profile, opportunities);
  scores.push(attack.category);

  const selected = pickWinner(scores);
  const targetId = targetFor(selected.intention, situation, memory);

  return {
    scores,
    selected: selected.intention,
    attackMethod: selected.intention === TACTICAL_INTENTION.ATTACK ? attack.method : null,
    targetId,
  };
}

function riskForRam(capabilities: VehicleCapabilities, situation: RaceSituation): number {
  const mismatch = 1 - capabilities.rammingCapability;
  const fragile = 1 - situation.integrity;
  return clamp01(0.08 + mismatch * 0.45 + fragile * 0.2);
}

function pickAttackMethod(
  scores: readonly ScoredIntention[],
  profile: DriverProfile,
  opportunities: SituationOpportunities,
): { category: ScoredIntention; method: TacticalIntention } {
  const methods = ATTACK_METHODS.map(intention => {
    const found = scores.find(score => score.intention === intention);
    return found ?? score(intention, 0, 0, 0, 0, 0, 1, 0);
  });
  let best = methods[0] ?? score(TACTICAL_INTENTION.USE_WEAPON, 0, 0, 0, 0, 0, 1, 0);
  for (const method of methods) {
    if (method.terms.final > best.terms.final) {
      best = method;
    }
  }
  const category = score(
    TACTICAL_INTENTION.ATTACK,
    profile.attack,
    opportunities.attack,
    0.7,
    0.65,
    0,
    0.05,
    0,
  );
  return { category, method: best.intention };
}

function pickWinner(scores: readonly ScoredIntention[]): ScoredIntention {
  let best = scores[0];
  if (best === undefined) {
    return score(TACTICAL_INTENTION.RACE, 1, 1, 1, 1, 0, 0, 0);
  }
  for (const entry of scores) {
    if (entry.terms.final > best.terms.final) {
      best = entry;
    }
  }
  return best;
}

function targetFor(
  intention: TacticalIntention,
  situation: RaceSituation,
  memory: OpponentMemoryEntry | null,
): string | null {
  if (
    intention === TACTICAL_INTENTION.RAM ||
    intention === TACTICAL_INTENTION.OVERTAKE ||
    intention === TACTICAL_INTENTION.USE_WEAPON ||
    intention === TACTICAL_INTENTION.ATTACK
  ) {
    return situation.ahead?.carId ?? memory?.opponentId ?? null;
  }
  if (intention === TACTICAL_INTENTION.BLOCK || intention === TACTICAL_INTENTION.DEFEND) {
    return situation.behind?.carId ?? null;
  }
  return memory !== null && memory.grudge > 0.45 ? memory.opponentId : null;
}

export function strongestGrudge(
  entries: readonly OpponentMemoryEntry[],
  opponentMemory: number,
): OpponentMemoryEntry | null {
  let best: OpponentMemoryEntry | null = null;
  let bestEffect = 0;
  for (const entry of entries) {
    const effect = memoryEffect(entry, opponentMemory);
    if (effect > bestEffect) {
      best = entry;
      bestEffect = effect;
    }
  }
  return best;
}
