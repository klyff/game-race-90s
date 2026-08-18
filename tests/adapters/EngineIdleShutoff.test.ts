import { describe, expect, it } from 'vitest';

import {
  ENGINE_IDLE_SHUTOFF_INITIAL,
  ENGINE_IDLE_SHUTOFF_SECONDS,
  shouldParkEngine,
  tickEngineIdleShutoff,
} from '../../src/adapters/audio/EngineIdleShutoff.ts';
import { COAST_STOP_SPEED } from '../../src/domain/race/Coast.ts';

describe('tickEngineIdleShutoff', () => {
  it('stays live while the car is moving', () => {
    let state = ENGINE_IDLE_SHUTOFF_INITIAL;
    for (let i = 0; i < 20; i += 1) {
      state = tickEngineIdleShutoff(state, COAST_STOP_SPEED + 1, 0, 1);
    }
    expect(state.shutOff).toBe(false);
    expect(state.elapsed).toBe(0);
  });

  it('cuts the engine after 3.5s of standstill with no drive', () => {
    let state = ENGINE_IDLE_SHUTOFF_INITIAL;
    state = tickEngineIdleShutoff(state, 0, 0, 3.4);
    expect(state.shutOff).toBe(false);
    state = tickEngineIdleShutoff(state, 0, 0, 0.2);
    expect(state.shutOff).toBe(true);
    expect(state.elapsed).toBe(ENGINE_IDLE_SHUTOFF_SECONDS);
  });

  it('restarts immediately on throttle or reverse', () => {
    let state = tickEngineIdleShutoff(ENGINE_IDLE_SHUTOFF_INITIAL, 0, 0, ENGINE_IDLE_SHUTOFF_SECONDS);
    expect(state.shutOff).toBe(true);

    state = tickEngineIdleShutoff(state, 0, 0.5, 0.016);
    expect(state.shutOff).toBe(false);
    expect(state.elapsed).toBe(0);

    state = tickEngineIdleShutoff(ENGINE_IDLE_SHUTOFF_INITIAL, 0, 0, ENGINE_IDLE_SHUTOFF_SECONDS);
    state = tickEngineIdleShutoff(state, 0, 0.5, 0.016);
    expect(state.shutOff).toBe(false);
  });

  it('does not accumulate while the pedal is held against a wall', () => {
    let state = ENGINE_IDLE_SHUTOFF_INITIAL;
    for (let i = 0; i < 10; i += 1) {
      state = tickEngineIdleShutoff(state, 0, 1, 1);
    }
    expect(state.shutOff).toBe(false);
    expect(state.elapsed).toBe(0);
  });

  it('treats an idle NPC the same as an idle player (speed 0, drive 0)', () => {
    let state = ENGINE_IDLE_SHUTOFF_INITIAL;
    state = tickEngineIdleShutoff(state, 0.4, 0, ENGINE_IDLE_SHUTOFF_SECONDS);
    expect(state.shutOff).toBe(true);
    state = tickEngineIdleShutoff(state, 0.4, 0.2, 0.016);
    expect(state.shutOff).toBe(false);
  });
});

describe('shouldParkEngine', () => {
  it('cuts immediately on a wreck or missing telemetry', () => {
    expect(
      shouldParkEngine({ destroyed: true, finished: false, hasTelemetry: true, speed: 8 }),
    ).toBe(true);
    expect(
      shouldParkEngine({ destroyed: false, finished: false, hasTelemetry: false, speed: 0 }),
    ).toBe(true);
  });

  it('cuts a finisher once they have rolled to a stop', () => {
    expect(
      shouldParkEngine({ destroyed: false, finished: true, hasTelemetry: true, speed: 0.4 }),
    ).toBe(true);
    expect(
      shouldParkEngine({ destroyed: false, finished: true, hasTelemetry: true, speed: 4 }),
    ).toBe(false);
  });

  it('leaves a live car to the idle timer', () => {
    expect(
      shouldParkEngine({ destroyed: false, finished: false, hasTelemetry: true, speed: 0 }),
    ).toBe(false);
  });
});
