import Phaser from 'phaser';
import type { Vec2 } from '../../domain/math/Vec2.ts';
import { add, fromAngle, scale } from '../../domain/math/Vec2.ts';
import { CRATE_WOOD_LIFE_SECONDS } from '../../domain/traps/TrapRules.ts';
import { IsoProjection } from './IsoProjection.ts';

const MAX_CHIPS = 80;
const GRAVITY = 18;
const BOUNCE = 0.18;
const THROW_SPEED = 7;
const UPWARD = 6;
const SIZE_UNITS = 0.7;
const FALLBACK_COLORS = [0xc48a48, 0x8a5a28, 0x6a3e18, 0xd4a06a];

function chipKey(index: number): string {
  return `trap-wood-chip-${String(index + 1).padStart(2, '0')}`;
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

/**
 * Wood chips from a smashed crate. They fly, settle, and stay on the asphalt
 * for four seconds, then fade.
 */
export class WoodDebrisEffect {
  private readonly scene: Phaser.Scene;
  private readonly projection: IsoProjection;
  private chips: FlyingChip[] = [];
  private nextBurstId = 1;

  constructor(scene: Phaser.Scene, projection: IsoProjection) {
    this.scene = scene;
    this.projection = projection;
  }

  burst(position: Vec2): void {
    const burstId = this.nextBurstId;
    this.nextBurstId += 1;
    const count = 6;
    for (let i = 0; i < count; i += 1) {
      while (this.chips.length >= MAX_CHIPS) {
        this.destroyChip(this.chips.shift()!);
      }
      const angle = (i / count) * Math.PI * 2 + burstId * 0.3;
      const sprite = this.makeSprite(i);
      this.chips.push({
        positionWorld: position,
        velocityWorldPerSec: scale(fromAngle(angle), THROW_SPEED * (0.7 + (i % 3) * 0.15)),
        height: 0.4,
        verticalVelocity: UPWARD * (0.8 + (i % 2) * 0.25),
        rotationRadians: angle,
        spinRadiansPerSec: 4 + i,
        lifetimeSeconds: CRATE_WOOD_LIFE_SECONDS,
        ageSeconds: 0,
        sizeUnits: SIZE_UNITS,
        sprite,
      });
    }
  }

  update(deltaSeconds: number): void {
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
        chip.velocityWorldPerSec = scale(chip.velocityWorldPerSec, 0.55);
        chip.spinRadiansPerSec *= 0.45;
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
  }

  destroy(): void {
    this.clear();
  }

  private makeSprite(index: number): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
    const key = chipKey(index);
    if (this.scene.textures.exists(key)) {
      return this.scene.add.image(0, 0, key);
    }
    const color = FALLBACK_COLORS[index % FALLBACK_COLORS.length]!;
    return this.scene.add.rectangle(0, 0, 8, 5, color);
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
    chip.sprite.setDisplaySize(pixelSize, pixelSize * 0.7);
  }

  private destroyChip(chip: FlyingChip): void {
    chip.sprite.destroy();
  }
}
