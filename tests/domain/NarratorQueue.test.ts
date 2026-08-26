import { describe, expect, it } from 'vitest';
import { NARRATOR_PRIORITY, NarratorQueue, narratorDelayMs } from '../../src/domain/audio/NarratorQueue.ts';

const A = { lineId: 'a', voice: 'echo' as const };
const B = { lineId: 'b', voice: 'verse' as const };
const C = { lineId: 'c', voice: 'echo' as const };
const D = { lineId: 'd', voice: 'verse' as const };

describe('NarratorQueue', () => {
  it('never overlaps: take is empty while a line is speaking', () => {
    const queue = new NarratorQueue();
    expect(queue.offer(A)).toBe(true);
    expect(queue.take()).toEqual(A);
    expect(queue.offer(B)).toBe(true);
    expect(queue.take()).toBeUndefined();
    queue.onEnded();
    expect(queue.take()).toEqual(B);
  });

  it('holds at most two waiting so three speak in a row', () => {
    const queue = new NarratorQueue();
    queue.offer(A);
    queue.take();
    expect(queue.offer(B)).toBe(true);
    expect(queue.offer(C)).toBe(true);
    expect(queue.offer(D)).toBe(false);
    expect(queue.sequenceCount).toBe(3);
  });

  it('lets a high-priority cue replace the last waiting banter', () => {
    const queue = new NarratorQueue();
    queue.offer(A);
    queue.take();
    queue.offer(B);
    queue.offer(C);
    expect(queue.offer(D, NARRATOR_PRIORITY.HIGH)).toBe(true);
    queue.onEnded();
    expect(queue.take()).toEqual(B);
    queue.onEnded();
    expect(queue.take()).toEqual(D);
  });

  it('keeps skipGap on the waiting cue so events can jump the 1s pause', () => {
    const queue = new NarratorQueue();
    expect(queue.offer(A, NARRATOR_PRIORITY.LOW, false)).toBe(true);
    expect(queue.peek()?.skipGap).toBe(false);
    expect(queue.offer(B, NARRATOR_PRIORITY.LOW, true)).toBe(true);
    expect(queue.peek()).toEqual({ clip: B, skipGap: true });
  });
});

describe('narratorDelayMs', () => {
  it('lets event shouts start as soon as the last line ends', () => {
    expect(narratorDelayMs(true, 0)).toBe(0);
    expect(narratorDelayMs(true, 400)).toBe(0);
  });

  it('holds banter for 1s after the previous clip', () => {
    expect(narratorDelayMs(false, 0)).toBe(1000);
    expect(narratorDelayMs(false, 350)).toBe(650);
    expect(narratorDelayMs(false, 1000)).toBe(0);
    expect(narratorDelayMs(false, 1400)).toBe(0);
  });
});
