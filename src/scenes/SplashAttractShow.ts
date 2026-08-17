import Phaser from 'phaser';
import { SPLASH_CARDS } from '../data/cards/SplashCards.ts';
import {
  CARD_FLIP_SECONDS,
  CARD_GROW_FADE_SECONDS,
  CARD_GROW_SCALE,
  CORNER_ORDER,
  SPARKLE_START_SECONDS,
  cardStartAt,
  clampToViewport,
  cornerCenter,
  cornerSize,
  cornersAppearAt,
  showcaseCenter,
  showcaseRect,
} from '../adapters/render/SplashAttract.ts';
import type { Size } from '../adapters/render/SplashLayout.ts';

const SPARKLE_TEXTURE_KEY = 'splash-sparkle';
const SPARKLE_COUNT = 18;
const CARD_DEPTH = 4;
const SPARKLE_DEPTH = 3;
const CORNER_DEPTH = 5;

interface Sparkle {
  readonly image: Phaser.GameObjects.Image;
  phase: number;
  speed: number;
  orbit: number;
}

/**
 * Phaser-facing attract on the splash: sparkles in the void, four cards
 * flipping through like a deck, then the same four parked in the corners.
 *
 * Timing lives in `SplashAttract.ts`. This file only creates objects and
 * tweens. `layout()` is safe to call on every resize — in-flight tweens
 * keep their scale/alpha; only positions and base sizes move.
 */
export class SplashAttractShow {
  private readonly scene: Phaser.Scene;
  private readonly sparkles: Sparkle[] = [];
  private readonly cornerCards: Phaser.GameObjects.Image[] = [];
  private showcase: Phaser.GameObjects.Image | null = null;
  private timers: Phaser.Time.TimerEvent[] = [];
  private started = false;
  private cornersAnimating = false;
  private showcaseIndex = -1;
  private viewport: Size = { width: 1, height: 1 };
  private image: Size = { width: 1, height: 1 };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.ensureSparkleTexture();
    this.spawnSparkles();
    this.spawnCornerCards();

    this.timers.push(
      this.scene.time.delayedCall(SPARKLE_START_SECONDS * 1000, () => this.wakeSparkles()),
    );
    for (let index = 0; index < SPLASH_CARDS.length; index += 1) {
      this.timers.push(
        this.scene.time.delayedCall(cardStartAt(index) * 1000, () => this.playCard(index)),
      );
    }
    this.timers.push(
      this.scene.time.delayedCall(cornersAppearAt() * 1000, () => this.revealCorners()),
    );
    this.layout(this.viewport, this.image);
  }

  layout(viewport: Size, image: Size): void {
    this.viewport = viewport;
    this.image = image;
    this.layoutShowcase();
    this.layoutCorners();
  }

  destroy(): void {
    for (const timer of this.timers) {
      timer.remove(false);
    }
    this.timers = [];
    if (this.showcase !== null) {
      this.scene.tweens.killTweensOf(this.showcase);
      this.showcase.destroy();
      this.showcase = null;
    }
    for (const card of this.cornerCards) {
      this.scene.tweens.killTweensOf(card);
      card.destroy();
    }
    this.cornerCards.length = 0;
    for (const sparkle of this.sparkles) {
      this.scene.tweens.killTweensOf(sparkle.image);
      sparkle.image.destroy();
    }
    this.sparkles.length = 0;
    this.started = false;
    this.showcaseIndex = -1;
    this.cornersAnimating = false;
  }

  update(deltaSeconds: number): void {
    if (this.sparkles.length === 0) {
      return;
    }
    const dt = Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? deltaSeconds : 0;
    const hole = showcaseRect(this.viewport, this.image);
    const cx = hole.x + hole.width / 2;
    const cy = hole.y + hole.height / 2;
    const rx = hole.width * 0.62;
    const ry = hole.height * 0.62;
    for (const sparkle of this.sparkles) {
      sparkle.phase += dt * sparkle.speed;
      const x = cx + Math.cos(sparkle.phase) * rx * sparkle.orbit;
      const y = cy + Math.sin(sparkle.phase * 1.35) * ry * sparkle.orbit;
      sparkle.image.setPosition(x, y);
    }
  }

  private playCard(index: number): void {
    const card = SPLASH_CARDS[index];
    if (card === undefined || !this.scene.textures.exists(card.key)) {
      return;
    }
    this.showcaseIndex = index;
    if (this.showcase === null) {
      this.showcase = this.scene.add.image(0, 0, card.key).setOrigin(0.5, 0.5).setDepth(CARD_DEPTH);
    } else {
      this.scene.tweens.killTweensOf(this.showcase);
      this.showcase.setTexture(card.key);
    }

    const size = showcaseRect(this.viewport, this.image);
    const center = showcaseCenter(this.viewport, this.image);
    this.showcase.setPosition(center.x, center.y);
    this.showcase.setDisplaySize(size.width, size.height);
    const faceX = this.showcase.scaleX;
    const faceY = this.showcase.scaleY;
    this.showcase.setAlpha(1);
    this.showcase.setAngle(-18);
    this.showcase.setScale(0.02, faceY);
    this.showcase.setVisible(true);

    const flipMs = (CARD_FLIP_SECONDS * 1000) / 3;
    this.scene.tweens.chain({
      targets: this.showcase,
      tweens: [
        { scaleX: faceX, angle: 10, duration: flipMs, ease: Phaser.Math.Easing.Cubic.Out },
        { scaleX: 0.02, angle: -10, duration: flipMs, ease: Phaser.Math.Easing.Cubic.InOut },
        { scaleX: faceX, angle: 0, duration: flipMs, ease: Phaser.Math.Easing.Cubic.Out },
      ],
      onComplete: () => {
        if (this.showcase === null) {
          return;
        }
        this.scene.tweens.add({
          targets: this.showcase,
          scaleX: faceX * CARD_GROW_SCALE,
          scaleY: faceY * CARD_GROW_SCALE,
          alpha: 0,
          duration: CARD_GROW_FADE_SECONDS * 1000,
          ease: Phaser.Math.Easing.Cubic.In,
          onComplete: () => {
            this.showcase?.setVisible(false);
          },
        });
      },
    });
  }

  private revealCorners(): void {
    this.cornersAnimating = true;
    this.layoutCorners();
    let remaining = this.cornerCards.length;
    for (const card of this.cornerCards) {
      card.setVisible(true);
      card.setAlpha(0);
      const targetScaleX = card.scaleX;
      const targetScaleY = card.scaleY;
      card.setScale(targetScaleX * 0.4, targetScaleY * 0.4);
      this.scene.tweens.add({
        targets: card,
        alpha: 1,
        scaleX: targetScaleX,
        scaleY: targetScaleY,
        duration: 520,
        ease: Phaser.Math.Easing.Back.Out,
        onComplete: () => {
          remaining -= 1;
          if (remaining <= 0) {
            this.cornersAnimating = false;
          }
        },
      });
    }
    if (remaining === 0) {
      this.cornersAnimating = false;
    }
  }

  private wakeSparkles(): void {
    for (const sparkle of this.sparkles) {
      sparkle.image.setVisible(true);
      this.scene.tweens.add({
        targets: sparkle.image,
        alpha: { from: 0.15, to: 1 },
        scale: { from: 0.4, to: 1.15 },
        duration: 420 + sparkle.orbit * 280,
        yoyo: true,
        repeat: -1,
        ease: Phaser.Math.Easing.Sine.InOut,
      });
    }
  }

  private spawnSparkles(): void {
    for (let i = 0; i < SPARKLE_COUNT; i += 1) {
      const image = this.scene.add
        .image(0, 0, SPARKLE_TEXTURE_KEY)
        .setOrigin(0.5, 0.5)
        .setDepth(SPARKLE_DEPTH)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setVisible(false)
        .setAlpha(0);
      this.sparkles.push({
        image,
        phase: (i / SPARKLE_COUNT) * Math.PI * 2,
        speed: 0.55 + (i % 5) * 0.18,
        orbit: 0.35 + (i % 7) * 0.09,
      });
    }
  }

  private spawnCornerCards(): void {
    for (let index = 0; index < SPLASH_CARDS.length; index += 1) {
      const spec = SPLASH_CARDS[index];
      if (spec === undefined || !this.scene.textures.exists(spec.key)) {
        continue;
      }
      const card = this.scene.add
        .image(0, 0, spec.key)
        .setOrigin(0.5, 0.5)
        .setDepth(CORNER_DEPTH)
        .setVisible(false)
        .setAlpha(0);
      this.cornerCards.push(card);
    }
  }

  private layoutShowcase(): void {
    if (this.showcase === null || this.showcaseIndex < 0) {
      return;
    }
    const center = showcaseCenter(this.viewport, this.image);
    this.showcase.setPosition(center.x, center.y);
  }

  private layoutCorners(): void {
    const size = cornerSize(this.viewport, this.image);
    for (let index = 0; index < this.cornerCards.length; index += 1) {
      const card = this.cornerCards[index];
      const corner = CORNER_ORDER[index];
      if (card === undefined || corner === undefined) {
        continue;
      }
      const raw = cornerCenter(this.viewport, this.image, corner);
      const point = clampToViewport(raw, size, this.viewport);
      card.setPosition(point.x, point.y);
      if (!this.cornersAnimating) {
        card.setDisplaySize(size, size);
      }
    }
  }

  private ensureSparkleTexture(): void {
    if (this.scene.textures.exists(SPARKLE_TEXTURE_KEY)) {
      return;
    }
    const graphics = this.scene.add.graphics().setVisible(false);
    graphics.fillStyle(0xfff2a8, 1);
    graphics.fillCircle(8, 8, 5);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(8, 8, 2);
    graphics.generateTexture(SPARKLE_TEXTURE_KEY, 16, 16);
    graphics.destroy();
  }
}
