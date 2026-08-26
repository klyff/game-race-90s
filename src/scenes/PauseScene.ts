import Phaser from 'phaser';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { bindMenuKeys } from '../adapters/input/bindMenuKeys.ts';
import { MENU_KIND, MENU_PROMPT_OPTIONS, MenuController } from '../adapters/input/MenuController.ts';
import type { MenuResult } from '../adapters/input/MenuController.ts';
import {
  getNarratorLocale,
  setNarratorLocale,
} from '../adapters/audio/AudioPrefs.ts';
import {
  NARRATOR_LOCALE_VALUES,
  localeFromMenuValue,
  menuValueFromLocale,
} from '../data/audio/NarratorBank.ts';
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
  /** Race bed only. Independent of {@link muted}. */
  readonly musicMuted: boolean;
  readonly setMusicMuted: (muted: boolean) => void;
  /** Mid-race retire: keep watching; omit on watch mode. */
  readonly onQuitRace?: () => void;
}

const ON_OFF = ['ON', 'OFF'] as const;

/**
 * The pause menu, launched OVER a paused `RaceScene` (owner: Esc pauses the game).
 *
 * Return resumes, Save writes progress, Audio / Music / Narration are
 * left/right options (Enter saves, Esc discards). Shared `MenuController`
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
          values: ON_OFF,
          valueIndex: data.muted ? 1 : 0,
        },
        {
          id: 'music',
          kind: MENU_KIND.OPTION,
          label: 'MUSIC',
          values: ON_OFF,
          valueIndex: data.musicMuted ? 1 : 0,
        },
        {
          id: 'narration',
          kind: MENU_KIND.OPTION,
          label: 'NARRATION',
          values: NARRATOR_LOCALE_VALUES,
          valueIndex: NARRATOR_LOCALE_VALUES.indexOf(menuValueFromLocale(getNarratorLocale())),
        },
        { id: 'help', kind: MENU_KIND.ACTION, label: 'HELP' },
        { id: 'garage', kind: MENU_KIND.ACTION, label: 'GARAGE' },
        ...(data.onQuitRace === undefined
          ? []
          : [{ id: 'quit', kind: MENU_KIND.ACTION, label: 'QUIT RACE' }]),
        { id: 'menu', kind: MENU_KIND.ACTION, label: 'MAIN MENU' },
      ],
      {
        onPreview: (id, _index, value) => {
          if (id === 'audio') {
            this.payload.setMuted(value === 'OFF');
          }
          if (id === 'music') {
            this.payload.setMusicMuted(value === 'OFF');
          }
          if (id === 'narration') {
            setNarratorLocale(localeFromMenuValue(value));
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
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N).on('down', () => this.toggleMusicKey());
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
      if (result.id === 'quit') {
        this.quitRace();
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

  private toggleMusicKey(): void {
    const nextMuted = this.menu.valueIndex('music') === 0;
    this.payload.setMusicMuted(nextMuted);
    this.menu.setOption('music', nextMuted ? 1 : 0, true);
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

  private quitRace(): void {
    const quit = this.payload.onQuitRace;
    this.scene.resume(SCENE_KEY.RACE);
    this.scene.resume(SCENE_KEY.HUD);
    this.scene.stop();
    quit?.();
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
      const step = this.optionTexts.length > 7 ? 0.05 : 0.07;
      text.setPosition(centreX, height * (0.25 + index * step));
    });
    this.statusText.setPosition(centreX, height * 0.8);
    this.promptText.setPosition(centreX, height * 0.9);
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
