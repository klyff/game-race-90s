import Phaser from 'phaser';
import type { CarSetManifest, CarSheetManifest } from '../../data/cars/CarManifest.ts';
import { frameIndexForHeading } from '../../data/cars/CarManifest.ts';
import type { VehicleState } from '../../domain/vehicle/Vehicle.ts';
import { IsoProjection } from './IsoProjection.ts';

/**
 * Draws one car as a pre-rendered sprite plus a ground shadow, and keeps both
 * in sync with a `VehicleState` every rendered frame.
 *
 * This is the only place that knows how to put a car on screen. It owns no
 * simulation state of its own: `sync` is a pure read of `VehicleState` into
 * two Phaser game objects, so multiple views can watch the same car (e.g. a
 * future minimap) without fighting over ownership.
 */

/**
 * Shadow depth offset relative to its sprite, in the same units as
 * `IsoProjection.depthOf`. Keeps a car's own shadow strictly behind its own
 * sprite regardless of floating-point rounding in the shared depth key.
 *
 * This only orders a car against its OWN shadow. Two different cars whose
 * ground points are close together are not addressed here — resolving that
 * is T-011's job (collisions), not this view's.
 */
const OWN_SHADOW_DEPTH_OFFSET = 0.001;

/** Alpha of the ground shadow ellipse. Low enough to read as a soft contact shadow. */
const SHADOW_ALPHA = 0.35;

export class VehicleView {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly manifest: CarSetManifest;
  private readonly projection: IsoProjection;

  constructor(
    scene: Phaser.Scene,
    manifest: CarSetManifest,
    sheet: CarSheetManifest,
    projection: IsoProjection,
  ) {
    this.manifest = manifest;
    this.projection = projection;

    this.shadow = scene.add.ellipse(0, 0, sheet.shadow.width, sheet.shadow.height, 0x000000);
    this.shadow.setAlpha(SHADOW_ALPHA);

    this.sprite = scene.add.sprite(0, 0, sheet.id);
    // The anchor is NOT the frame centre (0.5, 0.5): it is where the car's
    // local origin — its centre, on the ground — sits inside the 64x64 frame,
    // as measured by the offline sprite generator and recorded in
    // `cars.json`. Every one of the 32 yaw frames is rendered around that
    // same 3D point, so anchoring here at anything else makes the sprite
    // visibly wobble as it turns between frames.
    this.sprite.setOrigin(manifest.origin.x, manifest.origin.y);
  }

  /** Moves sprite and shadow to match `state`. Called once per rendered frame. */
  sync(state: VehicleState): void {
    const ground = this.projection.toScreen(state.position);

    this.sprite.setPosition(ground.x, ground.y);
    this.sprite.setFrame(frameIndexForHeading(state.heading, this.manifest.frameCount));

    this.shadow.setPosition(ground.x, ground.y);

    const depth = this.projection.depthOf(state.position);
    this.sprite.setDepth(depth);
    this.shadow.setDepth(depth - OWN_SHADOW_DEPTH_OFFSET);
  }

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.shadow.setVisible(visible);
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
