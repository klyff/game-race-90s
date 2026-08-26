import Phaser from 'phaser';
import { playSplashKick } from '../adapters/audio/SplashKick.ts';
import { attachMenuAudio } from '../adapters/audio/MenuAudio.ts';
import { MUSIC_SPLASH_BED_VOLUME } from '../data/audio/MusicBeds.ts';
import { TitleAudio } from '../adapters/audio/TitleAudio.ts';
import { BlinkClock } from '../adapters/render/BlinkClock.ts';
import { coverRect, promptAnchor, voidRect } from '../adapters/render/SplashLayout.ts';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { enableTourMode, feedTourCode, isTourModeOn } from '../adapters/progress/TourMode.ts';
import { enableWatchMode } from '../adapters/progress/WatchMode.ts';
import { enableDebugIaMode, debugIaSeed } from '../adapters/progress/DebugIaMode.ts';
import {
  WATCH_ATTRACT_RACER_COUNT,
  watchAttractTracks,
} from '../domain/race/WatchField.ts';
import { SCENE_KEY, SPLASH_ART_KEY } from './sceneKeys.ts';
import { SplashAttractShow } from './SplashAttractShow.ts';

const BLINK_PERIOD_SECONDS = 1.2;
const PROMPT_TEXT = 'press space bar to start';
const WATCH_HINT = 'P  WATCH  ·  15 BOTS';

interface SplashSceneData {
  readonly manifest: CarSetManifest;
  readonly linesByTrack: Record<string, TrackLinesManifest>;
}

/**
 * Attract screen. After 7s the void plays the four family cards, then
 * they settle in the corners. Space: explosion + narrator BOOOOM, then the comic.
 */
export class SplashScene extends Phaser.Scene {
  private manifest!: CarSetManifest;
  private linesByTrack!: Record<string, TrackLinesManifest>;

  private art!: Phaser.GameObjects.Image;
  private promptText!: Phaser.GameObjects.Text;
  private tourText!: Phaser.GameObjects.Text;
  private watchHint!: Phaser.GameObjects.Text;
  private attract!: SplashAttractShow;

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
    this.watchHint = this.add.text(0, 0, WATCH_HINT, this.watchHintStyle()).setOrigin(0.5, 0.5);
    this.tourText = this.add
      .text(0, 0, 'TOUR MODE · ALL MAPS OPEN', this.tourStyle())
      .setOrigin(0.5, 0.5)
      .setVisible(isTourModeOn());

    this.audio = attachMenuAudio(this, { volume: MUSIC_SPLASH_BED_VOLUME });
    this.attract = new SplashAttractShow(this);
    this.layout();
    this.attract.start();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
    this.bindKeys();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.attract.destroy();
      this.audio.destroy();
    });
  }

  update(_time: number, deltaMilliseconds: number): void {
    const deltaSeconds = deltaMilliseconds / 1000;
    this.blink.advance(deltaSeconds);
    this.attract.update(deltaSeconds);
    this.promptText.setVisible(this.leaving ? false : this.blink.isOn);
    this.watchHint.setVisible(!this.leaving);
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null || keyboard === undefined) {
      return;
    }
    keyboard.on('keydown', (event: KeyboardEvent) => {
      this.considerTourCode(event.key);
    });
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => this.leaveToOrigin());
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P).on('down', () => this.leaveToWatch());
  }

  private layout(): void {
    const viewport = { width: this.scale.width, height: this.scale.height };
    const image = { width: this.art.width, height: this.art.height };
    const art = coverRect(viewport, image);
    this.art.setPosition(art.x, art.y).setDisplaySize(art.width, art.height);
    const region = voidRect(viewport, image);
    const prompt = promptAnchor(viewport, image);
    this.promptText.setPosition(prompt.x, prompt.y).setDepth(8);
    this.watchHint.setPosition(prompt.x, prompt.y + region.height * 0.1).setDepth(8);
    this.tourText.setPosition(prompt.x, prompt.y + region.height * 0.18).setDepth(8);
    this.attract?.layout(viewport, image);
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

  private leaveToWatch(): void {
    if (this.leaving) {
      return;
    }
    const tracks = watchAttractTracks();
    const trackId = tracks[0];
    if (trackId === undefined) {
      return;
    }
    this.leaving = true;
    this.attract.destroy();
    this.audio.destroy();
    enableWatchMode();
    enableTourMode();
    enableDebugIaMode(undefined, undefined, WATCH_ATTRACT_RACER_COUNT);
    this.scene.start(SCENE_KEY.RACE, {
      manifest: this.manifest,
      linesByTrack: this.linesByTrack,
      trackId,
      watch: true,
      debugIa: true,
      debugIaSeed: debugIaSeed(),
      debugIaNpcCount: WATCH_ATTRACT_RACER_COUNT,
      watchTrackPool: tracks,
    });
  }

  private leaveToOrigin(): void {
    if (this.leaving) {
      return;
    }
    this.leaving = true;
    this.attract.destroy();
    this.audio.destroy();
    const wait = playSplashKick();
    this.time.delayedCall(Math.max(0, wait) * 1000, () => {
      this.scene.start(SCENE_KEY.ORIGIN_COMIC, {
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

  private watchHintStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffd85c',
      stroke: '#1a0e05',
      strokeThickness: 4,
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
