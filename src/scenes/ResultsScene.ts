import Phaser from 'phaser';
import { findCarSheet, type CarSetManifest } from '../data/cars/CarManifest.ts';
import {
  driverBodyKey,
  driverBodyUrl,
  driverVictoryKey,
  driverVictoryUrl,
} from '../data/cards/DriverBodies.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import {
  creditWallet,
  loadActiveCareer,
  loadPoints,
  loadCleared,
  loadTrackLossCount,
  loadWonTracks,
  recordProgress,
} from '../adapters/progress/ProgressStore.ts';
import { retryPayoutLines } from '../domain/progress/TrackRetryFee.ts';
import { campaignSlotForTrackId } from '../data/tracks/campaign.ts';
import { pickPubBackground, PUB_BACKGROUNDS, pubBackgroundKey, pubBackgroundUrl } from '../data/ui/PubBackgrounds.ts';
import { worldPassForFinish } from '../data/ui/WorldPassBackgrounds.ts';
import { attachMenuAudio } from '../adapters/audio/MenuAudio.ts';
import { TitleAudio } from '../adapters/audio/TitleAudio.ts';
import { formatRaceTime, positionOrdinal } from '../adapters/render/HudFormat.ts';
import { paintRoundedPlaque, PLAQUE_INK } from '../adapters/render/UiPlaque.ts';
import { containSize } from '../adapters/render/FitBox.ts';
import {
  PODIUM_BODY_GAP,
  PODIUM_BODY_SCALE,
  podiumBodyXs,
  podiumFootY,
  podiumNameY,
  winnerFootY,
} from '../adapters/render/PodiumLayout.ts';
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
  /** Preview / debug: skip wallet and career writes. */
  readonly preview?: boolean;
}

export const ADVANCE_POSITION = 3;
const WINNER_BODY = 320;
const OTHER_BODY = 230;
const PLAQUE_EDGE = 0xf4e6c4;
const PLAQUE_GOLD = 0xffd85c;
const GOLD = '#ffd85c';
const IVORY = '#f4f0e4';
const FIRST_BLUE = '#4da3ff';
const LAST_RED = '#ff4a4a';
const RANK_LINE = 21;

interface PodiumStack {
  readonly entry: ResultsEntry;
  readonly pose: Phaser.GameObjects.Image;
  readonly poseLetter: Phaser.GameObjects.Text;
  readonly name: Phaser.GameObjects.Text;
}

interface RankRow {
  readonly name: string;
  readonly race: number;
  readonly total: number;
  readonly isPlayer: boolean;
}

export class ResultsScene extends Phaser.Scene {
  private payload!: ResultsSceneData;
  private prize = 0;
  private hitBonus = 0;
  private racePoints = 0;
  private balance = 0;
  private retryLines: readonly string[] = [];
  private leaving = false;
  private wonBefore: readonly string[] = [];
  private clearedBefore: readonly string[] = [];
  private audio!: TitleAudio;
  private rankRows: RankRow[] = [];

  private art!: Phaser.GameObjects.Image;
  private dim!: Phaser.GameObjects.Rectangle;
  private floorDim!: Phaser.GameObjects.Rectangle;
  private titleBox!: Phaser.GameObjects.Graphics;
  private youBox!: Phaser.GameObjects.Graphics;
  private rankingBox!: Phaser.GameObjects.Graphics;
  private payoutBox!: Phaser.GameObjects.Graphics;
  private promptBox!: Phaser.GameObjects.Graphics;
  private playerMark!: Phaser.GameObjects.Rectangle;
  private headerText!: Phaser.GameObjects.Text;
  private winnerText!: Phaser.GameObjects.Text;
  private winnerCarText!: Phaser.GameObjects.Text;
  private youTag!: Phaser.GameObjects.Text;
  private youName!: Phaser.GameObjects.Text;
  private rankingHeader!: Phaser.GameObjects.Text;
  private rankingHeaderRight!: Phaser.GameObjects.Text;
  private rankLineTexts: Phaser.GameObjects.Text[] = [];
  private payoutText!: Phaser.GameObjects.Text;
  private payoutBankText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private podium: PodiumStack[] = [];

  constructor() {
    super(SCENE_KEY.RESULTS);
  }

  init(data: ResultsSceneData): void {
    this.payload = data;
    this.leaving = false;
    this.wonBefore = loadWonTracks();
    this.clearedBefore = loadCleared();
    const slot = campaignSlotForTrackId(data.trackId);
    const planetIndex = slot?.planetIndex ?? 1;
    const trackN = slot?.trackN ?? 1;
    this.prize = podiumPrize(data.playerPosition, planetIndex, trackN);
    this.hitBonus = weaponHitEarnings(data.weaponHits ?? EMPTY_WEAPON_HITS, planetIndex);
    this.racePoints =
      podiumPoints(data.playerPosition, planetIndex, trackN) +
      weaponHitPoints(data.weaponHits ?? EMPTY_WEAPON_HITS, planetIndex);
  }

  preload(): void {
    for (const pub of PUB_BACKGROUNDS) {
      const key = pubBackgroundKey(pub);
      if (!this.textures.exists(key)) {
        this.load.image(key, pubBackgroundUrl(pub));
      }
    }
    const names = new Set(
      this.payload.standings.filter(entry => entry.position <= 3).map(entry => entry.name),
    );
    for (const name of names) {
      this.queueBody(name, 'victory');
      this.queueBody(name, 'profile');
    }
  }

  private queueBody(name: string, pose: 'victory' | 'profile'): void {
    const key = pose === 'victory' ? driverVictoryKey(name) : driverBodyKey(name);
    const url = pose === 'victory' ? driverVictoryUrl(name) : driverBodyUrl(name);
    if (!this.textures.exists(key)) {
      this.load.image(key, url);
    }
  }

  private poseKey(name: string, preferVictory: boolean): string {
    const victory = driverVictoryKey(name);
    const profile = driverBodyKey(name);
    if (preferVictory && this.textures.exists(victory)) {
      return victory;
    }
    if (this.textures.exists(profile)) {
      return profile;
    }
    return this.textures.exists(victory) ? victory : '';
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

    if (this.payload.preview !== true) {
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
    }
    this.retryLines = retryPayoutLines(
      loadTrackLossCount(this.payload.trackId),
      this.balance,
      loadPoints(),
      this.payload.carId,
    );
    this.rankRows = this.buildRankRows();

    this.art = this.add.image(0, 0, '').setOrigin(0, 0).setVisible(false).setDepth(0);
    this.dim = this.add.rectangle(0, 0, 10, 10, 0x05060a, 0.28).setOrigin(0, 0).setDepth(1);
    this.floorDim = this.add.rectangle(0, 0, 10, 10, 0x05060a, 0.42).setOrigin(0, 1).setDepth(1);
    this.applyPubArt();

    this.titleBox = this.add.graphics().setDepth(2);
    this.youBox = this.add.graphics().setDepth(2);
    this.rankingBox = this.add.graphics().setDepth(2);
    this.payoutBox = this.add.graphics().setDepth(2);
    this.promptBox = this.add.graphics().setDepth(2);
    this.playerMark = this.add
      .rectangle(0, 0, 10, RANK_LINE, 0x3a2a14, 0.9)
      .setStrokeStyle(1, PLAQUE_GOLD, 0.7)
      .setOrigin(0.5, 0.5)
      .setDepth(3)
      .setVisible(false);

    this.headerText = this.add.text(0, 0, 'WINNER IS', this.headerStyle()).setOrigin(0.5, 0.5).setDepth(4);
    this.winnerText = this.add.text(0, 0, this.winnerName(), this.winnerStyle()).setOrigin(0.5, 0.5).setDepth(4);
    const carLabel = this.winnerCarName();
    this.winnerCarText = this.add
      .text(0, 0, carLabel, this.winnerCarStyle())
      .setOrigin(0.5, 0.5)
      .setVisible(carLabel !== '')
      .setDepth(4);
    this.youTag = this.add.text(0, 0, 'YOU', this.youTagStyle()).setOrigin(0.5, 0.5).setDepth(4);
    this.youName = this.add.text(0, 0, this.playerCallsign(), this.youNameStyle()).setOrigin(0.5, 0.5).setDepth(4);
    this.rankingHeader = this.add
      .text(0, 0, ' # NAME   RACE TOT', this.rankStyle())
      .setOrigin(0, 0)
      .setDepth(4);
    this.rankingHeaderRight = this.add
      .text(0, 0, ' # NAME   RACE TOT', this.rankStyle())
      .setOrigin(0, 0)
      .setDepth(4);
    this.rankLineTexts = Array.from({ length: 10 }, () =>
      this.add.text(0, 0, '', this.rankStyle()).setOrigin(0, 0).setDepth(4),
    );
    this.payoutText = this.add.text(0, 0, this.payoutRaceBlock(), this.payoutStyle()).setOrigin(0, 0).setDepth(4);
    this.payoutBankText = this.add.text(0, 0, this.payoutBankBlock(), this.payoutStyle()).setOrigin(0, 0).setDepth(4);
    this.promptText = this.add
      .text(0, 0, 'SPACE / ENTER   ·   GARAGE', this.promptStyle())
      .setOrigin(0.5, 0.5)
      .setDepth(4);

    this.podium = this.payload.standings
      .filter(entry => entry.position <= 3)
      .sort((a, b) => a.position - b.position)
      .map(entry => this.makePodium(entry));

    this.audio = attachMenuAudio(this);
    this.layout();
    this.slamTitle();
    this.playWinnerPhoto();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
    this.bindKeys();
  }

  private paintPlate(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    edge = PLAQUE_EDGE,
  ): void {
    paintRoundedPlaque(graphics, {
      x,
      y,
      width,
      height,
      radius: 16,
      fill: PLAQUE_INK,
      alpha: 0.5,
      edge,
    });
  }

  private makePodium(entry: ResultsEntry): PodiumStack {
    const poseKey = this.poseKey(entry.name, entry.position === 1);
    const gold = entry.position === 1;
    const pose = this.add
      .image(0, 0, poseKey)
      .setOrigin(0.5, 1)
      .setVisible(poseKey !== '')
      .setDepth(gold ? 6 : 5);
    const poseLetter = this.add
      .text(0, 0, entry.name.slice(0, 1).toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: GOLD,
        stroke: '#1a0e05',
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0.5)
      .setVisible(!pose.visible)
      .setDepth(5);
    const name = this.add
      .text(0, 0, `${entry.position}. ${entry.name.toUpperCase()}`, {
        fontFamily: 'monospace',
        fontSize: gold ? '16px' : '14px',
        color: this.podiumNameColor(entry),
        stroke: '#101014',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(4);
    return { entry, pose, poseLetter, name };
  }

  private winnerName(): string {
    const winner = this.payload.standings.find(entry => entry.position === 1);
    return (winner?.name ?? '???').toUpperCase();
  }

  private winnerCarName(): string {
    const winner = this.payload.standings.find(entry => entry.position === 1);
    const carId = winner?.carId ?? this.payload.carId;
    try {
      return findCarSheet(this.payload.manifest, carId).displayName.toUpperCase();
    } catch {
      return '';
    }
  }

  private playerCallsign(): string {
    const name = this.payload.playerName?.trim();
    return name !== undefined && name.length > 0 ? name.toUpperCase() : 'YOU';
  }

  private buildRankRows(): RankRow[] {
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

    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, total]) => ({
        name,
        race: racePts.get(name) ?? 0,
        total,
        isPlayer: name === playerName,
      }));
  }

  private visibleRankRows(): RankRow[] {
    return this.rankRows.slice(0, 10);
  }

  private rankSplit(): number {
    const n = this.visibleRankRows().length;
    return Math.max(1, n - 3);
  }

  private formatRankLine(row: RankRow, index: number): string {
    const marker = row.isPlayer ? '>' : ' ';
    return `${marker}${String(index + 1).padStart(2)} ${row.name.padEnd(6)} ${String(row.race).padStart(4)} ${String(row.total).padStart(4)}`;
  }

  private racePlace(name: string): number | undefined {
    return this.payload.standings.find(entry => entry.name === name)?.position;
  }

  private podiumNameColor(entry: ResultsEntry): string {
    if (entry.position === 1) {
      return FIRST_BLUE;
    }
    if (this.payload.totalRacers > 1 && entry.position >= this.payload.totalRacers) {
      return LAST_RED;
    }
    return entry.isPlayer ? GOLD : IVORY;
  }

  private rankLineColor(row: RankRow): string {
    const place = this.racePlace(row.name);
    if (place === 1) {
      return FIRST_BLUE;
    }
    if (place !== undefined && this.payload.totalRacers > 1 && place >= this.payload.totalRacers) {
      return LAST_RED;
    }
    return IVORY;
  }

  private payoutRaceBlock(): string {
    const row = (label: string, value: string): string => `${label.padEnd(8)}${value.padStart(8)}`;
    const lines = [
      this.payload.trackName.toUpperCase(),
      `PLACE    ${positionOrdinal(this.payload.playerPosition).toUpperCase()}`,
    ];
    lines.push(row('TIME', formatRaceTime(this.payload.finishSeconds)));
    if (this.prize > 0) {
      lines.push(row('PRIZE', formatCash(this.prize)));
    }
    if (this.hitBonus > 0) {
      lines.push(row('HITS', formatCash(this.hitBonus)));
    }
    lines.push(row('PTS', `+${this.racePoints}`));
    return lines.join('\n');
  }

  private payoutBankBlock(): string {
    const row = (label: string, value: string): string => `${label.padEnd(8)}${value.padStart(8)}`;
    const lines = [row('BANK', formatCash(this.balance)), row('RESPECT', String(loadPoints()))];
    if (this.retryLines.length > 0) {
      lines.push('');
      lines.push(...this.retryLines);
    }
    return lines.join('\n');
  }

  private applyPubArt(): void {
    const loaded = PUB_BACKGROUNDS.filter(pub => this.textures.exists(pubBackgroundKey(pub)));
    const picked = pickPubBackground(loaded);
    if (picked === undefined) {
      return;
    }
    this.art.setTexture(pubBackgroundKey(picked)).setVisible(true);
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
    const pass = worldPassForFinish(
      this.payload.trackId,
      this.payload.playerPosition,
      this.wonBefore,
      this.clearedBefore,
    );
    if (pass !== undefined) {
      this.scene.start(SCENE_KEY.WORLD_PASS, {
        manifest: this.payload.manifest,
        linesByTrack: this.payload.linesByTrack,
        passId: pass.id,
        playerName: this.playerCallsign(),
      });
      return;
    }
    this.scene.start(SCENE_KEY.GARAGE, {
      manifest: this.payload.manifest,
      linesByTrack: this.payload.linesByTrack,
    });
  }

  private slamTitle(): void {
    this.tweens.add({
      targets: [this.headerText, this.winnerText, this.winnerCarText],
      scale: { from: 1.18, to: 1 },
      duration: 260,
      ease: 'Back.easeOut',
    });
  }

  private playWinnerPhoto(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const winner = this.payload.standings.find(entry => entry.position === 1);
    const cover = this.add.rectangle(0, 0, width, height, 0x05060a, 1).setOrigin(0, 0).setDepth(30);
    const label = this.add
      .text(width / 2, height * 0.1, '1ST PLACE', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: GOLD,
        stroke: '#101014',
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(31);
    const name = this.add
      .text(width / 2, height * 0.16, winner?.name ?? this.winnerName(), {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: IVORY,
        stroke: '#101014',
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(31);
    const extras: Phaser.GameObjects.GameObject[] = [];
    const carLabel = this.winnerCarName();
    if (carLabel !== '') {
      extras.push(
        this.add
          .text(width / 2, height * 0.22, carLabel, {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: GOLD,
            stroke: '#101014',
            strokeThickness: 4,
          })
          .setOrigin(0.5, 0.5)
          .setDepth(31),
      );
    }
    const poseKey = winner !== undefined ? this.poseKey(winner.name, true) : '';
    if (poseKey !== '') {
      const pose = this.add.image(width / 2, height * 0.52, poseKey).setOrigin(0.5, 0.5).setDepth(31);
      const fit = containSize(
        { width: pose.frame.width, height: pose.frame.height },
        { width: width * 0.5, height: height * 0.58 },
      );
      pose.setDisplaySize(fit.width, fit.height);
      extras.push(pose);
    }
    const shot = [cover, label, name, ...extras];
    this.tweens.add({
      targets: shot,
      alpha: 0,
      delay: 1500,
      duration: 280,
      onComplete: () => {
        for (const node of shot) {
          node.destroy();
        }
      },
    });
  }

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const artRect = this.art.visible
      ? coverRect({ width, height }, { width: this.art.width, height: this.art.height })
      : undefined;
    if (artRect !== undefined) {
      this.art.setPosition(artRect.x, artRect.y).setDisplaySize(artRect.width, artRect.height);
    }
    this.dim.setSize(width, height);
    this.floorDim.setPosition(0, height).setSize(width, height * 0.28);

    const titleY = height * 0.08;
    const showCar = this.winnerCarText.visible;
    this.paintPlate(this.titleBox, width / 2, titleY, Math.min(560, width * 0.62), showCar ? 96 : 78, PLAQUE_GOLD);
    this.headerText.setPosition(width / 2, titleY - (showCar ? 26 : 18));
    this.winnerText.setPosition(width / 2, titleY + (showCar ? 2 : 16));
    this.winnerCarText.setPosition(width / 2, titleY + 28);

    const youW = Math.min(200, width * 0.22);
    const youX = width * 0.08 + youW / 2;
    this.paintPlate(this.youBox, youX, titleY, youW, 64, PLAQUE_GOLD);
    this.youTag.setPosition(youX, titleY - 14);
    this.youName.setPosition(youX, titleY + 14);

    const board = this.placeBottomBoards(width, height);
    this.placePodium(width, height, board.top);
    this.paintPlate(this.promptBox, width / 2, height * 0.96, Math.min(420, width * 0.5), 34);
    this.promptText.setPosition(width / 2, height * 0.96);
  }

  private placeBottomBoards(width: number, height: number): { readonly top: number } {
    const gap = 16;
    const boxW = Math.min(420, Math.max(360, (width - 56 - gap) / 2));
    const rankNeed = (1 + this.rankSplit()) * RANK_LINE + 28;
    const payLines = Math.max(
      this.payoutText.text.split('\n').length,
      this.payoutBankText.text.split('\n').length,
    );
    const payNeed = (payLines + 1) * 22 + 20;
    const boardH = Math.max(rankNeed, payNeed);
    const boardTop = Math.min(height * 0.9 - boardH, height * 0.68);
    const boardCy = boardTop + boardH / 2;
    const total = boxW * 2 + gap;
    const left = width / 2 - total / 2 + boxW / 2;
    const right = left + boxW + gap;

    this.paintPlate(this.rankingBox, left, boardCy, boxW, boardH);
    this.paintPlate(this.payoutBox, right, boardCy, boxW, boardH);

    const rankLeft = left - boxW / 2 + 16;
    const rankTop = boardCy - boardH / 2 + 12;
    const colW = (boxW - 40) / 2;
    this.rankingHeader.setVisible(true).setPosition(rankLeft, rankTop);
    this.rankingHeaderRight.setVisible(true).setPosition(rankLeft + colW + 8, rankTop);
    this.placeRankLines(colW, rankLeft, rankTop);
    const payLeft = right - boxW / 2 + 16;
    const payCol = (boxW - 40) / 2;
    this.payoutText.setPosition(payLeft, rankTop);
    this.payoutBankText.setPosition(payLeft + payCol + 8, rankTop);
    this.placePlayerMark(colW, rankLeft, rankTop);
    return { top: boardTop };
  }

  private placeRankLines(colW: number, rankLeft: number, rankTop: number): void {
    const rows = this.visibleRankRows();
    const split = this.rankSplit();
    this.rankLineTexts.forEach((text, index) => {
      const row = rows[index];
      if (row === undefined) {
        text.setVisible(false);
        return;
      }
      const inRight = index >= split;
      const local = inRight ? index - split : index;
      text
        .setVisible(true)
        .setText(this.formatRankLine(row, index))
        .setColor(this.rankLineColor(row))
        .setPosition(rankLeft + (inRight ? colW + 8 : 0), rankTop + (1 + local) * RANK_LINE);
    });
  }

  private placePlayerMark(colW: number, rankLeft: number, rankTop: number): void {
    const playerIndex = this.visibleRankRows().findIndex(row => row.isPlayer);
    if (playerIndex < 0) {
      this.playerMark.setVisible(false);
      return;
    }
    const split = this.rankSplit();
    const inRight = playerIndex >= split;
    const row = inRight ? playerIndex - split : playerIndex;
    const x = rankLeft + (inRight ? colW + 8 : 0) + colW / 2;
    const y = rankTop + (1 + row) * RANK_LINE + RANK_LINE / 2;
    this.playerMark.setVisible(true).setPosition(x, y).setSize(colW - 4, RANK_LINE);
  }

  private placePodium(width: number, height: number, boardTop: number): void {
    const headerBottom = height * 0.08 + 42;
    const footY = podiumFootY(boardTop);
    const firstFootY = winnerFootY(boardTop);
    const avail = Math.max(170, firstFootY - headerBottom - 24);
    const scale = Phaser.Math.Clamp(avail / WINNER_BODY, 0.55, 1.12);
    const first = this.podium.find(stack => stack.entry.position === 1);
    const second = this.podium.find(stack => stack.entry.position === 2);
    const third = this.podium.find(stack => stack.entry.position === 3);
    const firstBox =
      first !== undefined ? this.stackBox(first, WINNER_BODY * scale * PODIUM_BODY_SCALE) : { width: 0, height: 0 };
    const secondBox =
      second !== undefined ? this.stackBox(second, OTHER_BODY * scale * PODIUM_BODY_SCALE) : { width: 0, height: 0 };
    const thirdBox =
      third !== undefined ? this.stackBox(third, OTHER_BODY * scale * PODIUM_BODY_SCALE) : { width: 0, height: 0 };
    const xs = podiumBodyXs({
      screenW: width,
      firstW: firstBox.width,
      secondW: secondBox.width,
      thirdW: thirdBox.width,
      gap: PODIUM_BODY_GAP,
    });
    if (first !== undefined) {
      this.placeStack(first, xs.first, firstFootY, firstBox);
    }
    if (second !== undefined) {
      this.placeStack(second, xs.second, footY, secondBox);
    }
    if (third !== undefined) {
      this.placeStack(third, xs.third, footY, thirdBox);
    }
  }

  private stackBox(stack: PodiumStack, bodyMax: number): { readonly width: number; readonly height: number } {
    return stack.pose.visible
      ? this.fitPhoto(stack.pose, bodyMax * 0.48, bodyMax)
      : { width: bodyMax * 0.48, height: bodyMax };
  }

  private placeStack(
    stack: PodiumStack,
    x: number,
    footY: number,
    pose: { readonly width: number; readonly height: number },
  ): void {
    stack.pose.setPosition(x, footY);
    stack.poseLetter.setPosition(x, footY - pose.height / 2);
    stack.name.setPosition(x, podiumNameY(footY, pose.height));
  }

  private fitPhoto(
    image: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
    maxW: number,
    maxH: number,
  ): { readonly width: number; readonly height: number } {
    const fit = containSize({ width: image.frame.width, height: image.frame.height }, { width: maxW, height: maxH });
    image.setDisplaySize(fit.width, fit.height);
    return fit;
  }

  private headerStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '18px', color: GOLD, stroke: '#1a0e05', strokeThickness: 6 };
  }

  private youTagStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '14px', color: IVORY, stroke: '#1a0e05', strokeThickness: 4 };
  }

  private youNameStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '22px', color: GOLD, stroke: '#1a0e05', strokeThickness: 6 };
  }

  private winnerStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '36px', color: GOLD, stroke: '#3a0d05', strokeThickness: 8 };
  }

  private winnerCarStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '16px', color: IVORY, stroke: '#1a0e05', strokeThickness: 4 };
  }

  private rankStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#f7f3e8',
      align: 'left',
      stroke: '#101014',
      strokeThickness: 3,
      lineSpacing: 5,
    };
  }

  private payoutStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9dffad',
      align: 'left',
      stroke: '#101014',
      strokeThickness: 3,
      lineSpacing: 6,
    };
  }

  private promptStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '14px', color: IVORY, stroke: '#1a0e05', strokeThickness: 4 };
  }
}

