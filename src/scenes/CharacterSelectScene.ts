import Phaser from 'phaser';
import { DRIVER_CARDS, driverCardKey, driverCardUrl } from '../data/cards/DriverCards.ts';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import { REGULAR_PILOTS } from '../data/pilots/PilotRoster.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { bindMenuKeys } from '../adapters/input/bindMenuKeys.ts';
import { MENU_KIND, MenuController } from '../adapters/input/MenuController.ts';
import type { MenuResult } from '../adapters/input/MenuController.ts';
import { SCENE_KEY } from './sceneKeys.ts';

interface CharacterSelectData {
  readonly manifest: CarSetManifest;
  readonly linesByTrack: Record<string, TrackLinesManifest>;
}

const COLUMNS = 5;
const GOLD = '#ffe566';
const IVORY = '#f4ead0';
const MUTED = '#8a8378';

/**
 * Pick a championship regular. The 20 names already seed rival lockers;
 * this only chooses the player's face and save name.
 */
export class CharacterSelectScene extends Phaser.Scene {
  private payload!: CharacterSelectData;
  private menu!: MenuController;
  private leaving = false;

  constructor() {
    super(SCENE_KEY.CHARACTER_SELECT);
  }

  init(data: CharacterSelectData): void {
    this.payload = data;
    this.leaving = false;
    this.menu = new MenuController(
      REGULAR_PILOTS.map(name => ({
        id: name,
        kind: MENU_KIND.ACTION,
        label: name,
      })),
    );
  }

  preload(): void {
    for (const card of DRIVER_CARDS) {
      if (!this.textures.exists(card.key)) {
        this.load.image(card.key, driverCardUrl(card));
      }
    }
  }

  create(): void {
    this.draw();
    this.bindKeys();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.draw());
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null || keyboard === undefined) {
      return;
    }
    bindMenuKeys(keyboard, this.menu, {
      onResult: result => this.handle(result),
      onMoved: () => this.draw(),
    });
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT, true, true).on('down', () => {
      this.menu.move(-1);
      this.draw();
    });
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT, true, true).on('down', () => {
      this.menu.move(1);
      this.draw();
    });
  }

  private handle(result: MenuResult): void {
    if (result.type === 'activate') {
      this.confirm();
      return;
    }
    if (result.type === 'back') {
      this.back();
    }
  }

  private confirm(): void {
    if (this.leaving) {
      return;
    }
    const name = REGULAR_PILOTS[this.menu.selectedIndex];
    if (name === undefined) {
      return;
    }
    this.leaving = true;
    this.scene.start(SCENE_KEY.GARAGE, {
      manifest: this.payload.manifest,
      linesByTrack: this.payload.linesByTrack,
      selectedPilot: name,
    });
  }

  private back(): void {
    if (this.leaving) {
      return;
    }
    this.leaving = true;
    this.scene.start(SCENE_KEY.ORIGIN_COMIC, {
      manifest: this.payload.manifest,
      linesByTrack: this.payload.linesByTrack,
    });
  }

  private draw(): void {
    this.children.removeAll(true);
    const width = this.scale.width;
    const height = this.scale.height;
    const padX = width * 0.06;
    const padY = height * 0.07;
    this.add.rectangle(0, 0, width, height, 0x0c0a10, 1).setOrigin(0, 0);
    this.add
      .text(width / 2, padY, 'CHOOSE YOUR FACE', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: GOLD,
        stroke: '#1a1210',
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0.5);

    const rows = Math.ceil(REGULAR_PILOTS.length / COLUMNS);
    const cellW = (width - padX * 2) / COLUMNS;
    const cellH = (height - padY * 2 - 64) / rows;
    const face = Math.min(cellW * 0.62, cellH * 0.58);

    REGULAR_PILOTS.forEach((name, index) => {
      const col = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      const cx = padX + cellW * (col + 0.5);
      const cy = padY + 36 + cellH * (row + 0.5);
      const selected = index === this.menu.selectedIndex;
      const key = driverCardKey(name);
      if (this.textures.exists(key)) {
        this.add
          .image(cx, cy - 10, key)
          .setDisplaySize(selected ? face * 1.08 : face, selected ? face * 1.08 : face)
          .setAlpha(selected ? 1 : 0.82);
      } else {
        this.add.rectangle(cx, cy - 10, face, face, 0x2a241c).setStrokeStyle(2, selected ? 0xffe566 : 0x5a5248);
        this.add
          .text(cx, cy - 10, name.slice(0, 1), {
            fontFamily: 'monospace',
            fontSize: '36px',
            color: GOLD,
          })
          .setOrigin(0.5, 0.5);
      }
      this.add
        .text(cx, cy + face * 0.52, `${selected ? '>' : ' '} ${name}`, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: selected ? GOLD : IVORY,
          stroke: '#101014',
          strokeThickness: 4,
        })
        .setOrigin(0.5, 0);
    });

    this.add
      .text(width / 2, height - padY * 0.4, 'ARROWS MOVE  ·  ENTER CONFIRM  ·  ESC BACK', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: MUTED,
        stroke: '#101014',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0.5);
  }
}
