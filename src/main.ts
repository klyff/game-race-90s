import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.ts';
import { GarageScene } from './scenes/GarageScene.ts';
import { HudScene } from './scenes/HudScene.ts';
import { HelpScene } from './scenes/HelpScene.ts';
import { PauseScene } from './scenes/PauseScene.ts';
import { PlanetSelectScene } from './scenes/PlanetSelectScene.ts';
import { RaceScene } from './scenes/RaceScene.ts';
import { ResultsScene } from './scenes/ResultsScene.ts';
import { SplashScene } from './scenes/SplashScene.ts';
import { TrackSelectScene } from './scenes/TrackSelectScene.ts';

/**
 * Browser entry point. Everything interesting happens in the scenes; this file
 * only says how the canvas behaves.
 *
 * `pixelArt` and `roundPixels` are not cosmetic choices: the cars are 32
 * pre-rendered 64x64 frames, so any smoothing or sub-pixel placement would blur
 * the exact pixels the sprite generator was so careful about.
 */
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a0a12',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  // Order here is registration, not sequence: `BootScene` is first so it auto-starts,
  // and each scene names the next one itself (boot -> splash -> planet -> track ->
  // race). `HudScene` declares `active: false` and is launched by `RaceScene` once
  // there is a race to report on.
  scene: [
    BootScene,
    SplashScene,
    GarageScene,
    PlanetSelectScene,
    TrackSelectScene,
    RaceScene,
    HudScene,
    ResultsScene,
    PauseScene,
    HelpScene,
  ],
});

/**
 * Development-only handle on the running game.
 *
 * The renderer's only real acceptance test is a human — or a headless browser —
 * looking at the screen, and neither can reach a game instance that is closed
 * over by a module. Exposing it keeps "zoom out and check the whole circuit" a
 * one-liner from a devtools console or a screenshot script.
 *
 * Gated on `MODE` rather than `import.meta.env.DEV`: `vite build` forces
 * `NODE_ENV=production`, so `DEV` is false even for `vite build --mode development`
 * and this block would be silently tree-shaken out of exactly the build used to
 * verify it. `MODE` follows `--mode`, which is what was actually asked for.
 */
if (import.meta.env.MODE !== 'production') {
  (window as unknown as { game?: Phaser.Game }).game = game;
}

