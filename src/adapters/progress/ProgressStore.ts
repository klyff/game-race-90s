/**
 * Browser persistence for SaveSlots + the per-slot career sidecar.
 * Never throws: a corrupt store costs progress, never the ability to play.
 */

import {
  createEmptyCareer,
  createCareerSlot,
  parseCareer,
  setActiveSlot,
  writeCareerSlot,
} from '../../domain/progress/Career.ts';
import type { CareerData, CareerSlot } from '../../domain/progress/Career.ts';
import {
  createEmptySave,
  createSlot,
  fitsInCookie,
  isNameTaken,
  normalisePlayerName,
  parseSave,
  PLAYER_NAME_MIN_LENGTH,
  recordRaceResult,
  serializeSave,
  writeSlot,
} from '../../domain/progress/SaveSlots.ts';
import type { SaveData } from '../../domain/progress/SaveSlots.ts';
import { cashInValue } from '../../domain/progress/SeasonPoints.ts';
import { highestUnlockedPlanetIndex } from '../../data/tracks/campaign.ts';
import { isCarUnlocked, listPrice, sellPrice } from '../../domain/progress/GarageCatalog.ts';
import { isOutOfServiceCarId, sanitizeCarId } from '../../data/cars/FleetStatus.ts';
import { isTourModeOn } from './TourMode.ts';

const STORAGE_KEY = 'rockn90s.save';
const CAREER_KEY = 'rockn90s.career';

export const CLEAR_POSITION = 3;

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadSave(): SaveData {
  const store = storage();
  if (store === null) {
    return createEmptySave();
  }
  try {
    const raw = store.getItem(STORAGE_KEY);
    return raw === null ? createEmptySave() : parseSave(raw);
  } catch {
    return createEmptySave();
  }
}

export function persistSave(save: SaveData): void {
  const store = storage();
  if (store === null) {
    return;
  }
  try {
    const raw = serializeSave(save);
    if (fitsInCookie(raw)) {
      store.setItem(STORAGE_KEY, raw);
    }
  } catch {
    // best-effort
  }
}

export function loadCareer(): CareerData {
  const store = storage();
  if (store === null) {
    return createEmptyCareer();
  }
  try {
    const raw = store.getItem(CAREER_KEY);
    if (raw === null) {
      return createEmptyCareer();
    }
    return parseCareer(JSON.parse(raw));
  } catch {
    return createEmptyCareer();
  }
}

export function persistCareer(career: CareerData): void {
  const store = storage();
  if (store === null) {
    return;
  }
  try {
    store.setItem(CAREER_KEY, JSON.stringify(career));
  } catch {
    // best-effort
  }
}

export function activeSlotIndex(): number {
  return loadCareer().activeSlotIndex;
}

export function activateSlot(index: number): CareerData {
  const next = setActiveSlot(loadCareer(), index);
  persistCareer(next);
  return next;
}

export function loadActiveCareer(): CareerSlot | null {
  const career = loadCareer();
  return career.slots[career.activeSlotIndex] ?? null;
}

export function loadActiveName(): string {
  const slot = loadSave().slots[activeSlotIndex()];
  return slot?.name ?? '';
}

export function occupiedNames(): string[] {
  return loadSave()
    .slots.filter((slot): slot is NonNullable<typeof slot> => slot !== null)
    .map(slot => slot.name);
}

export function beginSlot(index: number, name: string, nowMillis: number): { ok: true } | { ok: false; reason: string } {
  const trimmed = normalisePlayerName(name);
  if (trimmed.length < PLAYER_NAME_MIN_LENGTH) {
    return { ok: false, reason: 'NAME' };
  }
  const save = loadSave();
  if (isNameTaken(save, trimmed, index)) {
    return { ok: false, reason: 'TAKEN' };
  }
  persistSave(writeSlot(save, index, createSlot(trimmed, '', nowMillis)));
  const career = writeCareerSlot(setActiveSlot(loadCareer(), index), index, createCareerSlot(nowMillis));
  persistCareer(career);
  return { ok: true };
}

function mutateActive(mutator: (slot: CareerSlot) => CareerSlot): CareerSlot | null {
  const career = loadCareer();
  const current = career.slots[career.activeSlotIndex];
  if (current === null || current === undefined) {
    return null;
  }
  const nextSlot = mutator(current);
  persistCareer(writeCareerSlot(career, career.activeSlotIndex, nextSlot));
  return nextSlot;
}

export function loadWallet(): number {
  return loadActiveCareer()?.cash ?? 0;
}

export function creditWallet(amount: number): number {
  const add = Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
  const next = mutateActive(slot => ({ ...slot, cash: slot.cash + add }));
  return next?.cash ?? 0;
}

export function debitWallet(amount: number): number | null {
  const take = Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
  const current = loadActiveCareer();
  if (current === null || current.cash < take) {
    return null;
  }
  const next = mutateActive(slot => ({ ...slot, cash: slot.cash - take }));
  return next?.cash ?? null;
}

export function loadPoints(): number {
  return loadActiveCareer()?.points ?? 0;
}

export function buyCar(carId: string): CareerSlot | null {
  const price = listPrice(carId);
  const current = loadActiveCareer();
  const planet = highestUnlockedPlanetIndex(loadWonTracks(), isTourModeOn(), loadCleared());
  const cleared = current?.clearedTrackIds.length ?? 0;
  if (
    current === null ||
    price <= 0 ||
    current.ownedCarIds.includes(carId) ||
    current.cash < price ||
    isOutOfServiceCarId(carId) ||
    !isCarUnlocked(carId, planet, cleared)
  ) {
    return null;
  }
  return mutateActive(slot => ({
    ...slot,
    cash: slot.cash - price,
    ownedCarIds: [...slot.ownedCarIds, carId],
    equippedCarId: carId,
  }));
}

export function sellCar(carId: string): CareerSlot | null {
  const current = loadActiveCareer();
  if (current === null || !current.ownedCarIds.includes(carId)) {
    return null;
  }
  const remaining = current.ownedCarIds.filter(id => id !== carId);
  return mutateActive(slot => ({
    ...slot,
    cash: slot.cash + sellPrice(carId),
    ownedCarIds: remaining,
    equippedCarId: remaining.includes(slot.equippedCarId) ? slot.equippedCarId : (remaining[0] ?? ''),
  }));
}

export function equipCar(carId: string): CareerSlot | null {
  const current = loadActiveCareer();
  if (current === null || !current.ownedCarIds.includes(carId) || isOutOfServiceCarId(carId)) {
    return null;
  }
  const save = loadSave();
  const index = activeSlotIndex();
  const slot = save.slots[index];
  if (slot !== null && slot !== undefined) {
    persistSave(writeSlot(save, index, { ...slot, carId }));
  }
  return mutateActive(entry => ({ ...entry, equippedCarId: carId }));
}

export function cashInPoints(): CareerSlot | null {
  const current = loadActiveCareer();
  if (current === null) {
    return null;
  }
  const deal = cashInValue(current.points);
  if (deal.batches <= 0) {
    return null;
  }
  return mutateActive(slot => ({
    ...slot,
    points: deal.remaining,
    cash: slot.cash + deal.cash,
  }));
}

export function rememberLastTrack(planetId: string, trackId: string): void {
  mutateActive(slot => ({ ...slot, lastPlanetId: planetId, lastTrackId: trackId }));
}

export function saveNow(carId: string): SaveData {
  const save = loadSave();
  const index = activeSlotIndex();
  const slot = save.slots[index];
  if (slot !== null && slot !== undefined) {
    persistSave(writeSlot(save, index, { ...slot, carId, updatedAt: Date.now() }));
  }
  persistCareer(loadCareer());
  return loadSave();
}

export function loadCleared(): string[] {
  return [...(loadActiveCareer()?.clearedTrackIds ?? [])];
}

export function loadWonTracks(): string[] {
  const slot = loadSave().slots[activeSlotIndex()];
  return slot === null || slot === undefined ? [] : [...slot.tracksWon];
}

export interface ProgressUpdate {
  readonly save: SaveData;
  readonly cleared: readonly string[];
}

export function recordProgress(params: {
  readonly trackId: string;
  readonly carId: string;
  readonly position: number;
  readonly lapSeconds: number;
  readonly nowMillis: number;
  readonly playerPoints?: number;
  readonly rivalResults?: readonly { readonly name: string; readonly points: number }[];
}): ProgressUpdate {
  const index = activeSlotIndex();
  const won = params.position === 1;
  const updated = recordRaceResult(
    loadSave(),
    index,
    params.trackId,
    params.lapSeconds,
    won,
    params.nowMillis,
  );
  persistSave(updated);

  mutateActive(slot => {
    const cleared =
      params.position <= CLEAR_POSITION && !slot.clearedTrackIds.includes(params.trackId)
        ? [...slot.clearedTrackIds, params.trackId]
        : slot.clearedTrackIds;
    const rivalPoints = slot.rivalNames.map((name, rivalIndex) => {
      const earned = params.rivalResults?.find(row => row.name === name)?.points ?? 0;
      return (slot.rivalPoints[rivalIndex] ?? 0) + earned;
    });
    const playerPts = params.playerPoints ?? 0;
    const trackPoints = {
      ...slot.trackPoints,
      [params.trackId]: (slot.trackPoints[params.trackId] ?? 0) + playerPts,
    };
    return {
      ...slot,
      points: slot.points + playerPts,
      clearedTrackIds: cleared,
      rivalPoints,
      trackPoints,
      equippedCarId: sanitizeCarId(params.carId || slot.equippedCarId, slot.equippedCarId),
    };
  });

  return { save: updated, cleared: loadCleared() };
}
