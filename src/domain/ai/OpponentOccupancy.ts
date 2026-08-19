/**
 * Opponent occupancy over a short horizon. Constant-velocity Frenet + growing radius.
 * Not a recursive "what they think I think".
 */

import { clamp01 } from './math.ts';

export interface OccupancySample {
  readonly s: number;
  readonly d: number;
  readonly radius: number;
}

export interface OccupancyRival {
  readonly carId: string;
  readonly s: number;
  readonly d: number;
  readonly speed: number;
  readonly collisionRadius: number;
  readonly isTarget: boolean;
}

export function occupancyTube(
  rival: OccupancyRival,
  horizon: number,
  dt: number,
  trackLength: number,
  opponentPrediction: number,
): readonly OccupancySample[] {
  const skill = clamp01(opponentPrediction);
  const samples: OccupancySample[] = [];
  const steps = Math.max(1, Math.round(horizon / dt));
  for (let i = 1; i <= steps; i += 1) {
    const t = i * dt;
    let s = rival.s + rival.speed * t;
    if (trackLength > 0) {
      s = ((s % trackLength) + trackLength) % trackLength;
    }
    const uncertainty = (0.55 + (1 - skill) * 1.4) * t;
    samples.push({
      s,
      d: rival.d,
      radius: rival.collisionRadius + 0.6 + uncertainty,
    });
  }
  return samples;
}

export function wrappedArcGap(from: number, to: number, trackLength: number): number {
  if (trackLength <= 0) {
    return Math.abs(to - from);
  }
  let gap = to - from;
  if (gap > trackLength * 0.5) {
    gap -= trackLength;
  } else if (gap < -trackLength * 0.5) {
    gap += trackLength;
  }
  return gap;
}

export function minSeparation(
  selfS: number,
  selfD: number,
  selfRadius: number,
  sample: OccupancySample,
  trackLength: number,
): number {
  const ds = wrappedArcGap(selfS, sample.s, trackLength);
  const dd = selfD - sample.d;
  const dist = Math.hypot(ds, dd);
  return dist - selfRadius - sample.radius;
}
