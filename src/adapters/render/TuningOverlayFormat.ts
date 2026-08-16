/**
 * Tuning overlay formatter: pure, testable formatting logic for the in-game debug display.
 *
 * The overlay is a 6-line fixed-width block displaying telemetry, geometry, and control state.
 * It is pure (no Phaser, no side effects) so it can be unit-tested in Node, and defensive against
 * NaN/Infinity so it never becomes unreadable when a number goes bad.
 *
 * Rationale: every field in the overlay silently changes what the screen looks like rather than
 * throwing, so a display that shows garbage when physics breaks is not a bug report — it is a
 * lie that hides the actual bug (see WORKLOG T-026). This module defends against it.
 */

import type { VehicleTelemetry } from '../../domain/vehicle/Vehicle.ts';

/**
 * One snapshot of telemetry and state for the tuning overlay.
 *
 * Fields match the data available in `RaceScene` at each rendering frame.
 */
export interface TuningOverlayReadout {
  /** Car display name, e.g. "Marauder". */
  readonly carName: string;
  /** Track display name, e.g. "Thunder Basin". */
  readonly trackName: string;
  /** Current telemetry snapshot. null only immediately after respawn, before the first simulation step. */
  readonly telemetry: VehicleTelemetry | null;
  /** Lateral offset from the spline's centre, in world units. Positive = left of travel. */
  readonly lateralOffset: number;
  /** Half-width of the road surface, in world units. Beyond this, the car is off-road. */
  readonly halfWidth: number;
  /** True if the car is in reverse gear. */
  readonly reversing: boolean;
  /** Camera zoom level, typically 1.5–2.0. */
  readonly zoom: number;
  /** True if audio is muted. */
  readonly muted: boolean;
  /** Current sprite frame name or index, e.g. "marauder_0" or 0. */
  readonly spriteFrame: string | number;
}

/**
 * Safe numeric formatter: if the value is NaN or Infinity, return a short placeholder.
 *
 * @param value The number to format.
 * @param decimalPlaces Number of decimal places to show.
 * @param placeholder Short string to return if value is not finite. Defaults to "?".
 */
function safeFormat(
  value: number,
  decimalPlaces: number,
  placeholder: string = '?',
): string {
  if (!Number.isFinite(value)) {
    return placeholder;
  }
  return value.toFixed(decimalPlaces);
}

/**
 * Format the tuning overlay into one string per line.
 *
 * Returns exactly 6 lines, monospace-safe with no trailing whitespace. All fields are
 * non-null, non-NaN, and safe to display. Telemetry nulls render as zeroes.
 *
 * Lines:
 *   1. `CAR NAME` (uppercased) + track name
 *   2. `spd <speed> u/s   fwd <forwardSpeed>   lat <lateralSpeed>`  — one decimal each
 *   3. `slip <slip>°   grip <0..1 two decimals>   SLIDING | gripping`
 *   4. `gear <D|R>   surf <TARMAC|DIRT>   off <lateralOffset>`
 *   5. `zoom <two decimals>   frame <spriteFrame>`
 *   6. `[T] overlay  [C] car  [R] respawn  [M] mute/unmute` — M label reflects muted state
 *
 * @param readout The telemetry and state snapshot.
 * @returns Array of exactly 6 strings, each with no trailing whitespace.
 */
export function formatTuningOverlay(readout: TuningOverlayReadout): readonly string[] {
  const tel = readout.telemetry;
  const speed = tel?.speed ?? 0;
  const forwardSpeed = tel?.forwardSpeed ?? 0;
  const lateralSpeed = tel?.lateralSpeed ?? 0;
  const slipAngleDegrees = tel ? tel.slipAngle * (180 / Math.PI) : 0;
  const gripUsage = tel?.gripUsage ?? 0;
  const isSliding = tel?.isSliding ?? false;

  // Determine surface: TARMAC if within halfWidth, DIRT otherwise.
  const onTarmac = Math.abs(readout.lateralOffset) <= readout.halfWidth;
  const surface = onTarmac ? 'TARMAC' : 'DIRT';

  // Determine gear: D for forward, R for reverse.
  const gear = readout.reversing ? 'R' : 'D';

  // The legend names what the key WILL DO, not the current state: while the audio is
  // muted the useful thing to offer is "unmute". Labelling it with the state instead
  // reads as "audio is muted" right when the player wants to know how to undo it.
  const muteLabel = readout.muted ? 'unmute' : 'mute';

  // Line 1: CAR NAME and track name.
  const line1 = `${readout.carName.toUpperCase()}  ${readout.trackName}`;

  // Line 2: speeds.
  const line2 =
    `spd ${safeFormat(speed, 1)} u/s   ` +
    `fwd ${safeFormat(forwardSpeed, 1)}   ` +
    `lat ${safeFormat(lateralSpeed, 1)}`;

  // Line 3: slip angle, grip, sliding state.
  const slipStr = safeFormat(slipAngleDegrees, 1);
  const slidingState = isSliding ? 'SLIDING' : 'gripping';
  const line3 =
    `slip ${slipStr}°   ` +
    `grip ${safeFormat(gripUsage, 2)}   ` +
    `${slidingState}`;

  // Line 4: gear, surface, lateral offset.
  const line4 =
    `gear ${gear}   ` +
    `surf ${surface}   ` +
    `off ${safeFormat(readout.lateralOffset, 2)}`;

  // Line 5: zoom and sprite frame.
  const line5 =
    `zoom ${safeFormat(readout.zoom, 2)}   ` +
    `frame ${readout.spriteFrame}`;

  // Line 6: key legend with mute label.
  const line6 = `[T] overlay  [C] car  [R] respawn  [M] ${muteLabel}`;

  return [line1, line2, line3, line4, line5, line6];
}
