/**
 * Chase camera that follows a vehicle with configurable lead and smoothing.
 *
 * The camera tracks the car's position ahead of its current velocity,
 * projecting the target into screen space before smoothing to it.
 * Smoothing is frame-rate independent using an exponential decay formula
 * rather than a fixed per-frame lerp, which would lag differently at 30, 60,
 * or 144 Hz — exactly the kind of thing that ships as a subtle, reproducible
 * bug and wastes hours in QA.
 *
 * Zoom is adaptive and driven by CameraZoomPolicy, owned by the scene. When a target zoom
 * is provided to follow() or snapTo(), the camera eases towards it using a separate,
 * slower time constant; zoom changes read as much slower to the eye than translation,
 * so using the same smoothing factor for both would make the zoom snap too fast and feel nauseating.
 *
 * The camera is manually controlled by snapTo() and follow(). It does NOT use
 * camera.startFollow(), which would fight this class for control and defeat
 * the look-ahead.
 */

import type { VehicleState } from '../../domain/vehicle/Vehicle.ts';
import { add, scale } from '../../domain/math/Vec2.ts';
import type { ScreenPoint } from './IsoProjection.ts';
import { IsoProjection } from './IsoProjection.ts';

export interface ChaseCameraOptions {
  /**
   * Camera zoom level. Defaults to 1.
   * Pre-rendered pixel art at 64 px per frame requires integer zoom to avoid resampling artifacts.
   */
  readonly zoom?: number;
  /**
   * Seconds of velocity to lead the car by, so the driver sees where they are going.
   * Defaults to 0.35 seconds, which at 78 units/s (marauder's max speed) looks ahead about 27 units.
   */
  readonly lookAheadSeconds?: number;
  /**
   * Time constant of the smoothing, in seconds. Larger is lazier.
   * Defaults to 0.18 seconds; at 0.18 the camera reaches 63% of target distance per time constant.
   */
  readonly smoothingSeconds?: number;
  /**
   * Time constant for zoom smoothing, in seconds. Larger is lazier.
   * Defaults to 0.6 seconds. Separate from smoothingSeconds because zoom changes
   * read as much slower to the eye than translation; using the same time constant
   * would make zoom snap nauseating.
   */
  readonly zoomSmoothingSeconds?: number;
}

export class ChaseCamera {
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private readonly projection: IsoProjection;
  private readonly defaultZoom: number;
  private currentZoom: number;
  private currentX = 0;
  private currentY = 0;
  private readonly lookAheadSeconds: number;
  private readonly smoothingSeconds: number;
  private readonly zoomSmoothingSeconds: number;

  constructor(
    camera: Phaser.Cameras.Scene2D.Camera,
    projection: IsoProjection,
    options?: ChaseCameraOptions,
  ) {
    this.camera = camera;
    this.projection = projection;

    // Default zoom = 1: the sprites are 64 px pre-rendered pixel art and any non-integer zoom would resample them.
    this.defaultZoom = options?.zoom ?? 1;
    this.currentZoom = this.defaultZoom;
    // Default lookAheadSeconds = 0.35: reasonable lead at ~78 units/s, about 27 units ahead.
    this.lookAheadSeconds = options?.lookAheadSeconds ?? 0.35;
    // Default smoothingSeconds = 0.18: feels responsive without jitter, exponential decay time constant.
    this.smoothingSeconds = options?.smoothingSeconds ?? 0.18;
    // Default zoomSmoothingSeconds = 0.6: much slower than position smoothing, because zoom
    // changes read as slower to the eye; matching position smoothing makes zoom feel jerky.
    this.zoomSmoothingSeconds = options?.zoomSmoothingSeconds ?? 0.6;

    this.camera.setZoom(this.currentZoom);
  }

  /**
   * Jump straight to the target with no smoothing.
   * Use on spawn and after a reset to place the camera immediately.
   * If targetZoom is provided, snap the zoom level as well; otherwise leave zoom unchanged.
   */
  snapTo(state: VehicleState, targetZoom?: number): void {
    const target: ScreenPoint = this.projection.toScreen(
      add(state.position, scale(state.velocity, this.lookAheadSeconds)),
    );
    this.currentX = target.x;
    this.currentY = target.y;
    this.camera.centerOn(this.currentX, this.currentY);

    if (targetZoom !== undefined) {
      this.currentZoom = targetZoom;
      this.camera.setZoom(this.currentZoom);
    }
  }

  /**
   * Ease towards the target. deltaSeconds is real time, not simulation time.
   * Frame-rate independent: uses exponential decay rather than per-frame lerp.
   * Guards against non-finite or non-positive deltaSeconds by snapping instead,
   * to avoid NaN in the camera centre (one NaN blanks the entire screen).
   * If targetZoom is provided, ease the zoom towards it with its own slower time constant;
   * if omitted, leave zoom unchanged.
   */
  follow(state: VehicleState, deltaSeconds: number, targetZoom?: number): void {
    // Guard: snap if deltaSeconds is not finite or is non-positive.
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      this.snapTo(state, targetZoom);
      return;
    }

    const target: ScreenPoint = this.projection.toScreen(
      add(state.position, scale(state.velocity, this.lookAheadSeconds)),
    );

    // Own last pose, not camera.midPoint: an impulse overlay must not feed back
    // into the chase smoother or the shake leaks into the next frame.
    const factor = 1 - Math.exp(-deltaSeconds / this.smoothingSeconds);
    this.currentX += (target.x - this.currentX) * factor;
    this.currentY += (target.y - this.currentY) * factor;
    this.camera.centerOn(this.currentX, this.currentY);

    // Ease zoom towards target if provided, using the slower zoom time constant.
    if (targetZoom !== undefined && Number.isFinite(targetZoom)) {
      const zoomFactor = 1 - Math.exp(-deltaSeconds / this.zoomSmoothingSeconds);
      const nextZoom =
        this.currentZoom + (targetZoom - this.currentZoom) * zoomFactor;
      this.currentZoom = nextZoom;
      this.camera.setZoom(this.currentZoom);
    }
  }

  /**
   * Presentation overlay (shake / wreck punch). Does not update the chase pose
   * or the smoothed zoom, so the kick dies without dragging the follow.
   *
   * Off for now: start pile-ups made the kick look messy. Uncomment the body
   * (and RaceScene's sample / applyOverlay) to restore.
   */
  applyOverlay(offsetX: number, offsetY: number, zoomScale: number): void {
    void offsetX;
    void offsetY;
    void zoomScale;
    // this.camera.centerOn(this.currentX + offsetX, this.currentY + offsetY);
    // const scale = Number.isFinite(zoomScale) && zoomScale > 0 ? zoomScale : 1;
    // this.camera.setZoom(this.currentZoom * scale);
  }

  get zoom(): number {
    return this.currentZoom;
  }
}
