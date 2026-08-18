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
  /** Oil slicks remaining. When set with `mines`, the HUD shows A/S/D counts. */
  readonly oil?: number;
  /** Landmines remaining. When set with `oil`, the HUD shows A/S/D counts. */
  readonly mines?: number;
  /** Hops remaining. When set with oil/mines, the HUD appends `SPC n`. */
  readonly jumps?: number;
  /** Turbo charges remaining. */
  readonly turbos?: number;
  /** True while a turbo charge is burning. */
  readonly turboActive?: boolean;
  readonly integrity: number; // 0..1 (0% to 100%)
  readonly standings: readonly { readonly carId: string; readonly position: number }[];
  /** The player's current speed, world units per second. */
  readonly speed: number;
  /** The player car's authored top speed, world units per second. Sizes the bar. */
  readonly maxSpeed: number;
  /**
   * Live purse (starting bank + hit bounties this race). Optional so existing
   * `formatHud` tests stay unchanged; the HUD scene formats it itself.
   */
  readonly cash?: number;
  /** Live season points plus this race's hit bonuses. */
  readonly points?: number;
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
  readonly speed: string; // e.g. "195 MPH"
  readonly speedFraction: number; // 0..1, for a bar width
  /**
   * Exactly three characters of speed for the seven-segment display, space-padded and
   * right-aligned, e.g. "195", " 95", "  0". Space-padded rather than zero-padded because
   * a real seven-segment dash blanks its leading digits instead of showing "095".
   */
  readonly speedDigits: string;
}

/**
 * World units per second -> the number on the dial.
 *
 * The simulation has no real-world scale: `maxSpeed` is 78 for the marauder and 95 for the
 * air-blade, which are tuning numbers, not speeds. A dial reading "78" would look broken, so
 * the readout is scaled into the range an arcade racer of this era displayed. It is a
 * PRESENTATION constant and lives here rather than in `src/domain/constants.ts` on purpose:
 * nothing in the simulation may depend on it, and a change here must never move a car.
 */
export const MPH_PER_WORLD_UNIT = 2.5;

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
    return 'GOOOO!';
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
 * Speed as a whole number plus its unit, e.g. "195 MPH". Never NaN, never negative.
 *
 * Rounds ties down (`237.5` -> `237`, not `238`) rather than with `Math.round`'s usual
 * round-half-up: the air-blade's authored `maxSpeed` of 95 lands exactly on a `.5` at this
 * scale factor, and `Math.round` would push its dial reading a whole MPH past the number
 * the car was tuned to represent.
 */
export function formatSpeed(speed: number): string {
  const safe = Number.isFinite(speed) ? speed : 0;
  const mph = Math.abs(safe) * MPH_PER_WORLD_UNIT;
  return `${Math.ceil(mph - 0.5)} MPH`;
}

/**
 * Speed as exactly three space-padded characters for a seven-segment display.
 *
 * Shares `formatSpeed`'s rounding exactly (ceil of value-minus-half, i.e. round-half-down)
 * so the seven-segment readout and the text readout can never disagree about the number
 * they are both derived from. Clamped at 999 — a real seven-segment gauge has three cells
 * and a fourth digit has nowhere to go; without the clamp a huge or post-collision
 * overspeed value would silently overflow into a four-character string.
 *
 * @param speed Current speed, world units per second. May be negative (reversing) or
 * non-finite, in which case it is treated as 0.
 * @returns Exactly three characters, right-aligned and space-padded, e.g. "195", " 95", "  0".
 */
export function formatSpeedDigits(speed: number): string {
  const safe = Number.isFinite(speed) ? speed : 0;
  const mph = Math.abs(safe) * MPH_PER_WORLD_UNIT;
  const rounded = Math.ceil(mph - 0.5);
  const clamped = Math.min(999, rounded);
  return String(clamped).padStart(3, ' ');
}

/**
 * Fraction of the speed bar to fill, 0..1.
 *
 * Guards a zero, negative or non-finite `maxSpeed`: dividing by such a value would yield
 * NaN or Infinity, and a NaN width makes a Phaser rectangle draw nothing at all with no
 * error, so this returns 0 rather than propagate the bad value.
 *
 * @param speed Current speed, world units per second. May be negative (reversing).
 * @param maxSpeed Authored top speed, world units per second.
 * @returns Clamped fraction, 0 to 1.
 */
function formatSpeedFraction(speed: number, maxSpeed: number): number {
  if (!Number.isFinite(maxSpeed) || maxSpeed <= 0 || !Number.isFinite(speed)) {
    return 0;
  }

  const fraction = Math.abs(speed) / maxSpeed;
  return Math.max(0, Math.min(1, fraction));
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

  // Ammo: "A 3  S 2  D 1" when the three-weapon loadout is present, else "AMMO 3/5".
  const ammoNum = Number.isFinite(readout.ammo) ? readout.ammo : 0;
  const ammoCap = Number.isFinite(readout.ammoCapacity) ? readout.ammoCapacity : 0;
  const clampedAmmo = Math.max(0, ammoNum);
  const clampedAmmoCap = Math.max(0, ammoCap);
  const oilCount = Math.max(0, Number.isFinite(readout.oil) ? readout.oil! : 0);
  const mineCount = Math.max(0, Number.isFinite(readout.mines) ? readout.mines! : 0);
  const turboCount = Math.max(0, Number.isFinite(readout.turbos) ? readout.turbos! : 0);
  const loadout =
    readout.oil !== undefined && readout.mines !== undefined
      ? `${clampedAmmo}  ${mineCount}  ${oilCount}`
      : `AMMO ${clampedAmmo}/${clampedAmmoCap}`;
  const ammo =
    readout.oil !== undefined && readout.mines !== undefined && readout.turbos !== undefined
      ? `${loadout}  ${turboCount}`
      : loadout;

  // Countdown: "3", "2", "1", "GO!", or null
  const countdown = formatCountdown(readout.phase, readout.countdownRemaining);

  // Integrity as 0..100 percent
  const integrityPercent = formatIntegrityPercent(readout.integrity);

  // Speed: "195 MPH", plus the fraction of maxSpeed for the bar width.
  const speed = formatSpeed(readout.speed);
  const speedFraction = formatSpeedFraction(readout.speed, readout.maxSpeed);
  const speedDigits = formatSpeedDigits(readout.speed);

  return {
    position,
    lap,
    time,
    ammo,
    countdown,
    integrityPercent,
    speed,
    speedFraction,
    speedDigits,
  };
}
