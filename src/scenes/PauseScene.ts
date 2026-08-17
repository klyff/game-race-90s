import Phaser from 'phaser';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { bindMenuKeys } from '../adapters/input/bindMenuKeys.ts';
import { MENU_KIND, MENU_PROMPT_OPTIONS, MenuController } from '../adapters/input/MenuController.ts';
import type { MenuResult } from '../adapters/input/MenuController.ts';
import { saveNow } from '../adapters/progress/ProgressStore.ts';
import { SCENE_KEY } from './sceneKeys.ts';

/** What `RaceScene` hands the pause overlay so it can resume, save or leave. */
export interface PauseSceneData {
  readonly manifest: CarSetManifest;
  /** Threaded through so "Main Menu" can hand the campaign back to the title. */
  readonly linesByTrack: Record<string, TrackLinesManifest>;
  readonly carId: string;
  readonly muted: boolean;
  readonly setMuted: (muted: boolean) => void;
}

const AUDIO_VALUES = ['ON', 'OFF'] as const;

/**
 * The pause menu, launched OVER a paused `RaceScene` (owner: Esc pauses the game).
 *
 * Return resumes, Save writes progress, Audio is a left/right option (Enter
 * saves, Esc discards), Main Menu abandons the race. Shared `MenuController`
 * so this screen uses the same pad as every other menu.
 */
export class PauseScene extends Phaser.Scene {
  private payload!: PauseSceneData;
  private menu!: MenuController;

  private backdrop!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private statusText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEY.PAUSE);
  }

  init(data: PauseSceneData): void {
    this.payload = data;
    this.menu = new MenuController(
      [
        { id: 'return', kind: MENU_KIND.ACTION, label: 'RETURN' },
        { id: 'save', kind: MENU_KIND.ACTION, label: 'SAVE' },
        {
          id: 'audio',
          kind: MENU_KIND.OPTION,
          label: 'AUDIO',
          values: AUDIO_VALUES,
          valueIndex: data.muted ? 1 : 0,
        },
        { id: 'help', kind: MENU_KIND.ACTION, label: 'HELP' },
        { id: 'garage', kind: MENU_KIND.ACTION, label: 'GARAGE' },
        { id: 'menu', kind: MENU_KIND.ACTION, label: 'MAIN MENU' },
      ],
      {
        onPreview: (id, _index, value) => {
          if (id === 'audio') {
            this.payload.setMuted(value === 'OFF');
          }
        },
      },
    );
  }

  create(): void {
    this.backdrop = this.add.rectangle(0, 0, 10, 10, 0x05060a, 0.72).setOrigin(0, 0);
    this.titleText = this.add.text(0, 0, 'PAUSED', this.titleStyle()).setOrigin(0.5, 0.5);
    this.optionTexts = this.menu.views().map(view =>
      this.add.text(0, 0, view.text, this.optionStyle()).setOrigin(0.5, 0.5),
    );
    this.statusText = this.add.text(0, 0, '', this.statusStyle()).setOrigin(0.5, 0.5);
    this.promptText = this.add.text(0, 0, MENU_PROMPT_OPTIONS, this.promptStyle()).setOrigin(0.5, 0.5);

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
    bindMenuKeys(keyboard, this.menu, {
      onResult: result => this.handleResult(result),
      onMoved: () => this.refreshHighlight(),
      onCycled: () => this.refreshHighlight(),
    });
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M).on('down', () => this.toggleMuteKey());
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H).on('down', () => this.openHelp());
  }

  private handleResult(result: MenuResult): void {
    if (result.type === 'activate') {
      if (result.id === 'return') {
        this.resume();
        return;
      }
      if (result.id === 'save') {
        this.save();
        return;
      }
      if (result.id === 'help') {
        this.openHelp();
        return;
      }
      if (result.id === 'garage') {
        this.garage();
        return;
      }
      if (result.id === 'menu') {
        this.mainMenu();
      }
      return;
    }
    if (result.type === 'commit') {
      this.statusText.setText('SAVED');
      this.refreshHighlight();
      return;
    }
    if (result.type === 'discard') {
      this.statusText.setText('');
      this.refreshHighlight();
      return;
    }
    if (result.type === 'back') {
      this.resume();
    }
  }

  private toggleMuteKey(): void {
    const nextMuted = this.menu.valueIndex('audio') === 0;
    this.payload.setMuted(nextMuted);
    this.menu.setOption('audio', nextMuted ? 1 : 0, true);
    this.refreshHighlight();
  }

  private openHelp(): void {
    this.scene.pause();
    this.scene.launch(SCENE_KEY.HELP, { resumeScene: SCENE_KEY.PAUSE });
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

  private garage(): void {
    this.scene.stop(SCENE_KEY.HUD);
    this.scene.stop(SCENE_KEY.RACE);
    this.scene.start(SCENE_KEY.GARAGE, {
      manifest: this.payload.manifest,
      linesByTrack: this.payload.linesByTrack,
    });
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
    this.menu.views().forEach((view, index) => {
      const text = this.optionTexts[index];
      if (text === undefined) {
        return;
      }
      text.setColor(view.selected ? '#ffd85c' : '#d8dae2');
      text.setText(view.text);
    });
  }

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const centreX = width / 2;

    this.backdrop.setSize(width, height);
    this.titleText.setPosition(centreX, height * 0.18);
    this.optionTexts.forEach((text, index) => {
      text.setPosition(centreX, height * (0.3 + index * 0.07));
    });
    this.statusText.setPosition(centreX, height * 0.76);
    this.promptText.setPosition(centreX, height * 0.88);
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

  private promptStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
      stroke: '#1a0e05',
      strokeThickness: 4,
    };
  }
}
