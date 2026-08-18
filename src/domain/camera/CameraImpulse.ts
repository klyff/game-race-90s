import {
  CAMERA_EXPLOSION_KICK,
  CAMERA_EXPLOSION_ZOOM_IN,
  CAMERA_EXPLOSION_ZOOM_OUT,
  CAMERA_HIT_SHAKE_LEFT,
  CAMERA_HIT_SHAKE_RIGHT,
  CAMERA_HIT_SHAKE_SECONDS,
} from './CameraPreset.ts';

export interface CameraImpulseSample {
  /** Viewport-width fraction. Negative is left. */
  readonly x: number;
  /** Viewport-height fraction. Negative is up. */
  readonly y: number;
  /** Multiplier on the director zoom. 1 = unchanged. */
  readonly zoomScale: number;
}

type ImpulseKind = 'none' | 'hit' | 'explosion';

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * Math.max(0, Math.min(1, t));
}

function hitOffsetX(progress: number): number {
  if (progress < 0.2) {
    return lerp(0, -CAMERA_HIT_SHAKE_LEFT, progress / 0.2);
  }
  if (progress < 0.4) {
    return lerp(-CAMERA_HIT_SHAKE_LEFT, 0, (progress - 0.2) / 0.2);
  }
  if (progress < 0.7) {
    return lerp(0, CAMERA_HIT_SHAKE_RIGHT, (progress - 0.4) / 0.3);
  }
  return lerp(CAMERA_HIT_SHAKE_RIGHT, 0, (progress - 0.7) / 0.3);
}

/**
 * Presentation-only kick. Chase look-ahead stays clean; RaceScene applies
 * this sample after `ChaseCamera.follow()`.
 */
export class CameraImpulse {
  private kind: ImpulseKind = 'none';
  private elapsed = 0;
  private kickX = 0;
  private kickY = 0;
  private holdZoom = false;

  punchHit(): void {
    if (this.kind === 'explosion') {
      return;
    }
    this.kind = 'hit';
    this.elapsed = 0;
    this.holdZoom = false;
  }

  punchExplosion(random: () => number = Math.random): void {
    const signX = random() < 0.5 ? -1 : 1;
    const signY = random() < 0.5 ? -1 : 1;
    this.kind = 'explosion';
    this.elapsed = 0;
    this.kickX = signX * CAMERA_EXPLOSION_KICK;
    this.kickY = signY * CAMERA_EXPLOSION_KICK;
    this.holdZoom = true;
  }

  /** Player is back on the road — ease zoom off the wreck punch. */
  recoverFromExplosion(): void {
    this.holdZoom = false;
    if (this.kind === 'explosion' && this.elapsed >= CAMERA_HIT_SHAKE_SECONDS) {
      this.kind = 'none';
    }
  }

  /** Quit: the player will not respawn into the race. */
  cancelHold(): void {
    this.holdZoom = false;
    this.kind = 'none';
    this.elapsed = 0;
  }

  sample(deltaSeconds: number): CameraImpulseSample {
    const dt = Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? deltaSeconds : 0;
    if (this.kind === 'none') {
      return { x: 0, y: 0, zoomScale: 1 };
    }
    this.elapsed += dt;
    const progress = this.elapsed / CAMERA_HIT_SHAKE_SECONDS;

    if (this.kind === 'hit') {
      if (progress >= 1) {
        this.kind = 'none';
        return { x: 0, y: 0, zoomScale: 1 };
      }
      return { x: hitOffsetX(progress), y: 0, zoomScale: 1 };
    }

    const offset = this.explosionOffset(progress);
    const zoomScale = this.explosionZoom(progress);
    if (progress >= 1 && !this.holdZoom) {
      this.kind = 'none';
      return { x: 0, y: 0, zoomScale: 1 };
    }
    return { x: offset.x, y: offset.y, zoomScale };
  }

  private explosionOffset(progress: number): { x: number; y: number } {
    if (progress >= 1) {
      return { x: 0, y: 0 };
    }
    if (progress < 0.25) {
      const t = progress / 0.25;
      return { x: lerp(0, this.kickX, t), y: lerp(0, this.kickY, t) };
    }
    if (progress < 0.5) {
      const t = (progress - 0.25) / 0.25;
      return { x: lerp(this.kickX, 0, t), y: lerp(this.kickY, 0, t) };
    }
    if (progress < 0.75) {
      const t = (progress - 0.5) / 0.25;
      return { x: lerp(0, -this.kickX, t), y: lerp(0, -this.kickY, t) };
    }
    const t = (progress - 0.75) / 0.25;
    return { x: lerp(-this.kickX, 0, t), y: lerp(-this.kickY, 0, t) };
  }

  private explosionZoom(progress: number): number {
    if (progress < 0.25) {
      return lerp(1, CAMERA_EXPLOSION_ZOOM_IN, progress / 0.25);
    }
    if (progress < 0.5) {
      return lerp(
        CAMERA_EXPLOSION_ZOOM_IN,
        CAMERA_EXPLOSION_ZOOM_OUT,
        (progress - 0.25) / 0.25,
      );
    }
    if (this.holdZoom || progress < 1) {
      return CAMERA_EXPLOSION_ZOOM_OUT;
    }
    return 1;
  }
}
