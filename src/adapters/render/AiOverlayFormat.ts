/**
 * Pure formatter for the NPC AI debug block. No Phaser.
 */

import type { AgentDebugSnapshot } from '../../domain/ai/RacingAgent.ts';
import { TACTICAL_INTENTION } from '../../domain/ai/UtilityEvaluator.ts';

function safe(value: number, places = 2): string {
  if (!Number.isFinite(value)) {
    return '?';
  }
  return value.toFixed(places);
}

export function formatAiOverlay(snapshot: AgentDebugSnapshot): readonly string[] {
  const scores = snapshot.scores;
  const selected = snapshot.intention;
  const lines: string[] = [
    `NPC: ${snapshot.carId.toUpperCase()}  PROFILE: ${snapshot.profile.displayName}  (${snapshot.profile.tier})`,
    `INTENT ${selected}${snapshot.attackMethod !== null ? ` / ${snapshot.attackMethod}` : ''}  TARGET: ${snapshot.targetId ?? '-'}  ${snapshot.execution}`,
  ];

  const order = [
    TACTICAL_INTENTION.RACE,
    TACTICAL_INTENTION.OVERTAKE,
    TACTICAL_INTENTION.ATTACK,
    TACTICAL_INTENTION.DEFEND,
    TACTICAL_INTENTION.RAM,
    TACTICAL_INTENTION.USE_WEAPON,
    TACTICAL_INTENTION.BLOCK,
    TACTICAL_INTENTION.EVADE,
    TACTICAL_INTENTION.RECOVER,
  ];
  for (const intention of order) {
    const scored = scores.find(entry => entry.intention === intention);
    if (scored === undefined) {
      continue;
    }
    const mark = scored.intention === selected ? ' <' : '';
    lines.push(`${intention.padEnd(10)} ${safe(scored.terms.final)}${mark}`);
  }

  const cap = snapshot.capabilities;
  lines.push(
    `CAP ovt ${safe(cap.overtakingCapability)} ram ${safe(cap.rammingCapability)} wpn ${safe(cap.weaponCapability)} blk ${safe(cap.blockingCapability)}`,
  );
  lines.push(
    `SKILL phys ${safe(snapshot.profile.vehiclePhysics)} steer ${safe(snapshot.profile.localSteering)} pred ${safe(snapshot.profile.opponentPrediction)} mem ${safe(snapshot.profile.opponentMemory)}`,
  );

  const winner = scores.find(entry => entry.intention === selected);
  if (winner !== undefined) {
    const t = winner.terms;
    lines.push(
      `${selected}: p ${safe(t.personality)} opp ${safe(t.opportunity)} cap ${safe(t.vehicleCapability)} tac ${safe(t.tacticalValue)} mem ${safe(t.memory)} risk -${safe(t.riskPenalty)}`,
    );
  }

  const traj = snapshot.trajectory;
  if (traj !== undefined && traj !== null) {
    lines.push(
      `TRAJ off ${safe(traj.selected.offset, 1)} score ${safe(traj.selected.score)}  (${traj.candidates.length} candidates)`,
    );
  }

  for (const entry of snapshot.memory) {
    if (entry.grudge < 0.05 && entry.threat < 0.05 && entry.rivalry < 0.05) {
      continue;
    }
    lines.push(
      `MEM ${entry.opponentId} grudge ${safe(entry.grudge)} threat ${safe(entry.threat)} riv ${safe(entry.rivalry)}`,
    );
  }

  return lines;
}
