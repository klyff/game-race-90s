/**
 * HUD formatter: pure, testable formatting logic for the player-facing race heads-up display.
 *
 * The HUD displays position, lap count, elapsed time, ammo, countdown, and car integrity.
 * It is pure (no Phaser, no side effects) so it can be unit-tested in Node, and defensive
 * against NaN/Infinity so it never displays garbage during a race.
 *
 * Rationale: the HUD updates every frame and must remain readable even if a calculation
 * breaks (NaN, Infinity). A display that shows unreadable output is worse than one showing
 * a placeholder, because it obscures the bug rather than reporting it.
 */

import type { RacePhase } from '../../domain/constants.ts';
import { RACE_PHASE } from '../../domain/constants.ts';

/**
 * One snapshot of race state for HUD display.
 *
 * Fields represent the current moment in a race: position in the field, lap progress,
 * elapsed time, ammo and car integrity, and the race phase (countdown, racing, finished).
 */
export interface HudReadout {
  readonly phase: RacePhase;
  readonly countdownRemaining: number;
  readonly elapsedSeconds: number;
  readonly position: number; // 1-based (1 is first place)
  readonly totalRacers: number;
  readonly lap: number; // laps completed by the player
  readonly totalLaps: number;
  readonly ammo: number;
  readonly ammoCapacity: number;
  readonly integrity: number; // 0..1 (0% to 100%)
  readonly standings: readonly { readonly carId: string; readonly position: number }[];
}

/**
 * Formatted HUD text ready for display.
 *
 * All fields are guaranteed non-null and non-NaN, suitable for rendering directly.
 * The countdown field is null once the race has begun, signalling the HUD scene to stop
 * drawing the countdown display.
 */
export interface HudText {
  readonly position: string; // e.g. "2nd"
  readonly lap: string; // e.g. "LAP 2/3"
  readonly time: string; // e.g. "1:23.45"
  readonly ammo: string; // e.g. "AMMO 3/5"
  readonly countdown: string | null; // "3", "2", "1", "GO!", or null
  readonly integrityPercent: number; // 0..100, rounded, for a bar width
}

/**
 * Ordinal for a race position: 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 11 -> "11th".
 *
 * English ordinals follow these rules:
 * - Numbers ending in 1 (except 11): -st
 * - Numbers ending in 2 (except 12): -nd
 * - Numbers ending in 3 (except 13): -rd
 * - All others (including 11, 12, 13): -th
 *
 * @param position 1-based position number. Non-finite or out-of-range inputs return "?".
 * @returns Position as an ordinal string, e.g. "1st", "22nd".
 */
export function positionOrdinal(position: number): string {
  if (!Number.isFinite(position) || position < 1) {
    return '?';
  }

  const pos = Math.floor(position);
  const lastDigit = pos % 10;
  const lastTwoDigits = pos % 100;

  // Special cases for 11, 12, 13: always use "th"
  if (lastTwoDigits === 11 || lastTwoDigits === 12 || lastTwoDigits === 13) {
    return `${pos}th`;
  }

  // Standard rules for last digit
  if (lastDigit === 1) {
    return `${pos}st`;
  }

  if (lastDigit === 2) {
    return `${pos}nd`;
  }

  if (lastDigit === 3) {
    return `${pos}rd`;
  }

  return `${pos}th`;
}

/**
 * Race clock as m:ss.cc — e.g. 83.456 -> "1:23.45".
 *
 * Formats elapsed time as minutes : seconds . centiseconds, with seconds and centiseconds
 * zero-padded to two digits each. Minutes are not padded (can be any length).
 *
 * Examples:
 * - 5.5 s -> "0:05.50"
 * - 60 s -> "1:00.00"
 * - 83.456 s -> "1:23.45"
 * - 611.5 s -> "10:11.50"
 *
 * @param seconds Elapsed time in seconds. Non-finite or negative inputs return "?:??.??".
 * @returns Formatted time string.
 */
export function formatRaceTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '?:??.??';
  }

  const totalSeconds = Math.floor(seconds);
  const centiseconds = Math.floor((seconds - totalSeconds) * 100);

  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  const secStr = String(secs).padStart(2, '0');
  const csStr = String(centiseconds).padStart(2, '0');

  return `${minutes}:${secStr}.${csStr}`;
}

/**
 * Format countdown display based on phase and remaining time.
 *
 * Returns:
 * - "3", "2", "1" during the countdown phase (displayed once per second)
 * - "GO!" during the final second (0 < countdownRemaining <= 1) in COUNTDOWN phase
 * - null once phase is RACING or once the countdown has ended
 *
 * Duration of "GO!": displayed for the full final second before phase transitions to RACING.
 * This allows the HUD scene to draw the "GO!" flash, then stop drawing it once null is returned.
 *
 * @param phase Current race phase (COUNTDOWN, RACING, or FINISHED).
 * @param countdownRemaining Seconds remaining until race starts. Only meaningful in COUNTDOWN phase.
 * @returns Countdown display string or null.
 */
function formatCountdown(phase: RacePhase, countdownRemaining: number): string | null {
  // Only show countdown during the COUNTDOWN phase.
  if (phase !== RACE_PHASE.COUNTDOWN) {
    return null;
  }

  // Defend against non-finite values (NaN, Infinity).
  if (!Number.isFinite(countdownRemaining)) {
    return null;
  }

  // If time has already elapsed, show nothing.
  if (countdownRemaining <= 0) {
    return null;
  }

  // Final second: show "GO!"
  if (countdownRemaining <= 1) {
    return 'GO!';
  }

  // Show the floor of remaining time: 3.5s -> "3", 2.1s -> "2", etc.
  // This ensures "1", "2", "3" appear in sequence as the countdown ticks down.
  return String(Math.floor(countdownRemaining));
}

/**
 * Format car integrity as a percentage, clamped and rounded.
 *
 * Input is expected to be 0..1 (0% to 100%). Values outside this range are clamped.
 * Non-finite inputs (NaN, Infinity) are treated as 0%.
 *
 * @param integrity Normalized integrity value (0 to 1).
 * @returns Rounded integer percent (0 to 100).
 */
function formatIntegrityPercent(integrity: number): number {
  if (!Number.isFinite(integrity)) {
    return 0;
  }

  const clamped = Math.max(0, Math.min(1, integrity));
  return Math.round(clamped * 100);
}

/**
 * Format HUD readout into displayable text.
 *
 * All returned strings are safe for display: no NaN, no Infinity, no undefined.
 * Nonsense inputs (NaN, negative positions, reversed lap counts, etc.) degrade gracefully
 * to readable values or placeholders.
 *
 * @param readout The current race state snapshot.
 * @returns Formatted HUD text ready for rendering.
 */
export function formatHud(readout: HudReadout): HudText {
  // Position: 1 -> "1st", 2 -> "2nd", etc.
  const position = positionOrdinal(readout.position);

  // Lap: "LAP 2/3", but never display "LAP 4/3". Clamp to valid range.
  // Defend against NaN by using fallback values.
  const lapNum = Number.isFinite(readout.lap) ? readout.lap : 0;
  const totalLaps = Number.isFinite(readout.totalLaps) ? readout.totalLaps : 0;
  const clampedTotalLaps = Math.max(0, totalLaps);
  const clampedLap = Math.max(0, Math.min(lapNum, clampedTotalLaps));
  const lap = `LAP ${clampedLap}/${clampedTotalLaps}`;

  // Time: "1:23.45"
  const time = formatRaceTime(readout.elapsedSeconds);

  // Ammo: "AMMO 3/5"
  // Defend against NaN by using fallback values.
  const ammoNum = Number.isFinite(readout.ammo) ? readout.ammo : 0;
  const ammoCap = Number.isFinite(readout.ammoCapacity) ? readout.ammoCapacity : 0;
  const clampedAmmo = Math.max(0, ammoNum);
  const clampedAmmoCap = Math.max(0, ammoCap);
  const ammo = `AMMO ${clampedAmmo}/${clampedAmmoCap}`;

  // Countdown: "3", "2", "1", "GO!", or null
  const countdown = formatCountdown(readout.phase, readout.countdownRemaining);

  // Integrity as 0..100 percent
  const integrityPercent = formatIntegrityPercent(readout.integrity);

  return {
    position,
    lap,
    time,
    ammo,
    countdown,
    integrityPercent,
  };
}
