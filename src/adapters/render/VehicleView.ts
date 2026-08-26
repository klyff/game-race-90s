import Phaser from 'phaser';
import type { CarSetManifest, CarSheetManifest } from '../../data/cars/CarManifest.ts';
import {
  frameIndexForHeading,
  sheetCellSize,
  sheetClock,
  sheetFrameCount,
  type ClockDirection,
} from '../../data/cars/CarManifest.ts';
import { add, fromAngle, scale } from '../../domain/math/Vec2.ts';
import type { VehicleState } from '../../domain/vehicle/Vehicle.ts';
import { contactShadowPose } from './ContactShadow.ts';
import { IsoProjection } from './IsoProjection.ts';

/**
 * Draws one car as a pre-rendered sprite plus a ground shadow, and keeps both
 * in sync with a `VehicleState` every rendered frame.
 *
 * This is the only place that knows how to put a car on screen. It owns no
 * simulation state of its own: `sync` is a pure read of `VehicleState` into
 * two Phaser game objects, so multiple views can watch the same car (e.g. a
 * future minimap) without fighting over ownership.
 *
 * Marker lights used to sit on the nose and tail so yaw would read when the
 * iso sheet was ambiguous. The live 32-frame strips already carry headlights
 * and tails in the pixels; fake ellipses are gone until real light is wired.
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

export interface VehicleViewExtras {
  /** Consumable turbo is burning: tint the body and throw exhaust. */
  readonly turboActive?: boolean;
}

export interface VehicleViewOptions {
  /** Far observation camera: hide exhaust. */
  readonly farLod?: boolean;
}

export class VehicleView {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly exhaust: readonly Phaser.GameObjects.Ellipse[];
  private readonly projection: IsoProjection;
  private readonly noseReach: number;
  private readonly frameCount: number;
  private readonly clock: ClockDirection;
  private readonly farLod: boolean;
  private readonly origin: { readonly x: number; readonly y: number };
  private readonly cellWidth: number;
  private readonly cellHeight: number;
  private readonly displayScale: number;
  private readonly collisionAlong: number | undefined;
  private readonly collisionAcross: number | undefined;
  private readonly collisionRadius: number;
  private exhaustPulse = 0;

  constructor(
    scene: Phaser.Scene,
    manifest: CarSetManifest,
    sheet: CarSheetManifest,
    projection: IsoProjection,
    options: VehicleViewOptions = {},
  ) {
    this.projection = projection;
    this.noseReach = Math.max(0.8, sheet.stats.collisionRadius);
    this.farLod = options.farLod === true;

    this.frameCount = sheetFrameCount(sheet, manifest);
    this.clock = sheetClock(sheet, manifest);
    const cell = sheetCellSize(sheet, manifest);
    const displayScale = manifest.frameWidth / cell.width;
    this.origin = manifest.origin;
    this.cellWidth = cell.width;
    this.cellHeight = cell.height;
    this.displayScale = displayScale;
    this.collisionAlong = sheet.stats.collisionAlong;
    this.collisionAcross = sheet.stats.collisionAcross;
    this.collisionRadius = sheet.stats.collisionRadius;

    this.shadow = scene.add.ellipse(0, 0, 1, 1, 0x000000);
    this.shadow.setOrigin(0.5, 0.5);
    this.shadow.setAlpha(SHADOW_ALPHA);

    this.sprite = scene.add.sprite(0, 0, sheet.id);
    // Never flipX / flipY. Yaw is a real strip frame (32 CCW or 30 CW).
    // The anchor is NOT the frame centre (0.5, 0.5): it is where the car's
    // local origin — its centre, on the ground — sits inside the cell,
    // as measured by the offline sprite generator and recorded in
    // `cars.json`. Every one of the 32 yaw frames is rendered around that
    // same 3D point, so anchoring here at anything else makes the sprite
    // visibly wobble as it turns between frames. A 128 cell is 2× the
    // fleet sheet; scale it back so the car matches the road.
    this.sprite.setOrigin(manifest.origin.x, manifest.origin.y);
    this.sprite.setScale(displayScale);

    this.exhaust = [0, 1, 2].map(() =>
      scene.add.ellipse(0, 0, 7, 4, 0xff9a2a).setVisible(false).setAlpha(0.7),
    );
  }

  /** Moves sprite and shadow to match `state`. Called once per rendered frame. */
  sync(state: VehicleState, extras: VehicleViewExtras = {}): void {
    const air = this.projection.toScreen(state.position, state.height);

    this.sprite.setPosition(air.x, air.y);
    this.sprite.setFrame(frameIndexForHeading(state.heading, this.frameCount, this.clock));
    // BBox frames carry customPivot (often 0.5, 0.5). setFrame reapplies that
    // and would undo the measured ground pin, so the painted car sits off the
    // blob. Re-pin every frame — same origin for every yaw, no wobble.
    this.sprite.setOrigin(this.origin.x, this.origin.y);

    const pose = contactShadowPose({
      projection: this.projection,
      position: state.position,
      heading: state.heading,
      collisionAlong: this.collisionAlong,
      collisionAcross: this.collisionAcross,
      collisionRadius: this.collisionRadius,
      origin: this.origin,
      cellWidth: this.cellWidth,
      cellHeight: this.cellHeight,
      displayScale: this.displayScale,
      height: state.height,
    });
    this.shadow.setOrigin(0.5, 0.5);
    this.shadow.setPosition(pose.x, pose.y);
    this.shadow.setSize(pose.width, pose.height);
    this.shadow.setRotation(pose.rotation);

    const depth = this.projection.depthOf(state.position);
    this.sprite.setDepth(depth);
    this.shadow.setDepth(depth - OWN_SHADOW_DEPTH_OFFSET);

    const turbo = extras.turboActive === true;
    if (turbo) {
      this.sprite.setTint(0xffd080);
    } else {
      this.sprite.clearTint();
    }

    if (!this.farLod) {
      this.placeExhaust(state, depth, turbo);
    }
  }

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.shadow.setVisible(visible);
    if (!visible) {
      for (const flame of this.exhaust) {
        flame.setVisible(false);
      }
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    for (const flame of this.exhaust) {
      flame.destroy();
    }
  }

  private placeExhaust(state: VehicleState, depth: number, turbo: boolean): void {
    if (!turbo) {
      for (const flame of this.exhaust) {
        flame.setVisible(false);
      }
      return;
    }
    this.exhaustPulse += 1;
    const forward = fromAngle(state.heading);
    for (let i = 0; i < this.exhaust.length; i += 1) {
      const flame = this.exhaust[i];
      if (flame === undefined) {
        continue;
      }
      const flicker = 0.55 + ((this.exhaustPulse + i * 3) % 5) * 0.08;
      const back = add(state.position, scale(forward, -this.noseReach * (1.05 + i * 0.28)));
      const screen = this.projection.toScreen(back, state.height + 0.15);
      flame
        .setVisible(true)
        .setPosition(screen.x, screen.y)
        .setScale(flicker, flicker * 0.7)
        .setAlpha(0.75 - i * 0.18)
        .setDepth(depth + 0.03);
    }
  }
}
