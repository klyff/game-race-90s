import Phaser from 'phaser';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { TitleAudio } from '../adapters/audio/TitleAudio.ts';
import { playGuitarSolo } from '../adapters/audio/GuitarSolo.ts';
import { paintRoundedPlaque, PLAQUE_INK } from '../adapters/render/UiPlaque.ts';
import { coverRect } from '../adapters/render/SplashLayout.ts';
import {
  WORLD_PASS_BACKGROUNDS,
  worldPassById,
  worldPassKey,
  worldPassUrl,
  type WorldPassBackground,
} from '../data/ui/WorldPassBackgrounds.ts';
import { SCENE_KEY } from './sceneKeys.ts';

export interface WorldPassSceneData {
  readonly manifest: CarSetManifest;
  readonly linesByTrack: Record<string, TrackLinesManifest>;
  readonly passId: string;
  readonly playerName?: string;
}

const GOLD = '#ffd85c';
const IVORY = '#f4f0e4';

export class WorldPassScene extends Phaser.Scene {
  private payload!: WorldPassSceneData;
  private pass!: WorldPassBackground;
  private leaving = false;
  private audio!: TitleAudio;
  private art!: Phaser.GameObjects.Image;
  private dim!: Phaser.GameObjects.Rectangle;
  private titleBox!: Phaser.GameObjects.Graphics;
  private promptBox!: Phaser.GameObjects.Graphics;
  private headlineText!: Phaser.GameObjects.Text;
  private issuedText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEY.WORLD_PASS);
  }

  init(data: WorldPassSceneData): void {
    this.payload = data;
    this.leaving = false;
    this.pass = worldPassById(data.passId) ?? WORLD_PASS_BACKGROUNDS[WORLD_PASS_BACKGROUNDS.length - 1]!;
  }

  preload(): void {
    for (const pass of WORLD_PASS_BACKGROUNDS) {
      const key = worldPassKey(pass);
      if (!this.textures.exists(key)) {
        this.load.image(key, worldPassUrl(pass));
      }
    }
  }

  create(): void {
    this.art = this.add.image(0, 0, '').setOrigin(0, 0).setVisible(false).setDepth(0);
    this.dim = this.add.rectangle(0, 0, 10, 10, 0x05060a, 0.18).setOrigin(0, 0).setDepth(1);
    const key = worldPassKey(this.pass);
    if (this.textures.exists(key)) {
      this.art.setTexture(key).setVisible(true);
    }

    this.titleBox = this.add.graphics().setDepth(2);
    this.promptBox = this.add.graphics().setDepth(2);
    this.headlineText = this.add
      .text(0, 0, this.pass.headline, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: GOLD,
        stroke: '#1a0e05',
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(4);
    this.issuedText = this.add
      .text(0, 0, this.issuedLine(), {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: IVORY,
        stroke: '#1a0e05',
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(4);
    this.titleText = this.add
      .text(0, 0, this.pass.title, {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: GOLD,
        stroke: '#3a0d05',
        strokeThickness: 8,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(4);
    this.promptText = this.add
      .text(0, 0, 'SPACE / ENTER   ·   GARAGE', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: IVORY,
        stroke: '#1a0e05',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(4);

    this.audio = new TitleAudio();
    this.audio.start();
    this.layout();
    this.tweens.add({
      targets: [this.headlineText, this.issuedText, this.titleText],
      scale: { from: 1.18, to: 1 },
      duration: 260,
      ease: 'Back.easeOut',
    });
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
    this.bindKeys();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.audio.destroy());
  }

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    if (this.art.visible) {
      const rect = coverRect({ width, height }, { width: this.art.width, height: this.art.height });
      this.art.setPosition(rect.x, rect.y).setDisplaySize(rect.width, rect.height);
    }
    this.dim.setSize(width, height);

    const titleY = height * 0.12;
    paintRoundedPlaque(this.titleBox, {
      x: width / 2,
      y: titleY,
      width: Math.min(720, width * 0.8),
      height: 118,
      fill: PLAQUE_INK,
      alpha: 0.5,
      edge: 0xffd85c,
    });
    this.headlineText.setPosition(width / 2, titleY - 36);
    this.issuedText.setPosition(width / 2, titleY);
    this.titleText.setPosition(width / 2, titleY + 36);

    paintRoundedPlaque(this.promptBox, {
      x: width / 2,
      y: height * 0.94,
      width: Math.min(420, width * 0.5),
      height: 34,
    });
    this.promptText.setPosition(width / 2, height * 0.94);
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
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M).on('down', () => this.audio.toggleMute());
  }

  private playerCallsign(): string {
    const name = this.payload.playerName?.trim();
    return name !== undefined && name.length > 0 ? name.toUpperCase() : 'YOU';
  }

  private issuedLine(): string {
    return `ISSUED TO  ${this.playerCallsign()}`;
  }

  private leaveToGarage(): void {
    if (this.leaving) {
      return;
    }
    this.leaving = true;
    this.audio.destroy();
    const wait = playGuitarSolo();
    this.time.delayedCall(Math.max(0, wait) * 1000, () => {
      this.scene.start(SCENE_KEY.GARAGE, {
        manifest: this.payload.manifest,
        linesByTrack: this.payload.linesByTrack,
      });
    });
  }
}
