/**
 * Facade: utility decides WHAT, trajectory decides WHERE, pursuit (AIDriver) decides HOW.
 * Physics is untouched. Intention updates are staggered and hysteretic.
 */

import type { TrackDefinition } from '../track/TrackDefinition.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';
import type { RacingLine } from '../race/RacingLine.ts';
import type { CarPerkProfile } from '../vehicle/CarPerk.ts';
import type { VehicleStats } from '../vehicle/VehicleStats.ts';
import type { VehicleState } from '../vehicle/Vehicle.ts';
import type { DriverProfile } from './DriverProfile.ts';
import { profileFor } from './DriverRoster.ts';
import {
  OpponentMemoryBook,
  type OpponentMemoryEntry,
} from './OpponentMemory.ts';
import {
  evaluateUtilities,
  strongestGrudge,
  TACTICAL_INTENTION,
  type ScoredIntention,
  type TacticalIntention,
  type UtilityResult,
} from './UtilityEvaluator.ts';
import { type NearbyRival, type RaceSituation } from './SituationEvaluator.ts';
import {
  planningCapabilities,
  type StatNormalizer,
  type VehicleCapabilities,
} from './VehicleCapabilityModel.ts';
import { interceptPoint, relativeSpeedAlong } from './Intercept.ts';
import {
  baselineOffset,
  planTrajectory,
  type NearbyLateral,
  type TrajectoryPlan,
} from './TrajectoryPlanner.ts';
import { applySkillToDriveOptions } from './skillLimits.ts';
import type { PaceDriverOptions } from '../vehicle/PaceDriver.ts';
import { length } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';

export const EXECUTION_STATE = {
  NORMAL: 'NORMAL',
  SPINNING: 'SPINNING',
  RECOVERING: 'RECOVERING',
  FINISHED: 'FINISHED',
} as const;

export type ExecutionState = (typeof EXECUTION_STATE)[keyof typeof EXECUTION_STATE];

const UTILITY_PERIOD = 6;
const TRAJECTORY_PERIOD = 3;
const HYSTERESIS = 0.08;
const MIN_COMMIT_STEPS = 18;

export interface AgentRival {
  readonly carId: string;
  readonly distance: number;
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly heading: number;
  readonly lateralOffset: number;
}

export interface AgentTickInput {
  readonly stepIndex: number;
  readonly stepSeconds: number;
  readonly elapsedSeconds: number;
  readonly state: VehicleState;
  readonly distance: number;
  readonly lateralOffset: number;
  readonly stats: VehicleStats;
  readonly perk: CarPerkProfile;
  readonly homePlanetId: string | undefined;
  readonly worldAdvantage: number | undefined;
  readonly planetId: string | undefined;
  readonly integrity: number;
  readonly missiles: number;
  readonly oil: number;
  readonly mines: number;
  readonly canAim: boolean;
  readonly position: number;
  readonly fieldSize: number;
  readonly lapsCompleted: number;
  readonly lapsTotal: number;
  readonly progressToFinish: number;
  readonly finished: boolean;
  readonly track: TrackDefinition;
  readonly spline: TrackSpline;
  readonly line: RacingLine | undefined;
  readonly laneBias: number;
  readonly rivals: readonly AgentRival[];
  readonly trackLength: number;
  readonly halfWidth: number;
}

export interface AgentDecision {
  readonly intention: TacticalIntention;
  readonly attackMethod: TacticalIntention | null;
  readonly targetId: string | null;
  readonly lateralOffset: number;
  readonly wantFire: boolean;
  readonly wantOil: boolean;
  readonly wantMine: boolean;
  readonly execution: ExecutionState;
  readonly driveOptions: PaceDriverOptions;
}

export interface AgentDebugSnapshot {
  readonly profile: DriverProfile;
  readonly carId: string;
  readonly intention: TacticalIntention;
  readonly attackMethod: TacticalIntention | null;
  readonly targetId: string | null;
  readonly scores: readonly ScoredIntention[];
  readonly capabilities: VehicleCapabilities;
  readonly trajectory: TrajectoryPlan | null;
  readonly memory: readonly OpponentMemoryEntry[];
  readonly execution: ExecutionState;
}

export class RacingAgent {
  readonly profile: DriverProfile;
  readonly carId: string;
  readonly memory = new OpponentMemoryBook();
  readonly stagger: number;

  private intention: TacticalIntention = TACTICAL_INTENTION.RACE;
  private attackMethod: TacticalIntention | null = null;
  private targetId: string | null = null;
  private lastUtility: UtilityResult | null = null;
  private lastCapabilities: VehicleCapabilities | null = null;
  private lastTrajectory: TrajectoryPlan | null = null;
  private lateralOffset = 0;
  private commitLeft = 0;
  private lastUtilityFinal = 0;
  private execution: ExecutionState = EXECUTION_STATE.NORMAL;

  constructor(name: string, carId: string, stagger: number) {
    this.profile = profileFor(name);
    this.carId = carId;
    this.stagger = stagger;
  }

  skillOptions(base: PaceDriverOptions): PaceDriverOptions {
    return applySkillToDriveOptions(base, this.profile.vehiclePhysics, this.profile.localSteering);
  }

  decide(input: AgentTickInput, normalizer: StatNormalizer, baseOptions: PaceDriverOptions): AgentDecision {
    this.memory.tick(input.stepSeconds);
    this.execution = executionOf(input);

    const dueUtility = (input.stepIndex + this.stagger) % UTILITY_PERIOD === 0 || this.lastUtility === null;
    const dueTrajectory =
      (input.stepIndex + this.stagger) % TRAJECTORY_PERIOD === 0 || this.lastTrajectory === null;

    if (dueUtility && this.execution !== EXECUTION_STATE.FINISHED) {
      this.refreshUtility(input, normalizer);
    }
    if (dueTrajectory && this.execution !== EXECUTION_STATE.FINISHED) {
      this.refreshTrajectory(input);
    }

    const intention = this.effectiveIntention();
    const wantFire = intention === TACTICAL_INTENTION.USE_WEAPON && input.canAim && input.missiles > 0;
    const behind = closestBehind(input);
    const wantMine =
      (intention === TACTICAL_INTENTION.DEFEND || intention === TACTICAL_INTENTION.BLOCK) &&
      input.mines > 0 &&
      behind !== null &&
      behind.gapBehind < 10;
    const wantOil =
      (intention === TACTICAL_INTENTION.DEFEND || intention === TACTICAL_INTENTION.BLOCK) &&
      input.oil > 0 &&
      behind !== null &&
      behind.gapBehind < 16 &&
      !wantMine;

    return {
      intention,
      attackMethod: this.attackMethod,
      targetId: this.targetId,
      lateralOffset: this.lateralOffset,
      wantFire,
      wantOil,
      wantMine,
      execution: this.execution,
      driveOptions: this.skillOptions(baseOptions),
    };
  }

  debugSnapshot(): AgentDebugSnapshot {
    return {
      profile: this.profile,
      carId: this.carId,
      intention: this.intention,
      attackMethod: this.attackMethod,
      targetId: this.targetId,
      scores: this.lastUtility?.scores ?? [],
      capabilities: this.lastCapabilities ?? emptyCapabilities(),
      trajectory: this.lastTrajectory,
      memory: this.memory.all(),
      execution: this.execution,
    };
  }

  private refreshUtility(input: AgentTickInput, normalizer: StatNormalizer): void {
    const capabilities = planningCapabilities(
      input.stats,
      input.perk,
      input.homePlanetId,
      input.worldAdvantage,
      input.planetId,
      normalizer,
    );
    this.lastCapabilities = capabilities;
    const situation = situationFrom(input);
    const memory = strongestGrudge(this.memory.all(), this.profile.opponentMemory);
    const result = evaluateUtilities(
      this.profile,
      capabilities,
      situation,
      memory,
      `${this.profile.id}:${this.carId}:${Math.floor(input.elapsedSeconds * 2)}`,
    );
    this.lastUtility = result;

    const emergency =
      result.selected === TACTICAL_INTENTION.RECOVER || result.selected === TACTICAL_INTENTION.EVADE;
    const winner = result.scores.find(score => score.intention === result.selected);
    const nextFinal = winner?.terms.final ?? 0;
    const canSwitch =
      emergency ||
      this.commitLeft <= 0 &&
        (nextFinal > this.lastUtilityFinal + HYSTERESIS || result.selected === this.intention);

    if (canSwitch) {
      this.intention = result.selected === TACTICAL_INTENTION.ATTACK
        ? result.attackMethod ?? TACTICAL_INTENTION.USE_WEAPON
        : result.selected;
      this.attackMethod = result.attackMethod;
      this.targetId = result.targetId;
      this.lastUtilityFinal = nextFinal;
      this.commitLeft = MIN_COMMIT_STEPS;
    } else {
      this.commitLeft = Math.max(0, this.commitLeft - UTILITY_PERIOD);
    }
  }

  private refreshTrajectory(input: AgentTickInput): void {
    const base = baselineOffset(input.line, input.distance, input.spline, input.laneBias);
    const interceptLateral = this.interceptLateral(input);
    const nearby: NearbyLateral[] = input.rivals.map(rival => ({
      carId: rival.carId,
      lateralOffset: rival.lateralOffset,
      gap: wrappedGap(input.distance, rival.distance, input.trackLength),
      isTarget: rival.carId === this.targetId,
    }));
    const plan = planTrajectory(
      base,
      input.lateralOffset,
      input.track,
      input.stats.collisionRadius,
      this.effectiveIntention(),
      nearby,
      interceptLateral,
    );
    this.lastTrajectory = plan;
    this.lateralOffset = plan.selected.offset;
  }

  private interceptLateral(input: AgentTickInput): number | null {
    const intention = this.effectiveIntention();
    const chase =
      intention === TACTICAL_INTENTION.RAM ||
      intention === TACTICAL_INTENTION.BLOCK ||
      intention === TACTICAL_INTENTION.DEFEND ||
      intention === TACTICAL_INTENTION.OVERTAKE;
    if (!chase || this.targetId === null) {
      return null;
    }
    const target = input.rivals.find(rival => rival.carId === this.targetId);
    if (target === undefined) {
      return null;
    }
    const point = interceptPoint(
      target.position,
      target.velocity,
      wrappedGap(input.distance, target.distance, input.trackLength),
      relativeSpeedAlong(input.state.velocity, target.velocity),
      this.profile.opponentPrediction,
    );
    const projected = input.spline.projectNear(point, target.distance, 40);
    return projected.lateralOffset;
  }

  private effectiveIntention(): TacticalIntention {
    if (this.execution === EXECUTION_STATE.FINISHED) {
      return TACTICAL_INTENTION.RACE;
    }
    if (this.execution === EXECUTION_STATE.SPINNING || this.execution === EXECUTION_STATE.RECOVERING) {
      return TACTICAL_INTENTION.RECOVER;
    }
    return this.intention;
  }
}

function executionOf(input: AgentTickInput): ExecutionState {
  if (input.finished) {
    return EXECUTION_STATE.FINISHED;
  }
  if (Math.abs(input.state.yawSpin) > 4) {
    return EXECUTION_STATE.SPINNING;
  }
  if (Math.abs(input.lateralOffset) > input.halfWidth || input.integrity < 0.2) {
    return EXECUTION_STATE.RECOVERING;
  }
  return EXECUTION_STATE.NORMAL;
}

function situationFrom(input: AgentTickInput): RaceSituation {
  return {
    position: input.position,
    fieldSize: input.fieldSize,
    lapsCompleted: input.lapsCompleted,
    lapsTotal: input.lapsTotal,
    progressToFinish: input.progressToFinish,
    integrity: input.integrity,
    missiles: input.missiles,
    oil: input.oil,
    mines: input.mines,
    canAim: input.canAim,
    spinning: Math.abs(input.state.yawSpin) > 4,
    offRoad: Math.abs(input.lateralOffset) > input.halfWidth,
    finished: input.finished,
    ahead: closestAhead(input),
    behind: closestBehind(input),
  };
}

function closestAhead(input: AgentTickInput): NearbyRival | null {
  let best: NearbyRival | null = null;
  for (const rival of input.rivals) {
    const gap = wrappedAhead(input.distance, rival.distance, input.trackLength);
    if (gap === null) {
      continue;
    }
    const closing = length(input.state.velocity) - length(rival.velocity);
    const row: NearbyRival = {
      carId: rival.carId,
      gapAhead: gap,
      gapBehind: 0,
      lateralDelta: rival.lateralOffset - input.lateralOffset,
      closingSpeed: closing,
    };
    if (best === null || gap < best.gapAhead) {
      best = row;
    }
  }
  return best;
}

function closestBehind(input: AgentTickInput): NearbyRival | null {
  let best: NearbyRival | null = null;
  for (const rival of input.rivals) {
    const gap = wrappedAhead(rival.distance, input.distance, input.trackLength);
    if (gap === null) {
      continue;
    }
    const row: NearbyRival = {
      carId: rival.carId,
      gapAhead: 0,
      gapBehind: gap,
      lateralDelta: rival.lateralOffset - input.lateralOffset,
      closingSpeed: length(rival.velocity) - length(input.state.velocity),
    };
    if (best === null || gap < best.gapBehind) {
      best = row;
    }
  }
  return best;
}

function wrappedAhead(from: number, to: number, trackLength: number): number | null {
  let gap = to - from;
  if (gap <= 0) {
    gap += trackLength;
  }
  if (gap <= 0 || gap > trackLength * 0.5) {
    return null;
  }
  return gap;
}

function wrappedGap(from: number, to: number, trackLength: number): number {
  return Math.min(
    lengthish(to - from, trackLength),
    lengthish(from - to, trackLength),
  );
}

function lengthish(delta: number, trackLength: number): number {
  let gap = delta;
  if (gap < 0) {
    gap += trackLength;
  }
  return gap;
}

function emptyCapabilities(): VehicleCapabilities {
  return {
    speedCapability: 0.5,
    accelerationCapability: 0.5,
    brakingCapability: 0.5,
    corneringCapability: 0.5,
    highSpeedSteeringCapability: 0.5,
    durabilityCapability: 0.5,
    rammingCapability: 0.5,
    weaponCapability: 0.5,
    blockingCapability: 0.5,
    overtakingCapability: 0.5,
    defensiveCapability: 0.5,
  };
}

