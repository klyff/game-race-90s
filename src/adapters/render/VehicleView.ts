import Phaser from 'phaser';
import type { CarSetManifest, CarSheetManifest } from '../../data/cars/CarManifest.ts';
import { frameIndexForHeading, sheetCellSize } from '../../data/cars/CarManifest.ts';
import { add, fromAngle, perpendicularLeft, scale } from '../../domain/math/Vec2.ts';
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

/** How far past the collision radius the nose / tail markers sit. */
const LIGHT_NOSE = 0.92;
const LIGHT_TAIL = 0.82;
const LIGHT_LATERAL = 0.32;

export interface VehicleViewExtras {
  /** Consumable turbo is burning: tint the body and throw exhaust. */
  readonly turboActive?: boolean;
}

export class VehicleView {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly headlights: readonly Phaser.GameObjects.Ellipse[];
  private readonly taillights: readonly Phaser.GameObjects.Ellipse[];
  private readonly exhaust: readonly Phaser.GameObjects.Ellipse[];
  private readonly manifest: CarSetManifest;
  private readonly projection: IsoProjection;
  private readonly noseReach: number;
  private exhaustPulse = 0;

  constructor(
    scene: Phaser.Scene,
    manifest: CarSetManifest,
    sheet: CarSheetManifest,
    projection: IsoProjection,
  ) {
    this.manifest = manifest;
    this.projection = projection;
    this.noseReach = Math.max(0.8, sheet.stats.collisionRadius);

    const cell = sheetCellSize(sheet, manifest);
    const displayScale = manifest.frameWidth / cell.width;

    this.shadow = scene.add.ellipse(0, 0, sheet.shadow.width, sheet.shadow.height, 0x000000);
    this.shadow.setAlpha(SHADOW_ALPHA);
    this.shadow.setScale(displayScale);

    this.sprite = scene.add.sprite(0, 0, sheet.id);
    // The anchor is NOT the frame centre (0.5, 0.5): it is where the car's
    // local origin — its centre, on the ground — sits inside the cell,
    // as measured by the offline sprite generator and recorded in
    // `cars.json`. Every one of the 32 yaw frames is rendered around that
    // same 3D point, so anchoring here at anything else makes the sprite
    // visibly wobble as it turns between frames. A 128 cell is 2× the
    // fleet sheet; scale it back so the car matches the road.
    this.sprite.setOrigin(manifest.origin.x, manifest.origin.y);
    this.sprite.setScale(displayScale);

    // Iso yaw is a 180° trap: front and rear poses can read as the same car
    // going the other way. Marker lights are tied to heading, not the sheet,
    // so "which way is forward" stays obvious even when the art is ambiguous.
    this.headlights = [0, 1].map(() =>
      scene.add.ellipse(0, 0, 6, 3.5, 0xfff4b0).setAlpha(0.95),
    );
    this.taillights = [0, 1].map(() =>
      scene.add.ellipse(0, 0, 5, 3, 0xff2a2a).setAlpha(0.9),
    );
    this.exhaust = [0, 1, 2].map(() =>
      scene.add.ellipse(0, 0, 7, 4, 0xff9a2a).setVisible(false).setAlpha(0.7),
    );
  }

  /** Moves sprite and shadow to match `state`. Called once per rendered frame. */
  sync(state: VehicleState, extras: VehicleViewExtras = {}): void {
    const ground = this.projection.toScreen(state.position);
    const air = this.projection.toScreen(state.position, state.height);

    this.sprite.setPosition(air.x, air.y);
    this.sprite.setFrame(frameIndexForHeading(state.heading, this.manifest.frameCount));

    this.shadow.setPosition(ground.x, ground.y);

    const depth = this.projection.depthOf(state.position);
    this.sprite.setDepth(depth);
    this.shadow.setDepth(depth - OWN_SHADOW_DEPTH_OFFSET);

    const turbo = extras.turboActive === true;
    if (turbo) {
      this.sprite.setTint(0xffd080);
    } else {
      this.sprite.clearTint();
    }

    this.placeLights(state, depth);
    this.placeExhaust(state, depth, turbo);
  }

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.shadow.setVisible(visible);
    for (const light of this.headlights) {
      light.setVisible(visible);
    }
    for (const light of this.taillights) {
      light.setVisible(visible);
    }
    if (!visible) {
      for (const flame of this.exhaust) {
        flame.setVisible(false);
      }
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    for (const light of this.headlights) {
      light.destroy();
    }
    for (const light of this.taillights) {
      light.destroy();
    }
    for (const flame of this.exhaust) {
      flame.destroy();
    }
  }

  private placeLights(state: VehicleState, depth: number): void {
    const forward = fromAngle(state.heading);
    const side = perpendicularLeft(forward);
    const lightDepth = depth + 0.02;
    for (let i = 0; i < 2; i += 1) {
      const lateral = scale(side, (i === 0 ? -1 : 1) * this.noseReach * LIGHT_LATERAL);
      const nose = add(add(state.position, scale(forward, this.noseReach * LIGHT_NOSE)), lateral);
      const tail = add(add(state.position, scale(forward, -this.noseReach * LIGHT_TAIL)), lateral);
      const noseScreen = this.projection.toScreen(nose, state.height);
      const tailScreen = this.projection.toScreen(tail, state.height);
      this.headlights[i]?.setPosition(noseScreen.x, noseScreen.y).setDepth(lightDepth);
      this.taillights[i]?.setPosition(tailScreen.x, tailScreen.y).setDepth(lightDepth);
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
