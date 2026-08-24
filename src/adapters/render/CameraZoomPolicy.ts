/**
 * Camera zoom policy: speed + upcoming curvature → target zoom.
 *
 * Conventional racing framing: zoom IN (closer) on corners, zoom OUT (wider)
 * on fast straights. Stationary cars sit at homeZoom. Both straightness and
 * pace are required to reach the wide end.
 *
 * All inputs are defended against NaN, Infinity and pathological values.
 */

import {
  CAMERA_CLOSE_ZOOM,
  CAMERA_CORNER_CURVATURE,
  CAMERA_HOME_ZOOM,
  CAMERA_WIDE_ZOOM,
} from '../../domain/camera/CameraPreset.ts';

export interface CameraZoomPolicyOptions {
  /** Resting zoom. Defaults to 1.75. */
  readonly homeZoom?: number;
  /** Zoom used in corners. Defaults to CAMERA_CLOSE_ZOOM. */
  readonly closeZoom?: number;
  /** Zoom used on fast straights. Defaults to 1.275. */
  readonly wideZoom?: number;
  /**
   * Curvature at or above which the track counts as a full corner, in 1/world-units.
   * Defaults to 1/70.
   */
  readonly cornerCurvature?: number;
  /**
   * Optional zoom quantisation step. Defaults to 0 (no snapping).
   * When > 0, the computed zoom is rounded to the nearest multiple BEFORE clamp.
   */
  readonly zoomStep?: number;
}

export class CameraZoomPolicy {
  private readonly homeZoom: number;
  private readonly closeZoom: number;
  private readonly wideZoom: number;
  private readonly cornerCurvature: number;
  private readonly zoomStep: number;

  constructor(options?: CameraZoomPolicyOptions) {
    this.homeZoom = options?.homeZoom ?? CAMERA_HOME_ZOOM;
    this.closeZoom = options?.closeZoom ?? CAMERA_CLOSE_ZOOM;
    this.wideZoom = options?.wideZoom ?? CAMERA_WIDE_ZOOM;
    this.cornerCurvature = options?.cornerCurvature ?? CAMERA_CORNER_CURVATURE;
    this.zoomStep = options?.zoomStep ?? 0;

    if (!Number.isFinite(this.homeZoom) || this.homeZoom <= 0) {
      throw new Error(`homeZoom must be a finite positive number, got ${this.homeZoom}`);
    }
    if (!Number.isFinite(this.closeZoom) || this.closeZoom <= 0) {
      throw new Error(`closeZoom must be a finite positive number, got ${this.closeZoom}`);
    }
    if (!Number.isFinite(this.wideZoom) || this.wideZoom <= 0) {
      throw new Error(`wideZoom must be a finite positive number, got ${this.wideZoom}`);
    }
    if (this.cornerCurvature <= 0) {
      throw new Error(`cornerCurvature must be positive, got ${this.cornerCurvature}`);
    }
    if (!Number.isFinite(this.zoomStep) || this.zoomStep < 0) {
      throw new Error(`zoomStep must be a finite non-negative number, got ${this.zoomStep}`);
    }
  }

  /**
   * @param speed Current vehicle speed (world units/s). Reverse uses abs.
   * @param maxSpeed Must be positive; 0 or negative returns homeZoom.
   * @param upcomingCurvature Signed 1/world-units; magnitude drives zoom.
   */
  targetZoom(speed: number, maxSpeed: number, upcomingCurvature: number): number {
    if (
      !Number.isFinite(speed) ||
      !Number.isFinite(maxSpeed) ||
      !Number.isFinite(upcomingCurvature) ||
      maxSpeed <= 0
    ) {
      return this.homeZoom;
    }

    const absoluteSpeed = Math.abs(speed);
    const absC = Math.abs(upcomingCurvature);
    const straightness = Math.max(0, 1 - Math.min(1, absC / this.cornerCurvature));
    const cornerness = 1 - straightness;
    const pace = Math.min(1, absoluteSpeed / maxSpeed);

    let targetZoom =
      this.homeZoom +
      (this.closeZoom - this.homeZoom) * cornerness +
      (this.wideZoom - this.homeZoom) * straightness * pace;

    const rawLo = Math.min(this.wideZoom, this.closeZoom, this.homeZoom);
    const rawHi = Math.max(this.wideZoom, this.closeZoom, this.homeZoom);
    if (this.zoomStep > 0) {
      targetZoom = Math.round(targetZoom / this.zoomStep) * this.zoomStep;
    }
    const lo =
      this.zoomStep > 0
        ? Math.round(rawLo / this.zoomStep) * this.zoomStep
        : rawLo;
    const hi =
      this.zoomStep > 0
        ? Math.round(rawHi / this.zoomStep) * this.zoomStep
        : rawHi;
    return Math.max(lo, Math.min(hi, targetZoom));
  }
}
