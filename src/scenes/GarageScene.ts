import Phaser from 'phaser';
import { coverRect } from '../adapters/render/SplashLayout.ts';
import { findCarSheet } from '../data/cars/CarManifest.ts';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import { campaignTracks, highestUnlockedPlanetIndex } from '../data/tracks/campaign.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { formatCash } from '../domain/progress/Wallet.ts';
import {
  GARAGE_CATALOG,
  isCarUnlocked,
  isStarterCar,
  listPrice,
  sellPrice,
  STARTER_CAR_IDS,
  WORLD_ONE_LOCKED_CAR_IDS,
} from '../domain/progress/GarageCatalog.ts';
import { cashInValue } from '../domain/progress/SeasonPoints.ts';
import { PLAYER_NAME_LENGTH } from '../domain/progress/SaveSlots.ts';
import { isTourModeOn } from '../adapters/progress/TourMode.ts';
import {
  activateSlot,
  beginSlot,
  buyCar,
  cashInPoints,
  equipCar,
  loadActiveCareer,
  loadActiveName,
  loadCareer,
  loadCleared,
  loadSave,
  loadWonTracks,
  occupiedNames,
  saveNow,
  sellCar,
} from '../adapters/progress/ProgressStore.ts';
import { bindMenuKeys } from '../adapters/input/bindMenuKeys.ts';
import { MENU_KIND, MENU_PROMPT_LIST, MenuController } from '../adapters/input/MenuController.ts';
import type { MenuResult } from '../adapters/input/MenuController.ts';
import { GARAGE_ART_KEY, SCENE_KEY } from './sceneKeys.ts';

export interface GarageSceneData {
  readonly manifest: CarSetManifest;
  readonly linesByTrack: Record<string, TrackLinesManifest>;
}

const PREVIEW_SCALE = 3;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

type Mode = 'slots' | 'name' | 'hub';

/**
 * Career hub: three save slots, buy/sell, cash-in points, race or exit.
 */
export class GarageScene extends Phaser.Scene {
  private payload!: GarageSceneData;
  private mode: Mode = 'slots';
  private menu!: MenuController;
  private nameLetters = ['A', 'A', 'A', 'A', 'A'];
  private nameCursor = 0;
  private shopIndex = 0;
  private status = '';

  private art!: Phaser.GameObjects.Image;
  private dim!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private bankText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private sheetText!: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private preview!: Phaser.GameObjects.Sprite;

  constructor() {
    super(SCENE_KEY.GARAGE);
  }

  init(data: GarageSceneData): void {
    this.payload = data;
    this.mode = 'slots';
    this.status = '';
    this.buildSlotMenu();
  }

  create(): void {
    this.art = this.add.image(0, 0, GARAGE_ART_KEY).setOrigin(0, 0);
    this.dim = this.add.rectangle(0, 0, 10, 10, 0x05060a, 0.28).setOrigin(0, 0);
    this.titleText = this.add.text(0, 0, 'GARAGE', this.titleStyle()).setOrigin(0.5, 0.5);
    this.bankText = this.add.text(0, 0, '', this.bankStyle()).setOrigin(0.5, 0.5);
    this.hintText = this.add.text(0, 0, MENU_PROMPT_LIST, this.hintStyle()).setOrigin(0.5, 0.5);
    this.statusText = this.add.text(0, 0, '', this.statusStyle()).setOrigin(0.5, 0.5);
    this.sheetText = this.add.text(0, 0, '', this.sheetStyle()).setOrigin(0.5, 0);
    this.preview = this.add.sprite(0, 0, this.previewCarId(), 0).setScale(PREVIEW_SCALE);
    this.rebuildOptions();
    this.refresh();
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
    this.bindKeys();
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null || keyboard === undefined) {
      return;
    }
    const liveMenu = {
      move: (delta: number) => this.menu.move(delta),
      cycle: (delta: number) => this.menu.cycle(delta),
      confirm: () => this.menu.confirm(),
      cancel: () => this.menu.cancel(),
    };
    bindMenuKeys(keyboard, liveMenu as unknown as MenuController, {
      onResult: result => this.handleResult(result),
      onMoved: () => this.refresh(),
      onCycled: () => this.onCycled(),
    });
  }

  private onCycled(): void {
    if (this.mode === 'name') {
      const index = this.menu.valueIndex('letter');
      this.nameLetters[this.nameCursor] = LETTERS[index] ?? 'A';
    }
    if (this.mode === 'hub') {
      this.shopIndex = this.menu.valueIndex('car');
    }
    this.refresh();
  }

  private handleResult(result: MenuResult): void {
    if (result.type === 'back') {
      this.back();
      return;
    }
    if (result.type !== 'activate' && result.type !== 'commit') {
      return;
    }
    if (this.mode === 'slots') {
      this.pickSlot(this.menu.selectedIndex);
      return;
    }
    if (this.mode === 'name') {
      if (result.id === 'letter') {
        this.nameCursor = (this.nameCursor + 1) % PLAYER_NAME_LENGTH;
        this.refresh();
        return;
      }
      if (result.id === 'confirm') {
        this.confirmName();
      }
      return;
    }
    if (this.mode === 'hub') {
      this.handleHub(result.id);
    }
  }

  private pickSlot(index: number): void {
    activateSlot(index);
    const save = loadSave().slots[index];
    const career = loadCareer().slots[index];
    if (save === null || career === null || career.ownedCarIds.length === 0) {
      this.mode = 'name';
      this.nameLetters = ['A', 'A', 'A', 'A', 'A'];
      this.nameCursor = 0;
      this.buildNameMenu();
      this.rebuildOptions();
      this.refresh();
      return;
    }
    this.enterHub();
  }

  private confirmName(): void {
    const name = this.nameLetters.join('');
    const result = beginSlot(activeSlotSafe(), name, Date.now());
    if (!result.ok) {
      this.status = result.reason === 'TAKEN' ? 'NAME TAKEN' : 'TYPE A NAME';
      this.refresh();
      return;
    }
    this.enterHub();
  }

  private enterHub(): void {
    this.mode = 'hub';
    this.status = '';
    this.buildHubMenu();
    this.rebuildOptions();
    this.refresh();
  }

  private handleHub(id: string): void {
    const career = loadActiveCareer();
    if (career === null) {
      return;
    }
    const shop = this.shopCars();
    const carId = shop[this.shopIndex] ?? career.equippedCarId;
    if (id === 'buy') {
      this.tryBuy(carId);
      return;
    }
    if (id === 'sell') {
      if (sellCar(carId) === null) {
        this.status = 'CANNOT SELL';
      } else {
        this.status = `SOLD ${this.carName(carId)}`;
      }
      this.reloadHub();
      return;
    }
    if (id === 'equip') {
      if (equipCar(carId) === null) {
        this.status = 'NOT OWNED';
      } else {
        this.status = `EQUIPPED ${this.carName(carId)}`;
      }
      this.reloadHub();
      return;
    }
    if (id === 'cash') {
      if (cashInPoints() === null) {
        this.status = 'NEED 400 PTS';
      } else {
        this.status = 'POINTS CASHED';
      }
      this.reloadHub();
      return;
    }
    if (id === 'save') {
      saveNow(career.equippedCarId);
      this.status = 'SAVED';
      this.refresh();
      return;
    }
    if (id === 'race') {
      this.goRace();
      return;
    }
    if (id === 'exit') {
      this.scene.start(SCENE_KEY.SPLASH, {
        manifest: this.payload.manifest,
        linesByTrack: this.payload.linesByTrack,
      });
    }
  }

  private tryBuy(carId: string): void {
    const career = loadActiveCareer();
    const won = loadWonTracks();
    const cleared = loadCleared();
    const planet = highestUnlockedPlanetIndex(won, isTourModeOn());
    if (!isCarUnlocked(carId, planet, cleared.length)) {
      this.status = 'LOCKED';
      this.refresh();
      return;
    }
    if (career?.ownedCarIds.includes(carId) === true) {
      this.status = 'ALREADY OWNED';
      this.refresh();
      return;
    }
    if (buyCar(carId) === null) {
      this.status = 'NOT ENOUGH CASH';
      this.refresh();
      return;
    }
    this.status = `BOUGHT ${this.carName(carId)}`;
    const owned = loadActiveCareer();
    if (owned !== null && owned.ownedCarIds.length === 1) {
      this.fadeToWorlds();
      return;
    }
    this.reloadHub();
  }

  private reloadHub(): void {
    this.buildHubMenu();
    this.rebuildOptions();
    this.refresh();
  }

  private fadeToWorlds(): void {
    this.cameras.main.fadeOut(400, 5, 6, 10);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.goRace());
  }

  private goRace(): void {
    const career = loadActiveCareer();
    if (career === null || career.equippedCarId === '') {
      this.status = 'BUY A CAR FIRST';
      this.refresh();
      return;
    }
    this.scene.start(SCENE_KEY.PLANET_SELECT, {
      manifest: this.payload.manifest,
      linesByTrack: this.payload.linesByTrack,
      carId: career.equippedCarId,
      lastPlanetId: career.lastPlanetId,
    });
  }

  private back(): void {
    if (this.mode === 'hub' || this.mode === 'name') {
      this.mode = 'slots';
      this.status = '';
      this.buildSlotMenu();
      this.rebuildOptions();
      this.refresh();
      return;
    }
    this.scene.start(SCENE_KEY.SPLASH, {
      manifest: this.payload.manifest,
      linesByTrack: this.payload.linesByTrack,
    });
  }

  private buildSlotMenu(): void {
    const save = loadSave();
    this.menu = new MenuController(
      [0, 1, 2].map(index => ({
        id: `slot-${index}`,
        kind: MENU_KIND.ACTION,
        label: this.slotLabel(index, save),
      })),
    );
  }

  private buildNameMenu(): void {
    this.menu = new MenuController(
      [
        {
          id: 'letter',
          kind: MENU_KIND.OPTION,
          label: 'LETTER',
          values: [...LETTERS],
          valueIndex: 0,
        },
        { id: 'confirm', kind: MENU_KIND.ACTION, label: 'CONFIRM NAME' },
      ],
      {
        onPreview: () => this.onCycled(),
      },
    );
  }

  private buildHubMenu(): void {
    const shop = this.shopCars();
    this.shopIndex = Math.min(this.shopIndex, Math.max(0, shop.length - 1));
    this.menu = new MenuController(
      [
        {
          id: 'car',
          kind: MENU_KIND.OPTION,
          label: 'CAR',
          values: shop.map(id => this.carLabel(id)),
          valueIndex: this.shopIndex,
        },
        { id: 'buy', kind: MENU_KIND.ACTION, label: 'BUY' },
        { id: 'sell', kind: MENU_KIND.ACTION, label: 'SELL' },
        { id: 'equip', kind: MENU_KIND.ACTION, label: 'EQUIP' },
        { id: 'cash', kind: MENU_KIND.ACTION, label: 'CASH IN PTS' },
        { id: 'save', kind: MENU_KIND.ACTION, label: 'SAVE' },
        { id: 'race', kind: MENU_KIND.ACTION, label: 'RACE' },
        { id: 'exit', kind: MENU_KIND.ACTION, label: 'EXIT' },
      ],
      {
        selectedIndex: 0,
        onPreview: () => this.onCycled(),
      },
    );
  }

  private shopCars(): string[] {
    const career = loadActiveCareer();
    const won = loadWonTracks();
    const cleared = loadCleared();
    const planet = highestUnlockedPlanetIndex(won, isTourModeOn());
    if (career === null || career.ownedCarIds.length === 0) {
      return [...STARTER_CAR_IDS, ...WORLD_ONE_LOCKED_CAR_IDS];
    }
    return GARAGE_CATALOG.filter(
      entry =>
        career.ownedCarIds.includes(entry.carId) ||
        isCarUnlocked(entry.carId, planet, cleared.length) ||
        isStarterCar(entry.carId) ||
        (WORLD_ONE_LOCKED_CAR_IDS as readonly string[]).includes(entry.carId),
    ).map(entry => entry.carId);
  }

  private slotLabel(index: number, save: ReturnType<typeof loadSave>): string {
    const slot = save.slots[index];
    const career = loadCareer().slots[index];
    if (slot === null || career === null) {
      return `SLOT ${index + 1}  ·  EMPTY`;
    }
    return `SLOT ${index + 1}  ·  ${slot.name}  ${formatCash(career.cash)}`;
  }

  private carLabel(carId: string): string {
    const career = loadActiveCareer();
    const owned = career?.ownedCarIds.includes(carId) === true;
    const won = loadWonTracks();
    const cleared = loadCleared();
    const unlocked = isCarUnlocked(carId, highestUnlockedPlanetIndex(won, isTourModeOn()), cleared.length);
    const tag = owned ? 'OWNED' : unlocked ? formatCash(listPrice(carId)) : 'LOCKED';
    return `${this.carName(carId)}  ${tag}`;
  }

  private carName(carId: string): string {
    try {
      return findCarSheet(this.payload.manifest, carId).displayName.toUpperCase();
    } catch {
      return carId.toUpperCase();
    }
  }

  private previewCarId(): string {
    const career = loadActiveCareer();
    if (this.mode === 'hub') {
      return this.shopCars()[this.shopIndex] ?? career?.equippedCarId ?? 'car-1';
    }
    return career?.equippedCarId || 'car-1';
  }

  private rebuildOptions(): void {
    this.optionTexts.forEach(text => text.destroy());
    this.optionTexts = this.menu.views().map(view =>
      this.add.text(0, 0, view.text, this.optionStyle()).setOrigin(0.5, 0.5),
    );
  }

  private refresh(): void {
    const career = loadActiveCareer();
    const name = loadActiveName();
    if (this.mode === 'slots') {
      this.titleText.setText('SELECT SAVE');
      this.bankText.setText(occupiedNames().length === 0 ? '3 SLOTS' : occupiedNames().join('  ·  '));
      this.hintText.setText(MENU_PROMPT_LIST);
    } else if (this.mode === 'name') {
      this.titleText.setText('Type your Name and Buy your Car!');
      const shown = this.nameLetters
        .map((letter, index) => (index === this.nameCursor ? `[${letter}]` : letter))
        .join(' ');
      this.bankText.setText(shown);
      this.hintText.setText('←→ LETTER     ENTER NEXT / CONFIRM');
    } else {
      this.titleText.setText(name || 'GARAGE');
      const deal = cashInValue(career?.points ?? 0);
      this.bankText.setText(
        `BANK ${formatCash(career?.cash ?? 0)}   PTS ${career?.points ?? 0}   CASH-IN x${deal.batches}`,
      );
      const carId = this.previewCarId();
      const extra = career?.ownedCarIds.includes(carId)
        ? `SELL ${formatCash(sellPrice(carId))}`
        : `BUY ${formatCash(listPrice(carId))}`;
      this.hintText.setText(`${MENU_PROMPT_LIST}     ${extra}`);
    }
    this.statusText.setText(this.status);
    this.sheetText.setText(this.mode === 'hub' ? this.sheetBlock() : '');
    this.sheetText.setVisible(this.mode === 'hub');
    if (this.textures.exists(this.previewCarId())) {
      this.preview.setTexture(this.previewCarId(), 0).setVisible(true);
    }
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
    if (this.textures.exists(GARAGE_ART_KEY)) {
      const image = { width: this.art.width, height: this.art.height };
      const rect = coverRect({ width, height }, image);
      this.art.setVisible(true).setPosition(rect.x, rect.y).setDisplaySize(rect.width, rect.height);
    } else {
      this.art.setVisible(false);
    }
    this.dim.setSize(width, height);
    this.titleText.setPosition(width / 2, height * 0.08);
    this.bankText.setPosition(width / 2, height * 0.14);
    this.preview.setPosition(width / 2, height * 0.42);
    this.optionTexts.forEach((text, index) => {
      text.setPosition(width / 2, height * (0.58 + index * 0.04));
    });
    this.sheetText.setPosition(width * 0.82, height * 0.2);
    this.statusText.setPosition(width / 2, height * 0.9);
    this.hintText.setPosition(width / 2, height * 0.95);
  }

  private titleStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '28px', color: '#ffffff', stroke: '#1a0e05', strokeThickness: 7 };
  }

  private bankStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '18px', color: '#8bff9b', stroke: '#101014', strokeThickness: 4 };
  }

  private optionStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '16px', color: '#d8dae2', stroke: '#101014', strokeThickness: 4 };
  }

  private hintStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', stroke: '#1a0e05', strokeThickness: 4 };
  }

  private sheetStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#d8dae2',
      align: 'left',
      stroke: '#101014',
      strokeThickness: 3,
    };
  }

  private sheetBlock(): string {
    const career = loadActiveCareer();
    const save = loadSave().slots[activeSlotSafe()];
    if (career === null || save === null || save === undefined) {
      return '';
    }
    const lines = ['TRACK     PTS    BEST'];
    for (const track of campaignTracks()) {
      const points = career.trackPoints[track.id];
      const lap = save.bestLaps[track.id];
      if (points === undefined && lap === undefined) {
        continue;
      }
      const lapText = lap !== undefined ? lap.toFixed(2) : '—';
      lines.push(
        `W${track.planet.index}-${track.n}  ${String(points ?? 0).padStart(4)}  ${lapText}`,
      );
    }
    if (lines.length === 1) {
      return 'NO LAPS YET';
    }
    const header = lines[0]!;
    const rows = lines.slice(1).slice(-8);
    return [header, ...rows].join('\n');
  }

  private statusStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '16px', color: '#ffd85c', stroke: '#101014', strokeThickness: 4 };
  }
}

function activeSlotSafe(): number {
  return loadCareer().activeSlotIndex;
}
