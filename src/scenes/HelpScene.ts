import Phaser from 'phaser';
import { formatHelpColumns } from '../data/input/ControlList.ts';
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
  private leftText!: Phaser.GameObjects.Text;
  private rightText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEY.HELP);
  }

  init(data: HelpSceneData): void {
    this.payload = data;
  }

  create(): void {
    this.backdrop = this.add.rectangle(0, 0, 10, 10, 0x05060a, 0.94).setOrigin(0, 0);
    const [left, right] = formatHelpColumns();
    this.titleText = this.add.text(0, 0, 'HELP  ·  CONTROLS', this.titleStyle()).setOrigin(0.5, 0.5);
    this.leftText = this.add.text(0, 0, left, this.bodyStyle()).setOrigin(0.5, 0);
    this.rightText = this.add.text(0, 0, right, this.bodyStyle()).setOrigin(0.5, 0);
    this.promptText = this.add
      .text(0, 0, 'ENTER / ESC  CLOSE', this.promptStyle())
      .setOrigin(0.5, 0.5);

    this.scene.setVisible(false, this.payload.resumeScene);
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
    this.scene.setVisible(true, this.payload.resumeScene);
    this.scene.resume(this.payload.resumeScene);
    this.scene.stop();
  }

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.backdrop.setSize(width, height);
    this.titleText.setPosition(width / 2, height * 0.1);
    this.leftText.setPosition(width * 0.3, height * 0.18);
    this.rightText.setPosition(width * 0.7, height * 0.18);
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
