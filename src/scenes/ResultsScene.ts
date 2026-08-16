import Phaser from 'phaser';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { creditWallet, loadActiveCareer, loadPoints, recordProgress } from '../adapters/progress/ProgressStore.ts';
import { campaignSlotForTrackId } from '../data/tracks/campaign.ts';
import { planetForTrackId } from '../data/tracks/planets.ts';
import { themeForPlanetId } from '../data/tracks/planetThemes.ts';
import { TitleAudio } from '../adapters/audio/TitleAudio.ts';
import { playGuitarSolo } from '../adapters/audio/GuitarSolo.ts';
import { coverRect } from '../adapters/render/SplashLayout.ts';
import {
  EMPTY_WEAPON_HITS,
  formatCash,
  podiumPrize,
  weaponHitEarnings,
  type WeaponHits,
} from '../domain/progress/Wallet.ts';
import { podiumPoints, weaponHitPoints } from '../domain/progress/SeasonPoints.ts';
import { SCENE_KEY } from './sceneKeys.ts';

export interface ResultsEntry {
  readonly position: number;
  readonly carId: string;
  readonly name: string;
  readonly isPlayer: boolean;
}

export interface ResultsSceneData {
  readonly manifest: CarSetManifest;
  readonly linesByTrack: Record<string, TrackLinesManifest>;
  readonly trackLines?: TrackLinesManifest;
  readonly carId: string;
  readonly trackId: string;
  readonly trackName: string;
  readonly laps: number;
  readonly standings: readonly ResultsEntry[];
  readonly playerPosition: number;
  readonly totalRacers: number;
  readonly finishSeconds: number;
  readonly parSeconds?: number;
  readonly weaponHits?: WeaponHits;
  readonly playerName?: string;
  readonly sittingRivals?: readonly string[];
  readonly rivalSeason?: readonly { readonly name: string; readonly points: number }[];
}

export const ADVANCE_POSITION = 3;

export class ResultsScene extends Phaser.Scene {
  private payload!: ResultsSceneData;
  private prize = 0;
  private hitBonus = 0;
  private racePoints = 0;
  private balance = 0;
  private leaving = false;
  private audio!: TitleAudio;

  private art!: Phaser.GameObjects.Image;
  private dim!: Phaser.GameObjects.Rectangle;
  private headerText!: Phaser.GameObjects.Text;
  private winnerText!: Phaser.GameObjects.Text;
  private podiumText!: Phaser.GameObjects.Text;
  private rankingText!: Phaser.GameObjects.Text;
  private purseText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private podiumSprites: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super(SCENE_KEY.RESULTS);
  }

  init(data: ResultsSceneData): void {
    this.payload = data;
    this.leaving = false;
    const slot = campaignSlotForTrackId(data.trackId);
    const planetIndex = slot?.planetIndex ?? 1;
    const trackN = slot?.trackN ?? 1;
    this.prize = podiumPrize(data.playerPosition, planetIndex, trackN);
    this.hitBonus = weaponHitEarnings(data.weaponHits ?? EMPTY_WEAPON_HITS, planetIndex);
    this.racePoints =
      podiumPoints(data.playerPosition, planetIndex, trackN) +
      weaponHitPoints(data.weaponHits ?? EMPTY_WEAPON_HITS, planetIndex);
  }

  create(): void {
    const slot = campaignSlotForTrackId(this.payload.trackId);
    const planetIndex = slot?.planetIndex ?? 1;
    const trackN = slot?.trackN ?? 1;
    const rivalResults = this.payload.standings
      .filter(entry => !entry.isPlayer)
      .map(entry => ({
        name: entry.name,
        points: podiumPoints(entry.position, planetIndex, trackN),
      }));

    recordProgress({
      trackId: this.payload.trackId,
      carId: this.payload.carId,
      position: this.payload.playerPosition,
      lapSeconds: this.payload.finishSeconds / Math.max(1, this.payload.laps),
      nowMillis: Date.now(),
      playerPoints: this.racePoints,
      rivalResults,
    });
    this.balance = creditWallet(this.prize + this.hitBonus);

    this.art = this.add.image(0, 0, '').setOrigin(0, 0).setVisible(false);
    this.dim = this.add.rectangle(0, 0, 10, 10, 0x05060a, 0.62).setOrigin(0, 0);
    this.applyPlanetArt();

    this.headerText = this.add.text(0, 0, 'WINNER IS', this.headerStyle()).setOrigin(0.5, 0.5);
    this.winnerText = this.add.text(0, 0, this.winnerName(), this.winnerStyle()).setOrigin(0.5, 0.5);
    this.podiumText = this.add.text(0, 0, this.podiumBlock(), this.listStyle()).setOrigin(0.5, 0);
    this.rankingText = this.add.text(0, 0, this.rankingBlock(), this.rankStyle()).setOrigin(0.5, 0);
    this.purseText = this.add.text(0, 0, this.purseLine(), this.purseStyle()).setOrigin(0.5, 0.5);
    this.promptText = this.add
      .text(0, 0, 'SPACE  ENTER  ESC  ·  GARAGE', this.promptStyle())
      .setOrigin(0.5, 0.5);

    this.podiumSprites = this.payload.standings
      .filter(entry => entry.position <= 3)
      .sort((a, b) => a.position - b.position)
      .map(entry => this.add.sprite(0, 0, entry.carId, 0).setScale(2.2));

    this.audio = new TitleAudio();
    this.audio.start();
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
    this.bindKeys();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.audio.destroy());
  }

  private winnerName(): string {
    const winner = this.payload.standings.find(entry => entry.position === 1);
    return (winner?.name ?? '???').toUpperCase();
  }

  private podiumBlock(): string {
    return this.payload.standings
      .filter(entry => entry.position <= 3)
      .map(entry => {
        const marker = entry.isPlayer ? '>' : ' ';
        return `${marker} ${entry.position}. ${entry.name.toUpperCase()}`;
      })
      .join('\n');
  }

  private rankingBlock(): string {
    const slot = campaignSlotForTrackId(this.payload.trackId);
    const planetIndex = slot?.planetIndex ?? 1;
    const trackN = slot?.trackN ?? 1;
    const playerName = this.payload.playerName ?? 'YOU';
    const racePts = new Map<string, number>();
    for (const entry of this.payload.standings) {
      racePts.set(
        entry.name,
        entry.isPlayer ? this.racePoints : podiumPoints(entry.position, planetIndex, trackN),
      );
    }
    for (const name of this.payload.sittingRivals ?? []) {
      if (!racePts.has(name)) {
        racePts.set(name, 0);
      }
    }

    const career = loadActiveCareer();
    const totals = new Map<string, number>();
    if (career !== null) {
      career.rivalNames.forEach((name, index) => {
        totals.set(name, career.rivalPoints[index] ?? 0);
      });
      totals.set(playerName, career.points);
    }
    for (const [name, points] of racePts) {
      if (!totals.has(name)) {
        totals.set(name, points);
      }
    }

    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const lines = ['RANKING    RACE  TOT       $'];
    ranked.forEach(([name, total], index) => {
      const marker = name === playerName ? '>' : ' ';
      const race = racePts.get(name) ?? 0;
      const cash = name === playerName ? formatCash(this.prize + this.hitBonus) : '—';
      lines.push(
        `${marker}${String(index + 1).padStart(2)} ${name.padEnd(8)} ${String(race).padStart(4)} ${String(total).padStart(4)} ${cash.padStart(8)}`,
      );
    });
    return lines.join('\n');
  }

  private purseLine(): string {
    const parts: string[] = [];
    if (this.prize > 0) {
      parts.push(`${formatCash(this.prize)}`);
    }
    if (this.hitBonus > 0) {
      parts.push(`HITS ${formatCash(this.hitBonus)}`);
    }
    parts.push(`PTS +${this.racePoints}`);
    return `${parts.join('  +  ')}   BANK ${formatCash(this.balance)}   TOTAL PTS ${loadPoints()}`;
  }

  private applyPlanetArt(): void {
    const planet = planetForTrackId(this.payload.trackId);
    if (planet === undefined) {
      return;
    }
    const theme = themeForPlanetId(planet.id);
    if (!this.textures.exists(theme.artKey)) {
      return;
    }
    this.art.setTexture(theme.artKey).setVisible(true);
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null || keyboard === undefined) {
      return;
    }
    const leave = (): void => this.leaveToGarage();
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', leave);
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).on('down', leave);
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', leave);
  }

  private leaveToGarage(): void {
    if (this.leaving) {
      return;
    }
    this.leaving = true;
    this.audio.destroy();
    const wait = playGuitarSolo();
    this.time.delayedCall(Math.max(0, wait) * 1000, () => {
      this.scene.start(SCENE_KEY.GARAGE, {
        manifest: this.payload.manifest,
        linesByTrack: this.payload.linesByTrack,
      });
    });
  }

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    if (this.art.visible) {
      const rect = coverRect({ width, height }, { width: this.art.width, height: this.art.height });
      this.art.setPosition(rect.x, rect.y).setDisplaySize(rect.width, rect.height);
    }
    this.dim.setSize(width, height);
    this.headerText.setPosition(width / 2, height * 0.08);
    this.winnerText.setPosition(width / 2, height * 0.16);
    this.podiumSprites.forEach((sprite, index) => {
      sprite.setPosition(width * (0.35 + index * 0.15), height * 0.32);
    });
    this.podiumText.setPosition(width / 2, height * 0.4);
    this.rankingText.setPosition(width / 2, height * 0.52);
    this.purseText.setPosition(width / 2, height * 0.88);
    this.promptText.setPosition(width / 2, height * 0.94);
  }

  private headerStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '28px', color: '#ffe066', stroke: '#1a0e05', strokeThickness: 7 };
  }

  private winnerStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '44px', color: '#ffd85c', stroke: '#3a0d05', strokeThickness: 8 };
  }

  private listStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', align: 'left', stroke: '#101014', strokeThickness: 4 };
  }

  private rankStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '16px', color: '#d8dae2', align: 'left', stroke: '#101014', strokeThickness: 4 };
  }

  private purseStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '16px', color: '#8bff9b', stroke: '#101014', strokeThickness: 4 };
  }

  private promptStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', stroke: '#1a0e05', strokeThickness: 4 };
  }
}
