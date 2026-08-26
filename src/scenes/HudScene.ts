import Phaser from 'phaser';
import { formatHud } from '../adapters/render/HudFormat.ts';
import type { HudReadout, HudText } from '../adapters/render/HudFormat.ts';
import { AnalogGauges } from '../adapters/render/AnalogGauges.ts';
import { MinimapView } from '../adapters/render/MinimapView.ts';
import type { MinimapSnapshot } from '../adapters/render/MinimapProjection.ts';
import { RACE_PHASE } from '../domain/constants.ts';
import { formatCash } from '../domain/progress/Wallet.ts';
import {
  HUD_MINE_KEY,
  HUD_MISSILE_KEY,
  HUD_OIL_KEY,
  HUD_TURBO_KEY,
  SCENE_KEY,
} from './sceneKeys.ts';

/**
 * Title-safe floor, pixels. `safeMargin()` grows this to 5% of the shorter
 * side so corner HUD stays inside TV overscan (game-ui-design safe zone).
 *
 * A plain pixel value is correct here and would NOT be correct inside `RaceScene`:
 * this scene has its own camera at zoom 1 with no scroll, so one unit of this scene
 * is one screen pixel by definition. See the class comment.
 */
const MARGIN_FLOOR = 32;
const TITLE_SAFE_FRACTION = 0.05;

function safeMargin(width: number, height: number): number {
  const shortest = Math.min(width, height);
  return Math.max(MARGIN_FLOOR, Math.round(shortest * TITLE_SAFE_FRACTION));
}

/**
 * Loadout rail: native icons are 32×32, shown at 2× (integer scale — pixelArt).
 * Slot is [icon][gap][two-digit count] plus a trailing gap so four sit in a row:
 * [Nitro] 99 [Missile] 99 [Mine] 99 [Oil] 99
 */
const ICON_NATIVE = 32;
const ICON_SCALE = 2;
const ICON_SIZE = ICON_NATIVE * ICON_SCALE;
const ICON_COUNT_GAP = 10;
const COUNT_WIDTH = 36;
const SLOT_GAP = 16;
const SLOT_WIDTH = ICON_SIZE + ICON_COUNT_GAP + COUNT_WIDTH + SLOT_GAP;
const LOADOUT_SLOT_COUNT = 4;

/** Integrity bar spans first icon through last count — no leftover trailing gap. */
const BAR_WIDTH = SLOT_WIDTH * LOADOUT_SLOT_COUNT - SLOT_GAP;
const BAR_HEIGHT = 16;
const RAIL_PAD = 8;
const EMPTY_ICON_ALPHA = 0.4;

const LOADOUT_ICON_KEYS = [
  HUD_TURBO_KEY,
  HUD_MISSILE_KEY,
  HUD_MINE_KEY,
  HUD_OIL_KEY,
] as const;

/** Integrity thresholds at which the bar changes colour. Matches `CAR_CONDITION`. */
const BAR_HEALTHY_ABOVE = 66;
const BAR_DAMAGED_ABOVE = 33;

const COLOUR_HEALTHY = 0x54d66a;
const COLOUR_DAMAGED = 0xe8c246;
const COLOUR_CRITICAL = 0xe0523c;

/** How long a value change stays highlighted, milliseconds. */
const PULSE_MILLISECONDS = 320;

/** How long "GO!" lingers after the lights go green, milliseconds. */
const GO_LINGER_MILLISECONDS = 620;

/** Yellow / red flash on each podium-clock digit, milliseconds. */
const PODIUM_FLASH_MILLISECONDS = 180;

const PODIUM_YELLOW = '#ffe066';
const PODIUM_RED = '#ff3a3a';

/** Depth of the standings block relative to the rest of the HUD. */
const HUD_DEPTH = 10;

/**
 * What the HUD needs from the race, per frame.
 *
 * `RaceScene` implements this rather than the HUD reaching into the race's internals,
 * so the coupling is one small readable interface instead of a scene poking at another
 * scene's fields.
 */
export interface HudSource {
  hudReadout(): HudReadout;
  standingsWithNames(): readonly { readonly name: string; readonly position: number }[];
  minimapSnapshot(): MinimapSnapshot | null;
}

/**
 * The race HUD: position, lap, timer, ammo, integrity, countdown and standings.
 *
 * **This is its own scene, and that is the whole point.** A HUD built as game objects
 * inside `RaceScene` inherits that scene's camera, which under T-020's adaptive zoom
 * ranges from 1.5 to 2.0 — and `setScrollFactor(0)` does NOT cancel zoom. That is
 * precisely how the debug text stayed invisible for two entire tasks while reporting
 * `visible: true` with the correct contents (WORKLOG decision 25). A separate scene
 * gets its own camera at zoom 1 and scroll 0, so screen pixels are simply screen
 * pixels and there is nothing to counter-scale. `TuningOverlay` still does the
 * counter-scaling dance because it lives inside `RaceScene`; do not copy it here.
 *
 * Everything numeric is formatted by the pure `formatHud`, so this file only decides
 * where text goes and how it moves.
 */
export class HudScene extends Phaser.Scene {
  private positionText!: Phaser.GameObjects.Text;
  private lapText!: Phaser.GameObjects.Text;
  private cashText!: Phaser.GameObjects.Text;
  private pointsText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private loadoutIcons: Phaser.GameObjects.Sprite[] = [];
  private loadoutCounts: Phaser.GameObjects.Text[] = [];
  private nitroTrack!: Phaser.GameObjects.Rectangle;
  private nitroFill!: Phaser.GameObjects.Rectangle;
  private railPlate!: Phaser.GameObjects.Rectangle;
  private countdownText!: Phaser.GameObjects.Text;
  private podiumPlate!: Phaser.GameObjects.Rectangle;
  private podiumClockText!: Phaser.GameObjects.Text;
  private podiumTimeoutLabel!: Phaser.GameObjects.Text;
  private standingsText!: Phaser.GameObjects.Text;
  private barBackground!: Phaser.GameObjects.Rectangle;
  private barFill!: Phaser.GameObjects.Rectangle;
  private gauge!: AnalogGauges;
  private minimap!: MinimapView;
  private mapMargin = 0;
  private mapStackBottom = 0;

  /** Last rendered values, so a pulse fires on CHANGE rather than every frame. */
  private lastPosition = '';
  private lastLap = '';
  private lastCash = '';
  private lastCashAmount = 0;
  private lastPoints = '';
  private lastAmmo = -1;
  private lastMines = -1;
  private lastOil = -1;
  private lastCountdown: string | null = null;
  private lastPodiumClock: string | null = null;
  private podiumFlashElapsed = 0;
  private podiumLabelSeen = false;

  constructor() {
    super({ key: SCENE_KEY.HUD, active: false });
  }

  create(): void {
    this.positionText = this.add.text(0, 0, '', this.bigStyle()).setDepth(HUD_DEPTH);
    this.lapText = this.add.text(0, 0, '', this.labelStyle()).setDepth(HUD_DEPTH);
    this.cashText = this.add.text(0, 0, '', this.cashStyle()).setDepth(HUD_DEPTH);
    this.pointsText = this.add.text(0, 0, '', this.pointsStyle()).setDepth(HUD_DEPTH);
    this.timeText = this.add.text(0, 0, '', this.labelStyle()).setDepth(HUD_DEPTH);
    this.standingsText = this.add.text(0, 0, '', this.smallStyle()).setDepth(HUD_DEPTH);
    this.loadoutIcons = LOADOUT_ICON_KEYS.map(key => {
      const sprite = this.add.sprite(0, 0, key, 0).setDepth(HUD_DEPTH).setVisible(this.textures.exists(key));
      sprite.setDisplaySize(ICON_SIZE, ICON_SIZE);
      sprite.setOrigin(0.5, 0.5);
      return sprite;
    });
    this.loadoutCounts = Array.from({ length: LOADOUT_SLOT_COUNT }, () =>
      this.add.text(0, 0, '0', this.loadoutCountStyle()).setOrigin(0, 0.5).setDepth(HUD_DEPTH),
    );
    this.nitroTrack = this.add
      .rectangle(0, 0, COUNT_WIDTH, 10, 0x101014, 0.9)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xf2f2f2, 0.85)
      .setDepth(HUD_DEPTH);
    this.nitroFill = this.add
      .rectangle(0, 0, COUNT_WIDTH, 8, 0xffe066)
      .setOrigin(0, 0.5)
      .setDepth(HUD_DEPTH + 1);

    const railHeight = ICON_SIZE + RAIL_PAD * 2;
    this.railPlate = this.add
      .rectangle(0, 0, BAR_WIDTH + RAIL_PAD * 2, railHeight, 0x000000, 0.45)
      .setOrigin(0, 0)
      .setDepth(HUD_DEPTH - 1);

    this.barBackground = this.add
      .rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setDepth(HUD_DEPTH);
    this.barFill = this.add
      .rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, COLOUR_HEALTHY)
      .setOrigin(0, 0)
      .setDepth(HUD_DEPTH + 1);

    this.gauge = new AnalogGauges(this);
    this.gauge.setDepth(HUD_DEPTH);
    this.minimap = new MinimapView(this);
    this.minimap.setDepth(HUD_DEPTH);

    this.countdownText = this.add
      .text(0, 0, '', this.countdownStyle())
      .setOrigin(0.5, 0.5)
      .setDepth(HUD_DEPTH + 2)
      .setVisible(false);

    this.podiumPlate = this.add
      .rectangle(0, 0, 240, 140, 0x000000, 0.5)
      .setOrigin(0.5, 0.5)
      .setDepth(HUD_DEPTH + 1)
      .setVisible(false);
    this.podiumClockText = this.add
      .text(0, 0, '', this.podiumClockStyle())
      .setOrigin(0.5, 0.5)
      .setDepth(HUD_DEPTH + 2)
      .setVisible(false);
    this.podiumTimeoutLabel = this.add
      .text(0, 0, '', this.podiumLabelStyle())
      .setOrigin(0.5, 0)
      .setDepth(HUD_DEPTH + 2)
      .setVisible(false);

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());

    // The gauge owns Phaser game objects (a container and its children) that Phaser
    // will not tear down on its own; every other owned-object adapter in this codebase
    // (`ExplosionEffect`, `TyreMarks`) is destroyed from a SHUTDOWN hook for the same
    // reason, following the pattern `RaceScene` uses for its own owned resources.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.gauge.destroy();
      this.minimap.destroy();
    });
  }

  update(_time: number, deltaMilliseconds: number): void {
    const source = this.raceSource();
    if (source === null) {
      return;
    }

    const readout = source.hudReadout();
    const text = formatHud(readout);

    this.timeText.setText(text.time);
    this.applyLoadout(readout);
    this.applyCash(readout.cash ?? 0);
    this.applyPoints(readout.points ?? 0);
    this.applyPosition(text);
    this.applyLap(text);
    this.applyIntegrity(text);
    this.applySpeed(text, deltaMilliseconds);
    this.applyCountdown(text);
    this.applyPodiumTimeout(text, deltaMilliseconds);
    this.applyStandings(source, readout);
    this.applyMinimap(source, readout);
  }

  private applyCash(amount: number): void {
    const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
    const next = formatCash(safe);
    this.cashText.setText(next);
    if (safe === this.lastCashAmount && next === this.lastCash) {
      return;
    }
    const grew = this.lastCash !== '' && safe > this.lastCashAmount;
    this.lastCashAmount = safe;
    this.lastCash = next;
    if (grew) {
      this.pulse(this.cashText, 1.12);
    }
  }

  private applyPoints(amount: number): void {
    const next = `${amount} PTS`;
    this.pointsText.setText(next);
    if (next === this.lastPoints) {
      return;
    }
    const grew = this.lastPoints !== '';
    this.lastPoints = next;
    if (grew) {
      this.pulse(this.pointsText, 1.28);
    }
  }

  /** The position is the number the player watches, so it pulses when it changes. */
  private applyPosition(text: HudText): void {
    this.positionText.setText(text.position);
    if (text.position === this.lastPosition) {
      return;
    }
    this.lastPosition = text.position;
    this.pulse(this.positionText, 1.45);
  }

  private applyLap(text: HudText): void {
    this.lapText.setText(text.lap);
    if (text.lap === this.lastLap) {
      return;
    }
    this.lastLap = text.lap;
    this.pulse(this.lapText, 1.3);
  }

  private applyIntegrity(text: HudText): void {
    const fraction = text.integrityPercent / 100;
    this.barFill.width = BAR_WIDTH * fraction;
    this.barFill.setFillStyle(barColour(text.integrityPercent));
  }

  /**
   * Speed changes every frame under normal driving, so unlike `applyPosition` and
   * `applyLap` this never pulses: `pulse()` fires on CHANGE, and a value that changes
   * constantly would tween constantly, which reads as broken rather than alive.
   */
  private applySpeed(text: HudText, deltaMilliseconds: number): void {
    const dt = prefersReducedMotion()
      ? 0
      : (Number.isFinite(deltaMilliseconds) ? deltaMilliseconds : 0) / 1000;
    this.gauge.update(text.mph, text.rpmFraction, dt);
  }

  /**
   * The countdown animates on every change of digit: it snaps in large and settles,
   * which reads as a light coming on rather than as text appearing. "GO!" then fades
   * itself out, because the phase has already flipped to RACING by the time the
   * player has read it and there is nothing left to count.
   */
  private applyCountdown(text: HudText): void {
    if (text.countdown === this.lastCountdown) {
      return;
    }
    this.lastCountdown = text.countdown;

    this.tweens.killTweensOf(this.countdownText);

    if (text.countdown === null) {
      this.countdownText.setVisible(false);
      return;
    }

    this.countdownText.setText(text.countdown);
    this.countdownText.setVisible(true);
    this.countdownText.setAlpha(1);
    this.countdownText.setScale(2.4);
    this.tweens.add({
      targets: this.countdownText,
      scale: 1,
      duration: 380,
      ease: Phaser.Math.Easing.Back.Out,
    });

    if (text.countdown === 'GOOOO!') {
      this.tweens.add({
        targets: this.countdownText,
        alpha: 0,
        delay: GO_LINGER_MILLISECONDS,
        duration: 260,
        onComplete: () => this.countdownText.setVisible(false),
      });
    }
  }

  /**
   * After the podium is locked, a centre-top clock counts the remaining pack
   * down. Each new digit flashes yellow then red; "TIME OUT" drops in at half.
   * The overlay sits in the title-safe band above the chased car, not on it.
   */
  private applyPodiumTimeout(text: HudText, deltaMilliseconds: number): void {
    if (text.podiumClock === null) {
      this.lastPodiumClock = null;
      this.podiumLabelSeen = false;
      this.podiumPlate.setVisible(false);
      this.podiumClockText.setVisible(false);
      this.podiumTimeoutLabel.setVisible(false);
      this.tweens.killTweensOf(this.podiumTimeoutLabel);
      return;
    }

    if (text.podiumClock !== this.lastPodiumClock) {
      this.lastPodiumClock = text.podiumClock;
      this.podiumFlashElapsed = 0;
      this.podiumClockText.setText(text.podiumClock);
      this.podiumClockText.setScale(1.18);
      this.tweens.killTweensOf(this.podiumClockText);
      this.tweens.add({
        targets: this.podiumClockText,
        scale: 1,
        duration: 220,
        ease: Phaser.Math.Easing.Cubic.Out,
      });
    }

    this.podiumFlashElapsed += Number.isFinite(deltaMilliseconds) ? deltaMilliseconds : 0;
    this.podiumClockText.setColor(this.podiumFlashColor());
    this.podiumClockText.setVisible(true);
    this.podiumPlate.setVisible(true);

    const showLabel = text.podiumTimeoutLabel !== null;
    this.podiumTimeoutLabel.setText(text.podiumTimeoutLabel ?? '');
    this.podiumTimeoutLabel.setVisible(showLabel);
    this.podiumTimeoutLabel.setColor(this.podiumFlashColor());
    if (showLabel && !this.podiumLabelSeen) {
      this.podiumLabelSeen = true;
      this.podiumTimeoutLabel.setScale(1.2);
      this.tweens.killTweensOf(this.podiumTimeoutLabel);
      this.tweens.add({
        targets: this.podiumTimeoutLabel,
        scale: 1,
        duration: 220,
        ease: Phaser.Math.Easing.Cubic.Out,
      });
    }
  }

  /** Yellow then red each digit. Reduced motion: one colour per second, no blink. */
  private podiumFlashColor(): string {
    if (prefersReducedMotion()) {
      const digit = Number.parseInt(this.lastPodiumClock ?? '0', 10);
      return Number.isFinite(digit) && digit % 2 === 0 ? PODIUM_YELLOW : PODIUM_RED;
    }
    const tick = Math.floor(this.podiumFlashElapsed / PODIUM_FLASH_MILLISECONDS);
    return tick % 2 === 0 ? PODIUM_YELLOW : PODIUM_RED;
  }

  private applyStandings(
    source: HudSource,
    readout: HudReadout,
  ): void {
    const lines = source
      .standingsWithNames()
      .map(entry => `${entry.position}. ${entry.name}`)
      .join('\n');
    this.standingsText.setText(lines);
    // Dimmed while racing so it never competes with the road, full strength once the
    // race is over and the standings are the only thing left worth reading.
    this.standingsText.setAlpha(readout.phase === 'finished' ? 1 : 0.72);
  }

  /**
   * Circuit silhouette while the lights are out or the pack is still racing.
   * Hidden once the race is finished so it does not fight the podium overlay.
   */
  private applyMinimap(source: HudSource, readout: HudReadout): void {
    const live = readout.phase === RACE_PHASE.COUNTDOWN || readout.phase === RACE_PHASE.RACING;
    if (!live || typeof source.minimapSnapshot !== 'function') {
      this.minimap.setVisible(false);
      return;
    }
    const snapshot = source.minimapSnapshot();
    if (snapshot === null) {
      this.minimap.setVisible(false);
      return;
    }
    this.minimap.setVisible(true);
    this.minimap.update(snapshot);
    this.placeMinimap();
  }

  /**
   * Four glance slots: Nitro, Missile, Mine, Oil. Nitro is a fill bar;
   * the others keep a count. Empty stock dims the icon; burning nitro tints gold.
   */
  private applyLoadout(readout: HudReadout): void {
    const capacity = Math.max(
      1,
      Number.isFinite(readout.turboCapacity) ? readout.turboCapacity! : 10,
    );
    const tank = Math.max(0, Number.isFinite(readout.turbos) ? readout.turbos! : 0);
    const fraction = Math.min(1, tank / capacity);
    const counts = [
      tank,
      Math.max(0, Number.isFinite(readout.ammo) ? readout.ammo : 0),
      Math.max(0, Number.isFinite(readout.mines) ? readout.mines! : 0),
      Math.max(0, Number.isFinite(readout.oil) ? readout.oil! : 0),
    ];
    this.loadoutCounts[0]?.setVisible(false);
    const ammo = Math.round(counts[1] ?? 0);
    const mines = Math.round(counts[2] ?? 0);
    const oil = Math.round(counts[3] ?? 0);
    if (this.lastAmmo >= 0 && ammo < this.lastAmmo) {
      this.pulseCount(1);
    }
    if (this.lastMines >= 0 && mines < this.lastMines) {
      this.pulseCount(2);
    }
    if (this.lastOil >= 0 && oil < this.lastOil) {
      this.pulseCount(3);
    }
    this.lastAmmo = ammo;
    this.lastMines = mines;
    this.lastOil = oil;
    this.nitroFill.width = Math.max(1, (COUNT_WIDTH - 4) * fraction);
    this.nitroFill.setFillStyle(readout.turboActive === true ? 0xffe066 : 0xd8dae2);
    this.nitroTrack.setAlpha(tank <= 0 ? EMPTY_ICON_ALPHA : 0.95);
    this.nitroFill.setAlpha(tank <= 0 ? 0.2 : 1);
    for (let index = 0; index < LOADOUT_SLOT_COUNT; index += 1) {
      if (index > 0) {
        const count = Math.round(counts[index] ?? 0);
        this.loadoutCounts[index]?.setText(String(count).padStart(2, ' '));
      }
      const icon = this.loadoutIcons[index];
      if (icon === undefined) {
        continue;
      }
      const empty = index === 0 ? tank <= 0 : (counts[index] ?? 0) <= 0;
      icon.setAlpha(empty ? EMPTY_ICON_ALPHA : 0.95);
      if (index === 0 && readout.turboActive === true) {
        icon.setTint(0xffe066);
        icon.setAlpha(1);
      } else {
        icon.clearTint();
      }
    }
  }

  /** Spend feedback on a loadout count — glanceable, not a new HUD chrome. */
  private pulseCount(index: number): void {
    const target = this.loadoutCounts[index];
    if (target !== undefined) {
      this.pulse(target, 1.35);
    }
  }

  /** A short scale-up that settles back, for a value the player should notice. */
  private pulse(target: Phaser.GameObjects.Text, scale: number): void {
    if (prefersReducedMotion()) {
      return;
    }
    this.tweens.killTweensOf(target);
    target.setScale(scale);
    this.tweens.add({
      targets: target,
      scale: 1,
      duration: PULSE_MILLISECONDS,
      ease: Phaser.Math.Easing.Cubic.Out,
    });
  }

  /**
   * Places every element from the current canvas size.
   *
   * Re-run on every resize because the canvas is `Phaser.Scale.RESIZE` at full window:
   * anything positioned once at boot ends up in the wrong corner the moment the window
   * changes, and on a first frame before layout it can be off-screen entirely.
   */
  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const margin = safeMargin(width, height);

    this.positionText.setPosition(margin, margin);
    this.lapText.setPosition(margin, margin + 58);
    this.cashText.setPosition(margin, margin + 88);
    this.pointsText.setPosition(margin, margin + 112);

    this.timeText.setPosition(width - margin, margin).setOrigin(1, 0);
    this.standingsText.setPosition(width - margin, margin + 34).setOrigin(1, 0);

    // Left column, under the position/lap stack. Sit below the PTS line by a
    // fixed gap so the halo never eats the cash/pts (18px font + 5px stroke).
    const stackBottom = this.minimapTop();
    const railHeight = ICON_SIZE + RAIL_PAD * 2;
    const loadoutTop = height - margin - BAR_HEIGHT - RAIL_PAD - railHeight;
    const budget = Math.max(96, loadoutTop - stackBottom - 12);
    const target = Math.round(Math.min(width, height) * 0.18);
    const mapSize = Math.max(96, Math.min(Math.max(target, 160), budget));
    this.mapMargin = margin;
    this.mapStackBottom = stackBottom;
    this.minimap.setSize(mapSize, mapSize);
    this.placeMinimap();

    const barY = height - margin - BAR_HEIGHT;
    this.barBackground.setPosition(margin, barY);
    this.barFill.setPosition(margin, barY);
    const iconY = barY - RAIL_PAD - ICON_SIZE / 2;
    this.railPlate.setPosition(margin - RAIL_PAD, iconY - ICON_SIZE / 2 - RAIL_PAD);
    this.loadoutIcons.forEach((icon, index) => {
      const slotX = margin + index * SLOT_WIDTH;
      icon.setPosition(slotX + ICON_SIZE / 2, iconY);
      icon.setDisplaySize(ICON_SIZE, ICON_SIZE);
      this.loadoutCounts[index]?.setPosition(slotX + ICON_SIZE + ICON_COUNT_GAP, iconY);
      if (index === 0) {
        const barX = slotX + ICON_SIZE + ICON_COUNT_GAP;
        this.nitroTrack.setPosition(barX, iconY);
        this.nitroFill.setPosition(barX + 2, iconY);
      }
    });

    // Analog cluster: bottom-right, the only free corner — top corners hold
    // position/lap and time/standings, bottom-left is the integrity + loadout rail.
    // Right-aligned using the cluster's own reported size, title-safe 5%.
    const gaugeSize = this.gauge.size;
    const gaugeX = width - margin - gaugeSize.width;
    const gaugeY = height - margin - gaugeSize.height;
    this.gauge.setPosition(gaugeX, gaugeY);

    // Well above centre on purpose: the chase camera keeps the player's car in the
    // middle of the screen, so a countdown at the centre sits squarely on top of the
    // car the player is about to launch.
    this.countdownText.setPosition(width / 2, height * 0.26);

    // Title-safe centre-top: 10% down from the top edge, never the screen corner.
    const podiumY = Math.max(margin + 48, height * 0.12);
    this.podiumPlate.setPosition(width / 2, podiumY);
    this.podiumClockText.setPosition(width / 2, podiumY);
    this.podiumTimeoutLabel.setPosition(width / 2, podiumY + 44);
  }

  /** Top of the halo: just under PTS, with room for the stroke outline. */
  private minimapTop(): number {
    const textBottom = this.pointsText.y + Math.max(this.pointsText.height, 28);
    return Math.round(textBottom + 20);
  }

  /** Centre the halo under the left text stack, never left of the title-safe margin. */
  private placeMinimap(): void {
    const stackWidth = Math.max(
      this.positionText.width,
      this.lapText.width,
      this.cashText.width,
      this.pointsText.width,
    );
    const mapWidth = this.minimap.contentSize.width;
    const extra = Number.isFinite(mapWidth) && mapWidth > 0 ? stackWidth - mapWidth : 0;
    const x = this.mapMargin + Math.round(Math.max(0, extra) / 2);
    this.mapStackBottom = this.minimapTop();
    this.minimap.setPosition(x, this.mapStackBottom);
  }

  /**
   * The race scene, or null while it is still starting up.
   *
   * Null-guarded rather than asserted: this scene is launched alongside `RaceScene`
   * and Phaser gives no ordering promise about which one's `update` runs first on the
   * very first frame, so a hard assertion here would be a crash that only ever
   * happened on slow machines.
   */
  private raceSource(): HudSource | null {
    const scene = this.scene.get(SCENE_KEY.RACE) as unknown as HudSource | undefined;
    if (scene === undefined || typeof scene.hudReadout !== 'function') {
      return null;
    }
    return scene;
  }

  private bigStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '52px',
      color: '#ffd85c',
      stroke: '#1a0e05',
      strokeThickness: 7,
    };
  }

  private cashStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#8bff9b',
      stroke: '#101014',
      strokeThickness: 5,
    };
  }

  private pointsStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffd85c',
      stroke: '#101014',
      strokeThickness: 5,
    };
  }

  private labelStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#f2f2f2',
      stroke: '#101014',
      strokeThickness: 5,
    };
  }

  /** Two-digit stock next to a 64px icon — same stroke as the rest of the HUD. */
  private loadoutCountStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#f2f2f2',
      stroke: '#101014',
      strokeThickness: 6,
    };
  }

  private smallStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#d8dae2',
      stroke: '#101014',
      strokeThickness: 4,
      align: 'right',
    };
  }

  private countdownStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '104px',
      color: '#ffe066',
      stroke: '#3a0d05',
      strokeThickness: 12,
    };
  }

  private podiumClockStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '72px',
      color: PODIUM_YELLOW,
      stroke: '#101014',
      strokeThickness: 10,
    };
  }

  private podiumLabelStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: PODIUM_YELLOW,
      stroke: '#101014',
      strokeThickness: 6,
    };
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Green while healthy, amber while damaged, red when the next hit could be the last. */
function barColour(percent: number): number {
  if (percent > BAR_HEALTHY_ABOVE) {
    return COLOUR_HEALTHY;
  }
  if (percent > BAR_DAMAGED_ABOVE) {
    return COLOUR_DAMAGED;
  }
  return COLOUR_CRITICAL;
}
