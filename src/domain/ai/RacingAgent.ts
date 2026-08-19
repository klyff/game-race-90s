/**
 * Futures first: world → envelope → candidates → rollout → RaceCore + personality bias.
 * Recovery is an orthogonal control mode. Pursuit (AIDriver) only executes the chosen lateral.
 */

import type { TrackDefinition } from '../track/TrackDefinition.ts';
import { rampApproach } from '../track/RampZone.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';
import type { RacingLine } from '../race/RacingLine.ts';
import type { CarPerkProfile } from '../vehicle/CarPerk.ts';
import type { VehicleStats } from '../vehicle/VehicleStats.ts';
import type { VehicleState } from '../vehicle/Vehicle.ts';
import { isAirborne } from '../vehicle/Vehicle.ts';
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
import { isFinalLap, type NearbyRival, type RaceSituation } from './SituationEvaluator.ts';
import {
  planningCapabilities,
  planningStats,
  type StatNormalizer,
  type VehicleCapabilities,
} from './VehicleCapabilityModel.ts';
import {
  baselineOffset,
  planFutures,
  type TrajectoryPlan,
} from './TrajectoryPlanner.ts';
import { applySkillToDriveOptions } from './skillLimits.ts';
import type { PaceDriverOptions } from '../vehicle/PaceDriver.ts';
import { length } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';
import {
  CONTROL_MODE,
  RecoverController,
  headingErrorOnTrack,
  type ControlMode,
} from './ControlMode.ts';
import { decisionTraits } from './PersonalityTraits.ts';
import type { OccupancyRival } from './OpponentOccupancy.ts';

export const EXECUTION_STATE = CONTROL_MODE;
export type ExecutionState = ControlMode;

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
  readonly collisionRadius?: number;
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
  readonly reverse: number;
  readonly recoverReason: string | null;
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
  readonly recoverReason: string | null;
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
  private execution: ExecutionState = EXECUTION_STATE.NORMAL;
  private readonly recover = new RecoverController();
  private lastPlanScore = 0;
  private reverse = 0;
  private recoverReason: string | null = null;

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
    const driveOptions = this.skillOptions(baseOptions);
    const control = this.recover.step(
      {
        finished: input.finished,
        integrity: input.integrity,
        lateralOffset: input.lateralOffset,
        halfWidth: input.halfWidth,
        yawSpin: input.state.yawSpin,
        headingError: headingErrorOnTrack(input.state, input.spline, input.distance),
        speed: length(input.state.velocity),
        progressVelocity: 0,
        airborne: isAirborne(input.state),
        onRamp: rampApproach(input.distance, input.track, input.trackLength) !== null,
      },
      input.distance,
      input.trackLength,
      input.stepSeconds,
    );
    this.execution = control.mode;
    this.reverse = control.reverse;
    this.recoverReason = control.mode === CONTROL_MODE.RECOVERING ? control.reason : null;

    const dueUtility = (input.stepIndex + this.stagger) % UTILITY_PERIOD === 0 || this.lastUtility === null;
    const dueTrajectory =
      (input.stepIndex + this.stagger) % TRAJECTORY_PERIOD === 0 || this.lastTrajectory === null;

    if (dueUtility && this.execution !== EXECUTION_STATE.FINISHED) {
      this.refreshUtility(input, normalizer);
    }

    if (this.execution === CONTROL_MODE.RECOVERING || this.execution === CONTROL_MODE.RESPAWNING) {
      this.intention = TACTICAL_INTENTION.RECOVER;
      this.lateralOffset = 0;
      this.targetId = null;
    } else if (dueTrajectory && this.execution !== EXECUTION_STATE.FINISHED) {
      this.refreshTrajectory(input, driveOptions);
    }

    const intention = this.effectiveIntention();
    const wantFire =
      this.execution === CONTROL_MODE.NORMAL &&
      intention === TACTICAL_INTENTION.USE_WEAPON &&
      input.canAim &&
      input.missiles > 0;
    const behind = closestBehind(input);
    const fighting =
      this.execution === CONTROL_MODE.NORMAL &&
      (intention === TACTICAL_INTENTION.DEFEND || intention === TACTICAL_INTENTION.BLOCK);
    const wantMine = fighting && input.mines > 0 && behind !== null && behind.gapBehind < 10;
    const wantOil =
      fighting && input.oil > 0 && behind !== null && behind.gapBehind < 16 && !wantMine;

    return {
      intention,
      attackMethod: this.attackMethod,
      targetId: this.targetId,
      lateralOffset: this.lateralOffset,
      wantFire,
      wantOil,
      wantMine,
      execution: this.execution,
      driveOptions,
      reverse: this.reverse,
      recoverReason: this.recoverReason,
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
      recoverReason: this.recoverReason,
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
    this.targetId = result.targetId;
    this.attackMethod = result.attackMethod;
  }

  private refreshTrajectory(input: AgentTickInput, driveOptions: PaceDriverOptions): void {
    const lineOffset = baselineOffset(input.line, input.distance, input.spline, input.laneBias);
    const ahead = closestAhead(input);
    const behind = closestBehind(input);
    const gapLateral = ahead !== null ? input.lateralOffset + Math.sign(ahead.lateralDelta || 1) * 3.2 : null;
    const stats = planningStats(
      input.stats,
      input.perk,
      input.homePlanetId,
      input.worldAdvantage,
      input.planetId,
    );
    const rivals: OccupancyRival[] = nearbyForHorizon(input).map(rival => ({
      carId: rival.carId,
      s: rival.distance,
      d: rival.lateralOffset,
      speed: length(rival.velocity),
      collisionRadius: rival.collisionRadius ?? 1.65,
      isTarget: rival.carId === this.targetId,
    }));
    const traits = decisionTraits(this.profile);
    const switchPenalty = this.lastTrajectory === null ? 0 : 0.05 + traits.commitment * 0.12;
    const capabilities = this.lastCapabilities;
    const memory = strongestGrudge(this.memory.all(), this.profile.opponentMemory);
    const mem = memory === null ? 0 : memory.grudge * this.profile.opponentMemory;
    const planned = planFutures({
      currentOffset: input.lateralOffset,
      lineOffset,
      gapLateral,
      track: input.track,
      collisionRadius: input.stats.collisionRadius,
      state: input.state,
      stats,
      spline: input.spline,
      distance: input.distance,
      lookAheadBase: driveOptions.lookAheadBase,
      lookAheadScale: driveOptions.lookAheadScaleFactor,
      fullLockBearing: driveOptions.fullLockBearing,
      rivals,
      trackLength: input.trackLength,
      profile: this.profile,
      rammingCapability: capabilities?.rammingCapability ?? 0.5,
      weaponCapability: capabilities?.weaponCapability ?? 0.5,
      canAim: input.canAim,
      missiles: input.missiles,
      memory: mem,
      switchPenalty,
      aheadGap: ahead?.gapAhead ?? null,
      behindGap: behind?.gapBehind ?? null,
      lastLap: !input.finished && isFinalLap(input.lapsCompleted, input.lapsTotal),
    });
    const threshold = HYSTERESIS + traits.commitment * 0.18;
    const keep =
      this.lastTrajectory !== null &&
      this.commitLeft > 0 &&
      planned.winnerScore < this.lastPlanScore + threshold &&
      planned.plan.selected.feasible !== false;
    if (!keep) {
      this.lastTrajectory = planned.plan;
      this.lateralOffset = planned.plan.selected.offset;
      this.intention = planned.intention;
      this.lastPlanScore = planned.winnerScore;
      this.commitLeft = MIN_COMMIT_STEPS;
    } else {
      this.commitLeft = Math.max(0, this.commitLeft - TRAJECTORY_PERIOD);
    }
  }

  private effectiveIntention(): TacticalIntention {
    if (this.execution === EXECUTION_STATE.FINISHED) {
      return TACTICAL_INTENTION.RACE;
    }
    if (this.execution === CONTROL_MODE.RECOVERING || this.execution === CONTROL_MODE.RESPAWNING) {
      return TACTICAL_INTENTION.RECOVER;
    }
    return this.intention;
  }
}

function nearbyForHorizon(input: AgentTickInput): AgentRival[] {
  return input.rivals
    .filter(rival => wrappedGap(input.distance, rival.distance, input.trackLength) < 38)
    .slice()
    .sort(
      (left, right) =>
        wrappedGap(input.distance, left.distance, input.trackLength) -
        wrappedGap(input.distance, right.distance, input.trackLength),
    )
    .slice(0, 6);
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

