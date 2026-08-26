import type { PlannedClip } from '../../data/audio/NarratorBank.ts';

/** Current line plus two waiting = three in a row, never stacked on top of each other. */
export const NARRATOR_MAX_SEQUENCE = 3;
const MAX_WAITING = NARRATOR_MAX_SEQUENCE - 1;

/** Silence between scheduled commentary lines. Event shouts skip this. */
export const NARRATOR_GAP_SECONDS = 1;

export const NARRATOR_PRIORITY = {
  HIGH: 'high',
  LOW: 'low',
} as const;
export type NarratorPriority = (typeof NARRATOR_PRIORITY)[keyof typeof NARRATOR_PRIORITY];

export interface NarratorCue {
  readonly clip: PlannedClip;
  /** Damage, weapons, start, finish — play as soon as the last line ends. */
  readonly skipGap: boolean;
}

/**
 * Banter waits `gapMs` after the previous clip. Event lines do not.
 */
export function narratorDelayMs(
  skipGap: boolean,
  msSinceEnded: number,
  gapMs: number = NARRATOR_GAP_SECONDS * 1000,
): number {
  if (skipGap) {
    return 0;
  }
  const remaining = gapMs - Math.max(0, msSinceEnded);
  return remaining > 0 ? remaining : 0;
}

/**
 * One-at-a-time narrator line-up.
 *
 * The adapter plays; this only decides who is next. A high-priority cue
 * (start, final lap, finish) can kick the last waiting banter when the
 * line is already full. Low-priority cues drop on the floor.
 */
export class NarratorQueue {
  private waiting: NarratorCue[] = [];
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

  peek(): NarratorCue | undefined {
    return this.waiting[0];
  }

  offer(
    clip: PlannedClip,
    priority: NarratorPriority = NARRATOR_PRIORITY.LOW,
    skipGap = false,
  ): boolean {
    const cue: NarratorCue = { clip, skipGap };
    if (this.playing === undefined && this.waiting.length === 0) {
      this.waiting.push(cue);
      return true;
    }
    if (skipGap) {
      const firstBanter = this.waiting.findIndex((item) => !item.skipGap);
      if (firstBanter === -1) {
        this.waiting.push(cue);
      } else {
        this.waiting.splice(firstBanter, 0, cue);
      }
      if (this.waiting.length > MAX_WAITING) {
        this.waiting.pop();
      }
      return true;
    }
    if (this.waiting.length < MAX_WAITING) {
      this.waiting.push(cue);
      return true;
    }
    if (priority === NARRATOR_PRIORITY.HIGH) {
      this.waiting[this.waiting.length - 1] = cue;
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
    this.playing = next.clip;
    return next.clip;
  }

  onEnded(): void {
    this.playing = undefined;
  }

  clear(): void {
    this.waiting = [];
    this.playing = undefined;
  }
}
