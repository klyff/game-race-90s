import { distance } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';
import {
  CAMERA_ACCIDENT_HOLD_SECONDS,
  CAMERA_CLUSTER_RADIUS_UNITS,
} from './CameraPreset.ts';

export interface CameraContactEvent {
  readonly carIdA: string;
  readonly carIdB: string;
  readonly impactSpeed: number;
  readonly position: Vec2;
}

export interface ClusterCandidate {
  readonly carId: string;
  readonly position: Vec2;
}

/**
 * Spectator attraction: a pairwise crash of 2+ cars holds the camera for a
 * few seconds, then the caller falls back to the race leader.
 */
export class AccidentWatch {
  private remaining = 0;
  private carId: string | null = null;

  note(contacts: readonly CameraContactEvent[], threshold: number, deltaSeconds: number): void {
    const dt = Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? deltaSeconds : 0;
    if (this.remaining > 0) {
      this.remaining = Math.max(0, this.remaining - dt);
      if (this.remaining === 0) {
        this.carId = null;
      }
    }
    for (const contact of contacts) {
      if (contact.impactSpeed <= threshold) {
        continue;
      }
      this.carId = contact.carIdA;
      this.remaining = CAMERA_ACCIDENT_HOLD_SECONDS;
      return;
    }
  }

  targetCarId(): string | null {
    return this.remaining > 0 ? this.carId : null;
  }

  jumpToCluster(candidates: readonly ClusterCandidate[]): string | null {
    if (candidates.length < 2) {
      return null;
    }
    let bestId = candidates[0]!.carId;
    let bestCount = 0;
    for (const candidate of candidates) {
      let neighbours = 0;
      for (const other of candidates) {
        if (other.carId === candidate.carId) {
          continue;
        }
        if (distance(candidate.position, other.position) <= CAMERA_CLUSTER_RADIUS_UNITS) {
          neighbours += 1;
        }
      }
      if (neighbours > bestCount) {
        bestCount = neighbours;
        bestId = candidate.carId;
      }
    }
    if (bestCount < 1) {
      return null;
    }
    this.carId = bestId;
    this.remaining = CAMERA_ACCIDENT_HOLD_SECONDS;
    return bestId;
  }
}
