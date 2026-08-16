/**
 * Session-only "tour" unlock: every planet and track is open so the owner can
 * walk the campaign and review terrain without grinding clears.
 *
 * Two ways in, both 90s-cabinet style:
 *  - launch with `?tour=1` (also `?allmaps=1`)
 *  - type TOUR on the splash screen
 *
 * Nothing is written to the save. A refresh without the query string starts
 * locked again unless the code is typed once more this session.
 */

export const TOUR_CODE = 'TOUR';

let sessionOn = false;

export function isTourModeOn(): boolean {
  return sessionOn;
}

export function enableTourMode(): void {
  sessionOn = true;
}

/** Test hook. Production never needs to turn the tour off mid-session. */
export function resetTourMode(): void {
  sessionOn = false;
}

/**
 * True when the launch URL asked for the tour.
 *
 * Accepts `?tour`, `?tour=1`, `?tour=true`, `?tour=all`, and the same values
 * on `allmaps`. Anything else, including a missing key, is a no.
 */
export function tourModeFromSearch(search: string): boolean {
  const raw = typeof search === 'string' ? search : '';
  const query = raw.startsWith('?') ? raw.slice(1) : raw;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(query);
  } catch {
    return false;
  }
  const value = params.get('tour') ?? params.get('allmaps');
  if (value === null) {
    return false;
  }
  const normalised = value.trim().toLowerCase();
  return normalised === '' || normalised === '1' || normalised === 'true' || normalised === 'all';
}

export function enableTourModeFromSearch(search: string): boolean {
  if (!tourModeFromSearch(search)) {
    return false;
  }
  enableTourMode();
  return true;
}

/**
 * Fold one key into a rolling letter buffer. Returns the next buffer and
 * whether that key completed TOUR. Non-letters leave the buffer alone so
 * arrows, Space and Enter on the splash do not wipe a half-typed code.
 */
export function feedTourCode(
  buffer: string,
  key: string,
): { readonly buffer: string; readonly unlocked: boolean } {
  if (typeof key !== 'string' || key.length !== 1) {
    return { buffer, unlocked: false };
  }
  const letter = key.toUpperCase();
  if (letter < 'A' || letter > 'Z') {
    return { buffer, unlocked: false };
  }
  const next = (buffer + letter).slice(-TOUR_CODE.length);
  return { buffer: next, unlocked: next === TOUR_CODE };
}
