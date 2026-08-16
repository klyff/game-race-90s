import Phaser from 'phaser';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { computeRaceScore } from '../domain/race/RaceScore.ts';
import { creditWallet, recordProgress } from '../adapters/progress/ProgressStore.ts';
import { campaignSlotForTrackId, nextCampaignTrack } from '../data/tracks/campaign.ts';
import type { CampaignTrack } from '../data/tracks/campaign.ts';
import {
  EMPTY_WEAPON_HITS,
  formatCash,
  podiumPrize,
  weaponHitEarnings,
  type WeaponHits,
} from '../domain/progress/Wallet.ts';
import { SCENE_KEY } from './sceneKeys.ts';

/** One row of the final classification. */
export interface ResultsEntry {
  readonly position: number;
  readonly carId: string;
  readonly name: string;
  readonly isPlayer: boolean;
}

/** Everything the results screen needs, assembled by `RaceScene` when the player finishes. */
export interface ResultsSceneData {
  readonly manifest: CarSetManifest;
  /** Every track's offline lines, threaded through so a rematch/next race can start. */
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
  /** Target time for the whole race (par lap × laps), if the track has generated lines. */
  readonly parSeconds?: number;
  /** Player weapon hits landed on rivals this race, for the hit bounty. */
  readonly weaponHits?: WeaponHits;
}

/** Top-3 of five advances (owner rule, RNRR style). */
export const ADVANCE_POSITION = 3;

/**
 * The post-race classification: winner, the player's place, time vs par and a 0..100
 * score. It records the result into the save (default slot) on create and offers a
 * rematch or a trip back to the title.
 *
 * It draws against the viewport (not artwork), so a plain dark panel keeps the text
 * readable at any window size.
 */
export class ResultsScene extends Phaser.Scene {
  private payload!: ResultsSceneData;
  private score = 0;
  private advanced = false;
  private prize = 0;
  private hitBonus = 0;
  private balance = 0;
  /** The next campaign track, offered when the player advanced. */
  private next: CampaignTrack | null = null;

  private backdrop!: Phaser.GameObjects.Rectangle;
  private headerText!: Phaser.GameObjects.Text;
  private trackText!: Phaser.GameObjects.Text;
  private standingsText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private purseText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEY.RESULTS);
  }

  init(data: ResultsSceneData): void {
    this.payload = data;
    this.score = computeRaceScore({
      position: data.playerPosition,
      totalRacers: data.totalRacers,
      finishSeconds: data.finishSeconds,
      parSeconds: data.parSeconds,
    });
    this.advanced = data.playerPosition <= ADVANCE_POSITION;
    // Only offer the next track when the player actually advanced (top-3) and one exists.
    this.next = this.advanced ? nextCampaignTrack(data.trackId) : null;

    const slot = campaignSlotForTrackId(data.trackId);
    const planetIndex = slot?.planetIndex ?? 1;
    const trackN = slot?.trackN ?? 1;
    this.prize = podiumPrize(data.playerPosition, planetIndex, trackN);
    this.hitBonus = weaponHitEarnings(data.weaponHits ?? EMPTY_WEAPON_HITS, planetIndex);
  }

  create(): void {
    // Persist the outcome. lapSeconds is the average lap so the stored best-lap is honest.
    recordProgress({
      trackId: this.payload.trackId,
      carId: this.payload.carId,
      position: this.payload.playerPosition,
      lapSeconds: this.payload.finishSeconds / Math.max(1, this.payload.laps),
      nowMillis: Date.now(),
    });
    this.balance = creditWallet(this.prize + this.hitBonus);

    this.backdrop = this.add.rectangle(0, 0, 10, 10, 0x05060a, 0.86).setOrigin(0, 0);
    this.headerText = this.add.text(0, 0, this.headerLine(), this.headerStyle()).setOrigin(0.5, 0.5);
    this.trackText = this.add.text(0, 0, this.trackLine(), this.subStyle()).setOrigin(0.5, 0.5);
    this.standingsText = this.add
      .text(0, 0, this.standingsBlock(), this.listStyle())
      .setOrigin(0.5, 0);
    this.scoreText = this.add.text(0, 0, this.scoreLine(), this.scoreStyle()).setOrigin(0.5, 0.5);
    this.purseText = this.add.text(0, 0, this.purseLine(), this.purseStyle()).setOrigin(0.5, 0.5);
    this.promptText = this.add.text(0, 0, this.promptLine(), this.promptStyle()).setOrigin(0.5, 0.5);

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
    this.bindKeys();
  }

  private headerLine(): string {
    return this.payload.playerPosition === 1
      ? 'YOU WIN'
      : `FINISHED ${ordinal(this.payload.playerPosition)}`;
  }

  private trackLine(): string {
    const time = `${this.payload.finishSeconds.toFixed(2)}s`;
    const par =
      this.payload.parSeconds !== undefined ? ` (par ${this.payload.parSeconds.toFixed(2)}s)` : '';
    return `${this.payload.trackName.toUpperCase()}  -  ${time}${par}`;
  }

  private standingsBlock(): string {
    return this.payload.standings
      .map(entry => {
        const marker = entry.isPlayer ? '>' : ' ';
        return `${marker} ${entry.position}. ${entry.name.toUpperCase()}`;
      })
      .join('\n');
  }

  private scoreLine(): string {
    const advance = this.advanced ? 'ADVANCES' : 'ELIMINATED';
    return `SCORE ${this.score}/100   -   ${advance}`;
  }

  private purseLine(): string {
    const parts: string[] = [];
    if (this.prize > 0) {
      parts.push(`${ordinal(this.payload.playerPosition)} ${formatCash(this.prize)}`);
    }
    if (this.hitBonus > 0) {
      parts.push(`HITS ${formatCash(this.hitBonus)}`);
    }
    const earned = parts.length > 0 ? `${parts.join('  +  ')}   →   ` : '';
    return `${earned}BANK ${formatCash(this.balance)}`;
  }

  private promptLine(): string {
    const next = this.next !== null ? `ENTER: NEXT (${this.next.name.toUpperCase()})     ` : '';
    return `SPACE: RACE AGAIN     ${next}ESC: MAIN MENU`;
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null || keyboard === undefined) {
      return;
    }
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => this.raceAgain());
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).on('down', () => this.advanceOrRepeat());
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.mainMenu());
  }

  /** Enter takes the next track when the player advanced, otherwise a rematch. */
  private advanceOrRepeat(): void {
    if (this.next !== null) {
      this.startRace(this.next.id);
      return;
    }
    this.raceAgain();
  }

  private raceAgain(): void {
    this.startRace(this.payload.trackId);
  }

  private startRace(trackId: string): void {
    this.scene.start(SCENE_KEY.RACE, {
      manifest: this.payload.manifest,
      linesByTrack: this.payload.linesByTrack,
      carId: this.payload.carId,
      trackId,
    });
  }

  private mainMenu(): void {
    this.scene.start(SCENE_KEY.SPLASH, {
      manifest: this.payload.manifest,
      linesByTrack: this.payload.linesByTrack,
    });
  }

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const centreX = width / 2;

    this.backdrop.setSize(width, height);
    this.headerText.setPosition(centreX, height * 0.16);
    this.trackText.setPosition(centreX, height * 0.27);
    this.standingsText.setPosition(centreX, height * 0.36);
    this.scoreText.setPosition(centreX, height * 0.72);
    this.purseText.setPosition(centreX, height * 0.8);
    this.promptText.setPosition(centreX, height * 0.91);
  }

  private headerStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: this.payload.playerPosition === 1 ? '#ffd85c' : '#e6e8ef',
      stroke: '#1a0e05',
      strokeThickness: 8,
    };
  }

  private subStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#d8dae2',
      stroke: '#101014',
      strokeThickness: 4,
    };
  }

  private listStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffffff',
      align: 'left',
      stroke: '#101014',
      strokeThickness: 4,
    };
  }

  private purseStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: this.prize + this.hitBonus > 0 ? '#8bff9b' : '#d8dae2',
      stroke: '#101014',
      strokeThickness: 5,
    };
  }

  private scoreStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: this.advanced ? '#8bff9b' : '#ff8b8b',
      stroke: '#101014',
      strokeThickness: 5,
    };
  }

  private promptStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#1a0e05',
      strokeThickness: 5,
    };
  }
}

function ordinal(position: number): string {
  const suffixes = ['TH', 'ST', 'ND', 'RD'];
  const value = position % 100;
  const suffix = suffixes[(value - 20) % 10] ?? suffixes[value] ?? suffixes[0];
  return `${position}${suffix}`;
}
