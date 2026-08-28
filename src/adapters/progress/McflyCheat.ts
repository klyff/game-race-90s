/**
 * URL cheat: `?code=Mcfly1985` boots as KLYFF in the DeLorean with tour maps open.
 *
 * Optional `?world=3&pista=3` (or `?track=…`) jumps straight into that race;
 * otherwise lands in the garage ready to GO RACE.
 */

import {
  createCareerSlot,
  createEmptyCareer,
  setActiveSlot,
  writeCareerSlot,
  type CareerData,
} from '../../domain/progress/Career.ts';
import {
  createEmptySave,
  createSlot,
  writeSlot,
  type SaveData,
} from '../../domain/progress/SaveSlots.ts';
import { campaignTrackFromSearch } from './CampaignSearch.ts';
import { persistCareer, persistSave } from './ProgressStore.ts';
import { enableTourMode } from './TourMode.ts';
import { watchTrackFromSearch } from './WatchMode.ts';

export const MCFLY_CODE = 'Mcfly1985';
export const MCFLY_PILOT = 'KLYFF';
export const MCFLY_CAR_ID = '10-delorean-steel-flux';
/** Enough cash to already own the flagship without grinding. */
export const MCFLY_CASH = 5_000_000;

let sessionOn = false;

export function isMcflyCheatOn(): boolean {
  return sessionOn;
}

/** Test hook. */
export function resetMcflyCheat(): void {
  sessionOn = false;
}

function paramsFrom(search: string): URLSearchParams {
  const raw = typeof search === 'string' ? search : '';
  const query = raw.startsWith('?') ? raw.slice(1) : raw;
  try {
    return new URLSearchParams(query);
  } catch {
    return new URLSearchParams();
  }
}

/** True when `code` matches {@link MCFLY_CODE} exactly (case-sensitive). */
export function mcflyCodeFromSearch(search: string): boolean {
  const value = paramsFrom(search).get('code');
  if (value === null) {
    return false;
  }
  return value.trim() === MCFLY_CODE;
}

/**
 * Optional track for a direct race jump. Prefer campaign `world`/`pista`,
 * then an explicit `track=` slug.
 */
export function mcflyTrackFromSearch(search: string): string | undefined {
  return campaignTrackFromSearch(search) ?? watchTrackFromSearch(search);
}

/** Pure: slot 0 = KLYFF driving the DeLorean. */
export function buildMcflySave(nowMillis: number): SaveData {
  return writeSlot(createEmptySave(), 0, createSlot(MCFLY_PILOT, MCFLY_CAR_ID, nowMillis));
}

/** Pure: career sidecar with DeLorean owned/equipped and tour-ready cash. */
export function buildMcflyCareer(nowMillis: number): CareerData {
  const careerSlot = {
    ...createCareerSlot(nowMillis),
    cash: MCFLY_CASH,
    ownedCarIds: [MCFLY_CAR_ID, '2-sportivo-blue-combat'] as const,
    equippedCarId: MCFLY_CAR_ID,
    lastPlanetId: 'thunder-basin',
    lastTrackId: 'thunder-basin-1',
  };
  return writeCareerSlot(setActiveSlot(createEmptyCareer(), 0), 0, careerSlot);
}

/** Persists the McFly slot into browser storage (no-op when storage is missing). */
export function applyMcflySave(nowMillis: number): void {
  persistSave(buildMcflySave(nowMillis));
  persistCareer(buildMcflyCareer(nowMillis));
}

/**
 * Arms the cheat from the launch URL: tour unlock + save seed.
 * Returns false when the code is absent or wrong.
 */
export function enableMcflyCheatFromSearch(search: string, nowMillis: number = Date.now()): boolean {
  if (!mcflyCodeFromSearch(search)) {
    return false;
  }
  sessionOn = true;
  enableTourMode();
  applyMcflySave(nowMillis);
  return true;
}
