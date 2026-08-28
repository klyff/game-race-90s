import Phaser from 'phaser';
import { ORIGIN_PANELS } from '../data/cards/OriginComic.ts';
import {
  rollOriginEntryStrips,
  type OriginStripPanel,
} from '../data/cards/OriginComicStrips.ts';
import { SPLASH_CARDS } from '../data/cards/SplashCards.ts';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { attachMenuAudio } from '../adapters/audio/MenuAudio.ts';
import { SCENE_KEY } from './sceneKeys.ts';

interface OriginComicData {
  readonly manifest: CarSetManifest;
  readonly linesByTrack: Record<string, TrackLinesManifest>;
}

/**
 * Four HQ panels: how street racing went global. Space/Enter advances.
 * Esc returns to splash. Last page opens character select.
 * Left column: cartoon comic strips rolled once per entry.
 */
export class OriginComicScene extends Phaser.Scene {
  private payload!: OriginComicData;
  private page = 0;
  private leaving = false;
  private entryStrips: readonly (readonly OriginStripPanel[])[] = [];

  constructor() {
    super(SCENE_KEY.ORIGIN_COMIC);
  }

  init(data: OriginComicData): void {
    this.payload = data;
    this.page = 0;
    this.leaving = false;
    this.entryStrips = rollOriginEntryStrips((Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0);
  }

  create(): void {
    this.add.rectangle(0, 0, 10, 10, 0x0c0a10, 1).setOrigin(0, 0).setScrollFactor(0);
    this.drawPage();
    this.bindKeys();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.drawPage());
    attachMenuAudio(this);
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null || keyboard === undefined) {
      return;
    }
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => this.advance());
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).on('down', () => this.advance());
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.back());
  }

  private advance(): void {
    if (this.leaving) {
      return;
    }
    if (this.page + 1 < ORIGIN_PANELS.length) {
      this.page += 1;
      this.drawPage();
      return;
    }
    this.leaving = true;
    this.scene.start(SCENE_KEY.CHARACTER_SELECT, {
      manifest: this.payload.manifest,
      linesByTrack: this.payload.linesByTrack,
    });
  }

  private back(): void {
    if (this.leaving) {
      return;
    }
    this.leaving = true;
    this.scene.start(SCENE_KEY.SPLASH, {
      manifest: this.payload.manifest,
      linesByTrack: this.payload.linesByTrack,
    });
  }

  private drawPage(): void {
    this.children.removeAll(true);
    const width = this.scale.width;
    const height = this.scale.height;
    // Title-safe ~6% margins (game-ui-design safe zone).
    const padX = width * 0.06;
    const padY = height * 0.07;
    this.add.rectangle(0, 0, width, height, 0x0c0a10, 1).setOrigin(0, 0);
    const panel = ORIGIN_PANELS[this.page];
    if (panel === undefined) {
      return;
    }
    const boxW = width - padX * 2;
    const boxH = height - padY * 2 - 36;
    this.add.rectangle(padX, padY, boxW, boxH, 0xf4ead0, 1).setOrigin(0, 0).setStrokeStyle(6, 0x1a1210);
    this.add
      .text(padX + 18, padY + 16, `${panel.kicker}  ·  ${panel.year}`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#8b1e1e',
      })
      .setOrigin(0, 0);
    this.add
      .text(padX + 18, padY + 42, panel.city, {
        fontFamily: 'monospace',
        fontSize: '42px',
        color: '#1a1210',
        stroke: '#f4ead0',
        strokeThickness: 2,
      })
      .setOrigin(0, 0);

    const card = SPLASH_CARDS[panel.cardIndex];
    const faceSize = Math.min(boxW * 0.28, boxH * 0.55);
    if (card !== undefined && this.textures.exists(card.key)) {
      this.add
        .image(padX + boxW - 24, padY + 72, card.key)
        .setOrigin(1, 0)
        .setDisplaySize(faceSize, faceSize);
    }

    const stripColW = boxW * 0.58;
    const strips = this.entryStrips[this.page] ?? [];
    this.drawComicStrips(padX + 18, padY + 100, stripColW, boxH - 240, strips);

    this.add
      .text(padX + 18, padY + boxH - 120, panel.caption, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#1a1210',
        wordWrap: { width: boxW * 0.62 },
      })
      .setOrigin(0, 0);

    const prompt = this.page + 1 >= ORIGIN_PANELS.length ? 'ENTER  ·  PICK YOUR FACE' : 'SPACE  ·  NEXT PAGE';
    this.add
      .text(width / 2, height - padY * 0.45, `${this.page + 1}/${ORIGIN_PANELS.length}   ${prompt}`, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#f4ead0',
        stroke: '#1a1210',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0.5);
  }

  /** Stacked comic panels — one job: voice beats for this page's face. */
  private drawComicStrips(
    x: number,
    y: number,
    width: number,
    height: number,
    strips: readonly OriginStripPanel[],
  ): void {
    if (strips.length === 0 || height < 48) {
      return;
    }
    const gap = 10;
    const panelH = Math.min(110, (height - gap * (strips.length - 1)) / strips.length);
    for (let i = 0; i < strips.length; i += 1) {
      const strip = strips[i];
      if (strip === undefined) {
        continue;
      }
      const top = y + i * (panelH + gap);
      const jog = (i % 2) * 8;
      this.add
        .rectangle(x + jog, top, width - jog, panelH, 0xfff8e8, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(3, 0x1a1210);
      this.add
        .text(x + jog + 12, top + 8, strip.badge, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#8b1e1e',
        })
        .setOrigin(0, 0);
      this.add
        .text(x + jog + 12, top + 28, strip.line, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#1a1210',
          wordWrap: { width: width - jog - 28 },
        })
        .setOrigin(0, 0);
    }
  }
}
