/**
 * Pure domain model for player progress saved in the browser.
 * Three slots, like a 90s console memory card.
 * No Phaser imports, no Date.now() — all mutations take `nowMillis` as a parameter.
 */

export const SLOT_COUNT = 3;
export const SAVE_BYTE_BUDGET = 3500;

export interface SlotProgress {
  /** 5-letter arcade-style name, uppercase A-Z, e.g. 'KLYFF'. Empty string = unused slot. */
  readonly name: string;
  /** Car id the player last chose, e.g. 'marauder'. */
  readonly carId: string;
  /** Track ids the player has won, in no particular order. */
  readonly tracksWon: readonly string[];
  /** Best lap in SECONDS per track id. */
  readonly bestLaps: Readonly<Record<string, number>>;
  /** Millisecond timestamp of the last write. */
  readonly updatedAt: number;
}

export interface SaveData {
  readonly slots: readonly (SlotProgress | null)[]; // always exactly SLOT_COUNT entries, null = empty
}

/**
 * Create an empty save: three null slots.
 */
export function createEmptySave(): SaveData {
  return {
    slots: [null, null, null],
  };
}

export const PLAYER_NAME_LENGTH = 5;
/** Character-select pilots may be 3–5 letters (`ENZO`, `HEX`). */
export const PLAYER_NAME_MIN_LENGTH = 3;

/**
 * Normalise and truncate a player name: uppercase, keep only A-Z, max 5 characters.
 */
export function normalisePlayerName(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, PLAYER_NAME_LENGTH);
}

/** True when `name` is already used on another occupied slot. */
export function isNameTaken(save: SaveData, name: string, exceptIndex = -1): boolean {
  const needle = normalisePlayerName(name);
  if (needle.length === 0) {
    return false;
  }
  return save.slots.some((slot, index) => index !== exceptIndex && slot !== null && slot.name === needle);
}

/**
 * Create a new slot for a player.
 */
export function createSlot(
  name: string,
  carId: string,
  nowMillis: number
): SlotProgress {
  return {
    name: normalisePlayerName(name),
    carId,
    tracksWon: [],
    bestLaps: {},
    updatedAt: nowMillis,
  };
}

/**
 * Write a slot into the save. Out-of-range index returns the save unchanged.
 */
export function writeSlot(
  save: SaveData,
  index: number,
  slot: SlotProgress
): SaveData {
  if (index < 0 || index >= SLOT_COUNT) {
    return save;
  }

  const newSlots = Array.from(save.slots) as (SlotProgress | null)[];
  newSlots[index] = slot;
  return { slots: newSlots as readonly (SlotProgress | null)[] };
}

/**
 * Clear a slot (set it to null). Out-of-range index returns the save unchanged.
 */
export function clearSlot(save: SaveData, index: number): SaveData {
  if (index < 0 || index >= SLOT_COUNT) {
    return save;
  }

  const newSlots = Array.from(save.slots) as (SlotProgress | null)[];
  newSlots[index] = null;
  return { slots: newSlots as readonly (SlotProgress | null)[] };
}

/**
 * Record the result of a race.
 * - Records a best lap only if it beats the stored one (or there is none).
 * - Adds trackId to tracksWon only when won and only once (no duplicates).
 * - Bumps updatedAt.
 * Out-of-range index or null slot returns the save unchanged.
 */
export function recordRaceResult(
  save: SaveData,
  index: number,
  trackId: string,
  lapSeconds: number,
  won: boolean,
  nowMillis: number
): SaveData {
  if (index < 0 || index >= SLOT_COUNT) {
    return save;
  }

  const slot = save.slots[index];
  if (slot === null) {
    return save;
  }

  let newBestLaps = { ...slot.bestLaps };
  const currentBest = newBestLaps[trackId];

  // Only update if this lap is faster
  if (currentBest === undefined || lapSeconds < currentBest) {
    newBestLaps[trackId] = lapSeconds;
  }

  let newTracksWon = slot.tracksWon;
  if (won && !newTracksWon.includes(trackId)) {
    newTracksWon = [...newTracksWon, trackId];
  }

  const newSlot: SlotProgress = {
    ...slot,
    bestLaps: newBestLaps,
    tracksWon: newTracksWon,
    updatedAt: nowMillis,
  };

  return writeSlot(save, index, newSlot);
}

/**
 * Serialize a save to a compact, cookie-safe string.
 * Uses short keys and encodeURIComponent to ensure no semicolons, commas, whitespace or quotes.
 * Compact key mapping: n=name, c=carId, w=tracksWon, b=bestLaps, u=updatedAt
 */
export function serializeSave(save: SaveData): string {
  const slotData = save.slots.map((slot) =>
    slot === null
      ? null
      : {
          n: slot.name,
          c: slot.carId,
          w: slot.tracksWon,
          b: slot.bestLaps,
          u: slot.updatedAt,
        }
  );

  const json = JSON.stringify(slotData);
  // encodeURIComponent ensures the result is safe for cookie values:
  // it escapes everything except A-Z, a-z, 0-9, -, _, ., ~
  // removing semicolons, commas, whitespace, and quotes
  return encodeURIComponent(json);
}

/**
 * Parse a saved string back into SaveData.
 * Must NEVER throw. Falls back to createEmptySave() on any error.
 * A corrupt save must cost the player their progress, never their ability to load the game.
 */
export function parseSave(raw: string): SaveData {
  if (!raw) {
    return createEmptySave();
  }

  try {
    const decoded = decodeURIComponent(raw);
    const slotData = JSON.parse(decoded);

    // Must be an array of exactly SLOT_COUNT entries
    if (!Array.isArray(slotData) || slotData.length !== SLOT_COUNT) {
      return createEmptySave();
    }

    const slots: (SlotProgress | null)[] = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      const item = slotData[i];

      if (item === null) {
        slots.push(null);
      } else if (typeof item === 'object' && item !== null) {
        // Validate the slot structure
        const n = item.n;
        const c = item.c;
        const w = item.w;
        const b = item.b;
        const u = item.u;

        // All fields must be present and of the right type
        if (
          typeof n !== 'string' ||
          typeof c !== 'string' ||
          !Array.isArray(w) ||
          typeof b !== 'object' ||
          b === null ||
          typeof u !== 'number'
        ) {
          slots.push(null);
          continue;
        }

        // Validate tracksWon is an array of strings
        const validTracksWon = w.every((t: unknown) => typeof t === 'string');
        if (!validTracksWon) {
          slots.push(null);
          continue;
        }

        // Validate bestLaps values are non-negative finite numbers
        let validBestLaps = true;
        for (const key in b) {
          const val = b[key];
          if (typeof val !== 'number' || !isFinite(val) || val < 0) {
            validBestLaps = false;
            break;
          }
        }
        if (!validBestLaps) {
          slots.push(null);
          continue;
        }

        // Validate updatedAt is a non-negative finite number
        if (!isFinite(u) || u < 0) {
          slots.push(null);
          continue;
        }

        slots.push({
          name: n,
          carId: c,
          tracksWon: w,
          bestLaps: b,
          updatedAt: u,
        });
      } else {
        slots.push(null);
      }
    }

    return { slots: slots as readonly (SlotProgress | null)[] };
  } catch {
    // Any error: invalid JSON, decode failure, etc. → empty save
    return createEmptySave();
  }
}

/**
 * Check whether a serialized save fits within the cookie budget.
 */
export function fitsInCookie(raw: string): boolean {
  return raw.length <= SAVE_BYTE_BUDGET;
}
