/**
 * Race-context snapshot for utility. Nearby opponents only; no all-vs-all sim.
 */

import { clamp01 } from './math.ts';

export interface NearbyRival {
  readonly carId: string;
  readonly gapAhead: number;
  readonly gapBehind: number;
  readonly lateralDelta: number;
  readonly closingSpeed: number;
}

export interface RaceSituation {
  readonly position: number;
  readonly fieldSize: number;
  readonly lapsCompleted: number;
  readonly lapsTotal: number;
  readonly progressToFinish: number;
  readonly integrity: number;
  readonly missiles: number;
  readonly oil: number;
  readonly mines: number;
  readonly canAim: boolean;
  readonly spinning: boolean;
  readonly offRoad: boolean;
  readonly finished: boolean;
  readonly ahead: NearbyRival | null;
  readonly behind: NearbyRival | null;
}

export interface SituationOpportunities {
  readonly race: number;
  readonly overtake: number;
  readonly attack: number;
  readonly defend: number;
  readonly ram: number;
  readonly weapon: number;
  readonly block: number;
  readonly evade: number;
  readonly recover: number;
  readonly finalStretch: number;
}

export function evaluateOpportunities(situation: RaceSituation): SituationOpportunities {
  const ahead = situation.ahead;
  const behind = situation.behind;
  const closeAhead = ahead !== null && ahead.gapAhead > 0 && ahead.gapAhead < 22;
  const closeBehind = behind !== null && behind.gapBehind > 0 && behind.gapBehind < 18;
  const alignedAhead = ahead !== null && Math.abs(ahead.lateralDelta) < 4;
  const alignedBehind = behind !== null && Math.abs(behind.lateralDelta) < 4;
  const closing = ahead !== null && ahead.closingSpeed > 2;
  const remaining = Math.max(0, situation.lapsTotal - situation.lapsCompleted);
  const finalStretch = remaining <= 1 && situation.position <= 2 ? 1 : remaining <= 1 ? 0.55 : 0;
  const packPressure = (closeAhead ? 0.45 : 0) + (closeBehind ? 0.45 : 0);

  return {
    race: clamp01(0.72 + (closeAhead ? -0.08 : 0.12) + situation.progressToFinish * 0.1),
    overtake: closeAhead ? clamp01(0.35 + (closing ? 0.35 : 0.1) + (alignedAhead ? 0.1 : 0.25)) : 0.12,
    attack: closeAhead || closeBehind ? clamp01(0.4 + packPressure) : 0.15,
    defend: closeBehind ? clamp01(0.45 + (alignedBehind ? 0.25 : 0.1)) : 0.18,
    ram: closeAhead && alignedAhead ? clamp01(0.4 + (closing ? 0.4 : 0.15)) : 0.08,
    weapon: situation.canAim && situation.missiles > 0 ? 0.85 : situation.missiles > 0 && closeAhead ? 0.35 : 0.05,
    block: closeBehind && alignedBehind ? 0.8 : closeBehind ? 0.45 : 0.1,
    evade: situation.spinning ? 0.95 : packPressure > 0.7 ? 0.55 : 0.12,
    recover: situation.spinning || situation.offRoad || situation.integrity < 0.35 ? 0.9 : 0.08,
    finalStretch,
  };
}

export function raceTacticalValue(situation: RaceSituation, fight: boolean): number {
  const remaining = Math.max(0, situation.lapsTotal - situation.lapsCompleted);
  const leading = situation.position === 1 ? 1 : situation.position === 2 ? 0.7 : 0.4;
  if (remaining <= 1 && situation.position <= 2) {
    return fight ? 0.28 * leading : clamp01(0.75 + leading * 0.2);
  }
  return fight ? clamp01(0.55 + (situation.position > 3 ? 0.2 : 0)) : clamp01(0.6 + leading * 0.15);
}
