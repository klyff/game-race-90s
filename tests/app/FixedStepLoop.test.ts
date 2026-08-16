import { SIMULATION_STEP_SECONDS } from '../../src/domain/constants.ts';
import { FixedStepLoop } from '../../src/app/FixedStepLoop.ts';

describe('FixedStepLoop', () => {
  describe('constructor', () => {
    it('accepts valid defaults', () => {
      const loop = new FixedStepLoop();
      expect(loop.stepSeconds).toBe(SIMULATION_STEP_SECONDS);
      expect(loop.maxStepsPerFrame).toBe(5);
    });

    it('accepts valid custom stepSeconds', () => {
      const loop = new FixedStepLoop(0.05);
      expect(loop.stepSeconds).toBe(0.05);
    });

    it('accepts valid custom maxStepsPerFrame', () => {
      const loop = new FixedStepLoop(SIMULATION_STEP_SECONDS, 10);
      expect(loop.maxStepsPerFrame).toBe(10);
    });

    it('rejects non-finite stepSeconds', () => {
      expect(() => new FixedStepLoop(Infinity)).toThrow();
      expect(() => new FixedStepLoop(-Infinity)).toThrow();
      expect(() => new FixedStepLoop(NaN)).toThrow();
    });

    it('rejects non-positive stepSeconds', () => {
      expect(() => new FixedStepLoop(0)).toThrow();
      expect(() => new FixedStepLoop(-0.01)).toThrow();
    });

    it('rejects non-integer maxStepsPerFrame', () => {
      expect(() => new FixedStepLoop(SIMULATION_STEP_SECONDS, 5.5)).toThrow();
      expect(() => new FixedStepLoop(SIMULATION_STEP_SECONDS, 5.1)).toThrow();
    });

    it('rejects non-positive maxStepsPerFrame', () => {
      expect(() => new FixedStepLoop(SIMULATION_STEP_SECONDS, 0)).toThrow();
      expect(() => new FixedStepLoop(SIMULATION_STEP_SECONDS, -1)).toThrow();
    });
  });

  describe('advance: basic stepping', () => {
    it('runs exactly one step when delta equals stepSeconds', () => {
      const loop = new FixedStepLoop();
      const steps: number[] = [];
      const stepsRun = loop.advance(SIMULATION_STEP_SECONDS, (dt) => {
        steps.push(dt);
      });

      expect(stepsRun).toBe(1);
      expect(steps).toEqual([SIMULATION_STEP_SECONDS]);
      expect(loop.pendingSeconds).toBeCloseTo(0);
    });

    it('passes stepSeconds to the callback, never the raw delta', () => {
      const loop = new FixedStepLoop(0.02);
      const deltasReceived: number[] = [];
      loop.advance(0.06, (dt) => {
        deltasReceived.push(dt);
      });

      // 0.06 / 0.02 = 3 steps (at least 2 guaranteed, 3 if no precision loss)
      expect(deltasReceived.length).toBeGreaterThanOrEqual(2);
      for (const dt of deltasReceived) {
        expect(dt).toBeCloseTo(0.02);
      }
    });

    it('runs nothing when delta is less than one stepSeconds', () => {
      const loop = new FixedStepLoop();
      const steps: number[] = [];
      const stepsRun = loop.advance(SIMULATION_STEP_SECONDS / 2, (dt) => {
        steps.push(dt);
      });

      expect(stepsRun).toBe(0);
      expect(steps).toEqual([]);
      expect(loop.pendingSeconds).toBeCloseTo(SIMULATION_STEP_SECONDS / 2);
    });
  });

  describe('advance: accumulation', () => {
    it('accumulates two half-steps into one full step', () => {
      const loop = new FixedStepLoop();
      const steps: number[] = [];

      // First half-step: should not run yet
      const run1 = loop.advance(SIMULATION_STEP_SECONDS / 2, (dt) => {
        steps.push(dt);
      });
      expect(run1).toBe(0);
      expect(steps).toEqual([]);

      // Second half-step: should now run one step
      const run2 = loop.advance(SIMULATION_STEP_SECONDS / 2, (dt) => {
        steps.push(dt);
      });
      expect(run2).toBe(1);
      expect(steps).toEqual([SIMULATION_STEP_SECONDS]);
      expect(loop.pendingSeconds).toBeCloseTo(0);
    });

    it('runs 2 and leaves 0.5 pending from 2.5 steps', () => {
      const loop = new FixedStepLoop();
      const steps: number[] = [];
      const stepsRun = loop.advance(SIMULATION_STEP_SECONDS * 2.5, (dt) => {
        steps.push(dt);
      });

      expect(stepsRun).toBe(2);
      expect(steps.length).toBe(2);
      expect(loop.pendingSeconds).toBeCloseTo(SIMULATION_STEP_SECONDS * 0.5);
    });
  });

  describe('advance: cap and discard', () => {
    it('caps at maxStepsPerFrame and discards the overflow', () => {
      const loop = new FixedStepLoop(SIMULATION_STEP_SECONDS, 3);
      const steps: number[] = [];

      // 10 seconds worth of deltas at 60 Hz = 600 steps, but capped at 3
      const stepsRun = loop.advance(10, (dt) => {
        steps.push(dt);
      });

      expect(stepsRun).toBe(3);
      expect(steps.length).toBe(3);
      expect(loop.pendingSeconds).toBeCloseTo(0, 5);
    });

    it('proves no backlog after cap: next normal delta runs exactly one step', () => {
      const loop = new FixedStepLoop(SIMULATION_STEP_SECONDS, 2);
      const steps: number[] = [];

      // First huge frame capped at 2 steps, discards the rest
      loop.advance(10, (dt) => {
        steps.push(dt);
      });
      expect(steps.length).toBe(2);

      // Second normal frame should run exactly one step, not queued backlog
      steps.length = 0;
      const run2 = loop.advance(SIMULATION_STEP_SECONDS, (dt) => {
        steps.push(dt);
      });

      expect(run2).toBe(1);
      expect(steps.length).toBe(1);
    });
  });

  describe('advance: invalid or degenerate deltas', () => {
    it('ignores NaN delta and leaves accumulator untouched', () => {
      const loop = new FixedStepLoop();
      const steps: number[] = [];

      // Add a half-step
      loop.advance(SIMULATION_STEP_SECONDS / 2, (dt) => {
        steps.push(dt);
      });
      expect(steps.length).toBe(0); // Not enough yet

      // Add NaN (should do nothing to accumulator)
      loop.advance(NaN, (dt) => {
        steps.push(dt);
      });
      expect(steps.length).toBe(0);

      // Add another half-step: should now run if accumulator was preserved
      loop.advance(SIMULATION_STEP_SECONDS / 2, (dt) => {
        steps.push(dt);
      });
      expect(steps.length).toBe(1); // Proves accumulator was not corrupted
    });

    it('ignores Infinity delta and leaves accumulator untouched', () => {
      const loop = new FixedStepLoop();
      const steps: number[] = [];

      const run1 = loop.advance(Infinity, (dt) => {
        steps.push(dt);
      });
      expect(run1).toBe(0);
      expect(steps).toEqual([]);
      expect(loop.pendingSeconds).toBeCloseTo(0);
    });

    it('ignores negative delta and leaves accumulator untouched', () => {
      const loop = new FixedStepLoop();
      const steps: number[] = [];

      const run1 = loop.advance(-0.1, (dt) => {
        steps.push(dt);
      });
      expect(run1).toBe(0);
      expect(steps).toEqual([]);
    });

    it('ignores zero delta and leaves accumulator untouched', () => {
      const loop = new FixedStepLoop();
      const steps: number[] = [];

      const run1 = loop.advance(0, (dt) => {
        steps.push(dt);
      });
      expect(run1).toBe(0);
      expect(steps).toEqual([]);
    });
  });

  describe('advance: returns number of steps run', () => {
    it('returns 0 when no steps run', () => {
      const loop = new FixedStepLoop();
      const stepsRun = loop.advance(SIMULATION_STEP_SECONDS / 2, () => {});
      expect(stepsRun).toBe(0);
    });

    it('returns exact count of steps run', () => {
      const loop = new FixedStepLoop();
      const stepsRun = loop.advance(SIMULATION_STEP_SECONDS * 3, () => {});
      expect(stepsRun).toBe(3);
    });

    it('returns capped count', () => {
      const loop = new FixedStepLoop(SIMULATION_STEP_SECONDS, 2);
      const stepsRun = loop.advance(SIMULATION_STEP_SECONDS * 100, () => {});
      expect(stepsRun).toBe(2);
    });
  });

  describe('reset', () => {
    it('clears the accumulator', () => {
      const loop = new FixedStepLoop();
      loop.advance(SIMULATION_STEP_SECONDS / 2, () => {});
      expect(loop.pendingSeconds).toBeCloseTo(SIMULATION_STEP_SECONDS / 2);

      loop.reset();
      expect(loop.pendingSeconds).toBeCloseTo(0);
    });

    it('allows the next advance to start fresh', () => {
      const loop = new FixedStepLoop();

      // Accumulate a half-step
      loop.advance(SIMULATION_STEP_SECONDS / 2, () => {});

      // Reset clears it
      loop.reset();

      // Now a half-step again should not run
      const stepsRun = loop.advance(SIMULATION_STEP_SECONDS / 2, () => {});
      expect(stepsRun).toBe(0);
      expect(loop.pendingSeconds).toBeCloseTo(SIMULATION_STEP_SECONDS / 2);
    });
  });

  describe('determinism: no drift', () => {
    it('runs exactly 60 steps for 1 second of regular deltas at 60 Hz', () => {
      const loop = new FixedStepLoop();
      const steps: number[] = [];

      // 60 identical deltas of exactly 1/60 second
      for (let i = 0; i < 60; i += 1) {
        loop.advance(SIMULATION_STEP_SECONDS, () => {
          steps.push(1);
        });
      }

      expect(steps.length).toBe(60);
      expect(loop.pendingSeconds).toBeCloseTo(0, 10);
    });

    it('accumulates correctly with realistic irregular deltas', () => {
      const loop = new FixedStepLoop();
      const steps: number[] = [];

      // Simulate 60 frames with ±5% jitter, but manually chosen to sum to
      // a safe total that will run exactly 60 steps at 60 Hz
      const base = SIMULATION_STEP_SECONDS;
      const deltas = [
        base,
        base,
        base * 1.02,
        base,
        base * 0.98,
        base,
        base,
        base,
        base * 1.01,
        base * 0.99,
        // Repeat for ~60 frames
      ];

      // Build enough deltas to make about 60 steps
      const jitteredDeltas: number[] = [];
      let totalDelta = 0;
      for (let i = 0; i < 60; i += 1) {
        const delta = deltas[i % deltas.length]!;
        jitteredDeltas.push(delta);
        totalDelta += delta;
      }

      // Run them all
      for (const delta of jitteredDeltas) {
        loop.advance(delta, () => {
          steps.push(1);
        });
      }

      // Should get 60 steps (or possibly 59-60 due to rounding)
      expect(steps.length).toBeGreaterThanOrEqual(59);
      expect(steps.length).toBeLessThanOrEqual(60);
    });
  });

  describe('pendingSeconds', () => {
    it('exposes the leftover accumulator', () => {
      const loop = new FixedStepLoop();
      expect(loop.pendingSeconds).toBe(0);

      loop.advance(SIMULATION_STEP_SECONDS / 3, () => {});
      expect(loop.pendingSeconds).toBeCloseTo(SIMULATION_STEP_SECONDS / 3);

      loop.advance(SIMULATION_STEP_SECONDS / 3, () => {});
      expect(loop.pendingSeconds).toBeCloseTo(SIMULATION_STEP_SECONDS * (2 / 3));
    });

    it('returns 0 after a complete step', () => {
      const loop = new FixedStepLoop();
      loop.advance(SIMULATION_STEP_SECONDS, () => {});
      expect(loop.pendingSeconds).toBeCloseTo(0);
    });

    it('returns 0 after cap and discard', () => {
      const loop = new FixedStepLoop(SIMULATION_STEP_SECONDS, 2);
      loop.advance(10, () => {});
      expect(loop.pendingSeconds).toBeCloseTo(0);
    });
  });
});
