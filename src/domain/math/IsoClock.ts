import { ISO_X, ISO_Y } from '../constants.ts';
import { VEC2_ZERO, type Vec2 } from './Vec2.ts';

export const SPINNER_CLOCK_FRAMES = 32;
export const SPINNER_CLOCK_STEP_DEG = 11.25;
export const SPINNER_HERO_CLOCK_INDEX = 7;

/**
 * 2:1 dimetric: world heading → screen travel. Phaser +Y is down.
 * +X world → (ISO_X, ISO_Y) = down-right. +Y world → (-ISO_X, ISO_Y) = down-left.
 */
export function screenDeltaFromHeading(heading: number): Vec2 {
  const cosine = Math.cos(heading);
  const sine = Math.sin(heading);
  return {
    x: ISO_X * (cosine - sine),
    y: ISO_Y * (cosine + sine),
  };
}

/** Same 2:1 basis, for a world chord (start line → 50 m ahead, or any travel). */
export function screenDeltaFromWorldDelta(delta: Vec2): Vec2 {
  return {
    x: ISO_X * (delta.x - delta.y),
    y: ISO_Y * (delta.x + delta.y),
  };
}

/** Inverse of `screenDeltaFromWorldDelta` (unscaled screen, ppu = 1). */
export function worldDeltaFromScreenDelta(screen: Vec2): Vec2 {
  return {
    x: screen.x / (2 * ISO_X) + screen.y / (2 * ISO_Y),
    y: screen.y / (2 * ISO_Y) - screen.x / (2 * ISO_X),
  };
}

/**
 * Unit screen vector for a clock yaw. 0 = 6h = +Y (nose to the bottom).
 * Positive yaw is clockwise in this helper, matching `clockYawFromScreenDelta`.
 */
export function clockScreenUnit(yaw: number): Vec2 {
  return { x: -Math.sin(yaw), y: Math.cos(yaw) };
}

/**
 * World offset of `screenPx` exactly behind the car on the 2:1 clock axis.
 * Snaps to the nearest 32-slot pose so the puck sits on the sprite's rear
 * (indice[n] nose → indice[n+16] tail), not on raw world heading.
 */
export function worldOffsetBehindClock(
  heading: number,
  screenPx: number,
  pixelsPerUnit: number,
  frameCount: number = SPINNER_CLOCK_FRAMES,
): Vec2 {
  const px = Number.isFinite(screenPx) ? screenPx : 0;
  const ppu = Number.isFinite(pixelsPerUnit) && pixelsPerUnit > 0 ? pixelsPerUnit : 1;
  if (px === 0) {
    return VEC2_ZERO;
  }
  const slot = nearestClockIndex(clockYawFromWorldHeading(heading), frameCount);
  const count = Number.isFinite(frameCount) && frameCount > 0 ? Math.floor(frameCount) : SPINNER_CLOCK_FRAMES;
  const rearYaw = (slot * Math.PI * 2) / count + Math.PI;
  const screen = clockScreenUnit(rearYaw);
  return worldDeltaFromScreenDelta({
    x: (screen.x * px) / ppu,
    y: (screen.y * px) / ppu,
  });
}

/**
 * Sprite clock yaw. 0 = 6h = screen down = indice[0] (nose to the bottom).
 * Positive is clockwise in this helper. Live strips are 32 CCW and remap
 * in `frameIndexForHeading`. Archive matrix_car a000…a029 used CW as-is.
 */
export function clockYawFromScreenDelta(screen: Vec2): number {
  return Math.atan2(-screen.x, screen.y);
}

export function clockYawFromWorldHeading(heading: number): number {
  return clockYawFromScreenDelta(screenDeltaFromHeading(heading));
}

/** Nearest slot in the strip array. Live spinner: 32 frames, 11.25° per index. */
export function nearestClockIndex(yaw: number, frameCount: number): number {
  const count = Number.isFinite(frameCount) && frameCount > 0 ? Math.floor(frameCount) : 1;
  const arc = (Math.PI * 2) / count;
  const index = ((Math.round(yaw / arc) % count) + count) % count;
  return index === 0 ? 0 : index;
}

/**
 * Nearest *clockwise* strip frame for a world heading under the 2:1 clock.
 * Live 32 CCW sheets remap this in `frameIndexForHeading`.
 */
export function frameIndexForClockHeading(heading: number, frameCount: number): number {
  return nearestClockIndex(clockYawFromWorldHeading(heading), frameCount);
}

/**
 * Nearest array index for a world chord after 2:1 projection.
 * Start pose: point zero → 50 m along the line. Curves: current travel.
 */
export function nearestClockIndexFromWorldChord(
  from: Vec2,
  to: Vec2,
  frameCount: number,
): number {
  return nearestClockIndex(
    clockYawFromScreenDelta(
      screenDeltaFromWorldDelta({ x: to.x - from.x, y: to.y - from.y }),
    ),
    frameCount,
  );
}

/** @deprecated Archive 30-slot CW clock. Live cars use SPINNER_CLOCK_*. */
export const MATRIX_CLOCK_FRAMES = 30;
/** @deprecated Archive 12° CW step. */
export const MATRIX_CLOCK_STEP_DEG = 12;

export interface MatrixClockSlot {
  readonly index: number;
  readonly angleDeg: number;
  readonly clockLabel: string;
  readonly worldHeading: number;
  readonly screen: Vec2;
}

function wrapTau(radians: number): number {
  const tau = Math.PI * 2;
  const wrapped = radians % tau;
  return wrapped < 0 ? wrapped + tau : wrapped;
}

function padClockMinute(minute: number): string {
  const whole = Math.floor(minute);
  const half = Math.abs(minute - whole - 0.5) < 1e-9;
  const body = String(whole).padStart(2, '0');
  return half ? `${body}.5` : body;
}

function clockLabelFromMinutesPastMidnight(totalMinutes: number): string {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour24 = Math.floor(wrapped / 60) % 24;
  const minute = wrapped % 60;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${padClockMinute(minute)}`;
}

/** Live spinner: `indice[0] = 6:00`, then −22.5 min of clock face per slot (CCW). */
export function spinnerClockLabel(index: number): string {
  const slot = ((Math.floor(index) % SPINNER_CLOCK_FRAMES) + SPINNER_CLOCK_FRAMES) % SPINNER_CLOCK_FRAMES;
  return clockLabelFromMinutesPastMidnight(6 * 60 - slot * 22.5);
}

export function spinnerClockAngleDeg(index: number): number {
  const slot = ((Math.floor(index) % SPINNER_CLOCK_FRAMES) + SPINNER_CLOCK_FRAMES) % SPINNER_CLOCK_FRAMES;
  return slot * SPINNER_CLOCK_STEP_DEG;
}

/** @deprecated Archive 30-slot CW labels. Live cars use `spinnerClockLabel`. */
export function matrixClockLabel(index: number): string {
  const slot = ((Math.floor(index) % MATRIX_CLOCK_FRAMES) + MATRIX_CLOCK_FRAMES) % MATRIX_CLOCK_FRAMES;
  const minutesFromSix = slot * 24;
  const totalMinutes = 6 * 60 + minutesFromSix;
  const hour24 = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')}`;
}

export function matrixClockAngleDeg(index: number): number {
  const slot = ((Math.floor(index) % MATRIX_CLOCK_FRAMES) + MATRIX_CLOCK_FRAMES) % MATRIX_CLOCK_FRAMES;
  return slot * MATRIX_CLOCK_STEP_DEG;
}

/**
 * A world heading whose 2:1 clock lands on `index`.
 * Sweeps the circle and keeps the heading closest to the official slot yaw.
 */
export function worldHeadingForClockIndex(index: number, frameCount: number = MATRIX_CLOCK_FRAMES): number {
  const count = Number.isFinite(frameCount) && frameCount > 0 ? Math.floor(frameCount) : 1;
  const target = ((Math.floor(index) % count) + count) % count;
  const wantYaw = (target * (Math.PI * 2)) / count;
  let bestHeading = 0;
  let bestError = Number.POSITIVE_INFINITY;
  const steps = 720;
  for (let step = 0; step < steps; step += 1) {
    const heading = (step / steps) * Math.PI * 2;
    if (frameIndexForClockHeading(heading, count) !== target) {
      continue;
    }
    let error = Math.abs(wrapTau(clockYawFromWorldHeading(heading)) - wantYaw);
    if (error > Math.PI) {
      error = Math.PI * 2 - error;
    }
    if (error < bestError) {
      bestError = error;
      bestHeading = heading;
    }
  }
  return bestHeading;
}

export function matrixClockSlots(frameCount: number = MATRIX_CLOCK_FRAMES): readonly MatrixClockSlot[] {
  const count = Number.isFinite(frameCount) && frameCount > 0 ? Math.floor(frameCount) : 1;
  const slots: MatrixClockSlot[] = [];
  for (let index = 0; index < count; index += 1) {
    const worldHeading = worldHeadingForClockIndex(index, count);
    slots.push({
      index,
      angleDeg:
        count === SPINNER_CLOCK_FRAMES
          ? spinnerClockAngleDeg(index)
          : count === MATRIX_CLOCK_FRAMES
            ? matrixClockAngleDeg(index)
            : (index * 360) / count,
      clockLabel:
        count === SPINNER_CLOCK_FRAMES
          ? spinnerClockLabel(index)
          : count === MATRIX_CLOCK_FRAMES
            ? matrixClockLabel(index)
            : `${index}`,
      worldHeading,
      screen: screenDeltaFromHeading(worldHeading),
    });
  }
  return slots;
}
