import Phaser from 'phaser';
import { MUSIC_BED_VOLUME } from '../../data/audio/MusicBeds.ts';
import { stopAllScreenAudio } from './AudioSession.ts';
import { TitleAudio } from './TitleAudio.ts';

export interface MenuAudioOptions {
  /** When false, M is left for typing (garage name). Default: always mute. */
  readonly allowMute?: () => boolean;
  /** Recorded bed level. Splash is louder than the other menus. */
  readonly volume?: number;
}

/**
 * Random recorded bed (or the procedural riff) for a menu scene.
 * No on-screen chrome — music sits under the UI. M stays mute everywhere
 * except when `allowMute` says the key is being typed.
 *
 * Pause and Help stay silent here: they overlay a scene that already owns audio.
 */
export function attachMenuAudio(scene: Phaser.Scene, options: MenuAudioOptions = {}): TitleAudio {
  stopAllScreenAudio();
  const audio = new TitleAudio(options.volume ?? MUSIC_BED_VOLUME);
  const start = (): void => audio.start();
  start();
  scene.input.on(Phaser.Input.Events.POINTER_DOWN, start);
  scene.input.keyboard?.on('keydown', start);
  scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.M).on('down', () => {
    if (options.allowMute !== undefined && !options.allowMute()) {
      return;
    }
    audio.toggleMute();
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => audio.destroy());
  scene.data.set('menuAudio', audio);
  return audio;
}
