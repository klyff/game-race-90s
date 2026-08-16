/**
 * Unit tests for ReverseLatch state machine.
 * The latch is pure and stateless except for internal dwell tracking, so every
 * sequence is deterministic and can be driven by feeding in speeds, hold times, and key events.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReverseLatch } from '../../src/adapters/input/ReverseLatch.ts';

describe('ReverseLatch', () => {
  let latch: ReverseLatch;

  beforeEach(() => {
    latch = new ReverseLatch();
  });

  describe('default construction and state', () => {
    it('constructs with default options', () => {
      expect(latch.engaged).toBe(false);
    });

    it('starts with engaged = false', () => {
      expect(latch.engaged).toBe(false);
    });
  });

  describe('custom options', () => {
    it('respects custom engageDelaySeconds', () => {
      const fastLatch = new ReverseLatch({ engageDelaySeconds: 0.1 });
      // Engage should happen at 0.1 s, not 0.3 s.
      fastLatch.update(true, false, 0, 0.05);
      expect(fastLatch.engaged).toBe(false);
      fastLatch.update(true, false, 0, 0.06);
      expect(fastLatch.engaged).toBe(true);
    });

    it('respects custom stoppedSpeedThreshold', () => {
      const sensitiveStop = new ReverseLatch({ stoppedSpeedThreshold: 1.0 });
      // At 0.5 u/s with a 1.0 threshold, still brakes, not reversing yet.
      const result = sensitiveStop.update(true, false, 0.5, 0);
      expect(result).toEqual({ brake: 1, reverse: 0 });
    });
  });

  describe('brake while rolling forward', () => {
    it('emits brake=1 when down is held and car is rolling', () => {
      const result = latch.update(true, false, 10, 0.016);
      expect(result).toEqual({ brake: 1, reverse: 0 });
    });

    it('does not accumulate dwell while rolling forward', () => {
      latch.update(true, false, 10, 0.1);
      latch.update(true, false, 10, 0.1);
      latch.update(true, false, 10, 0.1);
      expect(latch.engaged).toBe(false);
      // If we later stop, dwell should start fresh, not have accumulated.
      latch.update(true, false, 0, 0.1);
      latch.update(true, false, 0, 0.2);
      expect(latch.engaged).toBe(true); // Just hit the default 0.3 s delay.
    });
  });

  describe('standstill detection and engagement delay', () => {
    it('emits brake below the delay at standstill', () => {
      const result = latch.update(true, false, 0, 0.1);
      expect(result).toEqual({ brake: 1, reverse: 0 });
      expect(latch.engaged).toBe(false);
    });

    it('accumulates dwell across frames at standstill', () => {
      latch.update(true, false, 0, 0.1);
      expect(latch.engaged).toBe(false);
      latch.update(true, false, 0, 0.1);
      expect(latch.engaged).toBe(false);
      latch.update(true, false, 0, 0.1);
      expect(latch.engaged).toBe(true);
    });

    it('engages exactly at the delay', () => {
      latch.update(true, false, 0, 0.15);
      expect(latch.engaged).toBe(false);
      latch.update(true, false, 0, 0.15);
      expect(latch.engaged).toBe(true);
    });

    it('emits reverse after engagement at standstill', () => {
      latch.update(true, false, 0, 0.3);
      const result = latch.update(true, false, 0, 0.016);
      expect(result).toEqual({ brake: 0, reverse: 1 });
    });
  });

  describe('up key behavior (forward intent)', () => {
    it('disengages immediately when upHeld', () => {
      // First, engage reverse.
      latch.update(true, false, 0, 0.3);
      expect(latch.engaged).toBe(true);
      // Now press up.
      const result = latch.update(false, true, -5, 0.016);
      expect(result).toEqual({ brake: 0, reverse: 0 });
      expect(latch.engaged).toBe(false);
    });

    it('returns brake=0, reverse=0 when upHeld even if downHeld at same time', () => {
      // Up always wins.
      const result = latch.update(true, true, 0, 0.016);
      expect(result).toEqual({ brake: 0, reverse: 0 });
    });

    it('clears dwell when upHeld', () => {
      // Accumulate some dwell.
      latch.update(true, false, 0, 0.2);
      expect(latch.engaged).toBe(false);
      // Press up (and release down implicitly by not holding both).
      latch.update(false, true, 1, 0.016);
      // Release everything.
      latch.update(false, false, 1, 0.016);
      // Now hold down again and check that dwell starts over.
      latch.update(true, false, 0, 0.1);
      expect(latch.engaged).toBe(false);
      latch.update(true, false, 0, 0.2);
      expect(latch.engaged).toBe(true); // 0.1 + 0.2 = 0.3, exactly at the delay.
    });
  });

  describe('down key release behavior', () => {
    it('disengages when down is released', () => {
      latch.update(true, false, 0, 0.3);
      expect(latch.engaged).toBe(true);
      const result = latch.update(false, false, -2, 0.016);
      expect(result).toEqual({ brake: 0, reverse: 0 });
      expect(latch.engaged).toBe(false);
    });

    it('resets dwell when down is released', () => {
      // Accumulate some dwell, but not enough to engage.
      latch.update(true, false, 0, 0.2);
      expect(latch.engaged).toBe(false);
      // Release down.
      latch.update(false, false, 0, 0.016);
      // Hold down again and check dwell starts fresh.
      latch.update(true, false, 0, 0.1);
      latch.update(true, false, 0, 0.1);
      expect(latch.engaged).toBe(false);
      latch.update(true, false, 0, 0.1);
      expect(latch.engaged).toBe(true);
    });
  });

  describe('re-engagement after disengagement', () => {
    it('requires the full delay again after disengaging', () => {
      // Engage.
      latch.update(true, false, 0, 0.3);
      expect(latch.engaged).toBe(true);
      // Disengage by releasing down.
      latch.update(false, false, 0, 0.016);
      expect(latch.engaged).toBe(false);
      // Hold down again; dwell must rebuild.
      latch.update(true, false, 0, 0.2);
      expect(latch.engaged).toBe(false);
      latch.update(true, false, 0, 0.1);
      expect(latch.engaged).toBe(true);
    });
  });

  describe('transition from stopped back to rolling', () => {
    it('resets to braking when car rolls again after being stopped', () => {
      // Engage reverse at standstill.
      latch.update(true, false, 0, 0.3);
      expect(latch.engaged).toBe(true);
      // Car starts rolling forward (or backward, past threshold).
      const result = latch.update(true, false, 5, 0.016);
      expect(result).toEqual({ brake: 1, reverse: 0 });
      expect(latch.engaged).toBe(false);
    });

    it('can re-engage if held at standstill again', () => {
      // Engage, then roll, then brake back to stop.
      latch.update(true, false, 0, 0.3);
      expect(latch.engaged).toBe(true);
      latch.update(true, false, 5, 0.016);
      expect(latch.engaged).toBe(false);
      // Hold at standstill and re-engage.
      latch.update(true, false, 0, 0.3);
      expect(latch.engaged).toBe(true);
    });
  });

  describe('engaged getter', () => {
    it('reflects the current engagement state', () => {
      expect(latch.engaged).toBe(false);
      latch.update(true, false, 0, 0.3);
      expect(latch.engaged).toBe(true);
      latch.update(false, false, 0, 0.016);
      expect(latch.engaged).toBe(false);
    });
  });

  describe('reset() method', () => {
    it('clears dwell and disengages', () => {
      latch.update(true, false, 0, 0.2);
      expect(latch.engaged).toBe(false);
      latch.reset();
      // Dwell is cleared, so holding down immediately returns brake, not reverse.
      const result = latch.update(true, false, 0, 0.016);
      expect(result).toEqual({ brake: 1, reverse: 0 });
      expect(latch.engaged).toBe(false);
    });

    it('disengages even if currently engaged', () => {
      latch.update(true, false, 0, 0.3);
      expect(latch.engaged).toBe(true);
      latch.reset();
      expect(latch.engaged).toBe(false);
    });
  });

  describe('delta handling (non-finite and negative)', () => {
    it('ignores NaN deltas and does not poison the timer', () => {
      latch.update(true, false, 0, 0.1);
      latch.update(true, false, 0, Number.NaN); // Should be treated as 0.
      latch.update(true, false, 0, 0.1);
      expect(latch.engaged).toBe(false);
      latch.update(true, false, 0, 0.1);
      expect(latch.engaged).toBe(true); // Accumulated 0.1 + 0 + 0.1 + 0.1 = 0.3.
    });

    it('ignores Infinity deltas', () => {
      latch.update(true, false, 0, 0.2);
      latch.update(true, false, 0, Number.POSITIVE_INFINITY); // Should be treated as 0.
      expect(latch.engaged).toBe(false);
      latch.update(true, false, 0, 0.1);
      expect(latch.engaged).toBe(true); // Accumulated 0.2 + 0 + 0.1 = 0.3.
    });

    it('treats negative deltas as 0', () => {
      latch.update(true, false, 0, 0.2);
      latch.update(true, false, 0, -0.5); // Should be treated as 0.
      expect(latch.engaged).toBe(false);
      latch.update(true, false, 0, 0.1);
      expect(latch.engaged).toBe(true); // Accumulated 0.2 + 0 + 0.1 = 0.3.
    });
  });

  describe('frame accumulation', () => {
    it('accumulates dwell across many small frames', () => {
      const smallDelta = 0.01; // 10 ms frame.
      for (let i = 0; i < 29; i++) {
        latch.update(true, false, 0, smallDelta);
        expect(latch.engaged).toBe(false);
      }
      // 29 * 0.01 = 0.29 s, still below 0.3 s.
      latch.update(true, false, 0, smallDelta);
      // 30 * 0.01 = 0.30 s, exactly at the threshold.
      expect(latch.engaged).toBe(true);
    });

    it('handles variable frame times', () => {
      latch.update(true, false, 0, 0.1);
      latch.update(true, false, 0, 0.15);
      expect(latch.engaged).toBe(false);
      latch.update(true, false, 0, 0.05);
      // 0.1 + 0.15 + 0.05 = 0.3 s.
      expect(latch.engaged).toBe(true);
    });
  });

  describe('state machine consistency', () => {
    it('stays engaged while down is held and car is reversing', () => {
      // Engage reverse.
      latch.update(true, false, 0, 0.3);
      expect(latch.engaged).toBe(true);
      // Car is now actively reversing (negative speed).
      const result1 = latch.update(true, false, -2, 0.016);
      expect(result1).toEqual({ brake: 0, reverse: 1 });
      expect(latch.engaged).toBe(true);
      // Still reversing, still holding down.
      const result2 = latch.update(true, false, -5, 0.016);
      expect(result2).toEqual({ brake: 0, reverse: 1 });
      expect(latch.engaged).toBe(true);
    });

    it('combines up and down held (up wins)', () => {
      // Both held at once: up takes priority.
      const result = latch.update(true, true, 0, 0.3);
      expect(result).toEqual({ brake: 0, reverse: 0 });
      expect(latch.engaged).toBe(false);
    });

    it('emits correct values at threshold boundaries', () => {
      const customLatch = new ReverseLatch({ stoppedSpeedThreshold: 1.0 });
      // Exactly at threshold (1.0 u/s): NOT stopped, should brake.
      const result1 = customLatch.update(true, false, 1.0, 0.016);
      expect(result1).toEqual({ brake: 1, reverse: 0 });
      // Just below threshold (0.99 u/s): stopped, should accumulate dwell.
      const result2 = customLatch.update(true, false, 0.99, 0.016);
      expect(result2).toEqual({ brake: 1, reverse: 0 });
    });
  });
});
