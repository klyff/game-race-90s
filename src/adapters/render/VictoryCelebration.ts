import Phaser from 'phaser';
import { add, fromAngle, scale } from '../../domain/math/Vec2.ts';
import type { Vec2 } from '../../domain/math/Vec2.ts';
import { IsoProjection } from './IsoProjection.ts';
import { celebrationIntensity } from './VictoryIntensity.ts';

/**
 * Player-win burst at the finish line: world fireworks plus screen confetti.
 * Motion is the message (you won) — no extra HUD chrome, no corner text.
 *
 * Pixel rules: hard-edged dots and rects, short palette, no soft glow.
 */

const CONFETTI_LIFE = 3.4;
const SPARKS_PER_BURST = 18;
const MAX_DEPTH = 12_000;
const PALETTE = [0xffe066, 0xff3d6e, 0x3de0ff, 0xfff4d8, 0x7dff6a, 0xff7a18, 0xe848ff];

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  rotation: number;
  width: number;
  height: number;
  color: number;
  age: number;
  life: number;
}

interface Spark {
  positionWorld: Vec2;
  velocityWorldPerSec: Vec2;
  height: number;
  verticalVelocity: number;
  color: number;
  size: number;
  age: number;
  life: number;
}

interface Rocket {
  positionWorld: Vec2;
  height: number;
  verticalVelocity: number;
  delay: number;
  age: number;
  exploded: boolean;
  color: number;
}

export class VictoryCelebration {
  private readonly scene: Phaser.Scene;
  private readonly projection: IsoProjection;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly overlay: Phaser.GameObjects.Graphics;
  private confetti: Confetti[] = [];
  private sparks: Spark[] = [];
  private rockets: Rocket[] = [];
  private playing = false;

  constructor(scene: Phaser.Scene, projection: IsoProjection) {
    this.scene = scene;
    this.projection = projection;
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(MAX_DEPTH - 1);
    this.gfx.setName('victoryWorld');
    this.overlay = scene.add.graphics();
    this.overlay.setDepth(MAX_DEPTH);
    this.overlay.setScrollFactor(0);
    this.overlay.setName('victoryConfetti');
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Podium burst at `worldPosition` (the car crossing the line). P1–P3.
   * Safe to call once.
   */
  play(worldPosition: Vec2, place = 1): void {
    if (this.playing) {
      return;
    }
    this.playing = true;
    this.confetti = [];
    this.sparks = [];
    this.rockets = [];
    const intensity = celebrationIntensity(place);

    const cam = this.scene.cameras.main;
    const width = cam.width;
    const height = cam.height;
    for (let i = 0; i < intensity.confetti; i += 1) {
      const fromTop = i % 3 !== 2;
      this.confetti.push({
        x: 24 + ((i * 97) % Math.max(8, width - 48)),
        y: fromTop ? -12 - (i % 18) * 6 : height * (0.18 + (i % 7) * 0.04),
        vx: ((i * 13) % 17) - 8,
        vy: fromTop ? 70 + (i % 11) * 8 : -40 - (i % 9) * 6,
        spin: ((i % 2 === 0 ? 1 : -1) * (4 + (i % 5))) * 0.4,
        rotation: (i % 8) * 0.4,
        width: 5 + (i % 4),
        height: 3 + (i % 3),
        color: PALETTE[i % PALETTE.length]!,
        age: 0,
        life: CONFETTI_LIFE * (0.75 + (i % 5) * 0.06),
      });
    }

    for (let i = 0; i < intensity.fireworks; i += 1) {
      this.rockets.push({
        positionWorld: add(worldPosition, {
          x: ((i % 5) - 2) * 3.6,
          y: (Math.floor(i / 5) - 1) * 3.0,
        }),
        height: 0.4,
        verticalVelocity: 16 + (i % 4) * 2.2,
        delay: i * 0.12,
        age: 0,
        exploded: false,
        color: PALETTE[(i + 2) % PALETTE.length]!,
      });
    }
  }

  update(deltaSeconds: number): void {
    if (!this.playing) {
      this.gfx.clear();
      this.overlay.clear();
      return;
    }

    this.ageRockets(deltaSeconds);
    this.ageSparks(deltaSeconds);
    this.ageConfetti(deltaSeconds);
    this.redraw();

    if (
      this.rockets.length === 0 &&
      this.sparks.length === 0 &&
      this.confetti.length === 0
    ) {
      this.playing = false;
      this.gfx.clear();
      this.overlay.clear();
    }
  }

  clear(): void {
    this.playing = false;
    this.confetti = [];
    this.sparks = [];
    this.rockets = [];
    this.gfx.clear();
    this.overlay.clear();
  }

  destroy(): void {
    this.clear();
    this.gfx.destroy();
    this.overlay.destroy();
  }

  setVisible(visible: boolean): void {
    this.gfx.setVisible(visible);
    this.overlay.setVisible(visible);
  }

  private ageRockets(deltaSeconds: number): void {
    const next: Rocket[] = [];
    for (const rocket of this.rockets) {
      rocket.age += deltaSeconds;
      if (rocket.age < rocket.delay) {
        next.push(rocket);
        continue;
      }
      if (!rocket.exploded) {
        rocket.height += rocket.verticalVelocity * deltaSeconds;
        rocket.verticalVelocity -= 7 * deltaSeconds;
        if (rocket.verticalVelocity <= 3.5 || rocket.height > 11) {
          rocket.exploded = true;
          this.burstSparks(rocket);
          continue;
        }
        next.push(rocket);
      }
    }
    this.rockets = next;
  }

  private burstSparks(rocket: Rocket): void {
    for (let i = 0; i < SPARKS_PER_BURST; i += 1) {
      const angle = (i / SPARKS_PER_BURST) * Math.PI * 2 + rocket.age;
      const speed = 7 + (i % 5) * 1.4;
      this.sparks.push({
        positionWorld: rocket.positionWorld,
        velocityWorldPerSec: scale(fromAngle(angle), speed),
        height: rocket.height,
        verticalVelocity: 3 + (i % 4),
        color: i % 3 === 0 ? 0xfff6d8 : rocket.color,
        size: 0.22 + (i % 3) * 0.08,
        age: 0,
        life: 0.85 + (i % 4) * 0.08,
      });
    }
  }

  private ageSparks(deltaSeconds: number): void {
    const next: Spark[] = [];
    for (const spark of this.sparks) {
      spark.age += deltaSeconds;
      if (spark.age >= spark.life) {
        continue;
      }
      spark.positionWorld = add(
        spark.positionWorld,
        scale(spark.velocityWorldPerSec, deltaSeconds),
      );
      spark.verticalVelocity -= 16 * deltaSeconds;
      spark.height = Math.max(0, spark.height + spark.verticalVelocity * deltaSeconds);
      next.push(spark);
    }
    this.sparks = next;
  }

  private ageConfetti(deltaSeconds: number): void {
    const next: Confetti[] = [];
    for (const piece of this.confetti) {
      piece.age += deltaSeconds;
      if (piece.age >= piece.life) {
        continue;
      }
      piece.vy += 110 * deltaSeconds;
      piece.x += piece.vx * deltaSeconds * 18;
      piece.y += piece.vy * deltaSeconds;
      piece.rotation += piece.spin * deltaSeconds;
      next.push(piece);
    }
    this.confetti = next;
  }

  private redraw(): void {
    this.gfx.clear();
    this.overlay.clear();

    for (const rocket of this.rockets) {
      if (rocket.age < rocket.delay || rocket.exploded) {
        continue;
      }
      const screen = this.projection.toScreen(rocket.positionWorld, rocket.height);
      const px = this.projection.pixelsPerUnit;
      this.gfx.fillStyle(0xfff6d8, 1);
      this.gfx.fillRect(Math.round(screen.x) - 2, Math.round(screen.y) - 5, 4, 8);
      this.gfx.fillStyle(rocket.color, 1);
      this.gfx.fillRect(Math.round(screen.x) - 1, Math.round(screen.y) + 3, 2, 5);
      this.gfx.fillStyle(0xff7a18, 0.9);
      this.gfx.fillCircle(screen.x, screen.y + 8, Math.max(2, 0.22 * px));
    }

    for (const spark of this.sparks) {
      const t = spark.age / spark.life;
      const alpha = t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1;
      const screen = this.projection.toScreen(spark.positionWorld, spark.height);
      const radius = Math.max(2, spark.size * this.projection.pixelsPerUnit * (1 - t * 0.4));
      this.gfx.fillStyle(spark.color, alpha);
      this.gfx.fillCircle(Math.round(screen.x), Math.round(screen.y), radius);
    }

    const flash = this.rockets.some(rocket => rocket.exploded === false && rocket.age >= rocket.delay)
      ? 0
      : this.sparks.length > 0
        ? 0.12
        : 0;
    if (flash > 0) {
      const cam = this.scene.cameras.main;
      this.overlay.fillStyle(0xfff4d8, flash);
      this.overlay.fillRect(0, 0, cam.width, cam.height);
    }

    for (const piece of this.confetti) {
      const t = piece.age / piece.life;
      const alpha = t > 0.72 ? 1 - (t - 0.72) / 0.28 : 1;
      this.overlay.save();
      this.overlay.translateCanvas(Math.round(piece.x), Math.round(piece.y));
      this.overlay.rotateCanvas(piece.rotation);
      this.overlay.fillStyle(piece.color, alpha);
      this.overlay.fillRect(
        Math.round(-piece.width / 2),
        Math.round(-piece.height / 2),
        piece.width,
        piece.height,
      );
      this.overlay.restore();
    }
  }
}
