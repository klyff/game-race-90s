/**
 * Camera zoom policy: determine the zoom level based on vehicle speed and track curvature.
 *
 * This policy implements the opposite of the usual "zoom out when fast" convention:
 * it zooms IN on high-speed straights and OUT in corners. This is deliberate and makes
 * sense for this game: tight corners are brief and benefit from a wide view, while
 * long straights at high speed benefit from the car looking larger on screen.
 *
 * The policy factors two normalized inputs: `straightness` (how straight the upcoming
 * track is) and `pace` (how fast the car is moving). Both must be fully realized
 * (straightness=1 and pace=1) to achieve maximum zoom on a straight; a straight with
 * a stationary car still zooms to cornerZoom, and full speed in a corner stays at cornerZoom.
 *
 * All inputs are defended against NaN, Infinity and pathological values.
 */

export interface CameraZoomPolicyOptions {
  /**
   * Zoom level used in corners and at low speed. Defaults to 1.5.
   */
  readonly cornerZoom?: number;

  /**
   * Zoom level used on fast straights. Defaults to 2.0.
   * This inverted zoom (larger on straights, smaller in corners) is the opposite
   * of most driving games and is intentional; see class doc.
   */
  readonly straightZoom?: number;

  /**
   * Curvature at or above which the track counts as a full corner, in 1/world-units.
   * Defaults to 1/70.
   *
   * Reasoning: Thunder Basin's tightest corner (west hairpin) has radius 39.8 units
   * (curvature ≈ 0.025), and its fastest sweeper has radius ≈ 110 units (curvature ≈ 0.009).
   * Setting the threshold at 1/70 ≈ 0.0143 reads the hairpin as a full corner and the
   * sweeper as roughly two-thirds of a corner, matching the intended difficulty spread.
   */
  readonly cornerCurvature?: number;

  /**
   * Optional zoom quantisation step, in world units. Defaults to 0 (no snapping).
   *
   * When zoomStep > 0, the computed zoom is rounded to the nearest multiple of zoomStep
   * BEFORE the final clamp to [cornerZoom, straightZoom]. This confines resampling
   * shimmer when using pre-rendered pixel art.
   *
   * WHY this exists: car sprites are 64×64 px pre-rendered frames at 32 yaw angles.
   * A continuously varying zoom resamples them every frame, introducing visual noise.
   * Snapping to discrete steps (e.g., zoomStep: 0.5 yielding only 1.5 or 2.0) keeps
   * the car at one of two stable scales so resampling shimmer is confined to
   * the brief transition between them, not spread across the whole range.
   */
  readonly zoomStep?: number;
}

export class CameraZoomPolicy {
  private readonly cornerZoom: number;
  private readonly straightZoom: number;
  private readonly cornerCurvature: number;
  private readonly zoomStep: number;

  constructor(options?: CameraZoomPolicyOptions) {
    this.cornerZoom = options?.cornerZoom ?? 1.5;
    this.straightZoom = options?.straightZoom ?? 2.0;
    this.cornerCurvature = options?.cornerCurvature ?? 1 / 70;
    this.zoomStep = options?.zoomStep ?? 0;

    // Validate constructor inputs.
    if (
      !Number.isFinite(this.cornerZoom) ||
      this.cornerZoom <= 0
    ) {
      throw new Error(
        `cornerZoom must be a finite positive number, got ${this.cornerZoom}`,
      );
    }
    if (
      !Number.isFinite(this.straightZoom) ||
      this.straightZoom <= 0
    ) {
      throw new Error(
        `straightZoom must be a finite positive number, got ${this.straightZoom}`,
      );
    }
    if (this.cornerCurvature <= 0) {
      throw new Error(
        `cornerCurvature must be positive, got ${this.cornerCurvature}`,
      );
    }
    if (!Number.isFinite(this.zoomStep) || this.zoomStep < 0) {
      throw new Error(
        `zoomStep must be a finite non-negative number, got ${this.zoomStep}`,
      );
    }
  }

  /**
   * Compute the target zoom level given current speed, max speed, and upcoming curvature.
   *
   * @param speed Current vehicle speed (world units/s). Negative values (reversing) are treated as their absolute value.
   * @param maxSpeed Maximum vehicle speed (world units/s). Must be positive; 0 or negative returns cornerZoom.
   * @param upcomingCurvature Track curvature ahead (1/world-units), signed.
   *   Positive bends left, negative bends right; the magnitude is what matters for zoom.
   *
   * @returns Zoom level clamped to [cornerZoom, straightZoom]. Never NaN or Infinity.
   */
  targetZoom(
    speed: number,
    maxSpeed: number,
    upcomingCurvature: number,
  ): number {
    // Clamp: if any input is pathological, return cornerZoom (the safe default).
    if (
      !Number.isFinite(speed) ||
      !Number.isFinite(maxSpeed) ||
      !Number.isFinite(upcomingCurvature) ||
      maxSpeed <= 0
    ) {
      return this.cornerZoom;
    }

    // Handle negative speed (reversing): use absolute value. A car driving backwards
    // on a straight still deserves the look-ahead zoom benefit if moving fast.
    const absoluteSpeed = Math.abs(speed);

    // Compute straightness: how close to a pure straight the track is.
    // absC = absolute value of curvature (direction does not matter for zoom).
    // straightness = 1 on a dead straight (absC → 0), drops to 0 at cornerCurvature.
    const absC = Math.abs(upcomingCurvature);
    const straightness = Math.max(
      0,
      1 - Math.min(1, absC / this.cornerCurvature),
    );

    // Compute pace: how fast the car is moving relative to its max speed.
    // pace = 0 when stationary, 1 at maxSpeed, clamped to [0, 1].
    const pace = Math.min(1, absoluteSpeed / maxSpeed);

    // Target zoom: blend from cornerZoom (straightness=0 or pace=0) to straightZoom (both=1).
    const zoomRange = this.straightZoom - this.cornerZoom;
    let targetZoom =
      this.cornerZoom + zoomRange * straightness * pace;

    // Apply zoom quantisation if enabled. Round to the nearest multiple of zoomStep
    // BEFORE the final clamp, so a rounded value can never escape the band.
    if (this.zoomStep > 0) {
      targetZoom = Math.round(targetZoom / this.zoomStep) * this.zoomStep;
    }

    // Final clamp: ensure result is always in range, never NaN.
    // (Theoretically impossible given the above, but belt-and-suspenders.)
    return Math.max(
      this.cornerZoom,
      Math.min(this.straightZoom, targetZoom),
    );
  }
}
