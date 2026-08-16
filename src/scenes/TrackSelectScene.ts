import Phaser from 'phaser';
import { findPlanet } from '../data/tracks/planets.ts';
import { planetTracks, isTrackUnlocked } from '../data/tracks/campaign.ts';
import type { CampaignTrack } from '../data/tracks/campaign.ts';
import { loadCleared, loadWonTracks } from '../adapters/progress/ProgressStore.ts';
import type { TrackSelectData } from './selectData.ts';
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
  private selectedIndex = 0;

  private backdrop!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
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
    this.selectedIndex = 0;
  }

  create(): void {
    const planet = findPlanet(this.payload.planetId);
    this.backdrop = this.add.rectangle(0, 0, 10, 10, 0x05060a, 0.92).setOrigin(0, 0);
    this.titleText = this.add
      .text(0, 0, planet.displayName.toUpperCase(), this.titleStyle())
      .setOrigin(0.5, 0.5);
    this.rows = this.tracks.map(() => this.add.text(0, 0, '', this.rowStyle()).setOrigin(0.5, 0.5));
    this.promptText = this.add
      .text(0, 0, '↑↓ MOVE     ENTER RACE     ESC BACK', this.promptStyle())
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
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP).on('down', () => this.move(-1));
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN).on('down', () => this.move(1));
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).on('down', () => this.choose());
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => this.choose());
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.back());
  }

  private move(direction: number): void {
    const count = this.tracks.length;
    this.selectedIndex = (this.selectedIndex + direction + count) % count;
    this.refresh();
  }

  private choose(): void {
    const track = this.tracks[this.selectedIndex];
    if (track === undefined || !this.unlocked(track)) {
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
    return isTrackUnlocked(track.planet, track.n, this.cleared, this.won);
  }

  private refresh(): void {
    this.tracks.forEach((track, index) => {
      const row = this.rows[index];
      if (row === undefined) {
        return;
      }
      const unlocked = this.unlocked(track);
      const selected = index === this.selectedIndex;
      const marker = selected ? '>' : ' ';
      const status = this.won.includes(track.id)
        ? '  ★ WON'
        : this.cleared.includes(track.id)
          ? '  ✓ CLEARED'
          : unlocked
            ? ''
            : '  [LOCKED]';
      row.setText(`${marker} ${track.name.toUpperCase()}${status}`);
      row.setColor(unlocked ? (selected ? '#ffd85c' : '#d8dae2') : '#6a6f7a');
    });
  }

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const centreX = width / 2;

    this.backdrop.setSize(width, height);
    this.titleText.setPosition(centreX, height * 0.22);
    this.rows.forEach((row, index) => {
      row.setPosition(centreX, height * (0.42 + index * 0.1));
    });
    this.promptText.setPosition(centreX, height * 0.86);
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
