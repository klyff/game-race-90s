import Phaser from 'phaser';
import { formatCash } from '../../domain/progress/Wallet.ts';
import type { Vec2 } from '../../domain/math/Vec2.ts';
import { IsoProjection } from './IsoProjection.ts';

const LIFE_SECONDS = 0.7;
const RISE_PX = 36;
const STAR_COUNT = 6;
const MAX_BURSTS = 12;
/** Merge hits that land in the same scrape so the screen does not fill with $ text. */
const COALESCE_SECONDS = 0.28;

interface Star {
  readonly angle: number;
  readonly radius: number;
  readonly spin: number;
  readonly glyph: Phaser.GameObjects.Text;
}

interface Burst {
  age: number;
  cash: number;
  points: number;
  readonly label: Phaser.GameObjects.Text;
  readonly stars: readonly Star[];
}

/**
 * Floating bounty: `$` and points appear above the attacker as a star trail,
 * dive into the car, then vanish. The HUD totals update from live state;
 * this is only the pickup animation.
 */
export class HitRewardEffect {
  private readonly scene: Phaser.Scene;
  private readonly projection: IsoProjection;
  private bursts: Burst[] = [];
  private cameraZoom = 1;

  constructor(scene: Phaser.Scene, projection: IsoProjection) {
    this.scene = scene;
    this.projection = projection;
  }

  spawn(worldPosition: Vec2, cash: number, points: number): void {
    if (cash <= 0 && points <= 0) {
      return;
    }
    const newest = this.bursts[this.bursts.length - 1];
    if (newest !== undefined && newest.age < COALESCE_SECONDS) {
      newest.cash += cash;
      newest.points += points;
      newest.age = 0;
      newest.label.setText(rewardLabel(newest.cash, newest.points));
      return;
    }
    while (this.bursts.length >= MAX_BURSTS) {
      this.destroyBurst(this.bursts.shift()!);
    }
    const screen = this.projection.toScreen(worldPosition);
    const depth = this.projection.depthOf(worldPosition) + 8;
    const rise = this.risePx();
    const label = this.scene.add
      .text(screen.x, screen.y - rise, rewardLabel(cash, points), {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffe066',
        stroke: '#1a0e05',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 1)
      .setDepth(depth)
      .setScale(this.screenScale());
    const stars: Star[] = [];
    for (let i = 0; i < STAR_COUNT; i += 1) {
      const angle = (Math.PI * 2 * i) / STAR_COUNT;
      const glyph = this.scene.add
        .text(screen.x, screen.y - rise, '✦', {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#fff4b0',
          stroke: '#3a2008',
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0.5)
        .setDepth(depth)
        .setScale(this.screenScale());
      stars.push({
        angle,
        radius: 18 + (i % 2) * 8,
        spin: i % 2 === 0 ? 8 : -6,
        glyph,
      });
    }
    this.bursts.push({ age: 0, cash, points, label, stars });
  }

  update(worldPosition: Vec2, deltaSeconds: number, cameraZoom = 1): void {
    this.cameraZoom = cameraZoom;
    const screen = this.projection.toScreen(worldPosition);
    const fit = this.screenScale();
    const depth = this.projection.depthOf(worldPosition) + 8;
    const next: Burst[] = [];
    for (const burst of this.bursts) {
      burst.age += deltaSeconds;
      if (burst.age >= LIFE_SECONDS) {
        this.destroyBurst(burst);
        continue;
      }
      const t = burst.age / LIFE_SECONDS;
      const inward = t * t;
      const rise = this.risePx() * (1 - inward);
      const alpha = t < 0.72 ? 1 : 1 - (t - 0.72) / 0.28;
      burst.label.setPosition(screen.x, screen.y - rise).setAlpha(alpha).setDepth(depth);
      burst.label.setScale(fit * (1 + (1 - inward) * 0.18));
      for (const star of burst.stars) {
        const orbit = star.radius * (1 - inward) * fit;
        const angle = star.angle + burst.age * star.spin;
        star.glyph
          .setPosition(screen.x + Math.cos(angle) * orbit, screen.y - rise + Math.sin(angle) * orbit * 0.55)
          .setAlpha(alpha)
          .setDepth(depth)
          .setScale(fit * (1.15 - inward * 0.6));
      }
      next.push(burst);
    }
    this.bursts = next;
  }

  destroy(): void {
    for (const burst of this.bursts) {
      this.destroyBurst(burst);
    }
    this.bursts = [];
  }

  /**
   * RaceScene's chase camera zooms 1.5–2.0. Text created in that scene inherits
   * the zoom, which is why bounty labels either vanished (tiny after a pop) or
   * covered the car. Counter-scale so one screen pixel stays one screen pixel.
   */
  private screenScale(): number {
    const zoom = this.cameraZoom;
    if (!Number.isFinite(zoom) || zoom <= 0) {
      return 1;
    }
    return 1 / zoom;
  }

  private risePx(): number {
    return RISE_PX * this.screenScale();
  }

  private destroyBurst(burst: Burst): void {
    burst.label.destroy();
    for (const star of burst.stars) {
      star.glyph.destroy();
    }
  }
}

function rewardLabel(cash: number, points: number): string {
  const parts = [
    cash > 0 ? formatCash(cash) : '',
    points > 0 ? `+${points}` : '',
  ].filter(part => part.length > 0);
  return parts.join('  ');
}
