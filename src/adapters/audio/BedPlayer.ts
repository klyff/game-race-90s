import { MUSIC_BED_VOLUME } from '../../data/audio/MusicBeds.ts';

/**
 * Loops one recorded bed. Mute silences it without stopping the element,
 * so unmuting continues in place.
 */
export class BedPlayer {
  private readonly element: HTMLAudioElement;
  private started = false;
  private stopped = false;

  constructor(url: string, volume: number = MUSIC_BED_VOLUME) {
    this.element = new Audio(url);
    this.element.loop = true;
    this.element.preload = 'auto';
    this.element.volume = volume;
  }

  start(): void {
    if (this.started || this.stopped) {
      return;
    }
    this.started = true;
    void this.element.play().catch(() => {
      /* Missing file or autoplay block: caller keeps the procedural fallback. */
      this.started = false;
    });
  }

  setMuted(muted: boolean): void {
    this.element.muted = muted;
  }

  get isPlaying(): boolean {
    return this.started && !this.stopped && !this.element.paused;
  }

  stop(): void {
    if (this.stopped) {
      return;
    }
    this.stopped = true;
    this.element.pause();
    this.element.src = '';
  }
}
