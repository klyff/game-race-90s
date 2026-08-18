import {
  NARRATOR_LAB_DIRECTORY,
  NARRATOR_STASH_DIRECTORY,
  narratorClipKey,
  narratorClipUrl,
  resolveNarratorClip,
  type NarratorClip,
  type PlannedClip,
} from '../../data/audio/NarratorBank.ts';
import { NarratorQueue, type NarratorPriority } from '../../domain/audio/NarratorQueue.ts';

/** Sit above the bed so a shout reads over the guitars. */
const NARRATOR_VOLUME = 0.82;

/**
 * Plays planned narrator clips one after another.
 *
 * Files are HTMLAudio, same as the music beds: missing takes fail silently
 * and the queue moves on. Stash is preferred; lab is the fallback so a
 * fresh `gen:voice-lab` can be heard before anyone copies keepers.
 */
export class NarratorPlayer {
  private readonly queue = new NarratorQueue();
  private readonly elements = new Map<string, HTMLAudioElement>();
  private current: HTMLAudioElement | null = null;
  private muted = false;
  private stopped = false;

  preload(planned: readonly PlannedClip[]): void {
    for (const item of planned) {
      const clip = resolveNarratorClip(item);
      if (clip === undefined) {
        continue;
      }
      const key = narratorClipKey(item);
      if (this.elements.has(key)) {
        continue;
      }
      this.elements.set(key, createElement(clip));
    }
  }

  enqueue(clip: PlannedClip, priority: NarratorPriority): void {
    if (this.stopped) {
      return;
    }
    this.queue.offer(clip, priority);
    this.pump();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.current !== null) {
      this.current.muted = muted;
    }
  }

  reset(): void {
    this.stopCurrent();
    this.queue.clear();
  }

  destroy(): void {
    this.stopped = true;
    this.reset();
    for (const element of this.elements.values()) {
      element.src = '';
    }
    this.elements.clear();
  }

  private pump(): void {
    if (this.stopped) {
      return;
    }
    const next = this.queue.take();
    if (next === undefined) {
      return;
    }
    this.start(next);
  }

  private start(planned: PlannedClip): void {
    const element = this.elements.get(narratorClipKey(planned));
    const clip = resolveNarratorClip(planned);
    if (element === undefined || clip === undefined) {
      this.queue.onEnded();
      this.pump();
      return;
    }
    this.current = element;
    element.muted = this.muted;
    element.currentTime = 0;
    const onDone = (): void => {
      element.removeEventListener('ended', onDone);
      element.removeEventListener('error', onError);
      if (this.current === element) {
        this.current = null;
      }
      this.queue.onEnded();
      this.pump();
    };
    const onError = (): void => {
      if (!element.src.includes(NARRATOR_LAB_DIRECTORY)) {
        element.src = narratorClipUrl(clip, NARRATOR_LAB_DIRECTORY);
        void element.play().catch(() => {
          onDone();
        });
        return;
      }
      onDone();
    };
    element.addEventListener('ended', onDone);
    element.addEventListener('error', onError);
    void element.play().catch(() => {
      onError();
    });
  }

  private stopCurrent(): void {
    if (this.current === null) {
      return;
    }
    this.current.pause();
    this.current.currentTime = 0;
    this.current = null;
  }
}

function createElement(clip: NarratorClip): HTMLAudioElement {
  const element = new Audio();
  element.preload = 'auto';
  element.volume = NARRATOR_VOLUME;
  element.src = narratorClipUrl(clip, NARRATOR_STASH_DIRECTORY);
  return element;
}
