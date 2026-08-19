import Phaser from 'phaser';
import { findCarSheet } from '../data/cars/CarManifest.ts';
import { PLANETS } from '../data/tracks/planets.ts';
import { themeForPlanetId, PLANET_THEMES } from '../data/tracks/planetThemes.ts';
import { isPlanetUnlocked } from '../data/tracks/campaign.ts';
import { isTourModeOn } from '../adapters/progress/TourMode.ts';
import { loadActiveCareer, loadWallet, loadWonTracks } from '../adapters/progress/ProgressStore.ts';
import { formatCash } from '../domain/progress/Wallet.ts';
import { coverRect } from '../adapters/render/SplashLayout.ts';
import { bindMenuKeys } from '../adapters/input/bindMenuKeys.ts';
import { MENU_KIND, MENU_PROMPT_LIST, MenuController } from '../adapters/input/MenuController.ts';
import type { MenuResult } from '../adapters/input/MenuController.ts';
import type { PlanetSelectData } from './selectData.ts';
import { PLANET_ART_DIRECTORY, SCENE_KEY } from './sceneKeys.ts';

/**
 * Pick a planet. Ten worlds, each with a FEATURED car and three tracks. A planet
 * is locked until the previous planet's last track is won (owner rule), and a
 * locked row cannot be entered — unless tour mode is on (`?tour=1` or TOUR on
 * the splash). Enter opens the track select; Esc goes back to the garage.
 *
 * Drawn against the viewport with a plain dark backdrop so it reads at any size.
 */
export class PlanetSelectScene extends Phaser.Scene {
  private payload!: PlanetSelectData;
  private wonTracks: readonly string[] = [];
  private menu!: MenuController;

  private backdrop!: Phaser.GameObjects.Rectangle;
  private art!: Phaser.GameObjects.Image;
  private dim!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private walletText!: Phaser.GameObjects.Text;
  private rows: Phaser.GameObjects.Text[] = [];
  private promptText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEY.PLANET_SELECT);
  }

  init(data: PlanetSelectData): void {
    this.payload = data;
    this.wonTracks = loadWonTracks();
    // Tour starts at planet 1 so a terrain walk begins at the top. Otherwise
    // land on the last unlocked planet, where a returning player left off.
    const lastUnlocked = isTourModeOn()
      ? 0
      : PLANETS.reduce(
          (acc, planet, index) => (isPlanetUnlocked(planet, this.wonTracks) ? index : acc),
          0,
        );
    const remembered = PLANETS.findIndex(planet => planet.id === data.lastPlanetId);
    this.menu = new MenuController(
      PLANETS.map(planet => ({
        id: planet.id,
        kind: MENU_KIND.ACTION,
        label: planet.displayName,
      })),
      { selectedIndex: remembered >= 0 ? remembered : lastUnlocked },
    );
  }

  preload(): void {
    for (const theme of PLANET_THEMES) {
      if (!this.textures.exists(theme.artKey)) {
        this.load.image(theme.artKey, `${PLANET_ART_DIRECTORY}/${theme.artFile}`);
      }
    }
  }

  create(): void {
    this.backdrop = this.add.rectangle(0, 0, 10, 10, 0x05060a, 1).setOrigin(0, 0);
    this.art = this.add.image(0, 0, '').setOrigin(0, 0).setVisible(false);
    this.dim = this.add.rectangle(0, 0, 10, 10, 0x05060a, 0.55).setOrigin(0, 0);
    this.titleText = this.add
      .text(0, 0, isTourModeOn() ? 'SELECT PLANET  ·  TOUR' : 'SELECT PLANET', this.titleStyle())
      .setOrigin(0.5, 0.5);
    this.walletText = this.add
      .text(0, 0, `BANK ${formatCash(loadWallet())}`, this.walletStyle())
      .setOrigin(0.5, 0.5);
    this.rows = PLANETS.map(() => this.add.text(0, 0, '', this.rowStyle()).setOrigin(0.5, 0.5));
    this.promptText = this.add
      .text(0, 0, MENU_PROMPT_LIST, this.promptStyle())
      .setOrigin(0.5, 0.5);

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
    bindMenuKeys(keyboard, this.menu, {
      onResult: result => this.handleResult(result),
      onMoved: () => this.refresh(),
    });
  }

  private handleResult(result: MenuResult): void {
    if (result.type === 'activate') {
      this.choose();
      return;
    }
    if (result.type === 'back') {
      this.back();
    }
  }

  private choose(): void {
    const planet = PLANETS[this.menu.selectedIndex];
    if (planet === undefined || !isPlanetUnlocked(planet, this.wonTracks, isTourModeOn())) {
      return;
    }
    this.scene.start(SCENE_KEY.TRACK_SELECT, {
      manifest: this.payload.manifest,
      linesByTrack: this.payload.linesByTrack,
      carId: this.payload.carId,
      planetId: planet.id,
      lastTrackId: this.payload.lastPlanetId === planet.id ? loadActiveCareer()?.lastTrackId : undefined,
    });
  }

  private back(): void {
    this.scene.start(SCENE_KEY.GARAGE, {
      manifest: this.payload.manifest,
      linesByTrack: this.payload.linesByTrack,
    });
  }

  private refresh(): void {
    this.applyArt();
    PLANETS.forEach((planet, index) => {
      const row = this.rows[index];
      if (row === undefined) {
        return;
      }
      const unlocked = isPlanetUnlocked(planet, this.wonTracks, isTourModeOn());
      const featured = this.carName(planet.bestCarId);
      const selected = index === this.menu.selectedIndex;
      const marker = selected ? '>' : ' ';
      const lock = unlocked ? '' : '  [LOCKED]';
      row.setText(`${marker} ${planet.index}. ${planet.displayName.toUpperCase()}  ·  ${featured}${lock}`);
      row.setColor(this.rowColour(unlocked, selected));
    });
  }

  private rowColour(unlocked: boolean, selected: boolean): string {
    if (!unlocked) {
      return '#6a6f7a';
    }
    return selected ? '#ffd85c' : '#d8dae2';
  }

  private applyArt(): void {
    const planet = PLANETS[this.menu.selectedIndex];
    if (planet === undefined) {
      return;
    }
    const theme = themeForPlanetId(planet.id);
    if (!this.textures.exists(theme.artKey)) {
      this.art.setVisible(false);
      this.backdrop.setFillStyle(theme.ground, 1);
      return;
    }
    this.art.setTexture(theme.artKey).setVisible(true);
    this.layoutArt();
  }

  private layoutArt(): void {
    if (!this.art.visible) {
      return;
    }
    const viewport = { width: this.scale.width, height: this.scale.height };
    const image = { width: this.art.width, height: this.art.height };
    const rect = coverRect(viewport, image);
    this.art.setPosition(rect.x, rect.y).setDisplaySize(rect.width, rect.height);
  }

  private carName(carId: string): string {
    try {
      return findCarSheet(this.payload.manifest, carId).displayName.toUpperCase();
    } catch {
      return carId.toUpperCase();
    }
  }

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const centreX = width / 2;

    this.backdrop.setSize(width, height);
    this.dim.setSize(width, height);
    this.layoutArt();
    this.titleText.setPosition(centreX, height * 0.08);
    this.walletText.setPosition(centreX, height * 0.145);
    this.rows.forEach((row, index) => {
      row.setPosition(centreX, height * (0.22 + index * 0.06));
    });
    this.promptText.setPosition(centreX, height * 0.92);
  }

  private titleStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '40px',
      color: '#ffffff',
      stroke: '#1a0e05',
      strokeThickness: 8,
    };
  }

  private walletStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#8bff9b',
      stroke: '#101014',
      strokeThickness: 4,
    };
  }

  private rowStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#d8dae2',
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
