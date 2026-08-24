import Phaser from 'phaser';
import type { Vec2 } from '../../domain/math/Vec2.ts';
import { add, fromAngle, scale } from '../../domain/math/Vec2.ts';
import { CRATE_WOOD_LIFE_SECONDS } from '../../domain/traps/TrapRules.ts';
import { crateSmashTextureKey } from '../../scenes/sceneKeys.ts';
import { IsoProjection } from './IsoProjection.ts';

const MAX_CHIPS = 420;
const GRAVITY = 20;
const BOUNCE = 0.32;
const THROW_SPEED = 19;
const UPWARD = 14;
const SIZE_UNITS = 2.7;
const CHIP_COUNT = 32;
const SMASH_FRAME_SECONDS = 0.07;
const SMASH_FRAMES = 4;
const FALLBACK_COLORS = [0xc48a48, 0x8a5a28, 0x6a3e18, 0xd4a06a, 0xe8c078, 0x5a3010];

function chipKey(index: number): string {
  return `trap-wood-chip-${String((index % 6) + 1).padStart(2, '0')}`;
}

interface FlyingChip {
  positionWorld: Vec2;
  velocityWorldPerSec: Vec2;
  height: number;
  verticalVelocity: number;
  rotationRadians: number;
  spinRadiansPerSec: number;
  lifetimeSeconds: number;
  ageSeconds: number;
  sizeUnits: number;
  sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
}

interface SmashFlash {
  positionWorld: Vec2;
  ageSeconds: number;
  sizeUnits: number;
  sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
}

/**
 * Crate break: a 4-frame smash pose, then wood planks that fly, bounce, and
 * sit on the asphalt. Four punchy frames beat a mushy 12-frame dissolve.
 */
export class WoodDebrisEffect {
  private readonly scene: Phaser.Scene;
  private readonly projection: IsoProjection;
  private chips: FlyingChip[] = [];
  private flashes: SmashFlash[] = [];
  private nextBurstId = 1;

  constructor(scene: Phaser.Scene, projection: IsoProjection) {
    this.scene = scene;
    this.projection = projection;
  }

  burst(position: Vec2, crateSizeUnits = 3.4): void {
    const burstId = this.nextBurstId;
    this.nextBurstId += 1;
    this.spawnSmash(position, crateSizeUnits);
    for (let i = 0; i < CHIP_COUNT; i += 1) {
      while (this.chips.length >= MAX_CHIPS) {
        this.destroyChip(this.chips.shift()!);
      }
      const angle = (i / CHIP_COUNT) * Math.PI * 2 + burstId * 0.37 + (i % 3) * 0.11;
      const speedJitter = 0.55 + (i % 7) * 0.14;
      const plank = i % 4 === 0;
      const sprite = this.makeSprite(i, plank);
      this.chips.push({
        positionWorld: { x: position.x, y: position.y },
        velocityWorldPerSec: scale(fromAngle(angle), THROW_SPEED * speedJitter),
        height: 0.7 + (i % 4) * 0.18,
        verticalVelocity: UPWARD * (0.8 + (i % 5) * 0.22),
        rotationRadians: angle,
        spinRadiansPerSec: (i % 2 === 0 ? 1 : -1) * (6 + (i % 9)),
        lifetimeSeconds: CRATE_WOOD_LIFE_SECONDS,
        ageSeconds: 0,
        sizeUnits: SIZE_UNITS * (plank ? 1.35 + (i % 3) * 0.18 : 0.85 + (i % 5) * 0.16),
        sprite,
      });
    }
  }

  update(deltaSeconds: number): void {
    this.ageFlashes(deltaSeconds);
    const next: FlyingChip[] = [];
    for (const chip of this.chips) {
      chip.ageSeconds += deltaSeconds;
      if (chip.ageSeconds >= chip.lifetimeSeconds) {
        this.destroyChip(chip);
        continue;
      }
      chip.positionWorld = add(
        chip.positionWorld,
        scale(chip.velocityWorldPerSec, deltaSeconds),
      );
      chip.verticalVelocity -= GRAVITY * deltaSeconds;
      chip.height += chip.verticalVelocity * deltaSeconds;
      if (chip.height < 0) {
        chip.height = 0;
        chip.verticalVelocity = -chip.verticalVelocity * BOUNCE;
        chip.velocityWorldPerSec = scale(chip.velocityWorldPerSec, 0.58);
        chip.spinRadiansPerSec *= 0.5;
      }
      chip.rotationRadians += chip.spinRadiansPerSec * deltaSeconds;
      this.syncSprite(chip);
      next.push(chip);
    }
    this.chips = next;
  }

  clear(): void {
    for (const chip of this.chips) {
      this.destroyChip(chip);
    }
    this.chips = [];
    for (const flash of this.flashes) {
      flash.sprite.destroy();
    }
    this.flashes = [];
  }

  destroy(): void {
    this.clear();
  }

  setVisible(visible: boolean): void {
    for (const chip of this.chips) {
      chip.sprite.setVisible(visible);
    }
    for (const flash of this.flashes) {
      flash.sprite.setVisible(visible);
    }
  }

  private spawnSmash(position: Vec2, crateSizeUnits: number): void {
    const key = crateSmashTextureKey(1);
    const sprite = this.scene.textures.exists(key)
      ? this.scene.add.image(0, 0, key)
      : this.scene.add.rectangle(0, 0, 18, 16, 0xb07838);
    sprite.setOrigin(0.5, 0.82);
    this.flashes.push({
      positionWorld: position,
      ageSeconds: 0,
      sizeUnits: crateSizeUnits,
      sprite,
    });
  }

  private ageFlashes(deltaSeconds: number): void {
    const next: SmashFlash[] = [];
    for (const flash of this.flashes) {
      flash.ageSeconds += deltaSeconds;
      const frame = 1 + Math.floor(flash.ageSeconds / SMASH_FRAME_SECONDS);
      if (frame > SMASH_FRAMES) {
        flash.sprite.destroy();
        continue;
      }
      const key = crateSmashTextureKey(frame);
      if (flash.sprite instanceof Phaser.GameObjects.Image && this.scene.textures.exists(key)) {
        if (flash.sprite.texture.key !== key) {
          flash.sprite.setTexture(key);
        }
      }
      const screen = this.projection.toScreen(flash.positionWorld);
      const pixelSize = this.projection.pixelsPerUnit * flash.sizeUnits;
      const squash = frame === 1 ? 1.08 : 1;
      flash.sprite.setPosition(screen.x, screen.y);
      flash.sprite.setDepth(this.projection.depthOf(flash.positionWorld) + 2.2);
      flash.sprite.setVisible(true);
      flash.sprite.setDisplaySize(pixelSize * squash, pixelSize / squash);
      flash.sprite.setAlpha(frame >= SMASH_FRAMES ? 0.55 : 1);
      next.push(flash);
    }
    this.flashes = next;
  }

  private makeSprite(
    index: number,
    plank: boolean,
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
    const key = chipKey(index);
    if (this.scene.textures.exists(key)) {
      return this.scene.add.image(0, 0, key);
    }
    const color = FALLBACK_COLORS[index % FALLBACK_COLORS.length]!;
    return this.scene.add.rectangle(0, 0, plank ? 22 : 14, plank ? 9 : 6, color);
  }

  private syncSprite(chip: FlyingChip): void {
    const screen = this.projection.toScreen(chip.positionWorld, chip.height);
    const fade = chip.ageSeconds / chip.lifetimeSeconds;
    const alpha = fade > 0.75 ? 1 - (fade - 0.75) / 0.25 : 1;
    const pixelSize = this.projection.pixelsPerUnit * chip.sizeUnits;
    chip.sprite.setPosition(screen.x, screen.y);
    chip.sprite.setRotation(chip.rotationRadians);
    chip.sprite.setAlpha(Math.max(0, alpha));
    chip.sprite.setVisible(true);
    chip.sprite.setDepth(this.projection.depthOf(chip.positionWorld) + 2);
    chip.sprite.setDisplaySize(pixelSize, pixelSize * (chip.sizeUnits > SIZE_UNITS ? 0.42 : 0.55));
  }

  private destroyChip(chip: FlyingChip): void {
    chip.sprite.destroy();
  }
}
