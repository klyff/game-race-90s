import Phaser from 'phaser';
import { coverRect } from '../adapters/render/SplashLayout.ts';
import { findCarSheet } from '../data/cars/CarManifest.ts';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import { PLANETS } from '../data/tracks/planets.ts';
import { highestUnlockedPlanetIndex } from '../data/tracks/campaign.ts';
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
import { perkProfile } from '../domain/vehicle/CarPerk.ts';
import { missileCapacity } from '../domain/weapons/WeaponInventory.ts';
import { MINE_START_COUNT, OIL_START_COUNT } from '../domain/weapons/WeaponConstants.ts';
import { TURBO_START_COUNT } from '../domain/vehicle/TurboCharges.ts';
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
  saveNow,
  sellCar,
} from '../adapters/progress/ProgressStore.ts';
import { MENU_KIND, MenuController } from '../adapters/input/MenuController.ts';
import type { MenuResult } from '../adapters/input/MenuController.ts';
import {
  GARAGE_ART_KEY,
  MINE_SPRITE_KEY,
  MISSILE_SPRITE_KEY,
  OIL_SPRITE_KEY,
  SCENE_KEY,
  TURBO_SPRITE_KEY,
} from './sceneKeys.ts';

export interface GarageSceneData {
  readonly manifest: CarSetManifest;
  readonly linesByTrack: Record<string, TrackLinesManifest>;
}

const PREVIEW_SCALE = 4.2;
const PREVIEW_FRAME = 20;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const HUB_FOCUS = ['sell', 'buy', 'save', 'race'] as const;
const PLAQUE = 0x1a120c;
const PLAQUE_EDGE = 0xf4e6c4;
const GOLD = '#ffd85c';
const IVORY = '#f4f0e4';
const MUTED = '#8a8376';

type Mode = 'slots' | 'name' | 'hub';

/**
 * Career hub painted onto the garage floor: stats, car carousel, ranking,
 * buy/sell. Mouse, Tab, arrows and Enter all drive the same actions.
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
  private titleBox!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private arsenalBox!: Phaser.GameObjects.Rectangle;
  private arsenalIcons: Phaser.GameObjects.Sprite[] = [];
  private arsenalCounts: Phaser.GameObjects.Text[] = [];
  private moneyBox!: Phaser.GameObjects.Rectangle;
  private moneyText!: Phaser.GameObjects.Text;
  private pointsBox!: Phaser.GameObjects.Rectangle;
  private pointsText!: Phaser.GameObjects.Text;
  private worldBox!: Phaser.GameObjects.Rectangle;
  private worldText!: Phaser.GameObjects.Text;
  private profileBox!: Phaser.GameObjects.Rectangle;
  private profileText!: Phaser.GameObjects.Text;
  private rankingBox!: Phaser.GameObjects.Rectangle;
  private rankingText!: Phaser.GameObjects.Text;
  private preview!: Phaser.GameObjects.Sprite;
  private arrowLeft!: Phaser.GameObjects.Text;
  private arrowRight!: Phaser.GameObjects.Text;
  private carNameText!: Phaser.GameObjects.Text;
  private valueText!: Phaser.GameObjects.Text;
  private btnSave!: Phaser.GameObjects.Text;
  private btnSell!: Phaser.GameObjects.Text;
  private btnBuy!: Phaser.GameObjects.Text;
  private btnRace!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private overlayTexts: Phaser.GameObjects.Text[] = [];

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
    this.titleBox = this.plaque(280, 44);
    this.titleText = this.add.text(0, 0, '', this.titleStyle()).setOrigin(0.5, 0.5);
    this.arsenalBox = this.plaque(300, 40);
    this.arsenalIcons = [MISSILE_SPRITE_KEY, MINE_SPRITE_KEY, OIL_SPRITE_KEY, TURBO_SPRITE_KEY].map(key => {
      const sprite = this.add.sprite(0, 0, key, 0).setVisible(this.textures.exists(key));
      sprite.setDisplaySize(18, 18);
      return sprite;
    });
    this.arsenalCounts = [0, 1, 2, 3].map(() => this.add.text(0, 0, '', this.smallStyle()).setOrigin(0, 0.5));
    this.moneyBox = this.plaque(200, 48);
    this.moneyText = this.add.text(0, 0, '', this.statStyle('#8bff9b')).setOrigin(0.5, 0.5);
    this.pointsBox = this.plaque(200, 48);
    this.pointsText = this.add.text(0, 0, '', this.statStyle(GOLD)).setOrigin(0.5, 0.5);
    this.worldBox = this.plaque(200, 48);
    this.worldText = this.add.text(0, 0, '', this.statStyle(IVORY)).setOrigin(0.5, 0.5);
    this.profileBox = this.plaque(88, 88);
    this.profileText = this.add.text(0, 0, '', this.profileStyle()).setOrigin(0.5, 0.5);
    this.rankingBox = this.plaque(220, 220);
    this.rankingText = this.add.text(0, 0, '', this.rankStyle()).setOrigin(0.5, 0);
    this.preview = this.add.sprite(0, 0, this.previewCarId(), PREVIEW_FRAME).setScale(PREVIEW_SCALE);
    this.arrowLeft = this.add.text(0, 0, '◀', this.arrowStyle()).setOrigin(0.5, 0.5);
    this.arrowRight = this.add.text(0, 0, '▶', this.arrowStyle()).setOrigin(0.5, 0.5);
    this.carNameText = this.add.text(0, 0, '', this.carTitleStyle()).setOrigin(0.5, 0.5);
    this.valueText = this.add.text(0, 0, '', this.statStyle(GOLD)).setOrigin(0.5, 0.5);
    this.btnSave = this.add.text(0, 0, 'SAVE AND QUIT', this.buttonStyle()).setOrigin(0.5, 0.5);
    this.btnSell = this.add.text(0, 0, 'SELL CAR', this.buttonStyle()).setOrigin(0.5, 0.5);
    this.btnBuy = this.add.text(0, 0, 'BUY CAR', this.buttonStyle()).setOrigin(0.5, 0.5);
    this.btnRace = this.add.text(0, 0, 'GO RACING ROLL!', this.buttonStyle()).setOrigin(0.5, 0.5);
    this.statusText = this.add.text(0, 0, '', this.statusStyle()).setOrigin(0.5, 0.5);
    this.hintText = this.add.text(0, 0, '', this.hintStyle()).setOrigin(0.5, 0.5);

    this.wireClick(this.arrowLeft, () => this.nudgeShop(-1));
    this.wireClick(this.arrowRight, () => this.nudgeShop(1));
    this.wireClick(this.btnSell, () => this.handleHub('sell'));
    this.wireClick(this.btnBuy, () => this.handleHub('buy'));
    this.wireClick(this.btnSave, () => this.handleHub('save'));
    this.wireClick(this.btnRace, () => this.handleHub('race'));
    this.wireClick(this.pointsText, () => this.handleHub('cash'));
    this.wireClick(this.preview, () => this.handleHub('equip'));

    this.rebuildOverlay();
    this.refresh();
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
    this.bindKeys();
  }

  private plaque(width: number, height: number): Phaser.GameObjects.Rectangle {
    return this.add
      .rectangle(0, 0, width, height, PLAQUE, 0.72)
      .setStrokeStyle(2, PLAQUE_EDGE, 0.85)
      .setOrigin(0.5, 0.5);
  }

  private wireClick(target: Phaser.GameObjects.GameObject, action: () => void): void {
    target.setInteractive({ useHandCursor: true });
    target.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.mode !== 'hub') {
        return;
      }
      action();
    });
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null || keyboard === undefined) {
      return;
    }
    const add = (code: number, repeat: boolean, fn: () => void): void => {
      keyboard.addKey(code, true, repeat).on('down', fn);
    };
    add(Phaser.Input.Keyboard.KeyCodes.UP, true, () => this.moveFocus(-1));
    add(Phaser.Input.Keyboard.KeyCodes.DOWN, true, () => this.moveFocus(1));
    add(Phaser.Input.Keyboard.KeyCodes.LEFT, true, () => this.onLeftRight(-1));
    add(Phaser.Input.Keyboard.KeyCodes.RIGHT, true, () => this.onLeftRight(1));
    add(Phaser.Input.Keyboard.KeyCodes.ENTER, false, () => this.confirmFocus());
    add(Phaser.Input.Keyboard.KeyCodes.SPACE, false, () => this.confirmFocus());
    add(Phaser.Input.Keyboard.KeyCodes.ESC, false, () => this.back());
    keyboard.on('keydown-TAB', (event: KeyboardEvent) => {
      event.preventDefault();
      this.moveFocus(event.shiftKey ? -1 : 1);
    });
  }

  private moveFocus(delta: number): void {
    this.menu.move(delta);
    this.refresh();
  }

  private onLeftRight(delta: number): void {
    if (this.mode === 'hub') {
      this.nudgeShop(delta);
      return;
    }
    if (this.menu.cycle(delta)) {
      this.onCycled();
    }
  }

  private confirmFocus(): void {
    this.handleResult(this.menu.confirm());
  }

  private nudgeShop(delta: number): void {
    if (this.mode !== 'hub') {
      return;
    }
    const shop = this.shopCars();
    if (shop.length === 0) {
      return;
    }
    this.shopIndex = (this.shopIndex + delta + shop.length) % shop.length;
    this.refresh();
  }

  private onCycled(): void {
    if (this.mode === 'name') {
      const index = this.menu.valueIndex('letter');
      this.nameLetters[this.nameCursor] = LETTERS[index] ?? 'A';
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
    this.handleHub(result.id);
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
      this.rebuildOverlay();
      this.refresh();
      this.layout();
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
    const career = loadActiveCareer();
    const shop = this.shopCars();
    const equipped = career?.equippedCarId ?? '';
    const equippedIndex = shop.indexOf(equipped);
    this.shopIndex = equippedIndex >= 0 ? equippedIndex : 0;
    this.buildHubMenu();
    this.rebuildOverlay();
    this.refresh();
    this.layout();
  }

  private handleHub(id: string): void {
    if (this.mode !== 'hub') {
      return;
    }
    const career = loadActiveCareer();
    if (career === null) {
      return;
    }
    const carId = this.previewCarId();
    if (id === 'buy') {
      if (career.ownedCarIds.includes(carId)) {
        this.handleHub('equip');
        return;
      }
      this.tryBuy(carId);
      return;
    }
    if (id === 'sell') {
      if (sellCar(carId) === null) {
        this.status = 'CANNOT SELL';
      } else {
        this.status = `SOLD ${this.carName(carId)}`;
      }
      this.refresh();
      return;
    }
    if (id === 'equip') {
      if (equipCar(carId) === null) {
        this.status = career.ownedCarIds.includes(carId) ? 'EQUIPPED' : 'NOT OWNED';
      } else {
        this.status = `EQUIPPED ${this.carName(carId)}`;
      }
      this.refresh();
      return;
    }
    if (id === 'cash') {
      if (cashInPoints() === null) {
        this.status = 'NEED 400 PTS';
      } else {
        this.status = 'POINTS CASHED';
      }
      this.refresh();
      return;
    }
    if (id === 'save') {
      saveNow(career.equippedCarId);
      this.scene.start(SCENE_KEY.SPLASH, {
        manifest: this.payload.manifest,
        linesByTrack: this.payload.linesByTrack,
      });
      return;
    }
    if (id === 'race') {
      this.goRace();
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
      this.rebuildOverlay();
      this.refresh();
      this.layout();
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
      { onPreview: () => this.onCycled() },
    );
  }

  private buildHubMenu(): void {
    this.menu = new MenuController(
      HUB_FOCUS.map(id => ({
        id,
        kind: MENU_KIND.ACTION,
        label: id.toUpperCase(),
      })),
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

  private rebuildOverlay(): void {
    this.overlayTexts.forEach(text => text.destroy());
    this.overlayTexts = [];
    if (this.mode === 'hub') {
      return;
    }
    this.overlayTexts = this.menu.views().map((view, index) => {
      const text = this.add.text(0, 0, view.text, this.buttonStyle()).setOrigin(0.5, 0.5);
      text.setInteractive({ useHandCursor: true });
      text.on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (this.mode === 'slots') {
          this.pickSlot(index);
          return;
        }
        if (view.id === 'letter') {
          this.nameCursor = (this.nameCursor + 1) % PLAYER_NAME_LENGTH;
          this.refresh();
          return;
        }
        this.confirmName();
      });
      return text;
    });
  }

  private refresh(): void {
    const hub = this.mode === 'hub';
    this.setHubVisible(hub);
    const career = loadActiveCareer();
    const name = loadActiveName();

    if (this.mode === 'slots') {
      this.titleText.setText('SELECT SAVE');
      this.hintText.setText('CLICK A SLOT     TAB / ↑↓     ENTER');
    } else if (this.mode === 'name') {
      this.titleText.setText('TYPE YOUR NAME AND BUY YOUR CAR!');
      const shown = this.nameLetters
        .map((letter, index) => (index === this.nameCursor ? `[${letter}]` : letter))
        .join(' ');
      this.hintText.setText(`${shown}     ←→ LETTER     ENTER NEXT / CONFIRM`);
    } else {
      this.titleText.setText(`${name || 'PILOT'}'S GARAGE`);
      this.moneyText.setText(`$  ${formatCash(career?.cash ?? 0)}`);
      const deal = cashInValue(career?.points ?? 0);
      this.pointsText.setText(
        deal.batches > 0
          ? `PTS  ${career?.points ?? 0}   CASH ×${deal.batches}`
          : `PTS  ${career?.points ?? 0}`,
      );
      this.worldText.setText(this.worldLine(career?.lastPlanetId));
      this.profileText.setText((name || '?').slice(0, 1));
      this.rankingText.setText(this.rankingBlock(name));
      const carId = this.previewCarId();
      const owned = career?.ownedCarIds.includes(carId) === true;
      const unlocked = this.carUnlocked(carId);
      this.carNameText.setText(this.carName(carId));
      this.valueText.setText(
        owned ? `OWNED  ·  SELL ${formatCash(sellPrice(carId))}` : unlocked ? formatCash(listPrice(carId)) : 'LOCKED',
      );
      this.btnBuy.setText(owned ? 'EQUIP CAR' : 'BUY CAR');
      this.paintArsenal(carId);
      this.hintText.setText('CLICK OR TAB  ·  ←→ CARS  ·  ENTER');
      if (this.textures.exists(carId)) {
        this.preview.setTexture(carId, PREVIEW_FRAME).setVisible(true);
      }
      this.paintFocus();
    }

    this.statusText.setText(this.status);
    this.menu.views().forEach((view, index) => {
      const text = this.overlayTexts[index];
      if (text === undefined) {
        return;
      }
      text.setColor(view.selected ? GOLD : IVORY);
      text.setText(view.text);
    });
  }

  private setHubVisible(hub: boolean): void {
    const nodes: Phaser.GameObjects.GameObject[] = [
      this.arsenalBox,
      this.moneyBox,
      this.moneyText,
      this.pointsBox,
      this.pointsText,
      this.worldBox,
      this.worldText,
      this.profileBox,
      this.profileText,
      this.rankingBox,
      this.rankingText,
      this.preview,
      this.arrowLeft,
      this.arrowRight,
      this.carNameText,
      this.valueText,
      this.btnSave,
      this.btnSell,
      this.btnBuy,
      this.btnRace,
      ...this.arsenalIcons,
      ...this.arsenalCounts,
    ];
    nodes.forEach(node => {
      (node as unknown as { setVisible: (value: boolean) => void }).setVisible(hub);
    });
  }

  private paintFocus(): void {
    const focus = this.menu.selectedId;
    this.btnSell.setColor(focus === 'sell' ? GOLD : IVORY);
    this.btnBuy.setColor(focus === 'buy' ? GOLD : IVORY);
    this.btnSave.setColor(focus === 'save' ? GOLD : IVORY);
    this.btnRace.setColor(focus === 'race' ? GOLD : IVORY);
    this.arrowLeft.setColor(IVORY);
    this.arrowRight.setColor(IVORY);
  }

  private paintArsenal(carId: string): void {
    try {
      const sheet = findCarSheet(this.payload.manifest, carId);
      const missiles = missileCapacity(sheet.stats, perkProfile(sheet.perk));
      const counts = [missiles, MINE_START_COUNT, OIL_START_COUNT, TURBO_START_COUNT];
      this.arsenalCounts.forEach((text, index) => text.setText(String(counts[index] ?? 0)));
    } catch {
      this.arsenalCounts.forEach(text => text.setText(''));
    }
  }

  private carUnlocked(carId: string): boolean {
    return isCarUnlocked(carId, highestUnlockedPlanetIndex(loadWonTracks(), isTourModeOn()), loadCleared().length);
  }

  private worldLine(planetId: string | undefined): string {
    const planet = PLANETS.find(entry => entry.id === planetId) ?? PLANETS[0];
    if (planet === undefined) {
      return 'WORLD  1';
    }
    return `W${planet.index}  ${planet.displayName.toUpperCase()}`;
  }

  private rankingBlock(playerName: string): string {
    const career = loadActiveCareer();
    const rows: { name: string; points: number }[] = [];
    if (career !== null) {
      career.rivalNames.forEach((name, index) => {
        rows.push({ name, points: career.rivalPoints[index] ?? 0 });
      });
      rows.push({ name: playerName || 'YOU', points: career.points });
    }
    const ranked = rows.sort((a, b) => b.points - a.points).slice(0, 10);
    const lines = ['RANKING'];
    ranked.forEach((row, index) => {
      const marker = row.name === playerName ? '>' : ' ';
      lines.push(`${marker}${String(index + 1).padStart(2)} ${row.name.padEnd(8)} ${String(row.points).padStart(4)}`);
    });
    return lines.join('\n');
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

    const left = width * 0.16;
    const right = width * 0.84;
    const floorY = height * 0.5;
    this.titleBox.setPosition(width / 2, height * 0.07).setSize(Math.min(420, width * 0.42), 44);
    this.titleText.setPosition(width / 2, height * 0.07);
    this.arsenalBox.setPosition(width / 2, height * 0.145).setSize(320, 40);
    this.arsenalIcons.forEach((icon, index) => {
      const x = width / 2 - 130 + index * 76;
      icon.setPosition(x, height * 0.145);
      this.arsenalCounts[index]?.setPosition(x + 14, height * 0.145);
    });

    this.moneyBox.setPosition(left, height * 0.26);
    this.moneyText.setPosition(left, height * 0.26);
    this.pointsBox.setPosition(left, height * 0.36);
    this.pointsText.setPosition(left, height * 0.36);
    this.worldBox.setPosition(left, height * 0.46);
    this.worldText.setPosition(left, height * 0.46);

    this.profileBox.setPosition(right, height * 0.2);
    this.profileText.setPosition(right, height * 0.2);
    this.rankingBox.setPosition(right, height * 0.5).setSize(240, height * 0.36);
    this.rankingText.setPosition(right, height * 0.33);

    this.preview.setPosition(width / 2, floorY);
    this.arrowLeft.setPosition(width * 0.34, floorY);
    this.arrowRight.setPosition(width * 0.66, floorY);
    this.carNameText.setPosition(width / 2, height * 0.64);
    this.valueText.setPosition(width / 2, height * 0.69);

    this.btnSave.setPosition(width * 0.16, height * 0.88);
    this.btnSell.setPosition(width * 0.42, height * 0.88);
    this.btnBuy.setPosition(width * 0.58, height * 0.88);
    this.btnRace.setPosition(width * 0.84, height * 0.88);
    this.statusText.setPosition(width / 2, height * 0.8);
    this.hintText.setPosition(width / 2, height * 0.95);

    this.overlayTexts.forEach((text, index) => {
      text.setPosition(width / 2, height * (0.42 + index * 0.07));
    });
  }

  private titleStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '26px', color: IVORY, stroke: '#1a0e05', strokeThickness: 6 };
  }

  private statStyle(color: string): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '16px', color, stroke: '#101014', strokeThickness: 4 };
  }

  private smallStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '14px', color: IVORY, stroke: '#101014', strokeThickness: 3 };
  }

  private profileStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '40px', color: GOLD, stroke: '#1a0e05', strokeThickness: 6 };
  }

  private rankStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: IVORY,
      align: 'left',
      stroke: '#101014',
      strokeThickness: 3,
    };
  }

  private carTitleStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '22px', color: IVORY, stroke: '#1a0e05', strokeThickness: 6 };
  }

  private arrowStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '42px', color: IVORY, stroke: '#1a0e05', strokeThickness: 6 };
  }

  private buttonStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '16px', color: IVORY, stroke: '#1a0e05', strokeThickness: 5 };
  }

  private hintStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '12px', color: MUTED, stroke: '#101014', strokeThickness: 3 };
  }

  private statusStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '16px', color: GOLD, stroke: '#101014', strokeThickness: 4 };
  }
}

function activeSlotSafe(): number {
  return loadCareer().activeSlotIndex;
}
