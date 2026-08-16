import Phaser from 'phaser';
import { TitleAudio } from '../adapters/audio/TitleAudio.ts';
import { BlinkClock } from '../adapters/render/BlinkClock.ts';
import { statBars } from '../adapters/render/CarStatBars.ts';
import type { StatBar } from '../adapters/render/CarStatBars.ts';
import { coverRect, promptAnchor, voidRect } from '../adapters/render/SplashLayout.ts';
import type { CarSetManifest, CarSheetManifest } from '../data/cars/CarManifest.ts';
import { PLAYER_CAR_ID, SCENE_KEY, SPLASH_ART_KEY } from './sceneKeys.ts';

/** The prompt's blink period, seconds. Slow, the way a cabinet attract screen blinked. */
const BLINK_PERIOD_SECONDS = 1.2;

/** Exact wording the owner asked for. */
const PROMPT_TEXT = "PRESS SPACE TO ROCK'N THE 90s";

/** Magnification of the 64x64 preview sprite. Integer, so the pixels stay square. */
const PREVIEW_SCALE = 3;

/** Stat bar geometry, pixels. The bar length itself is derived from the void's width. */
const BAR_HEIGHT = 9;
const BAR_LABEL_GUTTER = 64;

const COLOUR_BAR_FILL = 0xffd85c;
const COLOUR_BAR_TRACK = 0x000000;

/** What `BootScene` hands over, and what this scene passes on to the race. */
interface SplashSceneData {
  readonly manifest: CarSetManifest;
}

/**
 * The title screen and the car select, on one screen.
 *
 * **No title is drawn here.** The "ROCK'N 90s" logo and the "PRODUCED BY ZHAS STUDIO AND
 * KLYFF" credit are painted into `splash.jpeg` itself, so drawing either would double it.
 *
 * Three things in this file are dictated by the artwork or by a lesson already paid for,
 * and are not free choices:
 *
 * **Everything is positioned against the ARTWORK's rect, never the viewport.** The canvas
 * is `Scale.RESIZE` at the full window, so the art is scaled to COVER and cropped. The
 * only region of the picture dark enough to read text against is the explosion void in
 * the middle; anchor text to the viewport instead and it slides off that void onto fire
 * and road the moment the window is tall or narrow. `SplashLayout` owns that arithmetic
 * and is unit-tested, because it cannot be checked by looking at one window size.
 *
 * **The prompt blinks with a hard on/off cut**, driven by the pure `BlinkClock` and
 * applied with `setVisible`. The era's blink was a palette flip; an alpha tween reads as
 * a modern fade and misses the reference. There is deliberately no tween on it at all.
 *
 * **The music starts on the first key press and stops on SHUTDOWN.** A browser silently
 * ignores an `AudioContext.resume()` that does not come from a user gesture, so starting
 * it in `create()` produces neither sound nor error — and nothing in Phaser stops a Web
 * Audio graph when a scene ends, so skipping the shutdown hook plays the title riff over
 * the race.
 */
export class SplashScene extends Phaser.Scene {
  private manifest!: CarSetManifest;
  private selectedIndex = 0;

  private art!: Phaser.GameObjects.Image;
  private nameText!: Phaser.GameObjects.Text;
  private archetypeText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private leftArrow!: Phaser.GameObjects.Text;
  private rightArrow!: Phaser.GameObjects.Text;
  private preview!: Phaser.GameObjects.Sprite;
  private barLabels: Phaser.GameObjects.Text[] = [];
  private barTracks: Phaser.GameObjects.Rectangle[] = [];
  private barFills: Phaser.GameObjects.Rectangle[] = [];

  private readonly blink = new BlinkClock(BLINK_PERIOD_SECONDS);
  private audio!: TitleAudio;

  constructor() {
    super(SCENE_KEY.SPLASH);
  }

  init(data: SplashSceneData): void {
    this.manifest = data.manifest;
    const preferred = this.manifest.cars.findIndex(car => car.id === PLAYER_CAR_ID);
    this.selectedIndex = preferred >= 0 ? preferred : 0;
  }

  create(): void {
    this.art = this.add.image(0, 0, SPLASH_ART_KEY).setOrigin(0, 0);

    this.nameText = this.add.text(0, 0, '', this.nameStyle()).setOrigin(0.5, 0);
    this.archetypeText = this.add.text(0, 0, '', this.archetypeStyle()).setOrigin(0.5, 0);
    this.leftArrow = this.add.text(0, 0, '◄', this.arrowStyle()).setOrigin(0.5, 0.5);
    this.rightArrow = this.add.text(0, 0, '►', this.arrowStyle()).setOrigin(0.5, 0.5);

    this.preview = this.add
      .sprite(0, 0, this.selectedCar().id, 0)
      .setOrigin(this.manifest.origin.x, this.manifest.origin.y)
      .setScale(PREVIEW_SCALE);

    for (const bar of statBars(this.manifest, this.selectedCar().id)) {
      this.barLabels.push(this.add.text(0, 0, bar.label, this.barLabelStyle()).setOrigin(0, 0.5));
      this.barTracks.push(
        this.add.rectangle(0, 0, 1, BAR_HEIGHT, COLOUR_BAR_TRACK, 0.65).setOrigin(0, 0.5),
      );
      this.barFills.push(
        this.add.rectangle(0, 0, 1, BAR_HEIGHT, COLOUR_BAR_FILL).setOrigin(0, 0.5),
      );
    }

    this.promptText = this.add.text(0, 0, PROMPT_TEXT, this.promptStyle()).setOrigin(0.5, 0.5);

    this.audio = new TitleAudio();

    this.applySelection();
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
    this.bindKeys();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.audio.destroy());
  }

  update(_time: number, deltaMilliseconds: number): void {
    this.blink.advance(deltaMilliseconds / 1000);
    this.promptText.setVisible(this.blink.isOn);
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null || keyboard === undefined) {
      return;
    }

    // Any key is a user gesture, which is the only thing a browser will start audio on.
    // Both `resume` and `TitleMusic.start` are idempotent, so binding the bare event and
    // letting it fire on every press is simpler than tracking which press was the first.
    keyboard.on('keydown', () => this.audio.start());
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => this.audio.start());

    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT).on('down', () => this.cycleCar(-1));
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT).on('down', () => this.cycleCar(1));
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => this.startRace());
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M).on('down', () => this.audio.toggleMute());
  }

  private selectedCar(): CarSheetManifest {
    const car = this.manifest.cars[this.selectedIndex];
    if (car === undefined) {
      // Cannot happen: the index is only ever set by modular arithmetic over this array.
      // Guarded anyway because the alternative is a blank panel with no explanation.
      throw new Error(`SplashScene has no car at index ${this.selectedIndex}`);
    }
    return car;
  }

  private cycleCar(direction: number): void {
    const count = this.manifest.cars.length;
    this.selectedIndex = (this.selectedIndex + direction + count) % count;
    this.applySelection();
    this.layout();
  }

  /** Pushes the chosen car into every panel element. */
  private applySelection(): void {
    const car = this.selectedCar();
    this.nameText.setText(car.displayName.toUpperCase());
    this.archetypeText.setText(car.archetype);
    this.preview.setTexture(car.id, 0);

    const bars = statBars(this.manifest, car.id);
    bars.forEach((bar, index) => this.applyBar(bar, index));
  }

  private applyBar(bar: StatBar, index: number): void {
    this.barLabels[index]?.setText(bar.label);
    const track = this.barTracks[index];
    const fill = this.barFills[index];
    if (track === undefined || fill === undefined) {
      return;
    }
    fill.width = track.width * bar.fraction;
  }

  /**
   * Places every element inside the artwork's dark void.
   *
   * Re-run on every resize, and after every car change because a bar's fill width is
   * derived from the track width this method sets.
   */
  private layout(): void {
    const viewport = { width: this.scale.width, height: this.scale.height };
    const image = { width: this.art.width, height: this.art.height };

    const art = coverRect(viewport, image);
    this.art.setPosition(art.x, art.y).setDisplaySize(art.width, art.height);

    const region = voidRect(viewport, image);
    const centreX = region.x + region.width / 2;

    this.nameText.setPosition(centreX, region.y + region.height * 0.01);
    this.archetypeText.setPosition(centreX, region.y + region.height * 0.18);

    const previewX = centreX - region.width * 0.27;
    const previewY = region.y + region.height * 0.55;
    this.preview.setPosition(previewX, previewY);
    this.leftArrow.setPosition(previewX - region.width * 0.16, previewY);
    this.rightArrow.setPosition(previewX + region.width * 0.16, previewY);

    const labelX = centreX + region.width * 0.04;
    const barX = labelX + BAR_LABEL_GUTTER;
    const barWidth = region.width * 0.26;
    this.barTracks.forEach((track, index) => {
      const y = region.y + region.height * (0.34 + 0.11 * index);
      this.barLabels[index]?.setPosition(labelX, y);
      track.setPosition(barX, y);
      track.width = barWidth;
      const fill = this.barFills[index];
      if (fill !== undefined) {
        fill.setPosition(barX, y);
      }
    });
    // The fills read their width from the tracks, so they must be recomputed after the
    // tracks are resized rather than before.
    this.applySelection();

    const prompt = promptAnchor(viewport, image);
    this.promptText.setPosition(prompt.x, prompt.y);
  }

  private startRace(): void {
    this.scene.start(SCENE_KEY.RACE, { manifest: this.manifest, carId: this.selectedCar().id });
  }

  private nameStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '30px',
      color: '#ffd85c',
      stroke: '#1a0e05',
      strokeThickness: 6,
    };
  }

  private archetypeStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#e6e8ef',
      stroke: '#101014',
      strokeThickness: 4,
    };
  }

  private barLabelStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#d8dae2',
      stroke: '#101014',
      strokeThickness: 3,
    };
  }

  private arrowStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffd85c',
      stroke: '#1a0e05',
      strokeThickness: 4,
    };
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
}
