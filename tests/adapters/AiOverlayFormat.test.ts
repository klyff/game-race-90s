import { describe, expect, it } from 'vitest';
import { formatAiOverlay } from '../../src/adapters/render/AiOverlayFormat.ts';
import { profileFor } from '../../src/domain/ai/DriverRoster.ts';
import { TACTICAL_INTENTION } from '../../src/domain/ai/UtilityEvaluator.ts';
import { EXECUTION_STATE } from '../../src/domain/ai/RacingAgent.ts';
import { combineUtility } from '../../src/domain/ai/UtilityEvaluator.ts';

describe('formatAiOverlay', () => {
  it('prints profile, intention and inspectable RAM terms', () => {
    const lines = formatAiOverlay({
      profile: profileFor('NEGAO'),
      carId: 'car-5',
      intention: TACTICAL_INTENTION.RAM,
      attackMethod: TACTICAL_INTENTION.RAM,
      targetId: 'car-2',
      scores: [
        {
          intention: TACTICAL_INTENTION.RAM,
          terms: combineUtility(0.98, 0.91, 0.88, 0.74, 0.1, 0.13),
        },
        {
          intention: TACTICAL_INTENTION.RACE,
          terms: combineUtility(0.85, 0.7, 0.6, 0.6, 0, 0.02),
        },
      ],
      capabilities: {
        speedCapability: 0.4,
        accelerationCapability: 0.5,
        brakingCapability: 0.5,
        corneringCapability: 0.5,
        highSpeedSteeringCapability: 0.5,
        durabilityCapability: 0.8,
        rammingCapability: 0.88,
        weaponCapability: 0.4,
        blockingCapability: 0.7,
        overtakingCapability: 0.3,
        defensiveCapability: 0.7,
      },
      trajectory: {
        selected: {
          offset: 2.4,
          score: 1.1,
          terms: {
            progressValue: 0.8,
            speedValue: 0.7,
            tacticalValue: 0.9,
            collisionPenalty: 0.1,
            wallPenalty: 0.05,
            offRoadPenalty: 0,
            instabilityPenalty: 0.05,
          },
        },
        candidates: [],
      },
      memory: [
        {
          opponentId: 'car-2',
          aggressionReceived: 0.4,
          rammedBy: 1,
          weaponHitsReceived: 0,
          blockedBy: 0,
          nearMisses: 0,
          threat: 0.3,
          rivalry: 0.1,
          grudge: 0.67,
          lastInteractionTime: 12,
        },
      ],
      execution: EXECUTION_STATE.NORMAL,
      recoverReason: null,
    });
    expect(lines[0]).toContain('NEGAO');
    expect(lines.some(line => line.includes('RAM') && line.includes('<'))).toBe(true);
    expect(lines.some(line => line.includes('grudge'))).toBe(true);
    expect(lines.some(line => line.includes('p 0.98'))).toBe(true);
  });
});
