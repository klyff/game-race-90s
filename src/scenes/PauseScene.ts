import Phaser from 'phaser';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { saveNow } from '../adapters/progress/ProgressStore.ts';
import { SCENE_KEY } from './sceneKeys.ts';

/** What `RaceScene` hands the pause overlay so it can resume, save or leave. */
export interface PauseSceneData {
  readonly manifest: CarSetManifest;
  /** Threaded through so "Main Menu" can hand the campaign back to the title. */
  readonly linesByTrack: Record<string, TrackLinesManifest>;
  readonly carId: string;
}

interface PauseOption {
  readonly label: string;
  readonly run: () => void;
}

/**
 * The pause menu, launched OVER a paused `RaceScene` (owner: Esc pauses the game).
 *
 * Three choices: Return resumes the frozen race, Save writes progress to storage,
 * Main Menu abandons the race and goes back to the title. Arrow keys move the
 * cursor, Enter/Space activates it, Esc is a shortcut for Return.
 */
export class PauseScene extends Phaser.Scene {
  private payload!: PauseSceneData;
  private options: PauseOption[] = [];
  private selectedIndex = 0;

  private backdrop!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEY.PAUSE);
  }

  init(data: PauseSceneData): void {
    this.payload = data;
    this.selectedIndex = 0;
  }

  create(): void {
    this.options = [
      { label: 'RETURN', run: () => this.resume() },
      { label: 'SAVE', run: () => this.save() },
      { label: 'MAIN MENU', run: () => this.mainMenu() },
    ];

    this.backdrop = this.add.rectangle(0, 0, 10, 10, 0x05060a, 0.72).setOrigin(0, 0);
    this.titleText = this.add.text(0, 0, 'PAUSED', this.titleStyle()).setOrigin(0.5, 0.5);
    this.optionTexts = this.options.map(option =>
      this.add.text(0, 0, option.label, this.optionStyle()).setOrigin(0.5, 0.5),
    );
    this.statusText = this.add.text(0, 0, '', this.statusStyle()).setOrigin(0.5, 0.5);

    this.refreshHighlight();
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
    this.bindKeys();
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null || keyboard === undefined) {
      return;
    }
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP).on('down', () => this.move(-1));
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN).on('down', () => this.move(1));
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).on('down', () => this.activate());
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => this.activate());
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.resume());
  }

  private move(direction: number): void {
    const count = this.options.length;
    this.selectedIndex = (this.selectedIndex + direction + count) % count;
    this.refreshHighlight();
  }

  private activate(): void {
    this.options[this.selectedIndex]?.run();
  }

  private resume(): void {
    this.scene.resume(SCENE_KEY.RACE);
    this.scene.resume(SCENE_KEY.HUD);
    this.scene.stop();
  }

  private save(): void {
    saveNow(this.payload.carId);
    this.statusText.setText('SAVED');
  }

  private mainMenu(): void {
    this.scene.stop(SCENE_KEY.HUD);
    this.scene.stop(SCENE_KEY.RACE);
    this.scene.start(SCENE_KEY.SPLASH, {
      manifest: this.payload.manifest,
      linesByTrack: this.payload.linesByTrack,
    });
  }

  private refreshHighlight(): void {
    this.optionTexts.forEach((text, index) => {
      const selected = index === this.selectedIndex;
      text.setColor(selected ? '#ffd85c' : '#d8dae2');
      text.setText(selected ? `> ${this.options[index]?.label} <` : (this.options[index]?.label ?? ''));
    });
  }

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const centreX = width / 2;

    this.backdrop.setSize(width, height);
    this.titleText.setPosition(centreX, height * 0.3);
    this.optionTexts.forEach((text, index) => {
      text.setPosition(centreX, height * (0.45 + index * 0.09));
    });
    this.statusText.setPosition(centreX, height * 0.78);
  }

  private titleStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '44px',
      color: '#ffffff',
      stroke: '#1a0e05',
      strokeThickness: 8,
    };
  }

  private optionStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '26px',
      color: '#d8dae2',
      stroke: '#101014',
      strokeThickness: 5,
    };
  }

  private statusStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#8bff9b',
      stroke: '#101014',
      strokeThickness: 4,
    };
  }
}
