import type Phaser from 'phaser';
import {
  crowdHitsFromCars,
  crowdIsReacting,
  crowdWorldPosition,
  type CrowdCarTarget,
  type CrowdSlot,
} from '../../domain/crowd/CrowdSlots.ts';
import { add, length, normalize, scale } from '../../domain/math/Vec2.ts';
import type { Vec2 } from '../../domain/math/Vec2.ts';
import type { TrackSpline } from '../../domain/track/TrackSpline.ts';
import { crowdTextureKey } from '../../scenes/sceneKeys.ts';
import type { IsoProjection } from './IsoProjection.ts';

/** 64×64 box; figure is ~24 px so this world size reads as ~1/3 of a car. */
const CROWD_WORLD_SIZE = 3.6;
const ORIGIN_X = 0.5;
const ORIGIN_Y = 50 / 64;
const GRAVITY = 28;
const FLY_LIFE = 1.55;
const SHARD_COUNT = 5;
const SHARD_COLORS = [0xf0c8a0, 0x2a1a18, 0xe84870, 0xf4e8d4, 0x1c3a8a, 0xc45a28];

interface FlyingBody {
  positionWorld: Vec2;
  velocityWorldPerSec: Vec2;
  height: number;
  verticalVelocity: number;
  rotationRadians: number;
  spinRadiansPerSec: number;
  ageSeconds: number;
  lifetimeSeconds: number;
  sizeUnits: number;
  sprite: Phaser.GameObjects.Image;
  shards: Phaser.GameObjects.Rectangle[];
}

/**
 * Spectators around the circuit. Face the camera (no yaw). Cheer / flasher
 * swap texture when the leader is nearby. A car overlap launches the body
 * and clothing shards — 4 great frames of motion beat a 12-frame death sheet.
 */
export class CrowdView {
  private readonly slots: readonly CrowdSlot[];
  private readonly spline: TrackSpline;
  private readonly world: readonly Vec2[];
  private readonly sprites: readonly Phaser.GameObjects.Image[];
  private readonly display: number;
  private readonly projection: IsoProjection;
  private readonly scene: Phaser.Scene;
  private readonly dead = new Set<number>();
  private flying: FlyingBody[] = [];

  constructor(
    scene: Phaser.Scene,
    slots: readonly CrowdSlot[],
    spline: TrackSpline,
    projection: IsoProjection,
    pixelsPerUnit: number,
  ) {
    this.scene = scene;
    this.slots = slots;
    this.spline = spline;
    this.projection = projection;
    this.display = CROWD_WORLD_SIZE * pixelsPerUnit;
    this.world = slots.map(slot => crowdWorldPosition(spline, slot));
    this.sprites = slots.map((slot, index) => {
      const world = this.world[index]!;
      const screen = projection.toScreen(world);
      const key = crowdTextureKey(slot.kind, false);
      const image = scene.add.image(screen.x, screen.y, key);
      image.setOrigin(ORIGIN_X, ORIGIN_Y);
      image.setDisplaySize(this.display, this.display);
      image.setDepth(projection.depthOf(world) - 0.4);
      image.setVisible(scene.textures.exists(key));
      return image;
    });
  }

  sync(leaderDistance: number, cars: readonly CrowdCarTarget[]): void {
    const lengthAlong = this.spline.totalLength;
    this.slots.forEach((slot, index) => {
      if (this.dead.has(index)) {
        return;
      }
      const sprite = this.sprites[index];
      if (sprite === undefined) {
        return;
      }
      const reacting = crowdIsReacting(slot, leaderDistance, lengthAlong);
      const key = crowdTextureKey(slot.kind, reacting);
      if (sprite.texture.key !== key && sprite.scene.textures.exists(key)) {
        sprite.setTexture(key);
      }
    });

    const hits = crowdHitsFromCars(this.world, this.dead, cars);
    for (const hit of hits) {
      this.launch(hit.slotIndex, hit.throwVelocity);
    }
  }

  update(deltaSeconds: number): void {
    const next: FlyingBody[] = [];
    for (const body of this.flying) {
      body.ageSeconds += deltaSeconds;
      if (body.ageSeconds >= body.lifetimeSeconds) {
        this.destroyFlying(body);
        continue;
      }
      body.positionWorld = add(
        body.positionWorld,
        scale(body.velocityWorldPerSec, deltaSeconds),
      );
      body.verticalVelocity -= GRAVITY * deltaSeconds;
      body.height += body.verticalVelocity * deltaSeconds;
      if (body.height < 0) {
        body.height = 0;
        body.verticalVelocity = -body.verticalVelocity * 0.28;
        body.velocityWorldPerSec = scale(body.velocityWorldPerSec, 0.55);
        body.spinRadiansPerSec *= 0.6;
      }
      body.rotationRadians += body.spinRadiansPerSec * deltaSeconds;
      this.syncFlying(body);
      next.push(body);
    }
    this.flying = next;
  }

  reset(): void {
    for (const body of this.flying) {
      this.destroyFlying(body);
    }
    this.flying = [];
    this.dead.clear();
    for (const sprite of this.sprites) {
      sprite.setVisible(sprite.scene.textures.exists(sprite.texture.key));
      sprite.setRotation(0);
      sprite.setAlpha(1);
    }
  }

  destroy(): void {
    for (const sprite of this.sprites) {
      sprite.destroy();
    }
    for (const body of this.flying) {
      this.destroyFlying(body);
    }
    this.flying = [];
  }

  private launch(index: number, throwVelocity: Vec2): void {
    if (this.dead.has(index)) {
      return;
    }
    const sprite = this.sprites[index];
    const origin = this.world[index];
    if (sprite === undefined || origin === undefined) {
      return;
    }
    this.dead.add(index);
    sprite.setVisible(false);

    const fly = this.scene.add.image(0, 0, sprite.texture.key);
    fly.setOrigin(0.5, 0.55);
    fly.setDisplaySize(this.display, this.display);
    const speed = Math.max(9, length(throwVelocity) * 0.55);
    const outward = length(throwVelocity) > 0.2 ? normalize(throwVelocity) : { x: 1, y: 0 };
    const shards: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < SHARD_COUNT; i += 1) {
      const color = SHARD_COLORS[(index + i) % SHARD_COLORS.length]!;
      shards.push(this.scene.add.rectangle(0, 0, 5, 4, color).setOrigin(0.5, 0.5));
    }
    this.flying.push({
      positionWorld: { x: origin.x, y: origin.y },
      velocityWorldPerSec: scale(outward, speed * (1.1 + (index % 4) * 0.12)),
      height: 0.45,
      verticalVelocity: 14 + (index % 5) * 1.4,
      rotationRadians: 0,
      spinRadiansPerSec: (index % 2 === 0 ? 1 : -1) * (9 + (index % 6)),
      ageSeconds: 0,
      lifetimeSeconds: FLY_LIFE,
      sizeUnits: CROWD_WORLD_SIZE,
      sprite: fly,
      shards,
    });
  }

  private syncFlying(body: FlyingBody): void {
    const fade = body.ageSeconds / body.lifetimeSeconds;
    const alpha = fade > 0.62 ? 1 - (fade - 0.62) / 0.38 : 1;
    const squash = fade < 0.08 ? 1.12 : 1;
    const screen = this.projection.toScreen(body.positionWorld, body.height);
    const depth = this.projection.depthOf(body.positionWorld) + 2.4;
    const pixelSize = this.projection.pixelsPerUnit * body.sizeUnits;
    body.sprite
      .setPosition(screen.x, screen.y)
      .setRotation(body.rotationRadians)
      .setAlpha(Math.max(0, alpha))
      .setVisible(true)
      .setDepth(depth)
      .setDisplaySize(pixelSize * squash, pixelSize / squash);
    for (let i = 0; i < body.shards.length; i += 1) {
      const shard = body.shards[i];
      if (shard === undefined) {
        continue;
      }
      const angle = body.rotationRadians + (i / SHARD_COUNT) * Math.PI * 2;
      const spread = 8 + fade * 22;
      shard
        .setPosition(screen.x + Math.cos(angle) * spread, screen.y + Math.sin(angle) * spread * 0.55)
        .setRotation(angle * 1.4)
        .setAlpha(Math.max(0, alpha * 0.95))
        .setVisible(true)
        .setDepth(depth + 0.1)
        .setDisplaySize(5 + (i % 3), 3 + (i % 2));
    }
  }

  private destroyFlying(body: FlyingBody): void {
    body.sprite.destroy();
    for (const shard of body.shards) {
      shard.destroy();
    }
  }
}
