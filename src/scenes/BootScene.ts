import Phaser from 'phaser';
import { parseCarSetManifest } from '../data/cars/CarManifest.ts';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import { CAR_ASSET_DIRECTORY, CAR_MANIFEST_KEY, SCENE_KEY } from './sceneKeys.ts';

/**
 * Loads the generated car assets, then hands the parsed manifest to the race.
 *
 * Loading happens in two passes on purpose: the sprite strips are listed IN the
 * manifest, so their filenames are not known until `cars.json` has been read.
 * The first pass fetches the manifest, `create` validates it, and only then are
 * the strips queued. That also means a broken or stale manifest fails here, with
 * a message on screen, instead of surfacing later as an invisible car.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEY.BOOT);
  }

  preload(): void {
    this.load.json(CAR_MANIFEST_KEY, `${CAR_ASSET_DIRECTORY}/cars.json`);
    this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      this.showFatalError(`Failed to load ${file.src}`);
    });
  }

  create(): void {
    let manifest: CarSetManifest;
    try {
      manifest = parseCarSetManifest(this.cache.json.get(CAR_MANIFEST_KEY));
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

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.scene.start(SCENE_KEY.RACE, { manifest });
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
