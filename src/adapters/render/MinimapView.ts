/**
 * Race HUD minimap: north-up circuit silhouette, focus triangle, NPC squares.
 *
 * Pixel-hard like `AnalogGauges` — integer centres, 2 px strokes, no glow.
 * Title-safe placement is the caller's job (`HudScene`).
 */

import Phaser from 'phaser';
import type { Vec2 } from '../../domain/math/Vec2.ts';
import {
  createMinimapViewport,
  minimapHeading,
  worldToMinimap,
  type MinimapSnapshot,
  type MinimapViewport,
} from './MinimapProjection.ts';

const PLATE = 0x000000;
const PLATE_ALPHA = 0.82;
const BEZEL = 0x2a2a32;
const ROAD = 0x8a8e96;
const START_LIGHT = 0xffffff;
const START_DARK = 0x000000;
const NPC = 0xe0523c;
const NPC_STROKE = 0x1a0e10;
const FOCUS = 0x4ec8ff;
const FOCUS_STROKE = 0xf6f6fa;
const FADED_ALPHA = 0.35;

const DEFAULT_SIZE = 200;

export interface MinimapViewOptions {
  readonly size?: number;
}

export class MinimapView {
  private readonly container: Phaser.GameObjects.Container;
  private readonly plate: Phaser.GameObjects.Rectangle;
  private readonly trackGfx: Phaser.GameObjects.Graphics;
  private readonly racerGfx: Phaser.GameObjects.Graphics;
  private width: number;
  private height: number;
  private viewport: MinimapViewport;
  private lastOutline: readonly Vec2[] = [];
  private lastStart: readonly [Vec2, Vec2] | null = null;
  private lastMargin = 0;

  constructor(scene: Phaser.Scene, options: MinimapViewOptions = {}) {
    const size = Math.max(64, Math.round(options.size ?? DEFAULT_SIZE));
    this.width = size;
    this.height = size;
    this.container = scene.add.container(0, 0);
    this.plate = scene.add
      .rectangle(0, 0, size, size, PLATE, PLATE_ALPHA)
      .setOrigin(0, 0)
      .setStrokeStyle(2, BEZEL, 0.9);
    this.trackGfx = scene.add.graphics();
    this.racerGfx = scene.add.graphics();
    this.container.add([this.plate, this.trackGfx, this.racerGfx]);
    this.viewport = createMinimapViewport([], size, size);
  }

  get size(): { readonly width: number; readonly height: number } {
    return { width: this.width, height: this.height };
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(Math.round(x), Math.round(y));
  }

  setDepth(depth: number): void {
    this.container.setDepth(depth);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  setSize(width: number, height: number): void {
    const nextW = Math.max(64, Math.round(width));
    const nextH = Math.max(64, Math.round(height));
    if (nextW === this.width && nextH === this.height) {
      return;
    }
    this.width = nextW;
    this.height = nextH;
    this.plate.setSize(nextW, nextH);
    this.rebuildViewport();
    this.drawTrack();
  }

  update(snapshot: MinimapSnapshot): void {
    const outlineChanged =
      snapshot.outline !== this.lastOutline ||
      snapshot.startLine !== this.lastStart ||
      snapshot.worldMargin !== this.lastMargin;
    this.lastOutline = snapshot.outline;
    this.lastStart = snapshot.startLine;
    this.lastMargin = snapshot.worldMargin;
    if (outlineChanged) {
      this.rebuildViewport();
      this.drawTrack();
    }
    this.drawRacers(snapshot);
  }

  destroy(): void {
    this.container.destroy();
  }

  private rebuildViewport(): void {
    this.viewport = createMinimapViewport(this.lastOutline, this.width, this.height, {
      worldMargin: this.lastMargin,
    });
  }

  private drawTrack(): void {
    this.trackGfx.clear();
    const outline = this.lastOutline;
    if (outline.length < 2) {
      return;
    }

    const roadWidth = Math.max(3, Math.round(Math.min(this.width, this.height) * 0.02));
    this.trackGfx.lineStyle(roadWidth, ROAD, 1);
    this.trackGfx.beginPath();
    const first = worldToMinimap(this.viewport, outline[0]!);
    this.trackGfx.moveTo(first.x, first.y);
    for (let i = 1; i < outline.length; i += 1) {
      const pixel = worldToMinimap(this.viewport, outline[i]!);
      this.trackGfx.lineTo(pixel.x, pixel.y);
    }
    this.trackGfx.closePath();
    this.trackGfx.strokePath();

    if (this.lastStart !== null) {
      const from = worldToMinimap(this.viewport, this.lastStart[0]);
      const to = worldToMinimap(this.viewport, this.lastStart[1]);
      const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
      this.trackGfx.lineStyle(2, START_DARK, 1);
      this.trackGfx.lineBetween(from.x, from.y, mid.x, mid.y);
      this.trackGfx.lineStyle(2, START_LIGHT, 1);
      this.trackGfx.lineBetween(mid.x, mid.y, to.x, to.y);
    }
  }

  private drawRacers(snapshot: MinimapSnapshot): void {
    this.racerGfx.clear();
    const mark = Math.max(4, Math.round(Math.min(this.width, this.height) * 0.024));
    const tip = Math.max(11, Math.round(Math.min(this.width, this.height) * 0.06));
    const base = Math.max(6, Math.round(tip * 0.62));

    for (const racer of snapshot.racers) {
      if (racer.isFocus) {
        continue;
      }
      this.drawNpc(worldToMinimap(this.viewport, racer.position), mark, racer.faded ? FADED_ALPHA : 1);
    }

    const focus = snapshot.racers.find(racer => racer.isFocus);
    if (focus === undefined) {
      return;
    }
    this.drawFocus(
      worldToMinimap(this.viewport, focus.position),
      minimapHeading(focus.heading),
      tip,
      base,
      focus.faded ? 0.45 : 1,
    );
  }

  private drawNpc(pixel: Vec2, half: number, alpha: number): void {
    const x = Math.round(pixel.x) - half;
    const y = Math.round(pixel.y) - half;
    const size = half * 2;
    this.racerGfx.fillStyle(NPC, alpha);
    this.racerGfx.fillRect(x, y, size, size);
    this.racerGfx.lineStyle(1, NPC_STROKE, alpha);
    this.racerGfx.strokeRect(x, y, size, size);
  }

  private drawFocus(pixel: Vec2, angle: number, tip: number, base: number, alpha: number): void {
    const cx = pixel.x;
    const cy = pixel.y;
    const tx = cx + Math.cos(angle) * tip;
    const ty = cy + Math.sin(angle) * tip;
    const left = angle + Math.PI * 0.78;
    const right = angle - Math.PI * 0.78;
    const lx = cx + Math.cos(left) * base;
    const ly = cy + Math.sin(left) * base;
    const rx = cx + Math.cos(right) * base;
    const ry = cy + Math.sin(right) * base;
    this.racerGfx.fillStyle(FOCUS, alpha);
    this.racerGfx.fillTriangle(tx, ty, lx, ly, rx, ry);
    this.racerGfx.lineStyle(2, FOCUS_STROKE, alpha);
    this.racerGfx.strokeTriangle(tx, ty, lx, ly, rx, ry);
  }
}
