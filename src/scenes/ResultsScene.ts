import Phaser from 'phaser';
import { cartPortraitKey } from '../data/cars/CarManifest.ts';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import { driverCardKey } from '../data/cards/DriverCards.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { creditWallet, loadActiveCareer, loadPoints, recordProgress } from '../adapters/progress/ProgressStore.ts';
import { campaignSlotForTrackId } from '../data/tracks/campaign.ts';
import { pickPubBackground, PUB_BACKGROUNDS, pubBackgroundKey } from '../data/ui/PubBackgrounds.ts';
import { TitleAudio } from '../adapters/audio/TitleAudio.ts';
import { playGuitarSolo } from '../adapters/audio/GuitarSolo.ts';
import { formatRaceTime, positionOrdinal } from '../adapters/render/HudFormat.ts';
import { layoutResults } from '../adapters/render/ResultsLayout.ts';
import type { Plate, PodiumSlot } from '../adapters/render/ResultsLayout.ts';
import { paintRoundedPlaque, PLAQUE_INK } from '../adapters/render/UiPlaque.ts';
import { containSize } from '../adapters/render/FitBox.ts';
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
const PLAQUE_EDGE = 0xf4e6c4;
const PLAQUE_GOLD = 0xffd85c;
const PLAQUE_SILVER = 0xc0c8d4;
const PLAQUE_BRONZE = 0xc4843a;
const PLAQUE_ALPHA = 0.82;
const GOLD = '#ffd85c';
const SILVER = '#d4dae4';
const BRONZE = '#e0a060';
const IVORY = '#f4f0e4';
const LAST_RED = '#ff4a4a';

interface PodiumStack {
  readonly entry: ResultsEntry;
  readonly card: Phaser.GameObjects.Image;
  readonly cardLetter: Phaser.GameObjects.Text;
  readonly car: Phaser.GameObjects.Image;
  readonly carFallback: Phaser.GameObjects.Sprite;
  readonly name: Phaser.GameObjects.Text;
}

interface RankRow {
  readonly place: number;
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
  private leaving = false;
  private audio!: TitleAudio;
  private rankRows: RankRow[] = [];

  private art!: Phaser.GameObjects.Image;
  private dim!: Phaser.GameObjects.Rectangle;
  private floorDim!: Phaser.GameObjects.Rectangle;
  private titleBox!: Phaser.GameObjects.Graphics;
  private rankingBox!: Phaser.GameObjects.Graphics;
  private payoutBox!: Phaser.GameObjects.Graphics;
  private promptBox!: Phaser.GameObjects.Graphics;
  private stepsBox!: Phaser.GameObjects.Graphics;
  private playerMark!: Phaser.GameObjects.Rectangle;
  private headerText!: Phaser.GameObjects.Text;
  private winnerText!: Phaser.GameObjects.Text;
  private rankingCaption!: Phaser.GameObjects.Text;
  private rankingColumns!: Phaser.GameObjects.Text;
  private rankLineTexts: Phaser.GameObjects.Text[] = [];
  private payoutCaption!: Phaser.GameObjects.Text;
  private payoutText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private stepLabels: Phaser.GameObjects.Text[] = [];
  private podium: PodiumStack[] = [];

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
    this.rankRows = this.buildRankRows();

    this.art = this.add.image(0, 0, '').setOrigin(0, 0).setVisible(false).setDepth(0);
    this.dim = this.add.rectangle(0, 0, 10, 10, 0x05060a, 0.46).setOrigin(0, 0).setDepth(1);
    this.floorDim = this.add.rectangle(0, 0, 10, 10, 0x05060a, 0.36).setOrigin(0, 1).setDepth(1);
    this.applyPubArt();

    this.titleBox = this.add.graphics().setDepth(2);
    this.stepsBox = this.add.graphics().setDepth(2);
    this.rankingBox = this.add.graphics().setDepth(2);
    this.payoutBox = this.add.graphics().setDepth(2);
    this.promptBox = this.add.graphics().setDepth(2);
    this.playerMark = this.add
      .rectangle(0, 0, 10, 18, 0x3a2a14, 0.95)
      .setStrokeStyle(2, PLAQUE_GOLD, 0.85)
      .setOrigin(0, 0.5)
      .setDepth(3)
      .setVisible(false);

    this.headerText = this.add.text(0, 0, 'WINNER IS', this.headerStyle()).setOrigin(0.5, 0.5).setDepth(4);
    this.winnerText = this.add.text(0, 0, this.winnerName(), this.winnerStyle()).setOrigin(0.5, 0.5).setDepth(4);
    this.rankingCaption = this.add.text(0, 0, 'CHAMPIONSHIP', this.captionStyle()).setOrigin(0, 0).setDepth(4);
    this.rankingColumns = this.add.text(0, 0, ' #  PILOT    RACE  TOT', this.rankStyle()).setOrigin(0, 0).setDepth(4);
    this.rankLineTexts = Array.from({ length: 10 }, () =>
      this.add.text(0, 0, '', this.rankStyle()).setOrigin(0, 0).setDepth(4),
    );
    this.payoutCaption = this.add.text(0, 0, 'PURSE', this.captionStyle()).setOrigin(0, 0).setDepth(4);
    this.payoutText = this.add.text(0, 0, this.payoutBlock(), this.payoutStyle()).setOrigin(0, 0).setDepth(4);
    this.promptText = this.add.text(0, 0, 'CONTINUE  ·  GARAGE', this.promptStyle()).setOrigin(0.5, 0.5).setDepth(4);
    this.stepLabels = [1, 2, 3].map(place =>
      this.add
        .text(0, 0, String(place), this.stepStyle(place))
        .setOrigin(0.5, 0.5)
        .setDepth(3),
    );

    this.podium = this.payload.standings
      .filter(entry => entry.position <= 3)
      .sort((a, b) => a.position - b.position)
      .map(entry => this.makePodium(entry));

    this.audio = new TitleAudio();
    this.audio.start();
    this.layout();
    this.slamTitle();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
    this.bindKeys();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.audio.destroy());
  }

  private paintPlate(graphics: Phaser.GameObjects.Graphics, plate: Plate, edge = PLAQUE_EDGE): void {
    paintRoundedPlaque(graphics, {
      x: plate.x,
      y: plate.y,
      width: plate.width,
      height: plate.height,
      radius: 14,
      fill: PLAQUE_INK,
      alpha: PLAQUE_ALPHA,
      edge,
    });
  }

  private makePodium(entry: ResultsEntry): PodiumStack {
    const cardKey = driverCardKey(entry.name);
    const portraitKey = cartPortraitKey(entry.carId);
    const gold = entry.position === 1;
    const card = this.add
      .image(0, 0, cardKey)
      .setOrigin(0.5, 0)
      .setVisible(this.textures.exists(cardKey))
      .setDepth(4);
    const cardLetter = this.add
      .text(0, 0, entry.name.slice(0, 1).toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: GOLD,
        stroke: '#1a0e05',
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0.5)
      .setVisible(!card.visible)
      .setDepth(5);
    const car = this.add
      .image(0, 0, portraitKey)
      .setOrigin(0.5, 0)
      .setVisible(this.textures.exists(portraitKey))
      .setDepth(4);
    const carFallback = this.add
      .sprite(0, 0, entry.carId, 0)
      .setOrigin(0.5, 0)
      .setScale(2.2)
      .setVisible(!car.visible && this.textures.exists(entry.carId))
      .setDepth(4);
    const name = this.add
      .text(0, 0, `${entry.position}. ${entry.name.toUpperCase()}`, {
        fontFamily: 'monospace',
        fontSize: gold ? '16px' : '14px',
        color: this.podiumNameColor(entry),
        stroke: '#101014',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(4);
    return { entry, card, cardLetter, car, carFallback, name };
  }

  private winnerName(): string {
    const winner = this.payload.standings.find(entry => entry.position === 1);
    return (winner?.name ?? '???').toUpperCase();
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
      .map(([name, total], index) => ({
        place: index + 1,
        name,
        race: racePts.get(name) ?? 0,
        total,
        isPlayer: name === playerName,
      }));
  }

  private visibleRankRows(): RankRow[] {
    return this.rankRows.slice(0, 10);
  }

  /** Keep the player on the board even when they sit below the last visible slot. */
  private pinPlayerRow(rows: readonly RankRow[], slots: number): RankRow[] {
    if (rows.length <= slots) {
      return [...rows];
    }
    const shown = rows.slice(0, slots);
    const player = rows.find(row => row.isPlayer);
    if (player !== undefined && !shown.some(row => row.isPlayer)) {
      shown[slots - 1] = player;
    }
    return shown;
  }

  private formatRankLine(row: RankRow): string {
    const marker = row.isPlayer ? '>' : ' ';
    const race = row.race > 0 ? `+${row.race}` : String(row.race);
    return `${marker}${String(row.place).padStart(2)}  ${row.name.slice(0, 6).padEnd(6)}  ${race.padStart(4)}  ${String(row.total).padStart(4)}`;
  }

  private racePlace(name: string): number | undefined {
    return this.payload.standings.find(entry => entry.name === name)?.position;
  }

  private podiumNameColor(entry: ResultsEntry): string {
    if (entry.position === 1) {
      return GOLD;
    }
    if (entry.position === 2) {
      return SILVER;
    }
    if (entry.position === 3) {
      return BRONZE;
    }
    if (this.payload.totalRacers > 1 && entry.position >= this.payload.totalRacers) {
      return LAST_RED;
    }
    return entry.isPlayer ? GOLD : IVORY;
  }

  private rankLineColor(row: RankRow): string {
    if (row.isPlayer) {
      return GOLD;
    }
    const place = this.racePlace(row.name);
    if (place === 1) {
      return GOLD;
    }
    if (place !== undefined && this.payload.totalRacers > 1 && place >= this.payload.totalRacers) {
      return LAST_RED;
    }
    return IVORY;
  }

  private payoutBlock(): string {
    const row = (label: string, value: string): string => `${label.padEnd(8)}${value.padStart(10)}`;
    const lines = [
      this.payload.trackName.toUpperCase(),
      `${positionOrdinal(this.payload.playerPosition).toUpperCase()} PLACE`,
      row('TIME', formatRaceTime(this.payload.finishSeconds)),
    ];
    if (this.prize > 0) {
      lines.push(row('PRIZE', formatCash(this.prize)));
    }
    if (this.hitBonus > 0) {
      lines.push(row('HITS', formatCash(this.hitBonus)));
    }
    lines.push(row('PTS', `+${this.racePoints}`));
    lines.push('');
    lines.push(row('BANK', formatCash(this.balance)));
    lines.push(row('RESPECT', String(loadPoints())));
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
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M).on('down', () => this.audio.toggleMute());
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

  private slamTitle(): void {
    this.tweens.add({
      targets: this.winnerText,
      scale: { from: 1.12, to: 1 },
      duration: 220,
      ease: 'Cubic.easeOut',
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
    this.floorDim.setPosition(0, height).setSize(width, height * 0.42);

    const rows = this.visibleRankRows();
    const placed = layoutResults(
      { width, height },
      { rankCount: rows.length, payoutLines: this.payoutText.text.split('\n').length },
    );
    const shown = this.pinPlayerRow(rows, placed.rankSlots);

    this.paintPlate(this.titleBox, placed.title, PLAQUE_GOLD);
    this.headerText.setPosition(placed.header.x, placed.header.y);
    this.winnerText.setPosition(placed.winner.x, placed.winner.y);

    this.placePodium(placed.first, placed.second, placed.third);
    this.paintSteps(placed.first, placed.second, placed.third);

    this.paintPlate(this.rankingBox, placed.ranking);
    this.paintPlate(this.payoutBox, placed.payout, PLAQUE_GOLD);
    this.rankingCaption.setPosition(placed.rankingCaption.x, placed.rankingCaption.y);
    this.rankingColumns.setPosition(placed.rankingColumns.x, placed.rankingColumns.y);
    this.placeRankLines(shown, placed.rankingLine0.x, placed.rankingLine0.y, placed.rankLine, placed.ranking.width);
    this.payoutCaption.setPosition(placed.payoutCaption.x, placed.payoutCaption.y);
    this.payoutText.setPosition(placed.payoutText.x, placed.payoutText.y);

    this.paintPlate(this.promptBox, placed.prompt);
    this.promptText.setPosition(placed.promptText.x, placed.promptText.y);
  }

  private placeRankLines(
    rows: readonly RankRow[],
    left: number,
    top: number,
    line: number,
    plateWidth: number,
  ): void {
    this.rankLineTexts.forEach((text, index) => {
      const row = rows[index];
      if (row === undefined) {
        text.setVisible(false);
        return;
      }
      text
        .setVisible(true)
        .setText(this.formatRankLine(row))
        .setColor(this.rankLineColor(row))
        .setPosition(left, top + index * line);
    });
    this.placePlayerMark(rows, left, top, line, plateWidth);
  }

  private placePlayerMark(
    rows: readonly RankRow[],
    left: number,
    top: number,
    line: number,
    plateWidth: number,
  ): void {
    const playerIndex = rows.findIndex(row => row.isPlayer);
    if (playerIndex < 0) {
      this.playerMark.setVisible(false);
      return;
    }
    this.playerMark
      .setVisible(true)
      .setPosition(left - 6, top + playerIndex * line + line / 2)
      .setSize(plateWidth - 20, line);
  }

  private placePodium(firstSlot: PodiumSlot, secondSlot: PodiumSlot, thirdSlot: PodiumSlot): void {
    const first = this.podium.find(stack => stack.entry.position === 1);
    const second = this.podium.find(stack => stack.entry.position === 2);
    const third = this.podium.find(stack => stack.entry.position === 3);
    if (first !== undefined) {
      this.placeStack(first, firstSlot);
    }
    if (second !== undefined) {
      this.placeStack(second, secondSlot);
    }
    if (third !== undefined) {
      this.placeStack(third, thirdSlot);
    }
  }

  private paintSteps(first: PodiumSlot, second: PodiumSlot, third: PodiumSlot): void {
    this.stepsBox.clear();
    const blocks: readonly {
      slot: PodiumSlot;
      edge: number;
      label: Phaser.GameObjects.Text | undefined;
      present: boolean;
    }[] = [
      {
        slot: first,
        edge: PLAQUE_GOLD,
        label: this.stepLabels[0],
        present: this.podium.some(stack => stack.entry.position === 1),
      },
      {
        slot: second,
        edge: PLAQUE_SILVER,
        label: this.stepLabels[1],
        present: this.podium.some(stack => stack.entry.position === 2),
      },
      {
        slot: third,
        edge: PLAQUE_BRONZE,
        label: this.stepLabels[2],
        present: this.podium.some(stack => stack.entry.position === 3),
      },
    ];
    for (const block of blocks) {
      const label = block.label;
      if (label === undefined) {
        continue;
      }
      label.setVisible(block.present);
      if (!block.present) {
        continue;
      }
      const left = block.slot.step.x - block.slot.step.width / 2;
      const top = block.slot.step.y - block.slot.step.height / 2;
      this.stepsBox.fillStyle(PLAQUE_INK, PLAQUE_ALPHA);
      this.stepsBox.fillRoundedRect(left, top, block.slot.step.width, block.slot.step.height, 8);
      this.stepsBox.lineStyle(2, block.edge, 0.85);
      this.stepsBox.strokeRoundedRect(left, top, block.slot.step.width, block.slot.step.height, 8);
      label.setPosition(block.slot.step.x, block.slot.step.y);
    }
  }

  private placeStack(stack: PodiumStack, slot: PodiumSlot): void {
    const nameH = 20;
    const gap = 6;
    const pad = 8;
    const floor = slot.step.y - slot.step.height / 2 - 4;
    const budget = Math.max(72, floor - slot.top - nameH - gap);
    const cardMax = Math.min(slot.cardMax, budget * 0.5);
    const carMax = Math.min(slot.carMax, budget * 0.46);
    const card = stack.card.visible
      ? this.fitPhoto(stack.card, cardMax, cardMax)
      : { width: cardMax, height: cardMax };
    const car = stack.car.visible
      ? this.fitPhoto(stack.car, carMax, carMax)
      : this.fitPhoto(stack.carFallback, carMax, carMax);
    stack.card.setPosition(slot.x, slot.top + pad);
    stack.cardLetter.setPosition(slot.x, slot.top + pad + card.height / 2);
    const carY = slot.top + pad + card.height + gap;
    stack.car.setPosition(slot.x, carY);
    stack.carFallback.setPosition(slot.x, carY);
    stack.name.setPosition(slot.x, Math.min(carY + car.height + gap, floor - nameH));
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
    return { fontFamily: 'monospace', fontSize: '16px', color: GOLD, stroke: '#1a0e05', strokeThickness: 5 };
  }

  private winnerStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '42px', color: GOLD, stroke: '#3a0d05', strokeThickness: 8 };
  }

  private captionStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '14px', color: GOLD, stroke: '#101014', strokeThickness: 4 };
  }

  private rankStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#f7f3e8',
      align: 'left',
      stroke: '#101014',
      strokeThickness: 3,
      lineSpacing: 4,
    };
  }

  private payoutStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9dffad',
      align: 'left',
      stroke: '#101014',
      strokeThickness: 4,
      lineSpacing: 5,
    };
  }

  private promptStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'monospace', fontSize: '15px', color: IVORY, stroke: '#1a0e05', strokeThickness: 4 };
  }

  private stepStyle(place: number): Phaser.Types.GameObjects.Text.TextStyle {
    const color = place === 1 ? GOLD : place === 2 ? SILVER : BRONZE;
    return { fontFamily: 'monospace', fontSize: '16px', color, stroke: '#101014', strokeThickness: 4 };
  }
}

