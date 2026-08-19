/**
 * Podium grace clock: once 1st–3rd have taken the flag, remaining cars get a
 * quarter of a full-race par to reach the line. When it hits zero the race
 * ends even if the pack is still out. Pure so the HUD and the scene share one
 * formula.
 */

/** How many finishers lock the podium and arm the timeout. */
export const PODIUM_SIZE = 3;

/** Remaining cars get this fraction of a full-track par. */
export const PODIUM_TIMEOUT_FRACTION = 0.25;

/** "TIME OUT" drops in when this fraction of the clock is left. */
export const PODIUM_TIMEOUT_LABEL_FRACTION = 0.5;

export const PODIUM_TIMEOUT_LABEL = 'TIME OUT';

export interface PodiumTimeoutHud {
  /** Whole seconds still on the clock, e.g. "12". Null when the overlay is off. */
  readonly clock: string | null;
  /** Caption under the digits; null until the halfway mark. */
  readonly label: string | null;
}

/**
 * Seconds to complete every lap of this race. Prefers authored one-lap par
 * times `laps`. Falls back to a live finish time when par is missing.
 */
export function fullTrackSeconds(
  parLapSeconds: number | undefined,
  laps: number,
  fallbackSeconds: number,
): number {
  const safeLaps = Number.isFinite(laps) && laps > 0 ? laps : 1;
  if (Number.isFinite(parLapSeconds) && (parLapSeconds as number) > 0) {
    return (parLapSeconds as number) * safeLaps;
  }
  if (Number.isFinite(fallbackSeconds) && fallbackSeconds > 0) {
    return fallbackSeconds;
  }
  return 0;
}

/** Quarter of a full-track run. Zero when the input is nonsense. */
export function podiumTimeoutDuration(fullTrack: number): number {
  if (!Number.isFinite(fullTrack) || fullTrack <= 0) {
    return 0;
  }
  return fullTrack * PODIUM_TIMEOUT_FRACTION;
}

/**
 * True once the podium is decided. A short field (fewer than 3 cars) locks
 * when every car has finished, so the timeout never hangs on empty seats.
 */
export function podiumIsLocked(finishedCount: number, fieldSize: number): boolean {
  if (!Number.isFinite(finishedCount) || !Number.isFinite(fieldSize) || fieldSize <= 0) {
    return false;
  }
  const needed = Math.min(PODIUM_SIZE, Math.floor(fieldSize));
  return finishedCount >= needed;
}

/**
 * Glanceable overlay for the remaining grace time.
 *
 * Ceil so the last second still reads "1" until the race actually ends.
 * The "TIME OUT" caption appears at the halfway mark and stays until zero.
 */
export function formatPodiumTimeoutHud(
  remainingSeconds: number | undefined,
  durationSeconds: number | undefined,
): PodiumTimeoutHud {
  if (
    remainingSeconds === undefined ||
    durationSeconds === undefined ||
    !Number.isFinite(remainingSeconds) ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    remainingSeconds <= 0
  ) {
    return { clock: null, label: null };
  }

  const seconds = Math.max(1, Math.ceil(remainingSeconds));
  const showLabel = remainingSeconds <= durationSeconds * PODIUM_TIMEOUT_LABEL_FRACTION;
  return {
    clock: String(seconds),
    label: showLabel ? PODIUM_TIMEOUT_LABEL : null,
  };
}
