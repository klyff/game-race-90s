import Phaser from 'phaser';
import { findPlanet } from '../data/tracks/planets.ts';
import { planetTracks, isTrackUnlocked } from '../data/tracks/campaign.ts';
import type { CampaignTrack } from '../data/tracks/campaign.ts';
import { isTourModeOn } from '../adapters/progress/TourMode.ts';
import {
  chargeTrackRetry,
  loadActiveCareer,
  loadActiveName,
  loadCleared,
  loadWallet,
  loadWonTracks,
} from '../adapters/progress/ProgressStore.ts';
import { firstPlacePrize, formatCash } from '../domain/progress/Wallet.ts';
import {
  RETRY_FEE_KIND,
  retryFeeMark,
  retryLevy,
  retryWarningLine,
  trackLossCount,
} from '../domain/progress/TrackRetryFee.ts';
import { paintRoundedPlaque, PLAQUE_INK } from '../adapters/render/UiPlaque.ts';
import { bindMenuKeys } from '../adapters/input/bindMenuKeys.ts';
import { MENU_KIND, MENU_PROMPT_LIST, MenuController } from '../adapters/input/MenuController.ts';
import type { MenuResult } from '../adapters/input/MenuController.ts';
import type { TrackSelectData } from './selectData.ts';
import { attachMenuAudio } from '../adapters/audio/MenuAudio.ts';
import { SCENE_KEY } from './sceneKeys.ts';

/**
 * Pick one of a planet's three tracks. Track 1 is always open; a later track
 * unlocks once the previous one is cleared (top-3, owner rule). Enter starts the
 * race on the chosen circuit; Esc returns to the planet select.
 */
export class TrackSelectScene extends Phaser.Scene {
  private payload!: TrackSelectData;
  private tracks: readonly CampaignTrack[] = [];
  private cleared: readonly string[] = [];
  private won: readonly string[] = [];
  private menu!: MenuController;

  private backdrop!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private walletText!: Phaser.GameObjects.Text;
  private warnPlate!: Phaser.GameObjects.Graphics;
  private warnText!: Phaser.GameObjects.Text;
  private rows: Phaser.GameObjects.Text[] = [];
  private promptText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEY.TRACK_SELECT);
  }

  init(data: TrackSelectData): void {
    this.payload = data;
    this.tracks = planetTracks(findPlanet(data.planetId));
    this.cleared = loadCleared();
    this.won = loadWonTracks();
    const remembered = this.tracks.findIndex(track => track.id === data.lastTrackId);
    this.menu = new MenuController(
      this.tracks.map(track => ({
        id: track.id,
        kind: MENU_KIND.ACTION,
        label: track.name,
      })),
      { selectedIndex: remembered >= 0 ? remembered : 0 },
    );
  }

  create(): void {
    const planet = findPlanet(this.payload.planetId);
    this.backdrop = this.add.rectangle(0, 0, 10, 10, 0x05060a, 0.92).setOrigin(0, 0);
    this.titleText = this.add
      .text(0, 0, planet.displayName.toUpperCase(), this.titleStyle())
      .setOrigin(0.5, 0.5);
    this.walletText = this.add
      .text(0, 0, `BANK ${formatCash(loadWallet())}`, this.walletStyle())
      .setOrigin(0.5, 0.5);
    this.warnPlate = this.add.graphics();
    this.warnText = this.add.text(0, 0, '', this.warnStyle()).setOrigin(0.5, 0.5);
    this.rows = this.tracks.map(() => this.add.text(0, 0, '', this.rowStyle()).setOrigin(0.5, 0.5));
    this.promptText = this.add
      .text(0, 0, MENU_PROMPT_LIST, this.promptStyle())
      .setOrigin(0.5, 0.5);

    this.refresh();
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
    this.bindKeys();
    attachMenuAudio(this);
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null || keyboard === undefined) {
      return;
    }
    bindMenuKeys(keyboard, this.menu, {
      onResult: result => this.handleResult(result),
      onMoved: () => {
        this.refresh();
        this.layout();
      },
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
    const track = this.tracks[this.menu.selectedIndex];
    if (track === undefined || !this.unlocked(track)) {
      return;
    }
    const charged = chargeTrackRetry(track.id, this.payload.carId);
    if (charged.kind === RETRY_FEE_KIND.GAME_OVER) {
      this.scene.start(SCENE_KEY.GAME_OVER, {
        manifest: this.payload.manifest,
        linesByTrack: this.payload.linesByTrack,
        playerName: loadActiveName(),
      });
      return;
    }
    this.scene.start(SCENE_KEY.RACE, {
      manifest: this.payload.manifest,
      linesByTrack: this.payload.linesByTrack,
      carId: this.payload.carId,
      trackId: track.id,
    });
  }

  private back(): void {
    this.scene.start(SCENE_KEY.PLANET_SELECT, {
      manifest: this.payload.manifest,
      linesByTrack: this.payload.linesByTrack,
      carId: this.payload.carId,
    });
  }

  private unlocked(track: CampaignTrack): boolean {
    return isTrackUnlocked(track.planet, track.n, this.cleared, this.won, isTourModeOn());
  }

  private refresh(): void {
    const career = loadActiveCareer();
    const cash = career?.cash ?? loadWallet();
    const points = career?.points ?? 0;
    const carId = this.payload.carId;
    const tour = isTourModeOn();
    this.walletText.setText(
      cash <= 0 ? `BANK ${formatCash(0)}  ·  RESPECT ${points}` : `BANK ${formatCash(cash)}`,
    );
    this.tracks.forEach((track, index) => {
      const row = this.rows[index];
      if (row === undefined) {
        return;
      }
      const unlocked = this.unlocked(track);
      const selected = index === this.menu.selectedIndex;
      const marker = selected ? '>' : ' ';
      const losses = tour ? 0 : trackLossCount(career?.trackLosses ?? {}, track.id);
      const status = this.won.includes(track.id)
        ? '  ★ WON'
        : this.cleared.includes(track.id)
          ? '  ✓ CLEARED'
          : unlocked
            ? ''
            : '  [LOCKED]';
      const feeMark = tour ? '' : retryFeeMark(losses, cash, points, carId);
      const purse = formatCash(firstPlacePrize(track.planet.index, track.n));
      row.setText(`${marker} ${track.name.toUpperCase()}  ${purse}${status}${feeMark}`);
      row.setColor(unlocked ? (selected ? '#ffd85c' : '#d8dae2') : '#6a6f7a');
    });
    this.refreshWarning(career?.trackLosses ?? {}, cash, points, carId, tour);
  }

  private refreshWarning(
    losses: Readonly<Record<string, number>>,
    cash: number,
    points: number,
    carId: string,
    tour: boolean,
  ): void {
    const track = this.tracks[this.menu.selectedIndex];
    const count = track === undefined || tour ? 0 : trackLossCount(losses, track.id);
    const line = tour ? null : retryWarningLine(count, cash, points, carId);
    const levy = retryLevy(count, cash, points, carId);
    this.warnText.setText(line ?? '').setVisible(line !== null);
    this.warnText.setColor(levy.kind === RETRY_FEE_KIND.GAME_OVER ? '#ff8080' : '#ffd085');
    this.warnPlate.setVisible(line !== null);
  }

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const centreX = width / 2;

    this.backdrop.setSize(width, height);
    this.titleText.setPosition(centreX, height * 0.16);
    this.walletText.setPosition(centreX, height * 0.24);
    const warnY = height * 0.325;
    this.warnText.setPosition(centreX, warnY);
    if (this.warnText.visible) {
      const plateW = Math.min(width * 0.82, Math.max(420, this.warnText.width + 48));
      const critical = this.warnText.text.includes('GAME OVER');
      paintRoundedPlaque(this.warnPlate, {
        x: centreX,
        y: warnY,
        width: plateW,
        height: Math.max(44, this.warnText.height + 20),
        fill: PLAQUE_INK,
        alpha: 0.72,
        edge: critical ? 0xff4a4a : 0xffb14a,
      });
    } else {
      this.warnPlate.clear();
    }
    this.rows.forEach((row, index) => {
      row.setPosition(centreX, height * (0.44 + index * 0.1));
    });
    this.promptText.setPosition(centreX, height * 0.88);
  }

  private titleStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '40px',
      color: '#ffd85c',
      stroke: '#1a0e05',
      strokeThickness: 8,
    };
  }

  private walletStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#8bff9b',
      stroke: '#101014',
      strokeThickness: 4,
    };
  }

  private warnStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffd085',
      stroke: '#1a0e05',
      strokeThickness: 5,
    };
  }

  private rowStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '24px',
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
