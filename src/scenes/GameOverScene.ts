import Phaser from 'phaser';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import { driverBodyKey, driverBodyUrl, driverDefeatKey, driverDefeatUrl } from '../data/cards/DriverBodies.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { loadActiveName, resetCareerKeepPilot } from '../adapters/progress/ProgressStore.ts';
import { isAudioMuted, setAudioMuted } from '../adapters/audio/AudioPrefs.ts';
import { playDefeatSting, stopDefeatSting } from '../adapters/audio/DefeatSting.ts';
import { containSize } from '../adapters/render/FitBox.ts';
import { paintRoundedPlaque, PLAQUE_INK } from '../adapters/render/UiPlaque.ts';
import { SCENE_KEY } from './sceneKeys.ts';

export interface GameOverSceneData {
  readonly manifest: CarSetManifest;
  readonly linesByTrack: Record<string, TrackLinesManifest>;
  readonly playerName?: string;
  /** Preview / debug: show the screen without wiping the slot. */
  readonly skipReset?: boolean;
}

const GOLD = '#ffd85c';
const IVORY = '#f4f0e4';
const ALERT = '#ff8080';

/**
 * The pose does the talking: defeat sprite, GAME OVER, one lose sting.
 * Confirm returns to the garage. No extra menu trap.
 */
export class GameOverScene extends Phaser.Scene {
  private payload!: GameOverSceneData;
  private leaving = false;
  private backdrop!: Phaser.GameObjects.Rectangle;
  private titleBox!: Phaser.GameObjects.Graphics;
  private poseBox!: Phaser.GameObjects.Graphics;
  private promptBox!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private pose!: Phaser.GameObjects.Image;
  private poseLetter!: Phaser.GameObjects.Text;
  private keptName = 'YOU';

  constructor() {
    super(SCENE_KEY.GAME_OVER);
  }

  init(data: GameOverSceneData): void {
    this.payload = data;
    this.leaving = false;
    const fromPayload = data.playerName?.trim();
    this.keptName =
      fromPayload !== undefined && fromPayload.length > 0 ? fromPayload.toUpperCase() : loadActiveName() || 'YOU';
    if (data.skipReset !== true) {
      resetCareerKeepPilot(Date.now());
    }
  }

  preload(): void {
    const defeat = driverDefeatKey(this.keptName);
    if (!this.textures.exists(defeat)) {
      this.load.image(defeat, driverDefeatUrl(this.keptName));
    }
    const profile = driverBodyKey(this.keptName);
    if (!this.textures.exists(profile)) {
      this.load.image(profile, driverBodyUrl(this.keptName));
    }
  }

  create(): void {
    this.backdrop = this.add.rectangle(0, 0, 10, 10, 0x05060a, 0.96).setOrigin(0, 0).setDepth(0);
    this.titleBox = this.add.graphics().setDepth(2);
    this.poseBox = this.add.graphics().setDepth(2);
    this.promptBox = this.add.graphics().setDepth(2);
    this.pose = this.add.image(0, 0, '').setOrigin(0.5, 0.5).setVisible(false).setDepth(3);
    this.poseLetter = this.add
      .text(0, 0, this.keptName.slice(0, 1), {
        fontFamily: 'monospace',
        fontSize: '72px',
        color: GOLD,
        stroke: '#1a0e05',
        strokeThickness: 8,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(3)
      .setVisible(false);
    this.titleText = this.add
      .text(0, 0, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: ALERT,
        stroke: '#1a0e05',
        strokeThickness: 8,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(4);
    this.nameText = this.add
      .text(0, 0, this.keptName, {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: GOLD,
        stroke: '#1a0e05',
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(4);
    this.bodyText = this.add
      .text(0, 0, 'BANK EMPTY  ·  KEEP PILOT  ·  START OVER', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: IVORY,
        stroke: '#101014',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(4);
    this.promptText = this.add
      .text(0, 0, 'SPACE / ENTER   ·   GARAGE', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: IVORY,
        stroke: '#1a0e05',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(4);

    this.applyPose();
    this.layout();
    this.slamIn();
    playDefeatSting();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
    this.bindKeys();
  }

  private poseKey(): string {
    const defeat = driverDefeatKey(this.keptName);
    if (this.textures.exists(defeat)) {
      return defeat;
    }
    const profile = driverBodyKey(this.keptName);
    return this.textures.exists(profile) ? profile : '';
  }

  private applyPose(): void {
    const key = this.poseKey();
    if (key === '') {
      this.pose.setVisible(false);
      this.poseLetter.setVisible(true);
      return;
    }
    this.pose.setTexture(key).setVisible(true);
    this.poseLetter.setVisible(false);
  }

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const centreX = width / 2;
    this.backdrop.setSize(width, height);

    const titleY = height * 0.12;
    paintRoundedPlaque(this.titleBox, {
      x: centreX,
      y: titleY,
      width: Math.min(640, width * 0.8),
      height: 80,
      fill: PLAQUE_INK,
      alpha: 0.78,
      edge: 0xff4a4a,
    });
    this.titleText.setPosition(centreX, titleY);

    const poseCy = height * 0.46;
    const poseBoxW = Math.min(width * 0.72, 520);
    const poseBoxH = Math.min(height * 0.42, 400);
    paintRoundedPlaque(this.poseBox, {
      x: centreX,
      y: poseCy,
      width: poseBoxW,
      height: poseBoxH,
      fill: PLAQUE_INK,
      alpha: 0.55,
      edge: 0xf4e6c4,
    });
    this.placePose(centreX, poseCy, poseBoxW - 36, poseBoxH - 36);
    this.poseLetter.setPosition(centreX, poseCy);

    this.nameText.setPosition(centreX, height * 0.76);
    this.bodyText.setPosition(centreX, height * 0.82);

    paintRoundedPlaque(this.promptBox, {
      x: centreX,
      y: height * 0.93,
      width: Math.min(420, width * 0.5),
      height: 40,
    });
    this.promptText.setPosition(centreX, height * 0.93);
  }

  private placePose(cx: number, cy: number, maxW: number, maxH: number): void {
    if (!this.pose.visible) {
      return;
    }
    const frame = this.pose.frame;
    const fit = containSize({ width: frame.width, height: frame.height }, { width: maxW, height: maxH });
    this.pose.setPosition(cx, cy).setDisplaySize(fit.width, fit.height);
  }

  private slamIn(): void {
    if (this.prefersReducedMotion()) {
      return;
    }
    this.tweens.add({
      targets: [this.titleText, this.nameText],
      scale: { from: 1.12, to: 1 },
      duration: 240,
      ease: 'Back.easeOut',
    });
    if (this.pose.visible) {
      this.pose.setAlpha(0);
      this.tweens.add({
        targets: this.pose,
        alpha: 1,
        duration: 180,
      });
    }
  }

  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null || keyboard === undefined) {
      return;
    }
    const leave = (): void => this.leaveToGarage();
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', leave);
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).on('down', leave);
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', leave);
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M).on('down', () => {
      setAudioMuted(!isAudioMuted());
      if (isAudioMuted()) {
        stopDefeatSting();
      }
    });
  }

  private leaveToGarage(): void {
    if (this.leaving) {
      return;
    }
    this.leaving = true;
    stopDefeatSting();
    this.scene.start(SCENE_KEY.GARAGE, {
      manifest: this.payload.manifest,
      linesByTrack: this.payload.linesByTrack,
    });
  }
}
