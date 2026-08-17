import Phaser from 'phaser';
import { containSize } from '../adapters/render/FitBox.ts';
import { coverRect } from '../adapters/render/SplashLayout.ts';
import { paintRoundedPlaque, PLAQUE_INK } from '../adapters/render/UiPlaque.ts';
import { cartPortraitKey, findCarSheet, sheetCellSize } from '../data/cars/CarManifest.ts';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import { STAT_BAR_FIELDS, statBars } from '../adapters/render/CarStatBars.ts';
import type { StatBar } from '../adapters/render/CarStatBars.ts';
import { PLANETS } from '../data/tracks/planets.ts';
import { highestUnlockedPlanetIndex } from '../data/tracks/campaign.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { formatCash } from '../domain/progress/Wallet.ts';
import {
  carUnlockHint,
  isCarUnlocked,
  listPrice,
  sellPrice,
  shopCarIds,
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
import { formatHelpBody } from '../data/input/ControlList.ts';
import {
  CART_PORTRAIT_SIZE,
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
const HUB_FOCUS = ['buy', 'race', 'sell', 'save'] as const;
const ARSENAL_LABELS = ['MSL', 'MINE', 'OIL', 'TURBO'] as const;
const PLAQUE = PLAQUE_INK;
const PLAQUE_EDGE = 0xf4e6c4;
const PLAQUE_HOT = 0x2c2410;
const GOLD = '#ffe566';
const IVORY = '#f7f3e8';
const MUTED = '#a39b8c';
const GO = '#9dffad';
const LOCKED = '#ff8a6a';

type Mode = 'slots' | 'name' | 'hub' | 'help';

/**
 * Career hub painted onto the garage floor: stats, car carousel, ranking,
 * buy/sell. Mouse, Tab, arrows and Enter all drive the same actions.
 */
export class GarageScene extends Phaser.Scene {
  private payload!: GarageSceneData;
  private mode: Mode = 'slots';
  private menu!: MenuController;
  private nameDraft = '';
  private shopIndex = 0;
  private status = '';

  private art!: Phaser.GameObjects.Image;
  private titleBox!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private arsenalBox!: Phaser.GameObjects.Rectangle;
  private arsenalIcons: Phaser.GameObjects.Sprite[] = [];
  private arsenalCounts: Phaser.GameObjects.Text[] = [];
  private arsenalLabels: Phaser.GameObjects.Text[] = [];
  private moneyBox!: Phaser.GameObjects.Rectangle;
  private moneyCaption!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  private pointsBox!: Phaser.GameObjects.Rectangle;
  private pointsCaption!: Phaser.GameObjects.Text;
  private pointsText!: Phaser.GameObjects.Text;
  private worldBox!: Phaser.GameObjects.Rectangle;
  private worldCaption!: Phaser.GameObjects.Text;
  private worldText!: Phaser.GameObjects.Text;
  private profileBox!: Phaser.GameObjects.Rectangle;
  private profileText!: Phaser.GameObjects.Text;
  private rankingBox!: Phaser.GameObjects.Rectangle;
  private rankingText!: Phaser.GameObjects.Text;
  private preview!: Phaser.GameObjects.Sprite;
  private portrait!: Phaser.GameObjects.Image;
  private specBox!: Phaser.GameObjects.Rectangle;
  private specPerkText!: Phaser.GameObjects.Text;
  private specLabels: Phaser.GameObjects.Text[] = [];
  private specTracks: Phaser.GameObjects.Rectangle[] = [];
  private specFills: Phaser.GameObjects.Rectangle[] = [];
  private specValues: Phaser.GameObjects.Text[] = [];
  private arrowLeft!: Phaser.GameObjects.Text;
  private arrowRight!: Phaser.GameObjects.Text;
  private carNameText!: Phaser.GameObjects.Text;
  private valueText!: Phaser.GameObjects.Text;
  private btnSaveBox!: Phaser.GameObjects.Rectangle;
  private btnSave!: Phaser.GameObjects.Text;
  private btnSellBox!: Phaser.GameObjects.Rectangle;
  private btnSell!: Phaser.GameObjects.Text;
  private btnBuyBox!: Phaser.GameObjects.Rectangle;
  private btnBuy!: Phaser.GameObjects.Text;
  private btnRaceBox!: Phaser.GameObjects.Rectangle;
  private btnRace!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private hintPlate!: Phaser.GameObjects.Rectangle;
  private nameField!: Phaser.GameObjects.Text;
  private menuPlate!: Phaser.GameObjects.Graphics;
  private namePlate!: Phaser.GameObjects.Graphics;
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
    this.menuPlate = this.add.graphics();
    this.namePlate = this.add.graphics();
    this.titleBox = this.plaque(280, 48);
    this.titleText = this.add.text(0, 0, '', this.titleStyle()).setOrigin(0.5, 0.5);
    this.arsenalBox = this.plaque(520, 72);
    this.arsenalIcons = [MISSILE_SPRITE_KEY, MINE_SPRITE_KEY, OIL_SPRITE_KEY, TURBO_SPRITE_KEY].map(key => {
      const sprite = this.add.sprite(0, 0, key, 0).setVisible(this.textures.exists(key));
      sprite.setDisplaySize(28, 28);
      return sprite;
    });
    this.arsenalCounts = [0, 1, 2, 3].map(() => this.add.text(0, 0, '', this.arsenalCountStyle()).setOrigin(0, 0.5));
    this.arsenalLabels = ARSENAL_LABELS.map(label =>
      this.add.text(0, 0, label, this.captionStyle()).setOrigin(0.5, 0.5),
    );
    this.moneyBox = this.plaque(210, 64);
    this.moneyCaption = this.add.text(0, 0, 'WALLET', this.captionStyle()).setOrigin(0.5, 0.5);
    this.moneyText = this.add.text(0, 0, '', this.statStyle(GO)).setOrigin(0.5, 0.5);
    this.pointsBox = this.plaque(210, 64);
    this.pointsCaption = this.add.text(0, 0, 'RESPECT', this.captionStyle()).setOrigin(0.5, 0.5);
    this.pointsText = this.add.text(0, 0, '', this.statStyle(GOLD)).setOrigin(0.5, 0.5);
    this.worldBox = this.plaque(210, 64);
    this.worldCaption = this.add.text(0, 0, 'WORLD', this.captionStyle()).setOrigin(0.5, 0.5);
    this.worldText = this.add.text(0, 0, '', this.worldStyle()).setOrigin(0.5, 0.5);
    this.profileBox = this.plaque(88, 88);
    this.profileText = this.add.text(0, 0, '', this.profileStyle()).setOrigin(0.5, 0.5);
    this.rankingBox = this.plaque(220, 220);
    this.rankingText = this.add.text(0, 0, '', this.rankStyle()).setOrigin(0.5, 0);
    this.preview = this.add.sprite(0, 0, this.previewCarId(), PREVIEW_FRAME).setScale(PREVIEW_SCALE);
    this.portrait = this.add.image(0, 0, '').setOrigin(0.5, 0.5).setVisible(false);
    this.specBox = this.plaque(260, 220);
    this.specPerkText = this.add.text(0, 0, '', this.captionStyle()).setOrigin(0.5, 0);
    this.specLabels = STAT_BAR_FIELDS.map(() => this.add.text(0, 0, '', this.specLabelStyle()).setOrigin(0, 0.5));
    this.specTracks = STAT_BAR_FIELDS.map(() => this.add.rectangle(0, 0, 120, 10, 0x2a2218, 0.95).setOrigin(0, 0.5));
    this.specFills = STAT_BAR_FIELDS.map(() => this.add.rectangle(0, 0, 120, 10, 0xffd85c, 1).setOrigin(0, 0.5));
    this.specValues = STAT_BAR_FIELDS.map(() => this.add.text(0, 0, '', this.specValueStyle()).setOrigin(0, 0.5));
    this.arrowLeft = this.add.text(0, 0, '◀', this.arrowStyle()).setOrigin(0.5, 0.5);
    this.arrowRight = this.add.text(0, 0, '▶', this.arrowStyle()).setOrigin(0.5, 0.5);
    this.carNameText = this.add.text(0, 0, '', this.carTitleStyle()).setOrigin(0.5, 0.5);
    this.valueText = this.add.text(0, 0, '', this.statStyle(GOLD)).setOrigin(0.5, 0.5);
    this.btnSaveBox = this.plaque(150, 48);
    this.btnSave = this.add.text(0, 0, 'SAVE', this.buttonStyle()).setOrigin(0.5, 0.5);
    this.btnSellBox = this.plaque(150, 48);
    this.btnSell = this.add.text(0, 0, 'SELL', this.buttonStyle()).setOrigin(0.5, 0.5);
    this.btnBuyBox = this.plaque(190, 48);
    this.btnBuy = this.add.text(0, 0, 'BUY', this.buttonStyle()).setOrigin(0.5, 0.5);
    this.btnRaceBox = this.plaque(190, 52);
    this.btnRace = this.add.text(0, 0, 'GO RACE', this.raceButtonStyle()).setOrigin(0.5, 0.5);
    this.helpText = this.add.text(0, 0, formatHelpBody(), this.helpStyle()).setOrigin(0.5, 0).setVisible(false);
    this.statusText = this.add.text(0, 0, '', this.statusStyle()).setOrigin(0.5, 0.5);
    this.nameField = this.add.text(0, 0, '', this.nameFieldStyle()).setOrigin(0.5, 0.5);
    this.hintPlate = this.plaque(420, 56);
    this.hintText = this.add.text(0, 0, '', this.hintStyle()).setOrigin(0.5, 0.5);

    this.wireClick(this.arrowLeft, () => this.nudgeShop(-1));
    this.wireClick(this.arrowRight, () => this.nudgeShop(1));
    this.wireClick(this.btnSellBox, () => this.handleHub('sell'));
    this.wireClick(this.btnSell, () => this.handleHub('sell'));
    this.wireClick(this.btnBuyBox, () => this.handleHub('buy'));
    this.wireClick(this.btnBuy, () => this.handleHub('buy'));
    this.wireClick(this.btnSaveBox, () => this.handleHub('save'));
    this.wireClick(this.btnSave, () => this.handleHub('save'));
    this.wireClick(this.btnRaceBox, () => this.handleHub('race'));
    this.wireClick(this.btnRace, () => this.handleHub('race'));
    this.wireClick(this.pointsBox, () => this.handleHub('cash'));
    this.wireClick(this.pointsText, () => this.handleHub('cash'));
    this.wireClick(this.preview, () => this.handleHub('equip'));
    this.wireClick(this.portrait, () => this.handleHub('equip'));

    this.rebuildOverlay();
    this.refresh();
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
    this.bindKeys();
  }

  private plaque(width: number, height: number): Phaser.GameObjects.Rectangle {
    return this.add
      .rectangle(0, 0, width, height, PLAQUE, 0.82)
      .setStrokeStyle(2, PLAQUE_EDGE, 0.9)
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
    add(Phaser.Input.Keyboard.KeyCodes.SPACE, false, () => {
      if (this.mode !== 'name') {
        this.confirmFocus();
      }
    });
    add(Phaser.Input.Keyboard.KeyCodes.ESC, false, () => this.back());
    add(Phaser.Input.Keyboard.KeyCodes.H, false, () => this.toggleHelp());
    keyboard.on('keydown-TAB', (event: KeyboardEvent) => {
      event.preventDefault();
      if (this.mode !== 'name') {
        this.moveFocus(event.shiftKey ? -1 : 1);
      }
    });
    keyboard.on('keydown', (event: KeyboardEvent) => this.onNameKey(event));
  }

  private moveFocus(delta: number): void {
    if (this.mode === 'name' || this.mode === 'help') {
      return;
    }
    this.menu.move(delta);
    this.refresh();
  }

  private onLeftRight(delta: number): void {
    if (this.mode === 'name' || this.mode === 'help') {
      return;
    }
    if (this.mode === 'hub') {
      this.nudgeShop(delta);
      return;
    }
    if (this.menu.cycle(delta)) {
      this.refresh();
    }
  }

  private confirmFocus(): void {
    if (this.mode === 'help') {
      this.leaveHelp();
      return;
    }
    if (this.mode === 'name') {
      this.confirmName();
      return;
    }
    this.handleResult(this.menu.confirm());
  }

  private onNameKey(event: KeyboardEvent): void {
    if (this.mode !== 'name') {
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      this.nameDraft = this.nameDraft.slice(0, -1);
      this.status = '';
      this.refresh();
      return;
    }
    const letter = event.key.length === 1 ? event.key.toUpperCase() : '';
    if (letter < 'A' || letter > 'Z' || this.nameDraft.length >= PLAYER_NAME_LENGTH) {
      return;
    }
    event.preventDefault();
    this.nameDraft += letter;
    this.status = '';
    this.refresh();
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
      this.confirmName();
      return;
    }
    this.handleHub(result.id);
  }

  private pickSlot(index: number): void {
    activateSlot(index);
    const save = loadSave().slots[index];
    const career = loadCareer().slots[index];
    if (save === null || career === null) {
      this.mode = 'name';
      this.nameDraft = '';
      this.buildNameMenu();
      this.rebuildOverlay();
      this.refresh();
      this.layout();
      return;
    }
    this.enterHub();
  }

  private confirmName(): void {
    const name = this.nameDraft;
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
      this.status = carUnlockHint(carId, planet, cleared.length) ?? 'LOCKED';
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

  private toggleHelp(): void {
    if (this.mode === 'help') {
      this.leaveHelp();
      return;
    }
    if (this.mode === 'hub') {
      this.enterHelp();
    }
  }

  private enterHelp(): void {
    this.mode = 'help';
    this.status = '';
    this.rebuildOverlay();
    this.refresh();
    this.layout();
  }

  private leaveHelp(): void {
    if (this.mode !== 'help') {
      return;
    }
    this.mode = 'hub';
    this.rebuildOverlay();
    this.refresh();
    this.layout();
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
    if (this.mode === 'help') {
      this.leaveHelp();
      return;
    }
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
    this.menu = new MenuController([{ id: 'confirm', kind: MENU_KIND.ACTION, label: 'CONFIRM NAME' }]);
  }

  private buildHubMenu(): void {
    const career = loadActiveCareer();
    const preferred = career?.equippedCarId ? 'race' : 'buy';
    this.menu = new MenuController(
      HUB_FOCUS.map(id => ({
        id,
        kind: MENU_KIND.ACTION,
        label: id.toUpperCase(),
      })),
      { selectedIndex: Math.max(0, HUB_FOCUS.indexOf(preferred)) },
    );
  }

  private shopCars(): string[] {
    const career = loadActiveCareer();
    const planet = highestUnlockedPlanetIndex(loadWonTracks(), isTourModeOn());
    return [...shopCarIds(career?.ownedCarIds ?? [], planet, loadCleared().length)];
  }

  private slotLabel(index: number, save: ReturnType<typeof loadSave>): string {
    const slot = save.slots[index];
    const career = loadCareer().slots[index];
    const name = (slot?.name ?? 'EMPTY').padEnd(PLAYER_NAME_LENGTH);
    // padStart(10) matches `$9,999,999`, so $70,000 and $999,000 share a column
    // and the plate can size to the fat cash string before anyone is that rich.
    const cash = career !== null ? formatCash(career.cash).padStart(10) : ''.padStart(10);
    return `SLOT ${index + 1}  ·  ${name}   ${cash}`;
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
    if (this.mode === 'hub' || this.mode === 'help') {
      return;
    }
    this.overlayTexts = this.menu.views().map((view, index) => {
      const text = this.add.text(0, 0, view.text, this.overlayStyle()).setOrigin(0.5, 0.5);
      text.setInteractive({ useHandCursor: true });
      text.on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (this.mode === 'slots') {
          this.pickSlot(index);
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

    this.nameField.setVisible(this.mode === 'name');
    this.helpText.setVisible(this.mode === 'help');
    if (this.mode === 'slots') {
      this.titleText.setText('SELECT SAVE');
      this.hintText.setText(
        'Browse / navigate with mouse, arrows and tab\nEsc to get back, Enter to accept',
      );
    } else if (this.mode === 'name') {
      this.titleText.setText('TYPE YOUR NAME');
      this.nameField.setText(this.nameSlots());
      this.hintText.setText(
        'Type A-Z · Backspace to erase\nEsc to get back, Enter to accept',
      );
    } else if (this.mode === 'help') {
      this.titleText.setText('CONTROLS');
      this.helpText.setText(formatHelpBody());
      this.hintText.setText('Esc or Enter to get back');
    } else {
      this.titleText.setText(`${name || 'PILOT'}'S GARAGE`);
      this.moneyText.setText(formatCash(career?.cash ?? 0));
      const deal = cashInValue(career?.points ?? 0);
      this.pointsText.setText(
        deal.batches > 0 ? `${career?.points ?? 0}   CASH ×${deal.batches}` : `${career?.points ?? 0} PTS`,
      );
      this.worldText.setText(this.worldLine(career?.lastPlanetId));
      this.profileText.setText((name || '?').slice(0, 1));
      this.rankingText.setText(this.rankingBlock(name));
      const shop = this.shopCars();
      if (shop.length > 0 && this.shopIndex >= shop.length) {
        this.shopIndex = shop.length - 1;
      }
      const carId = this.previewCarId();
      const owned = career?.ownedCarIds.includes(carId) === true;
      const equipped = career?.equippedCarId === carId;
      const unlocked = this.carUnlocked(carId);
      const hint = this.unlockHint(carId);
      this.carNameText.setText(this.carName(carId));
      this.valueText.setColor(owned ? GO : unlocked ? GOLD : LOCKED);
      this.valueText.setText(
        owned
          ? equipped
            ? `OWNED  ·  EQUIPPED  ·  SELL ${formatCash(sellPrice(carId))}`
            : `OWNED  ·  SELL ${formatCash(sellPrice(carId))}`
          : unlocked
            ? `BUY FOR  ${formatCash(listPrice(carId))}`
            : hint ?? 'LOCKED',
      );
      this.btnBuy.setText(owned ? (equipped ? 'EQUIPPED' : 'EQUIP') : unlocked ? `BUY  ${formatCash(listPrice(carId))}` : 'LOCKED');
      this.btnSell.setText(owned ? `SELL  ${formatCash(sellPrice(carId))}` : 'SELL');
      this.btnRace.setText(career?.equippedCarId ? 'GO RACE' : 'BUY A CAR FIRST');
      this.paintArsenal(carId);
      this.paintSpecs(carId);
      this.paintPortrait(carId, owned || unlocked);
      this.hintText.setText(
        'Browse / navigate with mouse, arrows and tab\nEsc to get back, Enter to accept, H for controls',
      );
      this.paintFocus();
    }
    this.fitTitleBox();

    this.statusText.setText(this.status);
    this.menu.views().forEach((view, index) => {
      const text = this.overlayTexts[index];
      if (text === undefined) {
        return;
      }
      text.setColor(view.selected ? GOLD : IVORY);
      text.setText(view.text);
    });
    // #region agent log
    fetch('http://127.0.0.1:7512/ingest/167bd834-e3e4-48a0-a1f7-0d5c92aafb32',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dbc378'},body:JSON.stringify({sessionId:'dbc378',runId:'pre-fix',hypothesisId:'B',location:'GarageScene.ts:refresh',message:'overlay text widths after setText',data:{mode:this.mode,hint:this.hintText.text,rows:this.overlayTexts.map(t=>({text:t.text,width:t.width}))},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    this.paintMenuPlates(this.scale.width, this.scale.height);
    this.layoutHint(this.scale.width, this.scale.height);
  }

  private setHubVisible(hub: boolean): void {
    const nodes: Phaser.GameObjects.GameObject[] = [
      this.arsenalBox,
      this.moneyBox,
      this.moneyCaption,
      this.moneyText,
      this.pointsBox,
      this.pointsCaption,
      this.pointsText,
      this.worldBox,
      this.worldCaption,
      this.worldText,
      this.profileBox,
      this.profileText,
      this.rankingBox,
      this.rankingText,
      this.preview,
      this.portrait,
      this.specBox,
      this.specPerkText,
      ...this.specLabels,
      ...this.specTracks,
      ...this.specFills,
      ...this.specValues,
      this.arrowLeft,
      this.arrowRight,
      this.carNameText,
      this.valueText,
      this.btnSaveBox,
      this.btnSave,
      this.btnSellBox,
      this.btnSell,
      this.btnBuyBox,
      this.btnBuy,
      this.btnRaceBox,
      this.btnRace,
      this.namePlate,
      ...this.arsenalIcons,
      ...this.arsenalCounts,
      ...this.arsenalLabels,
    ];
    nodes.forEach(node => {
      (node as unknown as { setVisible: (value: boolean) => void }).setVisible(hub);
    });
  }

  private paintFocus(): void {
    const career = loadActiveCareer();
    const carId = this.previewCarId();
    const owned = career?.ownedCarIds.includes(carId) === true;
    const unlocked = this.carUnlocked(carId);
    const canRace = (career?.equippedCarId ?? '') !== '';
    const focus = this.menu.selectedId;
    this.paintAction(this.btnSaveBox, this.btnSave, focus === 'save', true);
    this.paintAction(this.btnSellBox, this.btnSell, focus === 'sell', owned);
    this.paintAction(this.btnBuyBox, this.btnBuy, focus === 'buy', owned || unlocked);
    this.paintAction(this.btnRaceBox, this.btnRace, focus === 'race', canRace, canRace);
    this.arrowLeft.setColor(IVORY);
    this.arrowRight.setColor(IVORY);
  }

  private paintAction(
    box: Phaser.GameObjects.Rectangle,
    text: Phaser.GameObjects.Text,
    selected: boolean,
    enabled: boolean,
    primary = false,
  ): void {
    const fill = selected ? PLAQUE_HOT : PLAQUE;
    const edge = selected ? 0xffd85c : PLAQUE_EDGE;
    box.setFillStyle(fill, enabled ? 0.9 : 0.5).setStrokeStyle(selected ? 3 : 2, edge, enabled ? 0.98 : 0.45);
    const color = !enabled ? MUTED : selected ? GOLD : primary ? GO : IVORY;
    text.setColor(color);
  }

  private unlockHint(carId: string): string | null {
    return carUnlockHint(
      carId,
      highestUnlockedPlanetIndex(loadWonTracks(), isTourModeOn()),
      loadCleared().length,
    );
  }

  private fitTitleBox(): void {
    const width = Math.max(220, this.titleText.width + 48);
    const height = Math.max(44, this.titleText.height + 20);
    this.titleBox.setSize(width, height);
  }

  private paintPortrait(carId: string, lit: boolean): void {
    const key = cartPortraitKey(carId);
    if (this.textures.exists(key)) {
      this.portrait.setTexture(key).setVisible(true).setAlpha(lit ? 1 : 0.45);
      this.preview.setVisible(false);
      return;
    }
    this.portrait.setVisible(false);
    if (this.textures.exists(carId)) {
      const sheet = findCarSheet(this.payload.manifest, carId);
      const cell = sheetCellSize(sheet, this.payload.manifest);
      this.preview
        .setTexture(carId, PREVIEW_FRAME)
        .setScale(PREVIEW_SCALE * (this.payload.manifest.frameWidth / cell.width))
        .setVisible(true)
        .setAlpha(lit ? 1 : 0.45);
    }
  }

  private paintSpecs(carId: string): void {
    let bars: readonly StatBar[] = [];
    try {
      bars = statBars(this.payload.manifest, carId);
      const sheet = findCarSheet(this.payload.manifest, carId);
      const perk = perkProfile(sheet.perk);
      this.specPerkText.setText(
        perk.displayName === 'None'
          ? sheet.archetype.toUpperCase()
          : `${perk.displayName.toUpperCase()}  ·  ${perk.description.toUpperCase()}`,
      );
    } catch {
      this.specPerkText.setText('');
    }
    bars.forEach((bar, index) => {
      this.specLabels[index]?.setText(bar.label);
      this.specValues[index]?.setText(this.specNumber(bar));
      const fill = this.specFills[index];
      const track = this.specTracks[index];
      if (fill === undefined || track === undefined) {
        return;
      }
      fill.setSize(Math.max(8, track.width * bar.fraction), track.height);
    });
  }

  private specNumber(bar: StatBar): string {
    if (bar.label === 'ARMOR') {
      return String(Math.round(bar.value * 100));
    }
    return String(Math.round(bar.value));
  }

  private paintArsenal(carId: string): void {
    try {
      const sheet = findCarSheet(this.payload.manifest, carId);
      const missiles = missileCapacity(sheet.stats, perkProfile(sheet.perk));
      const counts = [missiles, MINE_START_COUNT, OIL_START_COUNT, TURBO_START_COUNT];
      this.arsenalCounts.forEach((text, index) => text.setText(`×${counts[index] ?? 0}`));
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
      lines.push(`${marker}${String(index + 1).padStart(2)} ${row.name.padEnd(10)} ${String(row.points).padStart(4)}`);
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
    const floorY = height * 0.48;
    this.titleText.setPosition(width / 2, height * 0.075);
    this.fitTitleBox();
    this.titleBox.setPosition(width / 2, height * 0.075);

    const arsenalY = height * 0.165;
    this.arsenalBox.setPosition(width / 2, arsenalY).setSize(Math.min(560, width * 0.56), 76);
    this.arsenalIcons.forEach((icon, index) => {
      const x = width / 2 - 210 + index * 140;
      icon.setPosition(x - 28, arsenalY - 6);
      this.arsenalCounts[index]?.setPosition(x - 8, arsenalY - 6);
      this.arsenalLabels[index]?.setPosition(x, arsenalY + 22);
    });

    this.placeStat(this.moneyBox, this.moneyCaption, this.moneyText, left, height * 0.28);
    this.placeStat(this.pointsBox, this.pointsCaption, this.pointsText, left, height * 0.4);
    this.placeStat(this.worldBox, this.worldCaption, this.worldText, left, height * 0.52);
    this.worldText.setWordWrapWidth(210);

    this.profileBox.setPosition(right, height * 0.2);
    this.profileText.setPosition(right, height * 0.2);

    const specW = Math.min(280, width * 0.26);
    const specH = height * 0.42;
    const specX = right;
    const specY = height * 0.48;
    this.specBox.setPosition(specX, specY).setSize(specW, specH);
    const specLeft = specX - specW / 2 + 16;
    const specTop = specY - specH / 2 + 18;
    const barW = specW - 110;
    STAT_BAR_FIELDS.forEach((_, index) => {
      const y = specTop + 14 + index * 26;
      this.specLabels[index]?.setPosition(specLeft, y);
      this.specTracks[index]?.setPosition(specLeft + 58, y).setSize(barW, 10);
      this.specFills[index]?.setPosition(specLeft + 58, y);
      this.specValues[index]?.setPosition(specLeft + 62 + barW, y);
    });
    this.specPerkText.setPosition(specX, specY + specH / 2 - 36).setWordWrapWidth(specW - 20);

    const portraitSize = Math.min(CART_PORTRAIT_SIZE, height * 0.34, width * 0.28);
    const portraitFit = containSize(
      { width: this.portrait.frame.width, height: this.portrait.frame.height },
      { width: portraitSize, height: portraitSize },
    );
    this.portrait.setPosition(width / 2, floorY).setDisplaySize(portraitFit.width, portraitFit.height);
    this.preview.setPosition(width / 2, floorY);
    this.arrowLeft.setPosition(width * 0.34, floorY);
    this.arrowRight.setPosition(width * 0.66, floorY);
    this.carNameText.setPosition(width / 2, height * 0.68);
    this.valueText.setPosition(width / 2, height * 0.725);

    const gap = Math.min(18, width * 0.014);
    const saveW = 180;
    const sellW = 210;
    const buyW = 250;
    const raceW = Math.max(230, Math.ceil(this.btnRace.width) + 40);
    const btnH = 58;
    const raceH = 64;
    const barY = height - 18 - raceH / 2;
    const total = saveW + sellW + buyW + raceW + gap * 3;
    let x = width / 2 - total / 2;
    this.placeAction(this.btnSaveBox, this.btnSave, x + saveW / 2, barY, saveW, btnH);
    x += saveW + gap;
    this.placeAction(this.btnSellBox, this.btnSell, x + sellW / 2, barY, sellW, btnH);
    x += sellW + gap;
    this.placeAction(this.btnBuyBox, this.btnBuy, x + buyW / 2, barY, buyW, btnH);
    x += buyW + gap;
    this.placeAction(this.btnRaceBox, this.btnRace, x + raceW / 2, barY, raceW, raceH);

    const specBottom = specY + specH / 2;
    const rankBottom = barY - raceH / 2 - 14;
    const rankTop = specBottom + 10;
    const rankH = Math.max(72, rankBottom - rankTop);
    const rankY = rankTop + rankH / 2;
    this.rankingBox.setPosition(right, rankY).setSize(specW, rankH);
    this.rankingText.setPosition(right, rankTop + 8);
    // #region agent log
    {
      const raceLeft = this.btnRaceBox.x - raceW / 2;
      const raceRight = this.btnRaceBox.x + raceW / 2;
      const raceTop = barY - raceH / 2;
      const raceBottom = barY + raceH / 2;
      const rankLeft = right - specW / 2;
      const rankRight = right + specW / 2;
      const overlap =
        raceRight > rankLeft && raceLeft < rankRight && raceBottom > rankTop && raceTop < rankBottom;
      fetch('http://127.0.0.1:7512/ingest/167bd834-e3e4-48a0-a1f7-0d5c92aafb32',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dbc378'},body:JSON.stringify({sessionId:'dbc378',runId:'post-fix',hypothesisId:'H',location:'GarageScene.ts:layout',message:'race button vs ranking',data:{mode:this.mode,overlap,race:{left:raceLeft,right:raceRight,top:raceTop,bottom:raceBottom},rank:{left:rankLeft,right:rankRight,top:rankTop,bottom:rankBottom}},timestamp:Date.now()})}).catch(()=>{});
    }
    // #endregion
    this.statusText.setPosition(width / 2, height * 0.775);
    this.nameField.setPosition(width / 2, height * 0.44);
    this.helpText.setPosition(width / 2, height * 0.2);
    this.layoutHint(width, height);

    this.overlayTexts.forEach((text, index) => {
      const y = this.mode === 'name' ? height * 0.58 : height * (0.42 + index * 0.09);
      text.setPosition(width / 2, y);
    });
    this.paintMenuPlates(width, height);
    if (this.mode === 'hub') {
      this.paintSpecs(this.previewCarId());
    }
  }

  private placeStat(
    box: Phaser.GameObjects.Rectangle,
    caption: Phaser.GameObjects.Text,
    value: Phaser.GameObjects.Text,
    x: number,
    y: number,
  ): void {
    box.setPosition(x, y).setSize(240, 76);
    caption.setPosition(x, y - 16);
    value.setPosition(x, y + 10);
  }

  private placeAction(
    box: Phaser.GameObjects.Rectangle,
    text: Phaser.GameObjects.Text,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    box.setPosition(x, y).setSize(width, height);
    text.setPosition(x, y);
  }

  private paintMenuPlates(width: number, height: number): void {
    if (this.mode === 'hub') {
      this.menuPlate.clear();
      paintRoundedPlaque(this.namePlate, {
        x: width / 2,
        y: height * 0.702,
        width: Math.min(560, width * 0.46),
        height: 78,
        radius: 14,
        alpha: 0.72,
      });
      return;
    }
    this.namePlate.clear();
    if (this.mode === 'help') {
      paintRoundedPlaque(this.menuPlate, {
        x: width / 2,
        y: height * 0.52,
        width: Math.min(720, width * 0.62),
        height: height * 0.64,
        radius: 18,
        alpha: 0.72,
      });
      return;
    }
    if (this.mode === 'name') {
      const confirm = this.overlayTexts[0];
      const top = this.nameField.y - this.nameField.height / 2;
      const bottom = confirm !== undefined ? confirm.y + confirm.height / 2 : this.nameField.y + this.nameField.height / 2;
      const plateH = Math.max(height * 0.28, bottom - top + 56);
      const plateW = Math.min(width * 0.72, Math.max(this.nameField.width, confirm?.width ?? 0) + 80);
      paintRoundedPlaque(this.menuPlate, {
        x: width / 2,
        y: (top + bottom) / 2,
        width: plateW,
        height: plateH,
        radius: 18,
        alpha: 0.72,
      });
      return;
    }
    const count = Math.max(1, this.overlayTexts.length);
    const maxTextW = this.overlayTexts.reduce((widest, text) => Math.max(widest, text.width), 0);
    const first = this.overlayTexts[0];
    const last = this.overlayTexts[count - 1];
    const rowsTop = first !== undefined ? first.y - first.height / 2 : height * 0.42;
    const rowsBottom = last !== undefined ? last.y + last.height / 2 : height * 0.6;
    const plateW = Math.min(width * 0.92, Math.max(maxTextW + 80, 520));
    const plateH = Math.max(count * height * 0.09 + 48, rowsBottom - rowsTop + 48);
    const plateY = (rowsTop + rowsBottom) / 2;
    // #region agent log
    fetch('http://127.0.0.1:7512/ingest/167bd834-e3e4-48a0-a1f7-0d5c92aafb32',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dbc378'},body:JSON.stringify({sessionId:'dbc378',runId:'pre-fix',hypothesisId:'A',location:'GarageScene.ts:paintMenuPlates',message:'slot plate vs longest label',data:{mode:this.mode,viewW:width,plateW,maxTextW,overflow:maxTextW>plateW-48,hint:this.hintText.text},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    paintRoundedPlaque(this.menuPlate, {
      x: width / 2,
      y: plateY,
      width: plateW,
      height: plateH,
      radius: 18,
      alpha: 0.72,
    });
  }

  /** Pins the footer hint to the canvas bottom so two lines cannot leak off-screen. */
  private layoutHint(width: number, height: number): void {
    const boxW = Math.min(width * 0.94, Math.max(Math.ceil(this.hintText.width) + 40, 280));
    const boxH = Math.max(48, Math.ceil(this.hintText.height) + 18);
    if (this.mode === 'hub') {
      this.hintPlate.setVisible(false);
      this.hintText.setPosition(width / 2, height * 0.805);
      return;
    }
    const y = height - 14 - boxH / 2;
    this.hintPlate.setVisible(true).setPosition(width / 2, y).setSize(boxW, boxH);
    this.hintText.setPosition(width / 2, y);
    // #region agent log
    fetch('http://127.0.0.1:7512/ingest/167bd834-e3e4-48a0-a1f7-0d5c92aafb32',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dbc378'},body:JSON.stringify({sessionId:'dbc378',runId:'post-fix',hypothesisId:'F',location:'GarageScene.ts:layoutHint',message:'hint vs canvas bottom',data:{mode:this.mode,viewH:height,hintH:this.hintText.height,hintW:this.hintText.width,boxW,boxH,hintBottom:y+boxH/2,leaks:y+boxH/2>height-4},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  private titleStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '28px', color: IVORY, stroke: '#05060a', strokeThickness: 7 };
  }

  private statStyle(color: string): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '22px', color, stroke: '#05060a', strokeThickness: 5 };
  }

  private worldStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '14px', color: IVORY, stroke: '#05060a', strokeThickness: 4 };
  }

  private captionStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '14px', color: MUTED, stroke: '#05060a', strokeThickness: 4 };
  }

  private arsenalCountStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '22px', color: IVORY, stroke: '#05060a', strokeThickness: 5 };
  }

  private specLabelStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '15px', color: GOLD, stroke: '#05060a', strokeThickness: 4 };
  }

  private specValueStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '15px', color: IVORY, stroke: '#05060a', strokeThickness: 4 };
  }

  private profileStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '44px', color: GOLD, stroke: '#05060a', strokeThickness: 7 };
  }

  private rankStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: IVORY,
      align: 'left',
      stroke: '#05060a',
      strokeThickness: 4,
    };
  }

  private carTitleStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '26px', color: IVORY, stroke: '#05060a', strokeThickness: 7 };
  }

  private arrowStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '42px', color: IVORY, stroke: '#1a0e05', strokeThickness: 6 };
  }

  private nameSlots(): string {
    const chars = this.nameDraft.padEnd(PLAYER_NAME_LENGTH, '_').split('');
    return chars.join('   ');
  }

  private nameFieldStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '52px', color: GOLD, stroke: '#05060a', strokeThickness: 9 };
  }

  private overlayStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '28px', color: IVORY, stroke: '#05060a', strokeThickness: 7 };
  }

  private buttonStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '22px', color: IVORY, stroke: '#05060a', strokeThickness: 6 };
  }

  private raceButtonStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '24px', color: GO, stroke: '#05060a', strokeThickness: 6 };
  }

  private helpStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: IVORY,
      align: 'left',
      stroke: '#05060a',
      strokeThickness: 4,
      lineSpacing: 5,
    };
  }

  private hintStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: MUTED,
      align: 'center',
      stroke: '#05060a',
      strokeThickness: 4,
      lineSpacing: 6,
    };
  }

  private statusStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '18px', color: GOLD, stroke: '#05060a', strokeThickness: 5 };
  }
}

function activeSlotSafe(): number {
  return loadCareer().activeSlotIndex;
}
