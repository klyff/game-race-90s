/**
 * Per-slot career sidecar: cash, points, garage, rivals, last track.
 * Lives beside the cookie-budgeted SaveSlots blob.
 */

import { STARTING_CASH } from './Wallet.ts';
import { drawRivalNames } from '../../data/pilots/PilotRoster.ts';
import { sanitizeCarId, sanitizeOwnedCarIds } from '../../data/cars/FleetStatus.ts';

export const CAREER_SLOT_COUNT = 3;

export interface CareerSlot {
  readonly cash: number;
  readonly points: number;
  readonly ownedCarIds: readonly string[];
  readonly equippedCarId: string;
  readonly lastPlanetId: string;
  readonly lastTrackId: string;
  readonly rivalNames: readonly string[];
  readonly rivalPoints: readonly number[];
  readonly trackPoints: Readonly<Record<string, number>>;
  readonly clearedTrackIds: readonly string[];
}

export interface CareerData {
  readonly slots: readonly (CareerSlot | null)[];
  readonly activeSlotIndex: number;
}

export function createEmptyCareer(): CareerData {
  return {
    slots: [null, null, null],
    activeSlotIndex: 0,
  };
}

export function createCareerSlot(nowMillis: number): CareerSlot {
  const rivals = drawRivalNames(nowMillis);
  return {
    cash: STARTING_CASH,
    points: 0,
    ownedCarIds: [],
    equippedCarId: '',
    lastPlanetId: 'thunder-basin',
    lastTrackId: 'thunder-basin',
    rivalNames: rivals,
    rivalPoints: rivals.map(() => 0),
    trackPoints: {},
    clearedTrackIds: [],
  };
}

export function writeCareerSlot(career: CareerData, index: number, slot: CareerSlot | null): CareerData {
  if (index < 0 || index >= CAREER_SLOT_COUNT) {
    return career;
  }
  const slots = Array.from(career.slots);
  slots[index] = slot;
  return { ...career, slots };
}

export function setActiveSlot(career: CareerData, index: number): CareerData {
  if (index < 0 || index >= CAREER_SLOT_COUNT) {
    return career;
  }
  return { ...career, activeSlotIndex: index };
}

export function parseCareer(raw: unknown): CareerData {
  if (typeof raw !== 'object' || raw === null) {
    return createEmptyCareer();
  }
  const source = raw as { slots?: unknown; activeSlotIndex?: unknown };
  if (!Array.isArray(source.slots) || source.slots.length !== CAREER_SLOT_COUNT) {
    return createEmptyCareer();
  }
  const slots = source.slots.map(item => parseCareerSlot(item));
  const active =
    typeof source.activeSlotIndex === 'number' &&
    Number.isFinite(source.activeSlotIndex) &&
    source.activeSlotIndex >= 0 &&
    source.activeSlotIndex < CAREER_SLOT_COUNT
      ? Math.floor(source.activeSlotIndex)
      : 0;
  return { slots, activeSlotIndex: active };
}

function parseCareerSlot(raw: unknown): CareerSlot | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const s = raw as Record<string, unknown>;
  if (typeof s.cash !== 'number' || !Number.isFinite(s.cash)) {
    return null;
  }
  if (typeof s.points !== 'number' || !Number.isFinite(s.points)) {
    return null;
  }
  if (!Array.isArray(s.ownedCarIds) || !s.ownedCarIds.every(id => typeof id === 'string')) {
    return null;
  }
  if (typeof s.equippedCarId !== 'string') {
    return null;
  }
  if (typeof s.lastPlanetId !== 'string' || typeof s.lastTrackId !== 'string') {
    return null;
  }
  if (!Array.isArray(s.rivalNames) || !s.rivalNames.every(n => typeof n === 'string')) {
    return null;
  }
  const rivalPoints = Array.isArray(s.rivalPoints)
    ? s.rivalPoints.map(n => (typeof n === 'number' && Number.isFinite(n) ? n : 0))
    : s.rivalNames.map(() => 0);
  const trackPoints: Record<string, number> = {};
  if (typeof s.trackPoints === 'object' && s.trackPoints !== null) {
    for (const [key, value] of Object.entries(s.trackPoints as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        trackPoints[key] = value;
      }
    }
  }
  const cleared = Array.isArray(s.clearedTrackIds)
    ? s.clearedTrackIds.filter((id): id is string => typeof id === 'string')
    : [];
  return {
    cash: Math.max(0, Math.round(s.cash)),
    points: Math.max(0, Math.round(s.points)),
    ownedCarIds: sanitizeOwnedCarIds(s.ownedCarIds),
    equippedCarId: sanitizeOwnedCarIds(s.ownedCarIds).includes(sanitizeCarId(s.equippedCarId))
      ? sanitizeCarId(s.equippedCarId)
      : (sanitizeOwnedCarIds(s.ownedCarIds)[0] ?? ''),
    lastPlanetId: s.lastPlanetId,
    lastTrackId: s.lastTrackId,
    rivalNames: s.rivalNames,
    rivalPoints: rivalPoints.slice(0, s.rivalNames.length),
    trackPoints,
    clearedTrackIds: cleared,
  };
}
