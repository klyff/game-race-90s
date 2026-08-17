/**
 * Lightweight pursuit prediction. Aim where the opponent WILL be.
 * Poor predictors use a shorter, slightly stale horizon — not per-frame noise.
 */

import { add, length, scale, subtract } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';
import { clamp, clamp01, lerp } from './math.ts';

export function predictPosition(position: Vec2, velocity: Vec2, predictionTime: number): Vec2 {
  return add(position, scale(velocity, Math.max(0, predictionTime)));
}

/**
 * How far ahead to look. Better opponentPrediction → longer, more accurate horizon.
 */
export function predictionTime(
  distance: number,
  relativeSpeed: number,
  opponentPrediction: number,
): number {
  const skill = clamp01(opponentPrediction);
  const closing = Math.max(6, Math.abs(relativeSpeed));
  const raw = Math.max(0, distance) / closing;
  return clamp(raw * lerp(0.35, 1, skill), 0.08, 0.85);
}

/** See a slightly stale target when prediction skill is low. */
export function observedPosition(
  position: Vec2,
  velocity: Vec2,
  opponentPrediction: number,
  staleSeconds = 0.14,
): Vec2 {
  const delay = lerp(staleSeconds, 0, opponentPrediction);
  return subtract(position, scale(velocity, delay));
}

export function interceptPoint(
  targetPosition: Vec2,
  targetVelocity: Vec2,
  distance: number,
  relativeSpeed: number,
  opponentPrediction: number,
): Vec2 {
  const seen = observedPosition(targetPosition, targetVelocity, opponentPrediction);
  const time = predictionTime(distance, relativeSpeed, opponentPrediction);
  return predictPosition(seen, targetVelocity, time);
}

export function relativeSpeedAlong(selfVelocity: Vec2, targetVelocity: Vec2): number {
  return length(subtract(selfVelocity, targetVelocity));
}
