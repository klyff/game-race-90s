import Phaser from 'phaser';
import type { Vec2 } from '../../domain/math/Vec2.ts';
import { add, fromAngle, scale } from '../../domain/math/Vec2.ts';
import type { VehicleState } from '../../domain/vehicle/Vehicle.ts';
import { IsoProjection } from './IsoProjection.ts';
import { ROAD_DEPTH } from './TrackRenderer.ts';

/**
 * Short electric bolts radiating from the DeLorean in Flux overdrive.
 *
 * Few frames, high impact (pixel-art animation rule): at most a handful of
 * live bolts, jagged stepped polylines, cyan→white palette, hard pixel snap.
 * Never spawn every physics step — gated by spawn interval.
 */

export interface FluxLightningOptions {
  readonly maxBolts?: number;
  readonly spawnIntervalSeconds?: number;
  readonly lifetimeSeconds?: number;
}

const DEFAULT_MAX_BOLTS = 8;
const DEFAULT_SPAWN_INTERVAL = 0.09;
const DEFAULT_LIFETIME = 0.22;
const BOLT_LENGTH_UNITS = 3.6;
const BOLT_SEGMENTS = 5;

/** Electric ramp: deep blue → cyan → white core. */
const BOLT_COLORS: readonly number[] = [0x1a4cff, 0x3ad0ff, 0xe8fbff];

interface Bolt {
  points: readonly Vec2[];
  ageSeconds: number;
  lifetimeSeconds: number;
  height: number;
}

export class FluxLightningEffect {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly projection: IsoProjection;
  private readonly maxBolts: number;
  private readonly spawnInterval: number;
  private readonly lifetime: number;
  private readonly bolts: Bolt[] = [];
  private spawnCooldown = 0;
  private seed = 1;

  constructor(scene: Phaser.Scene, projection: IsoProjection, options: FluxLightningOptions = {}) {
    this.projection = projection;
    this.maxBolts = options.maxBolts ?? DEFAULT_MAX_BOLTS;
    this.spawnInterval = options.spawnIntervalSeconds ?? DEFAULT_SPAWN_INTERVAL;
    this.lifetime = options.lifetimeSeconds ?? DEFAULT_LIFETIME;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(ROAD_DEPTH + 4);
    this.graphics.setName('fluxLightning');
  }

  update(deltaSeconds: number): void {
    this.spawnCooldown = Math.max(0, this.spawnCooldown - deltaSeconds);
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < this.bolts.length; readIndex += 1) {
      const bolt = this.bolts[readIndex]!;
      bolt.ageSeconds += deltaSeconds;
      if (bolt.ageSeconds < bolt.lifetimeSeconds) {
        this.bolts[writeIndex] = bolt;
        writeIndex += 1;
      }
    }
    this.bolts.length = writeIndex;
    this.redraw();
  }

  /**
   * While overdrive is active, occasionally throw a bolt from the car body.
   * Call once per overdrive car per frame after `record`ing the fire trail.
   */
  pulse(state: VehicleState, intensity: number = 1): void {
    if (intensity <= 0) {
      return;
    }
    if (this.spawnCooldown > 0) {
      return;
    }
    if (this.bolts.length >= this.maxBolts) {
      this.bolts.shift();
    }
    this.bolts.push(this.makeBolt(state, intensity));
    this.spawnCooldown = this.spawnInterval * (0.65 + this.nextRand() * 0.7);
  }

  clear(): void {
    this.bolts.length = 0;
    this.spawnCooldown = 0;
    this.graphics.clear();
  }

  destroy(): void {
    this.graphics.destroy();
  }

  setVisible(visible: boolean): void {
    this.graphics.setVisible(visible);
  }

  private makeBolt(state: VehicleState, intensity: number): Bolt {
    const angle = state.heading + (this.nextRand() - 0.5) * Math.PI * 1.4;
    const length = BOLT_LENGTH_UNITS * (0.55 + 0.55 * Math.min(1, intensity));
    const origin = add(state.position, scale(fromAngle(angle + Math.PI), 0.4));
    const points: Vec2[] = [origin];
    let cursor = origin;
    for (let step = 1; step <= BOLT_SEGMENTS; step += 1) {
      const t = step / BOLT_SEGMENTS;
      const along = fromAngle(angle + (this.nextRand() - 0.5) * 0.9);
      const jitter = (this.nextRand() - 0.5) * 1.1 * (1 - t * 0.4);
      cursor = add(cursor, scale(along, (length / BOLT_SEGMENTS) * (0.7 + this.nextRand() * 0.6)));
      cursor = add(cursor, scale(fromAngle(angle + Math.PI / 2), jitter));
      points.push(cursor);
    }
    return {
      points,
      ageSeconds: 0,
      lifetimeSeconds: this.lifetime * (0.75 + this.nextRand() * 0.5),
      height: state.height + 0.35 + this.nextRand() * 0.5,
    };
  }

  private nextRand(): number {
    // Tiny deterministic LCG so bolts are reproducible for a given pulse order.
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return (this.seed & 0xffff) / 0x10000;
  }

  private redraw(): void {
    this.graphics.clear();
    for (const bolt of this.bolts) {
      const life = 1 - bolt.ageSeconds / bolt.lifetimeSeconds;
      if (life <= 0 || bolt.points.length < 2) {
        continue;
      }
      const screens = bolt.points.map(point => {
        const screen = this.projection.toScreen(point, bolt.height);
        return { x: Math.round(screen.x), y: Math.round(screen.y) };
      });
      for (let layer = 0; layer < BOLT_COLORS.length; layer += 1) {
        const width = Math.max(1, 3 - layer);
        const alpha = life * (0.35 + layer * 0.28);
        this.graphics.lineStyle(width, BOLT_COLORS[layer]!, alpha);
        this.graphics.beginPath();
        this.graphics.moveTo(screens[0]!.x, screens[0]!.y);
        for (let i = 1; i < screens.length; i += 1) {
          this.graphics.lineTo(screens[i]!.x, screens[i]!.y);
        }
        this.graphics.strokePath();
      }
    }
  }
}
