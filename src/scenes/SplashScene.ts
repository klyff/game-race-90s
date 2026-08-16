import Phaser from 'phaser';
import { TitleAudio } from '../adapters/audio/TitleAudio.ts';
import { playGuitarSolo } from '../adapters/audio/GuitarSolo.ts';
import { BlinkClock } from '../adapters/render/BlinkClock.ts';
import { coverRect, promptAnchor, voidRect } from '../adapters/render/SplashLayout.ts';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { enableTourMode, feedTourCode, isTourModeOn } from '../adapters/progress/TourMode.ts';
import { SCENE_KEY, SPLASH_ART_KEY } from './sceneKeys.ts';

const BLINK_PERIOD_SECONDS = 1.2;
const PROMPT_TEXT = 'press space bar to start';

interface SplashSceneData {
  readonly manifest: CarSetManifest;
  readonly linesByTrack: Record<string, TrackLinesManifest>;
}

/**
 * Attract screen. The void in the middle stays empty for future art.
 * Space plays the guitar solo and opens the garage.
 */
export class SplashScene extends Phaser.Scene {
  private manifest!: CarSetManifest;
  private linesByTrack!: Record<string, TrackLinesManifest>;

  private art!: Phaser.GameObjects.Image;
  private promptText!: Phaser.GameObjects.Text;
  private tourText!: Phaser.GameObjects.Text;

  private readonly blink = new BlinkClock(BLINK_PERIOD_SECONDS);
  private audio!: TitleAudio;
  private tourBuffer = '';
  private leaving = false;

  constructor() {
    super(SCENE_KEY.SPLASH);
  }

  init(data: SplashSceneData): void {
    this.manifest = data.manifest;
    this.linesByTrack = data.linesByTrack;
    this.leaving = false;
  }

  create(): void {
    this.art = this.add.image(0, 0, SPLASH_ART_KEY).setOrigin(0, 0);
    this.promptText = this.add.text(0, 0, PROMPT_TEXT, this.promptStyle()).setOrigin(0.5, 0.5);
    this.tourText = this.add
      .text(0, 0, 'TOUR MODE · ALL MAPS OPEN', this.tourStyle())
      .setOrigin(0.5, 0.5)
      .setVisible(isTourModeOn());

    this.audio = new TitleAudio();
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
    this.bindKeys();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.audio.destroy());
  }

  update(_time: number, deltaMilliseconds: number): void {
    this.blink.advance(deltaMilliseconds / 1000);
    this.promptText.setVisible(this.leaving ? false : this.blink.isOn);
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null || keyboard === undefined) {
      return;
    }
    keyboard.on('keydown', (event: KeyboardEvent) => {
      this.audio.start();
      this.considerTourCode(event.key);
    });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => this.audio.start());
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => this.leaveToGarage());
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M).on('down', () => this.audio.toggleMute());
  }

  private layout(): void {
    const viewport = { width: this.scale.width, height: this.scale.height };
    const image = { width: this.art.width, height: this.art.height };
    const art = coverRect(viewport, image);
    this.art.setPosition(art.x, art.y).setDisplaySize(art.width, art.height);
    const region = voidRect(viewport, image);
    const prompt = promptAnchor(viewport, image);
    this.promptText.setPosition(prompt.x, prompt.y);
    this.tourText.setPosition(prompt.x, prompt.y + region.height * 0.18);
  }

  private considerTourCode(key: string): void {
    if (isTourModeOn()) {
      return;
    }
    const next = feedTourCode(this.tourBuffer, key);
    this.tourBuffer = next.buffer;
    if (!next.unlocked) {
      return;
    }
    enableTourMode();
    this.tourText.setVisible(true);
  }

  private leaveToGarage(): void {
    if (this.leaving) {
      return;
    }
    this.leaving = true;
    this.audio.destroy();
    const wait = playGuitarSolo();
    const delay = Math.max(0, wait) * 1000;
    this.time.delayedCall(delay, () => {
      this.scene.start(SCENE_KEY.GARAGE, {
        manifest: this.manifest,
        linesByTrack: this.linesByTrack,
      });
    });
  }

  private promptStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '26px',
      color: '#ffffff',
      stroke: '#1a0e05',
      strokeThickness: 7,
    };
  }

  private tourStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#8bff9b',
      stroke: '#101014',
      strokeThickness: 3,
    };
  }
}
