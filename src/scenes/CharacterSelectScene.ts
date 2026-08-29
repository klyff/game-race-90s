import Phaser from 'phaser';
import {
  driverBodyKey,
  driverBodyUrl,
} from '../data/cards/DriverBodies.ts';
import { DRIVER_CARDS, driverCardKey, driverCardUrl } from '../data/cards/DriverCards.ts';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import { faceTagline } from '../data/pilots/FaceTaglines.ts';
import { REGULAR_PILOTS } from '../data/pilots/PilotRoster.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { MENU_KIND, MenuController } from '../adapters/input/MenuController.ts';
import {
  cellIndexAt,
  characterSelectPanes,
  containInRect,
  FACE_COLUMNS,
  FACE_FOCUS_SCALE,
  type CharacterSelectPanes,
} from '../adapters/render/CharacterSelectLayout.ts';
import { paintRoundedPlaque } from '../adapters/render/UiPlaque.ts';
import { playRockScream } from '../adapters/audio/GuitarSolo.ts';
import { attachMenuAudio } from '../adapters/audio/MenuAudio.ts';
import { SCENE_KEY } from './sceneKeys.ts';

interface CharacterSelectData {
  readonly manifest: CarSetManifest;
  readonly linesByTrack: Record<string, TrackLinesManifest>;
}

const GOLD = '#ffe566';
const GOLD_HEX = 0xffe566;
const IVORY = '#f4ead0';
const MUTED = '#8a8378';
const RING_IDLE = 0x3a342c;
const BODY_FADE_MS = 75;

/**
 * Pick a championship regular. KLYFF sits first; the same 21 names seed
 * the rival locker. This screen also picks the player's save name.
 */
export class CharacterSelectScene extends Phaser.Scene {
  private payload!: CharacterSelectData;
  private menu!: MenuController;
  private leaving = false;
  private panes: CharacterSelectPanes | null = null;
  private bodyImage: Phaser.GameObjects.Image | null = null;
  private nameText: Phaser.GameObjects.Text | null = null;
  private tagText: Phaser.GameObjects.Text | null = null;
  private cardImages: Phaser.GameObjects.Image[] = [];
  private cardRings: Phaser.GameObjects.Rectangle[] = [];
  private shownPilot = '';

  constructor() {
    super(SCENE_KEY.CHARACTER_SELECT);
  }

  init(data: CharacterSelectData): void {
    this.payload = data;
    this.leaving = false;
    this.panes = null;
    this.bodyImage = null;
    this.nameText = null;
    this.tagText = null;
    this.cardImages = [];
    this.cardRings = [];
    this.shownPilot = '';
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
    for (const name of REGULAR_PILOTS) {
      const key = driverBodyKey(name);
      if (!this.textures.exists(key)) {
        this.load.image(key, driverBodyUrl(name));
      }
    }
  }

  create(): void {
    this.draw();
    this.bindKeys();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      this.onPointer(pointer.x, pointer.y);
    });
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.draw());
    attachMenuAudio(this);
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null || keyboard === undefined) {
      return;
    }
    const add = (code: number, repeat: boolean, fn: () => void): void => {
      keyboard.addKey(code, true, repeat).on('down', fn);
    };
    add(Phaser.Input.Keyboard.KeyCodes.LEFT, true, () => this.nudge(-1));
    add(Phaser.Input.Keyboard.KeyCodes.RIGHT, true, () => this.nudge(1));
    add(Phaser.Input.Keyboard.KeyCodes.UP, true, () => this.nudge(-FACE_COLUMNS));
    add(Phaser.Input.Keyboard.KeyCodes.DOWN, true, () => this.nudge(FACE_COLUMNS));
    add(Phaser.Input.Keyboard.KeyCodes.ENTER, false, () => this.confirm());
    add(Phaser.Input.Keyboard.KeyCodes.SPACE, false, () => this.confirm());
    add(Phaser.Input.Keyboard.KeyCodes.ESC, false, () => this.back());
  }

  private nudge(delta: number): void {
    if (this.leaving) {
      return;
    }
    this.menu.jump(delta);
    this.refreshSelection(true);
  }

  private onPointer(x: number, y: number): void {
    if (this.leaving || this.panes === null) {
      return;
    }
    const index = cellIndexAt(this.panes, x, y);
    if (index === undefined) {
      return;
    }
    if (index === this.menu.selectedIndex) {
      this.confirm();
      return;
    }
    this.menu.selectIndex(index);
    this.refreshSelection(true);
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
    playRockScream();
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
    this.bodyImage = null;
    this.nameText = null;
    this.tagText = null;
    this.cardImages = [];
    this.cardRings = [];
    const width = this.scale.width;
    const height = this.scale.height;
    const panes = characterSelectPanes({ width, height }, REGULAR_PILOTS.length);
    this.panes = panes;
    this.add.rectangle(0, 0, width, height, 0x0c0a10, 1).setOrigin(0, 0);
    this.add
      .text(panes.title.x, panes.title.y, 'CHOOSE YOUR FACE', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: GOLD,
        stroke: '#1a1210',
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0.5);
    const plaque = this.add.graphics();
    paintRoundedPlaque(plaque, {
      x: panes.stage.x + panes.stage.width / 2,
      y: panes.stage.y + panes.stage.height / 2,
      width: panes.stage.width,
      height: panes.stage.height,
      alpha: 0.55,
    });
    const firstBody = driverBodyKey(REGULAR_PILOTS[0] ?? 'KLYFF');
    this.bodyImage = this.add.image(0, 0, firstBody).setVisible(false);
    this.nameText = this.add
      .text(panes.name.x, panes.name.y, '', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: GOLD,
        stroke: '#101014',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0.5);
    this.tagText = this.add
      .text(panes.tagline.x, panes.tagline.y, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: IVORY,
        stroke: '#101014',
        strokeThickness: 4,
        wordWrap: { width: Math.max(48, panes.stage.width - 24) },
        align: 'center',
      })
      .setOrigin(0.5, 0.5);
    REGULAR_PILOTS.forEach((name, index) => {
      const cell = panes.cells[index];
      if (cell === undefined) {
        return;
      }
      const cx = cell.x + cell.width / 2;
      const cy = cell.y + cell.height / 2;
      const ring = this.add
        .rectangle(cx, cy, panes.cardSize, panes.cardSize)
        .setFillStyle(0x000000, 0)
        .setStrokeStyle(2, RING_IDLE);
      this.cardRings.push(ring);
      const key = driverCardKey(name);
      if (this.textures.exists(key)) {
        const card = this.add.image(cx, cy, key).setDisplaySize(panes.cardSize, panes.cardSize);
        this.cardImages[index] = card;
      } else {
        this.add.rectangle(cx, cy, panes.cardSize, panes.cardSize, 0x2a241c);
        this.add
          .text(cx, cy, name.slice(0, 1), {
            fontFamily: 'monospace',
            fontSize: '36px',
            color: GOLD,
            stroke: '#101014',
            strokeThickness: 4,
          })
          .setOrigin(0.5, 0.5);
      }
    });
    this.add
      .text(panes.footer.x, panes.footer.y, 'ARROWS MOVE  ·  ENTER CONFIRM  ·  ESC BACK', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: MUTED,
        stroke: '#101014',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0.5);
    this.shownPilot = '';
    this.refreshSelection(false);
  }

  private refreshSelection(animate: boolean): void {
    const panes = this.panes;
    if (panes === null) {
      return;
    }
    const name = REGULAR_PILOTS[this.menu.selectedIndex] ?? REGULAR_PILOTS[0] ?? '';
    this.cardRings.forEach((ring, index) => {
      const selected = index === this.menu.selectedIndex;
      const size = panes.cardSize * (selected ? FACE_FOCUS_SCALE : 1);
      ring.setSize(size, size);
      ring.setStrokeStyle(selected ? 4 : 2, selected ? GOLD_HEX : RING_IDLE);
    });
    this.cardImages.forEach((card, index) => {
      if (card === undefined) {
        return;
      }
      const selected = index === this.menu.selectedIndex;
      const size = panes.cardSize * (selected ? FACE_FOCUS_SCALE : 1);
      card.setDisplaySize(size, size).setAlpha(selected ? 1 : 0.88);
    });
    this.nameText?.setText(`> ${name}`);
    this.tagText?.setText(faceTagline(name));
    this.showBody(name, animate);
  }

  private showBody(name: string, animate: boolean): void {
    const image = this.bodyImage;
    const panes = this.panes;
    if (image === null || panes === null) {
      return;
    }
    const apply = (): void => {
      this.placeBody(name);
      this.shownPilot = name;
    };
    if (name === this.shownPilot) {
      apply();
      return;
    }
    if (!animate || this.prefersReducedMotion()) {
      this.tweens.killTweensOf(image);
      apply();
      image.setAlpha(1);
      return;
    }
    this.tweens.killTweensOf(image);
    this.tweens.add({
      targets: image,
      alpha: 0,
      duration: BODY_FADE_MS,
      onComplete: () => {
        apply();
        image.setAlpha(0);
        this.tweens.add({
          targets: image,
          alpha: 1,
          duration: BODY_FADE_MS,
        });
      },
    });
  }

  private placeBody(name: string): void {
    const image = this.bodyImage;
    const panes = this.panes;
    if (image === null || panes === null) {
      return;
    }
    const key = driverBodyKey(name);
    if (!this.textures.exists(key)) {
      image.setVisible(false);
      return;
    }
    image.setTexture(key);
    const frame = this.textures.get(key).get();
    const box = containInRect(panes.bodySlot, { width: frame.width, height: frame.height });
    image.setVisible(true);
    image.setPosition(box.x + box.width / 2, box.y + box.height / 2);
    image.setDisplaySize(box.width, box.height);
  }

  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
