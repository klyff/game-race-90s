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
  prizeTable,
  weaponHitEarnings,
  type WeaponHits,
} from '../domain/progress/Wallet.ts';
import { bindMenuKeys } from '../adapters/input/bindMenuKeys.ts';
import { MENU_KIND, MENU_PROMPT_LIST, MenuController } from '../adapters/input/MenuController.ts';
import type { MenuItemSpec, MenuResult } from '../adapters/input/MenuController.ts';
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
  private menu!: MenuController;

  private backdrop!: Phaser.GameObjects.Rectangle;
  private headerText!: Phaser.GameObjects.Text;
  private winnerText!: Phaser.GameObjects.Text;
  private trackText!: Phaser.GameObjects.Text;
  private standingsText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private purseText!: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
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

    this.backdrop = this.add.rectangle(0, 0, 10, 10, 0x05060a, 0.88).setOrigin(0, 0);
    this.headerText = this.add
      .text(0, 0, 'WINNER IS', this.headerStyle())
      .setOrigin(0.5, 0.5)
      .setScale(2.6)
      .setAlpha(0);
    this.winnerText = this.add
      .text(0, 0, this.winnerName(), this.winnerStyle())
      .setOrigin(0.5, 0.5)
      .setAlpha(0);
    this.trackText = this.add.text(0, 0, this.trackLine(), this.subStyle()).setOrigin(0.5, 0.5);
    this.standingsText = this.add
      .text(0, 0, this.standingsBlock(), this.listStyle())
      .setOrigin(0.5, 0);
    this.scoreText = this.add.text(0, 0, this.scoreLine(), this.scoreStyle()).setOrigin(0.5, 0.5);
    this.purseText = this.add.text(0, 0, this.purseLine(), this.purseStyle()).setOrigin(0.5, 0.5);
    this.menu = new MenuController(this.menuItems());
    this.optionTexts = this.menu.views().map(view =>
      this.add.text(0, 0, view.text, this.optionStyle()).setOrigin(0.5, 0.5),
    );
    this.promptText = this.add.text(0, 0, MENU_PROMPT_LIST, this.promptStyle()).setOrigin(0.5, 0.5);

    this.layout();
    this.playCeremony();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
    this.bindKeys();
    this.refreshMenu();
  }

  private winnerName(): string {
    const winner = this.payload.standings.find(entry => entry.position === 1);
    return (winner?.name ?? '???').toUpperCase();
  }

  /** 90s cabinet snap-in: the line slams on, the name blinks, then the podium settles. */
  private playCeremony(): void {
    this.tweens.add({
      targets: this.headerText,
      alpha: 1,
      scale: 1,
      duration: 280,
      ease: Phaser.Math.Easing.Back.Out,
    });
    this.time.delayedCall(320, () => {
      this.winnerText.setAlpha(1);
      this.tweens.add({
        targets: this.winnerText,
        alpha: { from: 1, to: 0.15 },
        duration: 90,
        yoyo: true,
        repeat: 5,
      });
    });
  }

  private trackLine(): string {
    const time = `${this.payload.finishSeconds.toFixed(2)}s`;
    const par =
      this.payload.parSeconds !== undefined ? ` (par ${this.payload.parSeconds.toFixed(2)}s)` : '';
    return `${this.payload.trackName.toUpperCase()}  -  ${time}${par}`;
  }

  private standingsBlock(): string {
    const slot = campaignSlotForTrackId(this.payload.trackId);
    const planetIndex = slot?.planetIndex ?? 1;
    const trackN = slot?.trackN ?? 1;
    const purses = prizeTable(planetIndex, trackN);
    const purseFor = (position: number): number => {
      if (position === 1) return purses.first;
      if (position === 2) return purses.second;
      if (position === 3) return purses.third;
      return 0;
    };
    return this.payload.standings
      .filter(entry => entry.position <= 3)
      .map(entry => {
        const marker = entry.isPlayer ? '>' : ' ';
        const score = computeRaceScore({
          position: entry.position,
          totalRacers: this.payload.totalRacers,
          finishSeconds: this.payload.finishSeconds,
          parSeconds: this.payload.parSeconds,
        });
        const prize = formatCash(purseFor(entry.position));
        return `${marker} ${entry.position}. ${entry.name.toUpperCase()}   ${prize}   ${score}`;
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

  private menuItems(): readonly MenuItemSpec[] {
    const items: MenuItemSpec[] = [
      { id: 'again', kind: MENU_KIND.ACTION, label: 'RACE AGAIN' },
    ];
    if (this.next !== null) {
      items.push({
        id: 'next',
        kind: MENU_KIND.ACTION,
        label: `NEXT : ${this.next.name.toUpperCase()}`,
      });
    }
    items.push({ id: 'menu', kind: MENU_KIND.ACTION, label: 'MAIN MENU' });
    return items;
  }

  private refreshMenu(): void {
    this.menu.views().forEach((view, index) => {
      const text = this.optionTexts[index];
      if (text === undefined) {
        return;
      }
      text.setColor(view.selected ? '#ffd85c' : '#d8dae2');
      text.setText(view.text);
    });
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null || keyboard === undefined) {
      return;
    }
    bindMenuKeys(keyboard, this.menu, {
      onResult: result => this.handleResult(result),
      onMoved: () => this.refreshMenu(),
    });
  }

  private handleResult(result: MenuResult): void {
    if (result.type === 'activate') {
      if (result.id === 'again') {
        this.raceAgain();
        return;
      }
      if (result.id === 'next' && this.next !== null) {
        this.startRace(this.next.id);
        return;
      }
      if (result.id === 'menu') {
        this.mainMenu();
      }
      return;
    }
    if (result.type === 'back') {
      this.mainMenu();
    }
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
    this.headerText.setPosition(centreX, height * 0.14);
    this.winnerText.setPosition(centreX, height * 0.24);
    this.trackText.setPosition(centreX, height * 0.34);
    this.standingsText.setPosition(centreX, height * 0.42);
    this.scoreText.setPosition(centreX, height * 0.68);
    this.purseText.setPosition(centreX, height * 0.74);
    this.optionTexts.forEach((text, index) => {
      text.setPosition(centreX, height * (0.8 + index * 0.045));
    });
    this.promptText.setPosition(centreX, height * 0.94);
  }

  private headerStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '36px',
      color: '#ffe066',
      stroke: '#1a0e05',
      strokeThickness: 8,
    };
  }

  private winnerStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '56px',
      color: '#ffd85c',
      stroke: '#3a0d05',
      strokeThickness: 10,
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

  private optionStyle(): Phaser.Types.GameObjects.Text.TextStyle {
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
