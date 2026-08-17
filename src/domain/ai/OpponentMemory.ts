/**
 * Small per-opponent memory with decay. Recent events matter more.
 * MemoryEffect = stored × driver.opponentMemory — the same hit hits BERSERKER harder than APEX.
 */

import { clamp01 } from './math.ts';

export interface OpponentMemoryEntry {
  readonly opponentId: string;
  readonly aggressionReceived: number;
  readonly rammedBy: number;
  readonly weaponHitsReceived: number;
  readonly blockedBy: number;
  readonly nearMisses: number;
  readonly threat: number;
  readonly rivalry: number;
  readonly grudge: number;
  readonly lastInteractionTime: number;
}

const DECAY_PER_SECOND = 0.12;

export function emptyMemory(opponentId: string, now = 0): OpponentMemoryEntry {
  return {
    opponentId,
    aggressionReceived: 0,
    rammedBy: 0,
    weaponHitsReceived: 0,
    blockedBy: 0,
    nearMisses: 0,
    threat: 0,
    rivalry: 0,
    grudge: 0,
    lastInteractionTime: now,
  };
}

function decayField(value: number, dt: number): number {
  if (dt <= 0 || value <= 0) {
    return value;
  }
  return value * Math.exp(-DECAY_PER_SECOND * dt);
}

export function decayMemory(entry: OpponentMemoryEntry, dt: number): OpponentMemoryEntry {
  return {
    ...entry,
    aggressionReceived: decayField(entry.aggressionReceived, dt),
    threat: decayField(entry.threat, dt),
    rivalry: decayField(entry.rivalry, dt),
    grudge: decayField(entry.grudge, dt),
  };
}

export function recordRamReceived(entry: OpponentMemoryEntry, now: number): OpponentMemoryEntry {
  return {
    ...entry,
    rammedBy: entry.rammedBy + 1,
    aggressionReceived: clamp01(entry.aggressionReceived + 0.35),
    grudge: clamp01(entry.grudge + 0.4),
    threat: clamp01(entry.threat + 0.22),
    lastInteractionTime: now,
  };
}

export function recordWeaponHitReceived(entry: OpponentMemoryEntry, now: number): OpponentMemoryEntry {
  return {
    ...entry,
    weaponHitsReceived: entry.weaponHitsReceived + 1,
    aggressionReceived: clamp01(entry.aggressionReceived + 0.3),
    grudge: clamp01(entry.grudge + 0.38),
    threat: clamp01(entry.threat + 0.35),
    lastInteractionTime: now,
  };
}

export function recordBlockedBy(entry: OpponentMemoryEntry, now: number): OpponentMemoryEntry {
  return {
    ...entry,
    blockedBy: entry.blockedBy + 1,
    rivalry: clamp01(entry.rivalry + 0.22),
    lastInteractionTime: now,
  };
}

export function recordNearMiss(entry: OpponentMemoryEntry, now: number): OpponentMemoryEntry {
  return {
    ...entry,
    nearMisses: entry.nearMisses + 1,
    rivalry: clamp01(entry.rivalry + 0.08),
    lastInteractionTime: now,
  };
}

/** Stored memory as a 0..1 modifier, before personality scaling. */
export function storedMemory(entry: OpponentMemoryEntry): number {
  return clamp01(entry.grudge * 0.5 + entry.threat * 0.3 + entry.rivalry * 0.2);
}

export function memoryEffect(entry: OpponentMemoryEntry, opponentMemoryWeight: number): number {
  return storedMemory(entry) * clamp01(opponentMemoryWeight);
}

export class OpponentMemoryBook {
  private readonly entries = new Map<string, OpponentMemoryEntry>();

  get(opponentId: string): OpponentMemoryEntry {
    return this.entries.get(opponentId) ?? emptyMemory(opponentId);
  }

  all(): readonly OpponentMemoryEntry[] {
    return [...this.entries.values()];
  }

  tick(dt: number): void {
    if (dt <= 0) {
      return;
    }
    for (const [id, entry] of this.entries) {
      this.entries.set(id, decayMemory(entry, dt));
    }
  }

  noteRam(opponentId: string, now: number): void {
    this.entries.set(opponentId, recordRamReceived(this.get(opponentId), now));
  }

  noteWeapon(opponentId: string, now: number): void {
    this.entries.set(opponentId, recordWeaponHitReceived(this.get(opponentId), now));
  }

  noteBlock(opponentId: string, now: number): void {
    this.entries.set(opponentId, recordBlockedBy(this.get(opponentId), now));
  }

  noteNearMiss(opponentId: string, now: number): void {
    this.entries.set(opponentId, recordNearMiss(this.get(opponentId), now));
  }
}
