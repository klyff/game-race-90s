import Phaser from 'phaser';
import { formatHud } from '../adapters/render/HudFormat.ts';
import type { HudReadout, HudText } from '../adapters/render/HudFormat.ts';
import { SCENE_KEY } from './sceneKeys.ts';

/**
 * Screen inset for the corner blocks, pixels.
 *
 * A plain pixel value is correct here and would NOT be correct inside `RaceScene`:
 * this scene has its own camera at zoom 1 with no scroll, so one unit of this scene
 * is one screen pixel by definition. See the class comment.
 */
const MARGIN = 22;

/** Integrity bar geometry, pixels. */
const BAR_WIDTH = 190;
const BAR_HEIGHT = 14;

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
  private timeText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private standingsText!: Phaser.GameObjects.Text;
  private barBackground!: Phaser.GameObjects.Rectangle;
  private barFill!: Phaser.GameObjects.Rectangle;

  /** Last rendered values, so a pulse fires on CHANGE rather than every frame. */
  private lastPosition = '';
  private lastLap = '';
  private lastCountdown: string | null = null;

  constructor() {
    super({ key: SCENE_KEY.HUD, active: false });
  }

  create(): void {
    this.positionText = this.add.text(0, 0, '', this.bigStyle()).setDepth(HUD_DEPTH);
    this.lapText = this.add.text(0, 0, '', this.labelStyle()).setDepth(HUD_DEPTH);
    this.timeText = this.add.text(0, 0, '', this.labelStyle()).setDepth(HUD_DEPTH);
    this.standingsText = this.add.text(0, 0, '', this.smallStyle()).setDepth(HUD_DEPTH);
    this.ammoText = this.add.text(0, 0, '', this.labelStyle()).setDepth(HUD_DEPTH);

    this.barBackground = this.add
      .rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setDepth(HUD_DEPTH);
    this.barFill = this.add
      .rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, COLOUR_HEALTHY)
      .setOrigin(0, 0)
      .setDepth(HUD_DEPTH + 1);

    this.countdownText = this.add
      .text(0, 0, '', this.countdownStyle())
      .setOrigin(0.5, 0.5)
      .setDepth(HUD_DEPTH + 2)
      .setVisible(false);

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
  }

  update(): void {
    const source = this.raceSource();
    if (source === null) {
      return;
    }

    const readout = source.hudReadout();
    const text = formatHud(readout);

    this.timeText.setText(text.time);
    this.ammoText.setText(text.ammo);
    this.applyPosition(text);
    this.applyLap(text);
    this.applyIntegrity(text);
    this.applyCountdown(text);
    this.applyStandings(source, readout);
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

    if (text.countdown === 'GO!') {
      this.tweens.add({
        targets: this.countdownText,
        alpha: 0,
        delay: GO_LINGER_MILLISECONDS,
        duration: 260,
        onComplete: () => this.countdownText.setVisible(false),
      });
    }
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

  /** A short scale-up that settles back, for a value the player should notice. */
  private pulse(target: Phaser.GameObjects.Text, scale: number): void {
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

    this.positionText.setPosition(MARGIN, MARGIN);
    this.lapText.setPosition(MARGIN, MARGIN + 58);

    this.timeText.setPosition(width - MARGIN, MARGIN).setOrigin(1, 0);
    this.standingsText.setPosition(width - MARGIN, MARGIN + 34).setOrigin(1, 0);

    const barY = height - MARGIN - BAR_HEIGHT;
    this.barBackground.setPosition(MARGIN, barY);
    this.barFill.setPosition(MARGIN, barY);
    this.ammoText.setPosition(MARGIN, barY - 30);

    // Well above centre on purpose: the chase camera keeps the player's car in the
    // middle of the screen, so a countdown at the centre sits squarely on top of the
    // car the player is about to launch.
    this.countdownText.setPosition(width / 2, height * 0.26);
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

  private labelStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#f2f2f2',
      stroke: '#101014',
      strokeThickness: 5,
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
