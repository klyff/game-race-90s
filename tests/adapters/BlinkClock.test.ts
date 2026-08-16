import { describe, it, expect } from 'vitest';
import { BlinkClock } from '../../src/adapters/render/BlinkClock.ts';

describe('BlinkClock', () => {
  describe('constructor', () => {
    it('accepts valid period and default duty cycle', () => {
      const clock = new BlinkClock(1.0);
      expect(clock).toBeDefined();
    });

    it('accepts valid period and custom duty cycle', () => {
      const clock = new BlinkClock(1.0, 0.25);
      expect(clock).toBeDefined();
    });

    it('throws if period is zero', () => {
      expect(() => new BlinkClock(0)).toThrow(
        /BlinkClock period must be a positive number/,
      );
    });

    it('throws if period is negative', () => {
      expect(() => new BlinkClock(-1)).toThrow(
        /BlinkClock period must be a positive number/,
      );
    });

    it('throws if period is NaN', () => {
      expect(() => new BlinkClock(NaN)).toThrow(
        /BlinkClock period must be a positive number/,
      );
    });

    it('throws if period is Infinity', () => {
      expect(() => new BlinkClock(Infinity)).toThrow(
        /BlinkClock period must be a positive number/,
      );
    });

    it('throws if duty cycle is zero', () => {
      expect(() => new BlinkClock(1.0, 0)).toThrow(
        /BlinkClock duty cycle must be within \(0, 1\)/,
      );
    });

    it('throws if duty cycle is one', () => {
      expect(() => new BlinkClock(1.0, 1)).toThrow(
        /BlinkClock duty cycle must be within \(0, 1\)/,
      );
    });

    it('throws if duty cycle is negative', () => {
      expect(() => new BlinkClock(1.0, -0.5)).toThrow(
        /BlinkClock duty cycle must be within \(0, 1\)/,
      );
    });

    it('throws if duty cycle is greater than one', () => {
      expect(() => new BlinkClock(1.0, 1.5)).toThrow(
        /BlinkClock duty cycle must be within \(0, 1\)/,
      );
    });

    it('throws if duty cycle is NaN', () => {
      expect(() => new BlinkClock(1.0, NaN)).toThrow(
        /BlinkClock duty cycle must be within \(0, 1\)/,
      );
    });
  });

  describe('starts on', () => {
    it('reports isOn === true before any advance', () => {
      const clock = new BlinkClock(1.0);
      expect(clock.isOn).toBe(true);
    });

    it('starts on with default duty cycle 0.5', () => {
      const clock = new BlinkClock(2.0);
      expect(clock.isOn).toBe(true);
    });

    it('starts on with custom duty cycle 0.25', () => {
      const clock = new BlinkClock(1.0, 0.25);
      expect(clock.isOn).toBe(true);
    });
  });

  describe('hard cut at duty boundary', () => {
    it('transitions from on to off exactly at the duty boundary', () => {
      const clock = new BlinkClock(1.2, 0.5);
      // boundary is 1.2 * 0.5 = 0.6

      // Just before boundary: should be on
      clock.advance(0.59);
      expect(clock.isOn).toBe(true);

      // Reset and advance to exactly the boundary: should be off
      const clock2 = new BlinkClock(1.2, 0.5);
      clock2.advance(0.6);
      expect(clock2.isOn).toBe(false);

      // Reset and advance past boundary: should be off
      const clock3 = new BlinkClock(1.2, 0.5);
      clock3.advance(0.61);
      expect(clock3.isOn).toBe(false);
    });

    it('transitions from off to on exactly at the period boundary', () => {
      const clock = new BlinkClock(1.2, 0.5);
      // period is 1.2, boundary where we wrap is at 1.2

      // Advance to just before period wraps
      clock.advance(1.19);
      expect(clock.isOn).toBe(false);

      // Reset and advance to exactly at period (wraps to 0): should be on
      const clock2 = new BlinkClock(1.2, 0.5);
      clock2.advance(1.2);
      expect(clock2.isOn).toBe(true);

      // Reset and advance past period (wraps): should be on
      const clock3 = new BlinkClock(1.2, 0.5);
      clock3.advance(1.21);
      expect(clock3.isOn).toBe(true);
    });

    it('boundary is exclusive on the on side: elapsed < period * duty', () => {
      const clock = new BlinkClock(1.0, 0.5);
      // At exactly 0.5 seconds elapsed (the boundary), should be off
      clock.advance(0.5);
      expect(clock.isOn).toBe(false);
    });
  });

  describe('wraps at period', () => {
    it('wraps around and maintains pattern after multiple periods', () => {
      const clock = new BlinkClock(1.2, 0.5);

      // Advance through 6 full periods (7.2 seconds total)
      // Each period: on for 0.6s, off for 0.6s
      const results: boolean[] = [];

      // Step 1: First period 0.3s (on)
      clock.advance(0.3);
      results.push(clock.isOn);

      // Step 2: First period 0.6s (boundary, off)
      clock.advance(0.3);
      results.push(clock.isOn);

      // Step 3: Second period 0.3s (off)
      clock.advance(0.3);
      results.push(clock.isOn);

      // Step 4: Second period end + 0.3s into third (on)
      clock.advance(0.6);
      results.push(clock.isOn);

      // Step 5: Third period 0.6s (boundary, off)
      clock.advance(0.3);
      results.push(clock.isOn);

      // Verify the pattern: on, off, off, on, off (reflecting wraps)
      expect(results[0]).toBe(true); // 0.3s in first period: on
      expect(results[1]).toBe(false); // 0.6s in first period: off
      expect(results[2]).toBe(false); // 0.9s total (0.3s in second): off
      expect(results[3]).toBe(true); // 1.5s total (0.3s in third): on
      expect(results[4]).toBe(false); // 1.8s total (0.6s in third): off
    });

    it('returns to same state after one complete period', () => {
      const clock = new BlinkClock(1.2, 0.5);

      clock.advance(0.3);
      const stateAfter = clock.isOn;

      // Now advance one full period
      clock.advance(1.2);

      // Should be back to the same elapsed position within the period
      expect(clock.isOn).toBe(stateAfter);
    });

    it('pattern still alternates after many periods', () => {
      const clock = new BlinkClock(0.5, 0.5);

      // Advance 10 periods in 0.1s steps
      let onCount = 0;
      let offCount = 0;

      for (let i = 0; i < 20; i++) {
        clock.advance(0.1);
        if (clock.isOn) {
          onCount++;
        } else {
          offCount++;
        }
      }

      // With period 0.5 and 0.1s steps, we should see a mix of on/off states
      // Not just on forever or off forever
      expect(onCount).toBeGreaterThan(0);
      expect(offCount).toBeGreaterThan(0);
    });
  });

  describe('non-default duty cycle', () => {
    it('with duty 0.25, on window is approximately 25% of period', () => {
      const clock = new BlinkClock(1.0, 0.25);
      const stepSize = 0.01;
      let onCount = 0;

      // Sample one complete period in small steps
      for (let i = 0; i < 100; i++) {
        clock.advance(stepSize);
        if (clock.isOn) {
          onCount++;
        }
      }

      // After 100 steps of 0.01s on period 1.0, we should be at 1.0s (wrapped to 0).
      // Count of on states should be close to 25 (25% of 100 steps).
      // Allow some tolerance for step granularity.
      expect(onCount).toBeGreaterThanOrEqual(20);
      expect(onCount).toBeLessThanOrEqual(30);
    });

    it('with duty 0.75, on window is approximately 75% of period', () => {
      const clock = new BlinkClock(1.0, 0.75);
      const stepSize = 0.01;
      let onCount = 0;

      // Sample one complete period in small steps
      for (let i = 0; i < 100; i++) {
        clock.advance(stepSize);
        if (clock.isOn) {
          onCount++;
        }
      }

      // Count of on states should be close to 75 (75% of 100 steps).
      expect(onCount).toBeGreaterThanOrEqual(70);
      expect(onCount).toBeLessThanOrEqual(80);
    });

    it('different duty cycles produce different on-to-off ratios', () => {
      const clock25 = new BlinkClock(1.0, 0.25);
      const clock75 = new BlinkClock(1.0, 0.75);

      let onCount25 = 0;
      let onCount75 = 0;
      const stepSize = 0.01;

      for (let i = 0; i < 100; i++) {
        clock25.advance(stepSize);
        if (clock25.isOn) onCount25++;

        clock75.advance(stepSize);
        if (clock75.isOn) onCount75++;
      }

      // The 75% duty cycle should have more on-states than 25%
      expect(onCount75).toBeGreaterThan(onCount25);
    });
  });

  describe('bad deltas ignored', () => {
    it('advance(0) leaves isOn unchanged', () => {
      const clock = new BlinkClock(1.0, 0.5);
      const stateBefore = clock.isOn;
      clock.advance(0);
      expect(clock.isOn).toBe(stateBefore);
    });

    it('advance(NaN) leaves isOn unchanged', () => {
      const clock = new BlinkClock(1.0, 0.5);
      const stateBefore = clock.isOn;
      clock.advance(NaN);
      expect(clock.isOn).toBe(stateBefore);
    });

    it('advance(Infinity) leaves isOn unchanged', () => {
      const clock = new BlinkClock(1.0, 0.5);
      const stateBefore = clock.isOn;
      clock.advance(Infinity);
      expect(clock.isOn).toBe(stateBefore);
    });

    it('advance(-1) leaves isOn unchanged', () => {
      const clock = new BlinkClock(1.0, 0.5);
      const stateBefore = clock.isOn;
      clock.advance(-1);
      expect(clock.isOn).toBe(stateBefore);
    });

    it('sequence of bad deltas does not corrupt subsequent good delta', () => {
      const clock1 = new BlinkClock(1.0, 0.5);
      const clock2 = new BlinkClock(1.0, 0.5);

      // Clock 1: hit with bad deltas, then a good one
      clock1.advance(NaN);
      clock1.advance(Infinity);
      clock1.advance(-5);
      clock1.advance(0);
      clock1.advance(0.3); // good delta

      // Clock 2: just the good delta
      clock2.advance(0.3);

      // Both should be at the same state
      expect(clock1.isOn).toBe(clock2.isOn);
    });

    it('tab losing focus (NaN delta) does not desynchronise blinks', () => {
      const clock1 = new BlinkClock(1.2, 0.5);
      const clock2 = new BlinkClock(1.2, 0.5);

      // Clock 1: simulate focus loss with NaN, then resume
      clock1.advance(0.3); // advance 0.3s normally
      clock1.advance(NaN); // tab loses focus, gets NaN delta
      clock1.advance(0.3); // resume with another 0.3s

      // Clock 2: normal operation
      clock2.advance(0.3);
      clock2.advance(0.3);

      expect(clock1.isOn).toBe(clock2.isOn);
    });
  });

  describe('single large delta larger than period', () => {
    it('advance(5) on period-1.2 clock is well-defined via modulo', () => {
      const clock = new BlinkClock(1.2, 0.5);
      clock.advance(5);
      // 5 % 1.2 = 5 - 4*1.2 = 5 - 4.8 = 0.2
      // 0.2 < 0.6 (duty boundary), so should be on
      expect(clock.isOn).toBe(true);
    });

    it('large delta produces correct modulo position', () => {
      const clock1 = new BlinkClock(1.0, 0.5);
      const clock2 = new BlinkClock(1.0, 0.5);

      // Clock 1: advance 3.3 seconds on period 1.0
      // 3.3 % 1.0 = 0.3 (on since < 0.5)
      clock1.advance(3.3);

      // Clock 2: advance 0.3 seconds directly
      clock2.advance(0.3);

      expect(clock1.isOn).toBe(clock2.isOn);
    });

    it('clock remains usable after large delta', () => {
      const clock = new BlinkClock(1.2, 0.5);
      clock.advance(100); // very large delta

      // Should still respond to normal advances
      clock.advance(0.1);
      // State may or may not change, but the clock should still work
      expect(clock.isOn).toBeDefined();

      // Another advance should still work
      clock.advance(0.1);
      expect(clock.isOn).toBeDefined();
    });

    it('multiple large deltas accumulate correctly via modulo', () => {
      const clock = new BlinkClock(1.0, 0.5);

      // Advance 2.25 seconds
      clock.advance(2.25);
      // 2.25 % 1.0 = 0.25 (on)

      // Advance another 2.0 seconds
      clock.advance(2.0);
      // (0.25 + 2.0) % 1.0 = 2.25 % 1.0 = 0.25 (on, since 0.25 < 0.5)

      expect(clock.isOn).toBe(true);
    });
  });
});
