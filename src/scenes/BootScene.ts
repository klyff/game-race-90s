import Phaser from 'phaser';
import {
  applyAvailableMatrixStrips,
  applyMatrixStripToSheet,
  applyNogoLabs,
  carSheetImageUrl,
  cartPortraitKey,
  isBBoxSheet,
  isNogoLabCarId,
  isPlayableCarSheet,
  matrixHeroNumber,
  matrixStripCacheKey,
  isSpinnerCarId,
  parseCarSetManifest,
  parseCarStripJson,
  portraitCandidateUrls,
} from '../data/cars/CarManifest.ts';
import type { CarSetManifest, CarSheetManifest, MatrixStripAtlas } from '../data/cars/CarManifest.ts';
import { PLANET_THEMES } from '../data/tracks/planetThemes.ts';
import { parseTrackLinesManifest } from '../data/tracks/TrackLines.ts';
import { TRACKS } from '../data/tracks/registry.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { enableTourMode, enableTourModeFromSearch } from '../adapters/progress/TourMode.ts';
import {
  enableWatchModeFromSearch,
  watchCarFromSearch,
  watchPilotFromSearch,
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
import { DRIVER_CARDS, driverCardUrl } from '../data/cards/DriverCards.ts';
import { SPLASH_CARDS, splashCardUrl } from '../data/cards/SplashCards.ts';
import { SCRAP_SPRITES } from '../adapters/render/MetalScrapRoster.ts';
import {
  CAR_ASSET_DIRECTORY,
  CAR_MANIFEST_KEY,
  DEBRIS_ASSET_DIRECTORY,
  camerasCacheKey,
  CAMERAS_ASSET_DIRECTORY,
  trapsCacheKey,
  TRAPS_ASSET_DIRECTORY,
  linesCacheKey,
  LINES_ASSET_DIRECTORY,
  SCENE_KEY,
  GARAGE_ART_FILE,
  GARAGE_ART_KEY,
  GARAGE_PLATE_COUNT,
  GARAGE_PLATE_DIRECTORY,
  garageArtFile,
  garageArtKey,
  SPLASH_ART_FILE,
  SPLASH_ART_KEY,
  UI_ASSET_DIRECTORY,
  HUD_ICON_DIRECTORY,
  HUD_ICONS,
  GASOLINE_SPRITE_FILE,
  GASOLINE_SPRITE_KEY,
  CROWD_ASSET_DIRECTORY,
  CROWD_SPRITES,
  CRATE_SMASH_SPRITES,
  TRAP_PROP_SPRITES,
  WOOD_CHIP_SPRITES,
  WEAPON_ASSET_DIRECTORY,
  WEAPON_SHEET,
  WEAPON_SPRITES,
  MISSILE_EXHAUST_FILE,
  MISSILE_EXHAUST_KEY,
  MISSILE_EXHAUST_SHEET,
  MISSILE_SHEET,
  MISSILE_SPRITE_KEY,
  MISSILE_STRIP_FILE,
} from './sceneKeys.ts';

/**
 * Two-pass boot: manifest + lines first, then only assets that exist on disk.
 * Missing car strips are skipped (not fatal). Required art failures stay on
 * screen — Splash is not started after a required FILE_LOAD_ERROR.
 */
export class BootScene extends Phaser.Scene {
  private readonly optionalKeys = new Set<string>();
  private bootFailed = false;
  private loadLabel?: Phaser.GameObjects.Text;
  private loadBar?: Phaser.GameObjects.Graphics;

  constructor() {
    super(SCENE_KEY.BOOT);
  }

  preload(): void {
    this.drawLoadUi(0, 'READING MANIFEST');
    this.load.json(CAR_MANIFEST_KEY, `${CAR_ASSET_DIRECTORY}/cars.json`);
    for (const track of TRACKS) {
      this.load.json(linesCacheKey(track.id), `${LINES_ASSET_DIRECTORY}/${track.id}.json`);
      const cameraKey = camerasCacheKey(track.id);
      this.optionalKeys.add(cameraKey);
      this.load.json(cameraKey, `${CAMERAS_ASSET_DIRECTORY}/${track.id}.json`);
      const trapKey = trapsCacheKey(track.id);
      this.optionalKeys.add(trapKey);
      this.load.json(trapKey, `${TRAPS_ASSET_DIRECTORY}/${track.id}.json`);
    }
    for (const key of [
      MISSILE_SPRITE_KEY,
      MISSILE_EXHAUST_KEY,
      ...WEAPON_SPRITES.map(sprite => sprite.key),
      ...HUD_ICONS.map(icon => icon.key),
      GASOLINE_SPRITE_KEY,
      ...TRAP_PROP_SPRITES.map(prop => prop.key),
      ...WOOD_CHIP_SPRITES.map(chip => chip.key),
      ...CRATE_SMASH_SPRITES.map(smash => smash.key),
      ...CROWD_SPRITES.map(sprite => sprite.key),
      ...SCRAP_SPRITES.map(sprite => sprite.key),
      ...PLANET_THEMES.map(theme => theme.artKey),
      ...PLANET_THEMES.map(theme => theme.groundKey),
    ]) {
      this.optionalKeys.add(key);
    }
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      this.drawLoadUi(value, 'LOADING');
    });
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      if (this.optionalKeys.has(file.key)) {
        return;
      }
      this.failBoot(`Failed to load ${file.src}`);
    });
  }

  create(): void {
    if (this.bootFailed) {
      return;
    }
    let manifest: CarSetManifest;
    let linesByTrack: Record<string, TrackLinesManifest>;
    try {
      manifest = applyNogoLabs(
        applyAvailableMatrixStrips(parseCarSetManifest(this.cache.json.get(CAR_MANIFEST_KEY))),
      );
    } catch (error) {
      this.failBoot(error instanceof Error ? error.message : String(error));
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
      this.failBoot(error instanceof Error ? error.message : String(error));
      return;
    }

    const queuedIds = new Set<string>();
    for (const car of manifest.cars) {
      if (!isPlayableCarSheet(car)) {
        continue;
      }
      if (queuedIds.has(car.id)) {
        continue;
      }
      queuedIds.add(car.id);
      this.load.image(car.id, carSheetImageUrl(car));
      if (car.framesJson !== undefined) {
        this.load.json(matrixStripCacheKey(car.id), car.framesJson);
      }
    }

    for (const car of manifest.cars) {
      if (isSpinnerCarId(car.id)) {
        this.queuePortrait(car.id);
      }
    }

    this.load.image(SPLASH_ART_KEY, `${UI_ASSET_DIRECTORY}/${SPLASH_ART_FILE}`);
    this.load.image(GARAGE_ART_KEY, `${UI_ASSET_DIRECTORY}/${GARAGE_ART_FILE}`);
    for (let planet = 1; planet <= GARAGE_PLATE_COUNT; planet += 1) {
      this.load.image(garageArtKey(planet), `${GARAGE_PLATE_DIRECTORY}/${garageArtFile(planet)}`);
    }
    for (const card of SPLASH_CARDS) {
      this.load.image(card.key, splashCardUrl(card));
    }
    for (const card of DRIVER_CARDS) {
      this.load.image(card.key, driverCardUrl(card));
    }

    this.load.spritesheet(MISSILE_SPRITE_KEY, `${WEAPON_ASSET_DIRECTORY}/${MISSILE_STRIP_FILE}`, {
      frameWidth: MISSILE_SHEET.frameWidth,
      frameHeight: MISSILE_SHEET.frameHeight,
    });
    this.load.spritesheet(MISSILE_EXHAUST_KEY, `${WEAPON_ASSET_DIRECTORY}/${MISSILE_EXHAUST_FILE}`, {
      frameWidth: MISSILE_EXHAUST_SHEET.frameWidth,
      frameHeight: MISSILE_EXHAUST_SHEET.frameHeight,
    });
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
    for (const prop of TRAP_PROP_SPRITES) {
      this.load.image(prop.key, `${TRAPS_ASSET_DIRECTORY}/${prop.file}`);
    }
    for (const chip of WOOD_CHIP_SPRITES) {
      this.load.image(chip.key, `${TRAPS_ASSET_DIRECTORY}/${chip.file}`);
    }
    for (const smash of CRATE_SMASH_SPRITES) {
      this.load.image(smash.key, `${TRAPS_ASSET_DIRECTORY}/${smash.file}`);
    }
    for (const sprite of CROWD_SPRITES) {
      this.load.image(sprite.key, `${CROWD_ASSET_DIRECTORY}/${sprite.file}`);
    }
    for (const scrap of SCRAP_SPRITES) {
      this.load.image(scrap.key, `${DEBRIS_ASSET_DIRECTORY}/${scrap.file}`);
    }

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (this.bootFailed) {
        return;
      }
      let liveManifest: CarSetManifest;
      try {
        liveManifest = this.installBBoxSheets(manifest);
      } catch (error) {
        this.failBoot(error instanceof Error ? error.message : String(error));
        return;
      }
      for (const car of liveManifest.cars) {
        this.promotePortrait(car.id);
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
            watchPinPilot: watchPilotFromSearch(location.search),
            watchPinCar: watchCarFromSearch(location.search),
          });
          return;
        }
      }
      this.scene.start(SCENE_KEY.SPLASH, { manifest: liveManifest, linesByTrack });
    });
    this.drawLoadUi(0, 'LOADING ART');
    this.load.start();
  }

  private installBBoxSheets(manifest: CarSetManifest): CarSetManifest {
    const cars: CarSheetManifest[] = manifest.cars.map(car => {
      if (!isBBoxSheet(car) || car.framesJson === undefined) {
        return car;
      }
      if (!this.textures.exists(car.id) || !this.cache.json.exists(matrixStripCacheKey(car.id))) {
        return { ...car, framesJson: undefined };
      }
      const strip = parseCarStripJson(this.cache.json.get(matrixStripCacheKey(car.id)));
      this.addBBoxFrames(car.id, strip);
      return applyMatrixStripToSheet(car, strip, manifest.pixelsPerUnit);
    });
    return { ...manifest, cars };
  }

  private addBBoxFrames(carId: string, strip: MatrixStripAtlas): void {
    const texture = this.textures.get(carId);
    for (const frame of strip.frames) {
      const frameName = isNogoLabCarId(carId) ? String(frame.clockIndex) : String(frame.i);
      const added = texture.add(frameName, 0, frame.x, frame.y, frame.w, frame.h);
      if (added === null) {
        continue;
      }
      added.customPivot = true;
      added.pivotX = frame.pivotX;
      added.pivotY = frame.pivotY;
    }
  }

  private queuePortrait(carId: string): void {
    this.portraitUrls(carId).forEach((url, index) => {
      const trial = `${cartPortraitKey(carId)}#${index}`;
      this.optionalKeys.add(trial);
      this.load.image(trial, url);
    });
  }

  private portraitUrls(carId: string): readonly string[] {
    return portraitCandidateUrls(carId);
  }

  private promotePortrait(carId: string): void {
    const dest = cartPortraitKey(carId);
    if (this.textures.exists(dest)) {
      return;
    }
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
    const n = matrixHeroNumber(carId);
    if (n === undefined) {
      return;
    }
    for (const other of this.textures.getTextureKeys()) {
      if (!other.startsWith('cart-portrait:') || !other.includes('#')) {
        continue;
      }
      const sourceId = other.slice('cart-portrait:'.length).split('#')[0] ?? '';
      if (matrixHeroNumber(sourceId) !== n) {
        continue;
      }
      const image = this.textures.get(other).getSourceImage();
      if (!(image instanceof HTMLImageElement) || image.naturalWidth < 2) {
        continue;
      }
      this.textures.addImage(dest, image);
      return;
    }
  }

  private drawLoadUi(progress: number, caption: string): void {
    const width = this.scale.width;
    const height = this.scale.height;
    if (this.loadLabel === undefined) {
      this.loadLabel = this.add
        .text(width / 2, height / 2 - 18, caption, {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#d8dae2',
        })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(1000);
    } else {
      this.loadLabel.setText(caption).setPosition(width / 2, height / 2 - 18);
    }
    if (this.loadBar === undefined) {
      this.loadBar = this.add.graphics().setScrollFactor(0).setDepth(1000);
    }
    const barW = Math.min(420, width * 0.6);
    const barH = 14;
    const x = (width - barW) / 2;
    const y = height / 2 + 8;
    this.loadBar.clear();
    this.loadBar.fillStyle(0x22222c, 1);
    this.loadBar.fillRect(x, y, barW, barH);
    this.loadBar.fillStyle(0xffd85c, 1);
    this.loadBar.fillRect(x, y, barW * Math.max(0, Math.min(1, progress)), barH);
  }

  private failBoot(message: string): void {
    this.bootFailed = true;
    this.load.removeAllListeners(Phaser.Loader.Events.COMPLETE);
    this.load.reset();
    this.showFatalError(message);
  }

  private showFatalError(message: string): void {
    this.add
      .text(16, 16, `Boot failed\n\n${message}`, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ff8080',
        wordWrap: { width: this.scale.width - 32 },
      })
      .setScrollFactor(0)
      .setDepth(2000);
  }
}
