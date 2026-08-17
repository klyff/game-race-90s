import Phaser from 'phaser';
import {
  MENU_CONTROLS,
  RACE_DRIVE_CONTROLS,
  RACE_SYSTEM_CONTROLS,
  RACE_WEAPON_CONTROLS,
} from '../data/input/ControlList.ts';
import type { ControlRow } from '../data/input/ControlList.ts';
import { SCENE_KEY } from './sceneKeys.ts';

export interface HelpSceneData {
  readonly resumeScene: string;
}

/**
 * Command overlay. Launched over Pause or Garage; Esc / Enter closes it
 * and resumes the scene that opened it.
 */
export class HelpScene extends Phaser.Scene {
  private payload!: HelpSceneData;
  private backdrop!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEY.HELP);
  }

  init(data: HelpSceneData): void {
    this.payload = data;
  }

  create(): void {
    this.backdrop = this.add.rectangle(0, 0, 10, 10, 0x05060a, 0.82).setOrigin(0, 0);
    this.titleText = this.add.text(0, 0, 'HELP  ·  COMMANDS', this.titleStyle()).setOrigin(0.5, 0.5);
    this.bodyText = this.add.text(0, 0, this.body(), this.bodyStyle()).setOrigin(0.5, 0);
    this.promptText = this.add
      .text(0, 0, 'ENTER / ESC  CLOSE', this.promptStyle())
      .setOrigin(0.5, 0.5);

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
    this.bindKeys();
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null || keyboard === undefined) {
      return;
    }
    const close = (): void => this.close();
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', close);
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).on('down', close);
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', close);
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H).on('down', close);
  }

  private close(): void {
    this.scene.resume(this.payload.resumeScene);
    this.scene.stop();
  }

  private body(): string {
    const block = (title: string, rows: readonly ControlRow[]): string => {
      const lines = rows.map(row => `${row.keys.padEnd(16)}  ${row.action}`);
      return `${title}\n${lines.join('\n')}`;
    };
    return [
      block('DRIVE', RACE_DRIVE_CONTROLS),
      block('WEAPONS', RACE_WEAPON_CONTROLS),
      block('RACE', RACE_SYSTEM_CONTROLS),
      block('MENUS', MENU_CONTROLS),
    ].join('\n\n');
  }

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.backdrop.setSize(width, height);
    this.titleText.setPosition(width / 2, height * 0.1);
    this.bodyText.setPosition(width / 2, height * 0.16);
    this.promptText.setPosition(width / 2, height * 0.92);
  }

  private titleStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '36px',
      color: '#ffffff',
      stroke: '#1a0e05',
      strokeThickness: 8,
    };
  }

  private bodyStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#d8dae2',
      stroke: '#101014',
      strokeThickness: 4,
      lineSpacing: 4,
      align: 'left',
    };
  }

  private promptStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffd85c',
      stroke: '#1a0e05',
      strokeThickness: 4,
    };
  }
}
