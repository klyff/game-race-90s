import { EngineGearbox } from '../../src/adapters/audio/EngineGearbox.ts';

const MAX_SPEED = 78;

describe('EngineGearbox', () => {
  it('idles at rest', () => {
    const gearbox = new EngineGearbox();
    const state = gearbox.update(0, MAX_SPEED);
    expect(state.gear).toBe(1);
    expect(state.rpmFraction).toBeCloseTo(0.15, 5);
  });

  it('is in gear 1 from a standstill', () => {
    const gearbox = new EngineGearbox();
    const state = gearbox.update(1, MAX_SPEED);
    expect(state.gear).toBe(1);
  });

  it('visits every gear in ascending order without skipping across a full sweep', () => {
    const gearbox = new EngineGearbox();
    const seenGears: number[] = [1];
    const steps = 2000;
    for (let i = 1; i <= steps; i += 1) {
      const speed = (MAX_SPEED * i) / steps;
      const state = gearbox.update(speed, MAX_SPEED);
      if (state.gear !== seenGears[seenGears.length - 1]) {
        seenGears.push(state.gear);
      }
    }
    expect(seenGears).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps rpmFraction within [idleRpmFraction, 1] across a full sweep', () => {
    const gearbox = new EngineGearbox();
    const steps = 2000;
    for (let i = 0; i <= steps; i += 1) {
      const speed = (MAX_SPEED * i) / steps;
      const state = gearbox.update(speed, MAX_SPEED);
      expect(state.rpmFraction).toBeGreaterThanOrEqual(0.15 - 1e-9);
      expect(state.rpmFraction).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('reports shifted true on exactly the frames the gear changed', () => {
    const gearbox = new EngineGearbox();
    let previousGear = 1;
    let shiftCount = 0;
    let observedGearChanges = 0;
    const steps = 2000;
    for (let i = 0; i <= steps; i += 1) {
      const speed = (MAX_SPEED * i) / steps;
      const state = gearbox.update(speed, MAX_SPEED);
      if (state.gear !== previousGear) observedGearChanges += 1;
      if (state.shifted) shiftCount += 1;
      expect(state.shifted).toBe(state.gear !== previousGear);
      previousGear = state.gear;
    }
    expect(shiftCount).toBeGreaterThan(0);
    expect(shiftCount).toBe(observedGearChanges);
  });

  it('drops rpm on an upshift and jumps rpm on a downshift (the sawtooth)', () => {
    const gearbox = new EngineGearbox();
    let previousRpm = gearbox.update(0, MAX_SPEED).rpmFraction;
    let previousGear = 1;
    const steps = 4000;
    let sawUpshiftDrop = false;

    // Sweep up, watching for the classic sawtooth drop at an upshift.
    for (let i = 1; i <= steps; i += 1) {
      const speed = (MAX_SPEED * i) / steps;
      const state = gearbox.update(speed, MAX_SPEED);
      if (state.gear > previousGear) {
        expect(state.rpmFraction).toBeLessThan(previousRpm);
        sawUpshiftDrop = true;
      }
      previousGear = state.gear;
      previousRpm = state.rpmFraction;
    }
    expect(sawUpshiftDrop).toBe(true);

    // Sweep back down from max speed, watching for the rpm jump at a downshift.
    gearbox.reset();
    gearbox.update(MAX_SPEED, MAX_SPEED);
    previousRpm = gearbox.update(MAX_SPEED, MAX_SPEED).rpmFraction;
    previousGear = 5;
    let sawDownshiftJump = false;
    for (let i = steps; i >= 0; i -= 1) {
      const speed = (MAX_SPEED * i) / steps;
      const state = gearbox.update(speed, MAX_SPEED);
      if (state.gear < previousGear) {
        expect(state.rpmFraction).toBeGreaterThan(previousRpm);
        sawDownshiftJump = true;
      }
      previousGear = state.gear;
      previousRpm = state.rpmFraction;
    }
    expect(sawDownshiftJump).toBe(true);
  });

  it('does not chatter: holding a speed exactly at a shift point causes at most one shift', () => {
    const gearbox = new EngineGearbox();
    // Drive up to the boundary between gear 1 and gear 2 first.
    const steps = 2000;
    let boundarySpeed = 0;
    let previousGear = 1;
    for (let i = 1; i <= steps; i += 1) {
      const speed = (MAX_SPEED * i) / steps;
      const state = gearbox.update(speed, MAX_SPEED);
      if (state.gear === 2 && previousGear === 1) {
        boundarySpeed = speed;
        break;
      }
      previousGear = state.gear;
    }
    expect(boundarySpeed).toBeGreaterThan(0);

    let shiftsAtBoundary = 0;
    for (let i = 0; i < 500; i += 1) {
      const state = gearbox.update(boundarySpeed, MAX_SPEED);
      if (state.shifted) shiftsAtBoundary += 1;
    }
    expect(shiftsAtBoundary).toBeLessThanOrEqual(1);
  });

  it('gives gear 0 with a sane rpm in reverse', () => {
    const gearbox = new EngineGearbox();
    const state = gearbox.update(-20, MAX_SPEED);
    expect(state.gear).toBe(0);
    expect(state.rpmFraction).toBeGreaterThanOrEqual(0.15);
    expect(state.rpmFraction).toBeLessThanOrEqual(1);
  });

  it('gives a safe idle state for NaN, Infinity and maxSpeed = 0', () => {
    const gearbox = new EngineGearbox();
    for (const [speed, maxSpeed] of [
      [Number.NaN, MAX_SPEED],
      [Number.POSITIVE_INFINITY, MAX_SPEED],
      [10, 0],
      [10, Number.NaN],
    ] as const) {
      const state = gearbox.update(speed, maxSpeed);
      expect(state.gear).toBe(1);
      expect(state.rpmFraction).toBeCloseTo(0.15, 5);
      expect(Number.isNaN(state.rpmFraction)).toBe(false);
    }
  });

  it('reset() returns to gear 1 at idle', () => {
    const gearbox = new EngineGearbox();
    gearbox.update(MAX_SPEED, MAX_SPEED);
    gearbox.reset();
    const state = gearbox.update(0, MAX_SPEED);
    expect(state.gear).toBe(1);
    expect(state.rpmFraction).toBeCloseTo(0.15, 5);
  });
});
