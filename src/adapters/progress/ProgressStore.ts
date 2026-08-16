/**
 * Browser persistence for the pure `SaveSlots` domain model.
 *
 * The domain layer never touches storage or the clock; this adapter is the only
 * place that does. It must never throw: a corrupt or unavailable store costs the
 * player their progress, never their ability to play.
 *
 * Until a save-slot select screen exists, the game uses a single default slot so
 * that wins and best laps are recorded from the results screen.
 */

import {
  createEmptySave,
  createSlot,
  fitsInCookie,
  parseSave,
  recordRaceResult,
  serializeSave,
} from '../../domain/progress/SaveSlots.ts';
import type { SaveData, SlotProgress } from '../../domain/progress/SaveSlots.ts';

const STORAGE_KEY = 'rockn90s.save';

/**
 * Separate key for tracks CLEARED (top-3), which unlock the next track. The pure
 * `SaveSlots` model only records outright wins (1st, for planet unlocks), so the
 * top-3 clears live alongside it rather than forcing a change to that tested
 * schema and its byte budget.
 */
const CLEARED_KEY = 'rockn90s.cleared';

/** Top-3 is a "clear" (owner rule); 1st is also a "win". */
export const CLEAR_POSITION = 3;

/** The slot the game auto-uses before a slot-select screen is built. */
export const DEFAULT_SLOT_INDEX = 0;

/** Placeholder name for the auto-created slot. */
const DEFAULT_PLAYER_NAME = 'YOU';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Read and validate the save. Any failure yields an empty save. */
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

/** Persist the save if it fits the budget. Silently no-ops on any failure. */
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
    // Ignore: progress is best-effort, never a crash.
  }
}

/** Ensure the default slot exists, creating it for `carId` if the slot is empty. */
function ensureDefaultSlot(save: SaveData, carId: string, nowMillis: number): SaveData {
  const existing = save.slots[DEFAULT_SLOT_INDEX];
  if (existing != null) {
    return save;
  }
  const slot: SlotProgress = createSlot(DEFAULT_PLAYER_NAME, carId, nowMillis);
  const slots = Array.from(save.slots);
  slots[DEFAULT_SLOT_INDEX] = slot;
  return { slots };
}

/**
 * Ensure the default slot exists for `carId` and persist it. Used by the pause
 * menu's "Save": there is no race result mid-race, but the player still expects
 * their slot (and any unlocked tracks) to be written to storage on demand.
 */
export function saveNow(carId: string): SaveData {
  const withSlot = ensureDefaultSlot(loadSave(), carId, Date.now());
  persistSave(withSlot);
  return withSlot;
}

/** Read the set of cleared (top-3) track ids. Any failure yields an empty list. */
export function loadCleared(): string[] {
  const store = storage();
  if (store === null) {
    return [];
  }
  try {
    const raw = store.getItem(CLEARED_KEY);
    if (raw === null) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

/** Add a track to the cleared set (top-3), de-duplicated. Best-effort persist. */
function recordCleared(trackId: string): string[] {
  const cleared = loadCleared();
  if (cleared.includes(trackId)) {
    return cleared;
  }
  const next = [...cleared, trackId];
  const store = storage();
  if (store !== null) {
    try {
      store.setItem(CLEARED_KEY, JSON.stringify(next));
    } catch {
      // Ignore: progress is best-effort, never a crash.
    }
  }
  return next;
}

/** The outcome of persisting one race: the save, plus the updated cleared set. */
export interface ProgressUpdate {
  readonly save: SaveData;
  readonly cleared: readonly string[];
}

/**
 * Record the outcome of one race into the default slot and persist it. A win
 * (1st) goes into `SaveSlots.tracksWon`; a top-3 finish is also stored in the
 * cleared set, which unlocks the next track. Returns both so the results screen
 * can decide routing without re-reading storage.
 */
export function recordProgress(params: {
  readonly trackId: string;
  readonly carId: string;
  readonly position: number;
  readonly lapSeconds: number;
  readonly nowMillis: number;
}): ProgressUpdate {
  const won = params.position === 1;
  const withSlot = ensureDefaultSlot(loadSave(), params.carId, params.nowMillis);
  const updated = recordRaceResult(
    withSlot,
    DEFAULT_SLOT_INDEX,
    params.trackId,
    params.lapSeconds,
    won,
    params.nowMillis,
  );
  persistSave(updated);

  const cleared =
    params.position <= CLEAR_POSITION ? recordCleared(params.trackId) : loadCleared();
  return { save: updated, cleared };
}

/** Track ids the player has WON (1st) in the default slot. */
export function loadWonTracks(): string[] {
  const slot = loadSave().slots[DEFAULT_SLOT_INDEX];
  return slot === null ? [] : [...slot.tracksWon];
}
