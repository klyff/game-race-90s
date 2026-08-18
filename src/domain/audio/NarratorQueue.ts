import type { PlannedClip } from '../../data/audio/NarratorBank.ts';

/** Current line plus two waiting = three in a row, never stacked on top of each other. */
export const NARRATOR_MAX_SEQUENCE = 3;
const MAX_WAITING = NARRATOR_MAX_SEQUENCE - 1;

export const NARRATOR_PRIORITY = {
  HIGH: 'high',
  LOW: 'low',
} as const;
export type NarratorPriority = (typeof NARRATOR_PRIORITY)[keyof typeof NARRATOR_PRIORITY];

/**
 * One-at-a-time narrator line-up.
 *
 * The adapter plays; this only decides who is next. A high-priority cue
 * (start, final lap, finish) can kick the last waiting banter when the
 * line is already full. Low-priority cues drop on the floor.
 */
export class NarratorQueue {
  private waiting: PlannedClip[] = [];
  private playing: PlannedClip | undefined;

  get isPlaying(): boolean {
    return this.playing !== undefined;
  }

  get pendingCount(): number {
    return this.waiting.length;
  }

  get sequenceCount(): number {
    return (this.playing === undefined ? 0 : 1) + this.waiting.length;
  }

  offer(clip: PlannedClip, priority: NarratorPriority = NARRATOR_PRIORITY.LOW): boolean {
    if (this.playing === undefined && this.waiting.length === 0) {
      this.waiting.push(clip);
      return true;
    }
    if (this.waiting.length < MAX_WAITING) {
      this.waiting.push(clip);
      return true;
    }
    if (priority === NARRATOR_PRIORITY.HIGH) {
      this.waiting[this.waiting.length - 1] = clip;
      return true;
    }
    return false;
  }

  /** Next clip the adapter should start. Undefined while one is already speaking. */
  take(): PlannedClip | undefined {
    if (this.playing !== undefined) {
      return undefined;
    }
    const next = this.waiting.shift();
    if (next === undefined) {
      return undefined;
    }
    this.playing = next;
    return next;
  }

  onEnded(): void {
    this.playing = undefined;
  }

  clear(): void {
    this.waiting = [];
    this.playing = undefined;
  }
}
