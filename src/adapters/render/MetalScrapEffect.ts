import Phaser from 'phaser';
import type { Vec2 } from '../../domain/math/Vec2.ts';
import { add, fromAngle, scale } from '../../domain/math/Vec2.ts';
import { IsoProjection } from './IsoProjection.ts';
import {
  scrapCountForHit,
  scrapRosterPick,
  scrapRosterSeed,
  scrapTextureKey,
  SCRAP_LIGHT_COUNT,
  SCRAP_ROSTER_SIZE,
} from './MetalScrapRoster.ts';

/**
 * Flying metal scraps thrown by a ram or a wreck.
 *
 * Each piece is one of the roster sprites (`debris-scrap-01` …). A light
 * hit fans five pieces, one toward each side; harder hits shuffle more
 * of the same roster. A wreck launches every piece.
 *
 * Physics: outward throw, gravity, bounce on the asphalt, then fade.
 * Missing art falls back to a gunmetal rect.
 */

const MAX_LIVE_SCRAPS = 180;
const GRAVITY = 22;
const BOUNCE = 0.32;
const LIFE_SECONDS = 1.25;
const LIGHT_SPEED = 6.5;
const MEDIUM_SPEED = 9.5;
const HARD_SPEED = 12.5;
const WRECK_SPEED = 15;
const UPWARD = 8.5;
const SIZE_UNITS = 1.15;
const FALLBACK_COLOR = 0x8a909a;

interface FlyingScrap {
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

export class MetalScrapEffect {
  private readonly scene: Phaser.Scene;
  private readonly projection: IsoProjection;
  private scraps: FlyingScrap[] = [];
  private nextBurstId = 1;

  constructor(scene: Phaser.Scene, projection: IsoProjection) {
    this.scene = scene;
    this.projection = projection;
  }

  /**
   * Throw a shuffled handful from `position`. `impactSpeed` is the hit
   * delta: it picks how many pieces; the burst id shuffles which ones.
   */
  burst(position: Vec2, impactSpeed: number, exploded: boolean): void {
    const count = scrapCountForHit(impactSpeed, exploded);
    if (count <= 0) {
      return;
    }
    const burstId = this.nextBurstId;
    this.nextBurstId += 1;
    const indices = scrapRosterPick(count, scrapRosterSeed(impactSpeed, burstId));
    const throwSpeed = exploded
      ? WRECK_SPEED
      : count >= 15
        ? HARD_SPEED
        : count >= 12
          ? MEDIUM_SPEED
          : LIGHT_SPEED;
    const evenSpread = count === SCRAP_LIGHT_COUNT && !exploded;
    const baseAngle = (burstId % SCRAP_ROSTER_SIZE) * ((Math.PI * 2) / SCRAP_ROSTER_SIZE);

    for (let i = 0; i < indices.length; i += 1) {
      const rosterIndex = indices[i]!;
      const jitter = evenSpread ? 0 : ((i * 17 + rosterIndex * 13) % 20) * 0.02 - 0.2;
      const angle = baseAngle + (i / Math.max(1, count)) * Math.PI * 2 + jitter;
      const speed = throwSpeed * (0.78 + ((rosterIndex * 11) % 10) * 0.03);
      const direction = fromAngle(angle);
      while (this.scraps.length >= MAX_LIVE_SCRAPS) {
        this.destroyScrap(this.scraps.shift()!);
      }
      this.scraps.push({
        positionWorld: { x: position.x, y: position.y },
        velocityWorldPerSec: scale(direction, speed),
        height: 0.35,
        verticalVelocity: UPWARD * (0.7 + ((rosterIndex * 7) % 8) * 0.06),
        rotationRadians: angle,
        spinRadiansPerSec: (rosterIndex % 2 === 0 ? 1 : -1) * (6 + (rosterIndex % 5)),
        lifetimeSeconds: LIFE_SECONDS * (exploded ? 1.25 : 1),
        ageSeconds: 0,
        sizeUnits: SIZE_UNITS * (0.75 + (rosterIndex % 5) * 0.08),
        sprite: this.makeSprite(rosterIndex),
      });
    }
  }

  update(deltaSeconds: number): void {
    const next: FlyingScrap[] = [];
    for (const scrap of this.scraps) {
      scrap.ageSeconds += deltaSeconds;
      if (scrap.ageSeconds >= scrap.lifetimeSeconds) {
        this.destroyScrap(scrap);
        continue;
      }
      scrap.positionWorld = add(
        scrap.positionWorld,
        scale(scrap.velocityWorldPerSec, deltaSeconds),
      );
      scrap.verticalVelocity -= GRAVITY * deltaSeconds;
      scrap.height += scrap.verticalVelocity * deltaSeconds;
      if (scrap.height < 0) {
        scrap.height = 0;
        scrap.verticalVelocity = -scrap.verticalVelocity * BOUNCE;
        scrap.velocityWorldPerSec = scale(scrap.velocityWorldPerSec, 0.72);
        scrap.spinRadiansPerSec *= 0.55;
      }
      scrap.rotationRadians += scrap.spinRadiansPerSec * deltaSeconds;
      this.syncSprite(scrap);
      next.push(scrap);
    }
    this.scraps = next;
  }

  clear(): void {
    for (const scrap of this.scraps) {
      this.destroyScrap(scrap);
    }
    this.scraps = [];
  }

  destroy(): void {
    this.clear();
  }

  private makeSprite(rosterIndex: number): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
    const key = scrapTextureKey(rosterIndex);
    if (this.scene.textures.exists(key)) {
      return this.scene.add.image(0, 0, key).setOrigin(0.5, 0.5).setVisible(false);
    }
    return this.scene.add
      .rectangle(0, 0, 10, 6, FALLBACK_COLOR)
      .setOrigin(0.5, 0.5)
      .setVisible(false);
  }

  private syncSprite(scrap: FlyingScrap): void {
    const screen = this.projection.toScreen(scrap.positionWorld, scrap.height);
    const fade = scrap.ageSeconds / scrap.lifetimeSeconds;
    const alpha = fade > 0.65 ? 1 - (fade - 0.65) / 0.35 : 1;
    const pixelSize = this.projection.pixelsPerUnit * scrap.sizeUnits;
    scrap.sprite.setPosition(screen.x, screen.y);
    scrap.sprite.setRotation(scrap.rotationRadians);
    scrap.sprite.setAlpha(Math.max(0, alpha));
    scrap.sprite.setVisible(true);
    scrap.sprite.setDepth(this.projection.depthOf(scrap.positionWorld) + 2);
    scrap.sprite.setDisplaySize(pixelSize, pixelSize);
  }

  private destroyScrap(scrap: FlyingScrap): void {
    scrap.sprite.destroy();
  }
}
