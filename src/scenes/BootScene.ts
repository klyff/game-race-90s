import Phaser from 'phaser';
import { parseCarSetManifest } from '../data/cars/CarManifest.ts';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import { PLANET_THEMES } from '../data/tracks/planetThemes.ts';
import { parseTrackLinesManifest } from '../data/tracks/TrackLines.ts';
import { TRACKS } from '../data/tracks/registry.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import {
  CAR_ASSET_DIRECTORY,
  CAR_MANIFEST_KEY,
  GROUND_ASSET_DIRECTORY,
  linesCacheKey,
  LINES_ASSET_DIRECTORY,
  PLANET_ART_DIRECTORY,
  SCENE_KEY,
  SPLASH_ART_FILE,
  SPLASH_ART_KEY,
  UI_ASSET_DIRECTORY,
  WEAPON_ASSET_DIRECTORY,
  WEAPON_SHEET,
  WEAPON_SPRITES,
} from './sceneKeys.ts';

/**
 * Loads the generated car assets, then hands the parsed manifest to the splash screen.
 *
 * Loading happens in two passes on purpose: the sprite strips are listed IN the
 * manifest, so their filenames are not known until `cars.json` has been read.
 * The first pass fetches the manifest, `create` validates it, and only then are
 * the strips queued. That also means a broken or stale manifest fails here, with
 * a message on screen, instead of surfacing later as an invisible car.
 *
 * The splash artwork joins the second pass rather than the first. It is a megabyte of
 * JPEG that nothing needs until the title is drawn, and putting it behind the manifest
 * check means a failed boot reports the real problem instead of stalling on artwork.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEY.BOOT);
  }

  preload(): void {
    this.load.json(CAR_MANIFEST_KEY, `${CAR_ASSET_DIRECTORY}/cars.json`);
    // Every circuit's offline racing lines: the campaign spans all registered tracks,
    // and RaceScene needs the lines for whichever one the player picks. One key per
    // track keeps the lookup a plain map rather than a re-fetch on every race.
    for (const track of TRACKS) {
      this.load.json(linesCacheKey(track.id), `${LINES_ASSET_DIRECTORY}/${track.id}.json`);
    }
    // A missing weapon sprite is not fatal — those assets are optional and the race
    // falls back to primitives — so weapon keys are filtered out of the error path.
    // Any OTHER load failure is fatal and reported on screen.
    const optionalKeys = new Set<string>([
      ...WEAPON_SPRITES.map(sprite => sprite.key),
      ...PLANET_THEMES.map(theme => theme.artKey),
      ...PLANET_THEMES.map(theme => theme.groundKey),
    ]);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      if (optionalKeys.has(file.key)) {
        return;
      }
      this.showFatalError(`Failed to load ${file.src}`);
    });
  }

  create(): void {
    let manifest: CarSetManifest;
    let linesByTrack: Record<string, TrackLinesManifest>;
    try {
      manifest = parseCarSetManifest(this.cache.json.get(CAR_MANIFEST_KEY));
    } catch (error) {
      this.showFatalError(error instanceof Error ? error.message : String(error));
      return;
    }

    try {
      linesByTrack = {};
      for (const track of TRACKS) {
        linesByTrack[track.id] = parseTrackLinesManifest(
          this.cache.json.get(linesCacheKey(track.id)),
        );
      }
    } catch (error) {
      this.showFatalError(error instanceof Error ? error.message : String(error));
      return;
    }

    for (const car of manifest.cars) {
      // One horizontal strip per car, 32 frames of 64x64 (locked decision 6).
      this.load.spritesheet(car.id, `${CAR_ASSET_DIRECTORY}/${car.image}`, {
        frameWidth: manifest.frameWidth,
        frameHeight: manifest.frameHeight,
      });
    }

    this.load.image(SPLASH_ART_KEY, `${UI_ASSET_DIRECTORY}/${SPLASH_ART_FILE}`);

    for (const theme of PLANET_THEMES) {
      this.load.image(theme.artKey, `${PLANET_ART_DIRECTORY}/${theme.artFile}`);
      this.load.image(theme.groundKey, `${GROUND_ASSET_DIRECTORY}/${theme.groundFile}`);
    }

    // Optional weapon art: 32-frame contact sheets, same layout as the cars.
    // Missing files are swallowed by the filtered error handler above.
    for (const sprite of WEAPON_SPRITES) {
      this.load.spritesheet(sprite.key, `${WEAPON_ASSET_DIRECTORY}/${sprite.file}`, {
        frameWidth: WEAPON_SHEET.frameWidth,
        frameHeight: WEAPON_SHEET.frameHeight,
      });
    }

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.scene.start(SCENE_KEY.SPLASH, { manifest, linesByTrack });
    });
    this.load.start();
  }

  /**
   * Asset problems are the most likely failure on a fresh checkout (nobody ran
   * `npm run gen:sprites`), and a black canvas says nothing. Put the reason where
   * whoever hit it will actually see it.
   */
  private showFatalError(message: string): void {
    this.add
      .text(16, 16, `Boot failed\n\n${message}`, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ff8080',
        wordWrap: { width: this.scale.width - 32 },
      })
      .setScrollFactor(0);
  }
}
