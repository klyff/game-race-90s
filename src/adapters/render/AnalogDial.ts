/**
 * Pure sweep math for the analog cluster. Lives apart from Phaser so Node tests
 * can assert rest / peg / halfway without booting a canvas.
 */

export const SPEED_DIAL_MAX_MPH = 220;
export const RPM_DIAL_MAX = 6000;
export const RPM_REDLINE = 5500;

/** Canvas angle: 0 = right, clockwise. Rest at 7:30, peg at 4:30, sweep over the top. */
export const DIAL_START_RAD = (135 * Math.PI) / 180;
export const DIAL_SWEEP_RAD = (270 * Math.PI) / 180;

export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

/** Needle angle for a 0..1 reading. */
export function dialAngle(fraction: number): number {
  return DIAL_START_RAD + DIAL_SWEEP_RAD * clampUnit(fraction);
}

export function mphDialFraction(mph: number): number {
  if (!Number.isFinite(mph) || mph <= 0) {
    return 0;
  }
  return clampUnit(mph / SPEED_DIAL_MAX_MPH);
}

/**
 * Gearbox `rpmFraction` is idle..1 (default idle 0.15). Maps onto the 0–6000 dial
 * so idle sits near 900 and an upshift pegs ~5500 then drops.
 */
export function rpmDialFraction(rpmFraction: number): number {
  return clampUnit(rpmFraction);
}
