import { NARRATOR_PRIORITY, type NarratorPriority } from './NarratorQueue.ts';
import type { NarratorPlan } from './NarratorPlan.ts';
import type { PlannedClip } from '../../data/audio/NarratorBank.ts';
import { RACE_PHASE, type RacePhase } from '../constants.ts';

const DAMAGE_COOLDOWN_SECONDS = 5;
const WEAPONS_COOLDOWN_SECONDS = 4;
const BEHIND_COOLDOWN_SECONDS = 14;
const BEHIND_START_PAD_SECONDS = 12;
const WRONG_WAY_COOLDOWN_SECONDS = 10;
const FINAL_LAP_MID_FRACTION = 0.45;

export interface NarratorSnapshot {
  readonly phase: RacePhase;
  readonly countdownRemaining: number;
  readonly elapsedSeconds: number;
  /** 1-based lap the player is currently on. */
  readonly playerLap: number;
  readonly totalLaps: number;
  readonly lapFraction: number;
  readonly playerPosition: number;
  readonly totalRacers: number;
  readonly playerFinished: boolean;
  readonly turboJustStarted: boolean;
  readonly impactJustHappened: boolean;
  readonly weaponJustHappened: boolean;
  readonly wrongWay: boolean;
  readonly becameLeader: boolean;
}

export interface NarratorOffer {
  readonly clip: PlannedClip;
  readonly priority: NarratorPriority;
  /** Event shouts skip the 1s commentary gap. Banter does not. */
  readonly skipGap: boolean;
}

/**
 * Walks a pre-rolled plan against live race facts and offers at most one
 * clip per tick. The queue decides whether that clip actually speaks.
 *
 * Event pools are consumed in the shuffled order the plan baked. When a
 * pool runs dry it reshuffles the same set so the race does not go mute.
 */
export class NarratorDirector {
  private readonly plan: NarratorPlan;
  private raceStartPlayed = false;
  private finalLapStartPlayed = false;
  private finalLapMidPlayed = false;
  private finishPlayed = false;
  private nextBanter = 0;
  private lastDamageAt = -Infinity;
  private lastWeaponsAt = -Infinity;
  private lastBehindAt = -Infinity;
  private lastWrongWayAt = -Infinity;
  private damageCursor = 0;
  private weaponsCursor = 0;
  private boostCursor = 0;
  private behindCursor = 0;

  constructor(plan: NarratorPlan) {
    this.plan = plan;
  }

  update(snapshot: NarratorSnapshot): NarratorOffer | undefined {
    const finish = this.offerFinish(snapshot);
    if (finish !== undefined) {
      return finish;
    }
    if (this.finishPlayed) {
      return undefined;
    }
    const start = this.offerRaceStart(snapshot);
    if (start !== undefined) {
      return start;
    }
    const finalLap = this.offerFinalLap(snapshot);
    if (finalLap !== undefined) {
      return finalLap;
    }
    if (snapshot.weaponJustHappened) {
      const weapons = this.offerPool(
        snapshot.elapsedSeconds,
        this.plan.weaponsPool,
        'weaponsCursor',
        this.lastWeaponsAt,
        WEAPONS_COOLDOWN_SECONDS,
        NARRATOR_PRIORITY.LOW,
        true,
      );
      if (weapons !== undefined) {
        this.lastWeaponsAt = snapshot.elapsedSeconds;
        return weapons;
      }
    }
    if (snapshot.impactJustHappened && !snapshot.weaponJustHappened) {
      const damage = this.offerPool(
        snapshot.elapsedSeconds,
        this.plan.damagePool,
        'damageCursor',
        this.lastDamageAt,
        DAMAGE_COOLDOWN_SECONDS,
        NARRATOR_PRIORITY.LOW,
        true,
      );
      if (damage !== undefined) {
        this.lastDamageAt = snapshot.elapsedSeconds;
        return damage;
      }
    }
    if (snapshot.turboJustStarted) {
      const boost = this.nextFromPool(this.plan.boostPool, 'boostCursor');
      if (boost !== undefined) {
        return this.cue(boost, NARRATOR_PRIORITY.LOW, true);
      }
    }
    if (snapshot.becameLeader) {
      return this.cue(this.plan.newLeader, NARRATOR_PRIORITY.LOW, true);
    }
    if (snapshot.wrongWay && snapshot.elapsedSeconds - this.lastWrongWayAt >= WRONG_WAY_COOLDOWN_SECONDS) {
      this.lastWrongWayAt = snapshot.elapsedSeconds;
      return this.cue(this.plan.wrongWay, NARRATOR_PRIORITY.LOW, true);
    }
    if (
      snapshot.playerPosition > 3 &&
      snapshot.elapsedSeconds >= BEHIND_START_PAD_SECONDS &&
      snapshot.elapsedSeconds - this.lastBehindAt >= BEHIND_COOLDOWN_SECONDS &&
      !snapshot.playerFinished
    ) {
      const behind = this.nextFromPool(this.plan.behindPool, 'behindCursor');
      if (behind !== undefined) {
        this.lastBehindAt = snapshot.elapsedSeconds;
        return this.cue(behind, NARRATOR_PRIORITY.LOW, true);
      }
    }
    return this.offerBanter(snapshot);
  }

  private offerFinish(snapshot: NarratorSnapshot): NarratorOffer | undefined {
    if (this.finishPlayed || !snapshot.playerFinished) {
      return undefined;
    }
    this.finishPlayed = true;
    if (snapshot.playerPosition >= 1 && snapshot.playerPosition <= 3) {
      const clip = snapshot.playerPosition === 2 ? this.plan.second : this.plan.victory;
      return this.cue(clip, NARRATOR_PRIORITY.HIGH, true);
    }
    if (snapshot.playerPosition >= snapshot.totalRacers) {
      return this.cue(this.plan.last, NARRATOR_PRIORITY.HIGH, true);
    }
    return undefined;
  }

  private offerRaceStart(snapshot: NarratorSnapshot): NarratorOffer | undefined {
    if (this.raceStartPlayed) {
      return undefined;
    }
    const go =
      (snapshot.phase === RACE_PHASE.COUNTDOWN && snapshot.countdownRemaining <= 1) ||
      snapshot.phase === RACE_PHASE.RACING;
    if (!go) {
      return undefined;
    }
    this.raceStartPlayed = true;
    return this.cue(this.plan.raceStart, NARRATOR_PRIORITY.HIGH, true);
  }

  private offerFinalLap(snapshot: NarratorSnapshot): NarratorOffer | undefined {
    if (snapshot.totalLaps <= 0) {
      return undefined;
    }
    if (!this.finalLapStartPlayed && snapshot.playerLap >= snapshot.totalLaps) {
      this.finalLapStartPlayed = true;
      return this.cue(this.plan.finalLapStart, NARRATOR_PRIORITY.HIGH, true);
    }
    if (
      this.finalLapStartPlayed &&
      !this.finalLapMidPlayed &&
      snapshot.playerLap >= snapshot.totalLaps &&
      snapshot.lapFraction >= FINAL_LAP_MID_FRACTION
    ) {
      this.finalLapMidPlayed = true;
      return this.cue(this.plan.finalLapMid, NARRATOR_PRIORITY.HIGH, true);
    }
    return undefined;
  }

  private offerBanter(snapshot: NarratorSnapshot): NarratorOffer | undefined {
    if (snapshot.phase !== RACE_PHASE.RACING) {
      return undefined;
    }
    const cue = this.plan.banter[this.nextBanter];
    if (cue === undefined || snapshot.elapsedSeconds < cue.atSeconds) {
      return undefined;
    }
    this.nextBanter += 1;
    return this.cue(cue.clip, NARRATOR_PRIORITY.LOW, false);
  }

  private cue(clip: PlannedClip, priority: NarratorPriority, skipGap: boolean): NarratorOffer {
    return { clip, priority, skipGap };
  }

  private offerPool(
    elapsed: number,
    pool: readonly PlannedClip[],
    cursor: CursorKey,
    lastAt: number,
    cooldown: number,
    priority: NarratorPriority,
    skipGap: boolean,
  ): NarratorOffer | undefined {
    if (elapsed - lastAt < cooldown) {
      return undefined;
    }
    const clip = this.nextFromPool(pool, cursor);
    if (clip === undefined) {
      return undefined;
    }
    return this.cue(clip, priority, skipGap);
  }

  private nextFromPool(pool: readonly PlannedClip[], cursor: CursorKey): PlannedClip | undefined {
    if (pool.length === 0) {
      return undefined;
    }
    const index = this[cursor] % pool.length;
    this[cursor] += 1;
    return pool[index];
  }
}

type CursorKey = 'damageCursor' | 'weaponsCursor' | 'boostCursor' | 'behindCursor';
