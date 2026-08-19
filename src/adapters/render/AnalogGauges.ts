/**
 * Bottom-right analog cluster: speedo 0–220 MPH and tach 0–6000 RPM.
 *
 * Faces are static Graphics; needles are rotated each frame. No per-entity
 * state — one cluster, like `SpeedoGauge`. Pixel-hard: integer centres, 2 px
 * strokes, no glow. Title-safe placement is the caller's job (`HudScene`).
 *
 * The tach reads `EngineGearbox.rpmFraction` (sound-only). Physics stays gearless.
 */
import Phaser from 'phaser';
import {
  RPM_DIAL_MAX,
  RPM_REDLINE,
  SPEED_DIAL_MAX_MPH,
  dialAngle,
  mphDialFraction,
  rpmDialFraction,
} from './AnalogDial.ts';

export {
  DIAL_START_RAD,
  DIAL_SWEEP_RAD,
  RPM_DIAL_MAX,
  RPM_REDLINE,
  SPEED_DIAL_MAX_MPH,
  clampUnit,
  dialAngle,
  mphDialFraction,
  rpmDialFraction,
} from './AnalogDial.ts';

/** Face radius at 1080p. 52 * 1.65 so the cluster reads from the couch. */
const RADIUS = 86;
const GAP = 17;
const NEEDLE_SETTLE_SECONDS = 0.1;

const FACE = 0x0c0c10;
const BEZEL = 0x2a2a32;
const BEZEL_LIT = 0x5a5a66;
const TICK = 0xe8e8e8;
const REDLINE = 0xc01818;
const NEEDLE = 0xff2020;
const HUB = 0xc8c8d0;
const LABEL = '#e8e8e8';

export interface AnalogGaugesOptions {
  readonly radius?: number;
  readonly gap?: number;
}

export class AnalogGauges {
  private readonly container: Phaser.GameObjects.Container;
  private readonly speedNeedle: Phaser.GameObjects.Container;
  private readonly tachNeedle: Phaser.GameObjects.Container;
  private readonly radius: number;
  private readonly totalWidth: number;
  private readonly totalHeight: number;
  private shownSpeed = 0;
  private shownRpm = 0.15;

  constructor(scene: Phaser.Scene, options: AnalogGaugesOptions = {}) {
    this.radius = Math.max(32, Math.round(options.radius ?? RADIUS));
    const gap = Math.max(4, Math.round(options.gap ?? GAP));
    const diameter = this.radius * 2;
    this.totalWidth = diameter * 2 + gap;
    this.totalHeight = diameter;
    this.container = scene.add.container(0, 0);

    const speedCx = this.radius;
    const tachCx = diameter + gap + this.radius;
    const cy = this.radius;

    this.drawFace(scene, speedCx, cy, 'speed');
    this.drawFace(scene, tachCx, cy, 'tach');

    this.speedNeedle = this.makeNeedle(scene, speedCx, cy);
    this.tachNeedle = this.makeNeedle(scene, tachCx, cy);
    this.speedNeedle.setRotation(dialAngle(0));
    this.tachNeedle.setRotation(dialAngle(0.15));
  }

  get size(): { readonly width: number; readonly height: number } {
    return { width: this.totalWidth, height: this.totalHeight };
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(Math.round(x), Math.round(y));
  }

  setDepth(depth: number): void {
    this.container.setDepth(depth);
  }

  /**
   * @param mph Honest MPH (already scaled / rounded by HudFormat).
   * @param rpmFraction Gearbox 0..1 (idle floor included).
   * @param deltaSeconds Frame dt, for the ~100 ms needle settle on a shift.
   */
  update(mph: number, rpmFraction: number, deltaSeconds: number): void {
    const targetSpeed = mphDialFraction(mph);
    const targetRpm = rpmDialFraction(rpmFraction);
    const dt = Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? deltaSeconds : 0;
    if (dt <= 0) {
      this.shownSpeed = targetSpeed;
      this.shownRpm = targetRpm;
    } else {
      const follow = 1 - Math.exp(-dt / NEEDLE_SETTLE_SECONDS);
      this.shownSpeed += (targetSpeed - this.shownSpeed) * follow;
      this.shownRpm += (targetRpm - this.shownRpm) * follow;
    }

    this.speedNeedle.setRotation(dialAngle(this.shownSpeed));
    this.tachNeedle.setRotation(dialAngle(this.shownRpm));
  }

  destroy(): void {
    this.container.destroy();
  }

  private makeNeedle(scene: Phaser.Scene, cx: number, cy: number): Phaser.GameObjects.Container {
    const holder = scene.add.container(Math.round(cx), Math.round(cy));
    const needle = scene.add.graphics();
    const length = this.radius - 23;
    needle.fillStyle(NEEDLE, 1);
    needle.fillTriangle(7, -3, length, 0, 7, 3);
    needle.fillStyle(HUB, 1);
    needle.fillCircle(0, 0, 7);
    holder.add(needle);
    this.container.add(holder);
    return holder;
  }

  private drawFace(scene: Phaser.Scene, cx: number, cy: number, kind: 'speed' | 'tach'): void {
    const gfx = scene.add.graphics();
    const r = this.radius;
    gfx.fillStyle(BEZEL, 1);
    gfx.fillCircle(cx, cy, r);
    gfx.fillStyle(BEZEL_LIT, 1);
    gfx.fillCircle(cx - 2, cy - 2, r - 3);
    gfx.fillStyle(FACE, 1);
    gfx.fillCircle(cx, cy, r - 8);

    if (kind === 'tach') {
      const redFrom = dialAngle(RPM_REDLINE / RPM_DIAL_MAX);
      const redTo = dialAngle(1);
      gfx.lineStyle(7, REDLINE, 1);
      gfx.beginPath();
      gfx.arc(cx, cy, r - 15, redFrom, redTo, false);
      gfx.strokePath();
    }

    const major = 7;
    for (let i = 0; i < major; i += 1) {
      const t = i / (major - 1);
      const angle = dialAngle(t);
      const inner = r - 26;
      const outer = r - 12;
      gfx.lineStyle(3, i === major - 1 && kind === 'tach' ? REDLINE : TICK, 1);
      gfx.beginPath();
      gfx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      gfx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      gfx.strokePath();
    }

    this.container.add(gfx);

    const labels =
      kind === 'speed'
        ? [
            { t: 0, text: '0' },
            { t: 80 / SPEED_DIAL_MAX_MPH, text: '80' },
            { t: 160 / SPEED_DIAL_MAX_MPH, text: '160' },
            { t: 1, text: '220' },
          ]
        : [
            { t: 0, text: '0' },
            { t: 2 / 6, text: '2' },
            { t: 4 / 6, text: '4' },
            { t: 1, text: '6' },
          ];
    for (const label of labels) {
      const angle = dialAngle(label.t);
      const lx = Math.round(cx + Math.cos(angle) * (r - 36));
      const ly = Math.round(cy + Math.sin(angle) * (r - 36));
      const text = scene.add
        .text(lx, ly, label.text, {
          fontFamily: 'monospace',
          fontSize: '24px',
          color: LABEL,
        })
        .setOrigin(0.5, 0.5);
      this.container.add(text);
    }

    const centre = kind === 'tach' ? 'RPM' : 'MPH';
    const centreY = kind === 'tach' ? cy : cy + 30;
    const hubLabel = scene.add
      .text(Math.round(cx), Math.round(centreY), centre, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: LABEL,
      })
      .setOrigin(0.5, 0.5);
    this.container.add(hubLabel);
  }
}
