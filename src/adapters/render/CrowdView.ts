import type Phaser from 'phaser';
import { crowdIsReacting, crowdWorldPosition, type CrowdSlot } from '../../domain/crowd/CrowdSlots.ts';
import type { TrackSpline } from '../../domain/track/TrackSpline.ts';
import { crowdTextureKey } from '../../scenes/sceneKeys.ts';
import type { IsoProjection } from './IsoProjection.ts';

/** 64×64 box; figure is ~24 px so this world size reads as ~1/3 of a car. */
const CROWD_WORLD_SIZE = 3.6;
const ORIGIN_X = 0.5;
const ORIGIN_Y = 50 / 64;

/**
 * Start-line spectators. Face the camera (no yaw). Cheer / flasher swap
 * texture when P1 is nearby.
 */
export class CrowdView {
  private readonly slots: readonly CrowdSlot[];
  private readonly spline: TrackSpline;
  private readonly sprites: readonly Phaser.GameObjects.Image[];

  constructor(
    scene: Phaser.Scene,
    slots: readonly CrowdSlot[],
    spline: TrackSpline,
    projection: IsoProjection,
    pixelsPerUnit: number,
  ) {
    this.slots = slots;
    this.spline = spline;
    const display = CROWD_WORLD_SIZE * pixelsPerUnit;
    this.sprites = slots.map(slot => {
      const world = crowdWorldPosition(spline, slot);
      const screen = projection.toScreen(world);
      const key = crowdTextureKey(slot.kind, false);
      const image = scene.add.image(screen.x, screen.y, key);
      image.setOrigin(ORIGIN_X, ORIGIN_Y);
      image.setDisplaySize(display, display);
      image.setDepth(projection.depthOf(world) - 0.4);
      image.setVisible(scene.textures.exists(key));
      return image;
    });
  }

  sync(leaderDistance: number): void {
    const length = this.spline.totalLength;
    this.slots.forEach((slot, index) => {
      const sprite = this.sprites[index];
      if (sprite === undefined) {
        return;
      }
      const reacting = crowdIsReacting(slot, leaderDistance, length);
      const key = crowdTextureKey(slot.kind, reacting);
      if (sprite.texture.key !== key && sprite.scene.textures.exists(key)) {
        sprite.setTexture(key);
      }
    });
  }

  destroy(): void {
    for (const sprite of this.sprites) {
      sprite.destroy();
    }
  }
}
