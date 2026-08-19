import Phaser from 'phaser';
import {
  applyMatrixStripToSheet,
  carSheetImageUrl,
  cartPortraitKey,
  isBBoxSheet,
  matrixStripCacheKey,
  parseCarSetManifest,
  parseMatrixStripJson,
  portraitCandidateUrls,
  sheetCellSize,
} from '../data/cars/CarManifest.ts';
import type { CarSetManifest, CarSheetManifest, MatrixStripAtlas } from '../data/cars/CarManifest.ts';
import { garageCarouselIds } from '../data/cars/MatrixCarIndex.ts';
import { PLANET_THEMES } from '../data/tracks/planetThemes.ts';
import { parseTrackLinesManifest } from '../data/tracks/TrackLines.ts';
import { TRACKS } from '../data/tracks/registry.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { markMusicBedLoaded } from '../adapters/audio/BedRegistry.ts';
import { MUSIC_BEDS, musicBedKey, musicBedUrl } from '../data/audio/MusicBeds.ts';
import { enableTourMode, enableTourModeFromSearch } from '../adapters/progress/TourMode.ts';
import {
  enableWatchModeFromSearch,
  watchTrackFromSearch,
} from '../adapters/progress/WatchMode.ts';
import {
  debugIaMix,
  debugIaNpcCount,
  debugIaSeed,
  debugIaTrackFromSearch,
  enableDebugIaModeFromSearch,
} from '../adapters/progress/DebugIaMode.ts';
import { watchPlanetTwoTracks } from '../domain/race/WatchField.ts';
import { SPLASH_CARDS, splashCardUrl } from '../data/cards/SplashCards.ts';
import { DRIVER_CARDS, driverCardUrl } from '../data/cards/DriverCards.ts';
import { PUB_BACKGROUNDS, pubBackgroundKey, pubBackgroundUrl } from '../data/ui/PubBackgrounds.ts';
import { SCRAP_SPRITES } from '../adapters/render/MetalScrapRoster.ts';
import {
  CAR_ASSET_DIRECTORY,
  CAR_MANIFEST_KEY,
  DEBRIS_ASSET_DIRECTORY,
  GROUND_ASSET_DIRECTORY,
  camerasCacheKey,
  CAMERAS_ASSET_DIRECTORY,
  trapsCacheKey,
  TRAPS_ASSET_DIRECTORY,
  linesCacheKey,
  LINES_ASSET_DIRECTORY,
  PLANET_ART_DIRECTORY,
  SCENE_KEY,
  GARAGE_ART_FILE,
  GARAGE_ART_KEY,
  SPLASH_ART_FILE,
  SPLASH_ART_KEY,
  UI_ASSET_DIRECTORY,
  HUD_ICON_DIRECTORY,
  HUD_ICONS,
  GASOLINE_SPRITE_FILE,
  GASOLINE_SPRITE_KEY,
  TRAP_CRATE_FILE,
  TRAP_CRATE_KEY,
  TRAP_GASOLINE_FILE,
  TRAP_GASOLINE_KEY,
  WOOD_CHIP_SPRITES,
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
  private readonly optionalKeys = new Set<string>();

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
      const cameraKey = camerasCacheKey(track.id);
      this.optionalKeys.add(cameraKey);
      this.load.json(cameraKey, `${CAMERAS_ASSET_DIRECTORY}/${track.id}.json`);
      const trapKey = trapsCacheKey(track.id);
      this.optionalKeys.add(trapKey);
      this.load.json(trapKey, `${TRAPS_ASSET_DIRECTORY}/${track.id}.json`);
    }
    // A missing weapon sprite is not fatal — those assets are optional and the race
    // falls back to primitives — so weapon keys are filtered out of the error path.
    // Any OTHER load failure is fatal and reported on screen.
    for (const key of [
      ...WEAPON_SPRITES.map(sprite => sprite.key),
      ...HUD_ICONS.map(icon => icon.key),
      GASOLINE_SPRITE_KEY,
      TRAP_CRATE_KEY,
      TRAP_GASOLINE_KEY,
      ...WOOD_CHIP_SPRITES.map(chip => chip.key),
      ...SCRAP_SPRITES.map(sprite => sprite.key),
      ...PLANET_THEMES.map(theme => theme.artKey),
      ...PLANET_THEMES.map(theme => theme.groundKey),
      ...MUSIC_BEDS.map(bed => musicBedKey(bed)),
      ...DRIVER_CARDS.map(card => card.key),
      ...PUB_BACKGROUNDS.map(pub => pubBackgroundKey(pub)),
    ]) {
      this.optionalKeys.add(key);
    }
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      if (this.optionalKeys.has(file.key)) {
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
      if (isBBoxSheet(car) && car.framesJson !== undefined) {
        // Variable-width matrix strip: one image + JSON crop boxes. A fixed
        // frameWidth spritesheet would slice car_18_strip_64.png wrong.
        this.load.image(car.id, carSheetImageUrl(car));
        this.load.json(matrixStripCacheKey(car.id), car.framesJson);
      } else {
        // One horizontal strip per car. Most sheets are 64×64; a redrawn car may be larger.
        const cell = sheetCellSize(car, manifest);
        this.load.spritesheet(car.id, `${CAR_ASSET_DIRECTORY}/${car.image}`, {
          frameWidth: cell.width,
          frameHeight: cell.height,
        });
      }
      this.queuePortrait(car.id);
    }
    const queuedPortraits = new Set(manifest.cars.map(car => car.id));
    for (const carId of garageCarouselIds()) {
      if (queuedPortraits.has(carId)) {
        continue;
      }
      this.queuePortrait(carId);
    }

    this.load.image(SPLASH_ART_KEY, `${UI_ASSET_DIRECTORY}/${SPLASH_ART_FILE}`);
    this.load.image(GARAGE_ART_KEY, `${UI_ASSET_DIRECTORY}/${GARAGE_ART_FILE}`);
    for (const pub of PUB_BACKGROUNDS) {
      this.load.image(pubBackgroundKey(pub), pubBackgroundUrl(pub));
    }
    for (const card of SPLASH_CARDS) {
      this.load.image(card.key, splashCardUrl(card));
    }
    for (const card of DRIVER_CARDS) {
      this.load.image(card.key, driverCardUrl(card));
    }

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

    for (const icon of HUD_ICONS) {
      this.load.image(icon.key, `${HUD_ICON_DIRECTORY}/${icon.file}`);
    }
    this.load.image(GASOLINE_SPRITE_KEY, `${HUD_ICON_DIRECTORY}/${GASOLINE_SPRITE_FILE}`);
    this.load.image(TRAP_CRATE_KEY, `${TRAPS_ASSET_DIRECTORY}/${TRAP_CRATE_FILE}`);
    this.load.image(TRAP_GASOLINE_KEY, `${TRAPS_ASSET_DIRECTORY}/${TRAP_GASOLINE_FILE}`);
    for (const chip of WOOD_CHIP_SPRITES) {
      this.load.image(chip.key, `${TRAPS_ASSET_DIRECTORY}/${chip.file}`);
    }

    // Optional metal scraps: missing files fall back to gunmetal rects in race.
    for (const scrap of SCRAP_SPRITES) {
      this.load.image(scrap.key, `${DEBRIS_ASSET_DIRECTORY}/${scrap.file}`);
    }

    for (const bed of MUSIC_BEDS) {
      this.load.audio(musicBedKey(bed), musicBedUrl(bed));
    }

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      let liveManifest: CarSetManifest;
      try {
        liveManifest = this.installBBoxSheets(manifest);
      } catch (error) {
        this.showFatalError(error instanceof Error ? error.message : String(error));
        return;
      }
      for (const car of liveManifest.cars) {
        this.promotePortrait(car.id);
      }
      for (const bed of MUSIC_BEDS) {
        if (this.cache.audio.exists(musicBedKey(bed))) {
          markMusicBedLoaded(bed.id);
        }
      }
      if (typeof location !== 'undefined') {
        enableTourModeFromSearch(location.search);
        if (enableDebugIaModeFromSearch(location.search)) {
          enableTourMode();
          const trackId =
            debugIaTrackFromSearch(location.search) ??
            watchTrackFromSearch(location.search) ??
            watchPlanetTwoTracks()[0];
          this.scene.start(SCENE_KEY.RACE, {
            manifest: liveManifest,
            linesByTrack,
            trackId,
            watch: true,
            debugIa: true,
            debugIaSeed: debugIaSeed(),
            debugIaMix: debugIaMix(),
            debugIaNpcCount: debugIaNpcCount(),
          });
          return;
        }
        if (enableWatchModeFromSearch(location.search)) {
          enableTourMode();
          const trackId = watchTrackFromSearch(location.search) ?? watchPlanetTwoTracks()[0];
          this.scene.start(SCENE_KEY.RACE, {
            manifest: liveManifest,
            linesByTrack,
            trackId,
            watch: true,
          });
          return;
        }
      }
      this.scene.start(SCENE_KEY.SPLASH, { manifest: liveManifest, linesByTrack });
    });
    this.load.start();
  }

  /**
   * Crop variable-width matrix strips from JSON boxes and fold that collision
   * onto the live manifest. Grid sheets are already Phaser spritesheets.
   */
  private installBBoxSheets(manifest: CarSetManifest): CarSetManifest {
    const cars: CarSheetManifest[] = manifest.cars.map(car => {
      if (!isBBoxSheet(car) || car.framesJson === undefined) {
        return car;
      }
      const strip = parseMatrixStripJson(this.cache.json.get(matrixStripCacheKey(car.id)));
      this.addBBoxFrames(car.id, strip);
      return applyMatrixStripToSheet(car, strip, manifest.pixelsPerUnit);
    });
    return { ...manifest, cars };
  }

  private addBBoxFrames(carId: string, strip: MatrixStripAtlas): void {
    const texture = this.textures.get(carId);
    for (const frame of strip.frames) {
      const added = texture.add(String(frame.i), 0, frame.x, frame.y, frame.w, frame.h);
      if (added === null) {
        continue;
      }
      added.customPivot = true;
      added.pivotX = frame.pivotX;
      added.pivotY = frame.pivotY;
    }
  }

  /**
   * Garage still is the matrix vitrine: `matrix_car/1_hero/car_1_hero.png`
   * for both `car-1` and `car_1`. Older `*_hero` / `*_300px` files are only
   * fallbacks when that folder is missing. `promotePortrait` keeps the first
   * candidate that actually loaded.
   */
  private portraitUrls(carId: string): readonly string[] {
    return portraitCandidateUrls(carId);
  }

  private queuePortrait(carId: string): void {
    this.portraitUrls(carId).forEach((url, index) => {
      const trial = `${cartPortraitKey(carId)}#${index}`;
      this.optionalKeys.add(trial);
      this.load.image(trial, url);
    });
  }

  private promotePortrait(carId: string): void {
    const dest = cartPortraitKey(carId);
    for (let index = 0; index < this.portraitUrls(carId).length; index += 1) {
      const trial = `${dest}#${index}`;
      if (!this.textures.exists(trial)) {
        continue;
      }
      const image = this.textures.get(trial).getSourceImage();
      if (!(image instanceof HTMLImageElement) || image.naturalWidth < 2) {
        continue;
      }
      this.textures.addImage(dest, image);
      return;
    }
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
