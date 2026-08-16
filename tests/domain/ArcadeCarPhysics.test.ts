import {
  SIMULATION_STEP_SECONDS,
  LATERAL_GRIP_STIFFNESS,
  REVERSE_SPEED_FRACTION,
} from '../../src/domain/constants.ts';
import { IDLE_INPUT, sanitizeInput } from '../../src/domain/input/InputCommand.ts';
import type { InputCommand } from '../../src/domain/input/InputCommand.ts';
import { fromAngle, length, perpendicularLeft } from '../../src/domain/math/Vec2.ts';
import {
  driftThreshold,
  normalizeAngle,
  OFFROAD,
  stepVehicle,
  TARMAC,
} from '../../src/domain/vehicle/ArcadeCarPhysics.ts';
import { createVehicleState } from '../../src/domain/vehicle/Vehicle.ts';
import type { VehicleState } from '../../src/domain/vehicle/Vehicle.ts';
import type { VehicleStats } from '../../src/domain/vehicle/VehicleStats.ts';

const STATS: VehicleStats = {
  mass: 1000,
  enginePower: 34,
  brakeForce: 46,
  maxSpeed: 78,
  grip: 30,
  steerRate: 2.5,
  steerSpeedFalloff: 0.45,
  armor: 0.4,
  ammoCapacity: 5,
  collisionRadius: 1.7,
};

const DT = SIMULATION_STEP_SECONDS;

function input(overrides: Partial<InputCommand>): InputCommand {
  return { ...IDLE_INPUT, ...overrides };
}

function run(
  state: VehicleState,
  command: InputCommand,
  steps: number,
  surface = TARMAC,
  stats = STATS,
): VehicleState {
  let current = state;
  for (let i = 0; i < steps; i += 1) {
    current = stepVehicle(current, command, stats, surface, DT).state;
  }
  return current;
}

describe('stepVehicle determinism', () => {
  it('produces bit-identical results for an identical input sequence', () => {
    const commands = Array.from({ length: 400 }, (_, i) =>
      input({ throttle: 1, steer: Math.sin(i / 17) }),
    );

    const runOnce = (): VehicleState => {
      let state = createVehicleState({ x: 0, y: 0 }, 0.3);
      for (const command of commands) {
        state = stepVehicle(state, command, STATS, TARMAC, DT).state;
      }
      return state;
    };

    expect(runOnce()).toEqual(runOnce());
  });

  it('never produces NaN, even under absurd input', () => {
    const hostile = [
      input({ throttle: 99, brake: -99, steer: 42 }),
      input({ throttle: Number.MIN_VALUE, steer: -1000 }),
      input({ brake: 1, steer: 1 }),
    ];
    let state = createVehicleState({ x: 0, y: 0 }, 0);
    for (let i = 0; i < 600; i += 1) {
      state = stepVehicle(state, hostile[i % hostile.length]!, STATS, TARMAC, DT).state;
      expect(Number.isFinite(state.position.x)).toBe(true);
      expect(Number.isFinite(state.position.y)).toBe(true);
      expect(Number.isFinite(state.velocity.x)).toBe(true);
      expect(Number.isFinite(state.velocity.y)).toBe(true);
      expect(Number.isFinite(state.heading)).toBe(true);
    }
  });
});

describe('stepVehicle longitudinal behaviour', () => {
  it('approaches the authored maxSpeed and does not exceed it', () => {
    // Drag is derived so that maxSpeed IS the terminal speed. If a separate drag
    // stat ever creeps in, this is what catches the mismatch.
    const state = run(createVehicleState({ x: 0, y: 0 }, 0), input({ throttle: 1 }), 60 * 60);
    const speed = length(state.velocity);
    expect(speed).toBeGreaterThan(STATS.maxSpeed * 0.99);
    expect(speed).toBeLessThanOrEqual(STATS.maxSpeed + 1e-6);
  });

  it('coasts to a standstill without reversing', () => {
    let state = run(createVehicleState({ x: 0, y: 0 }, 0), input({ throttle: 1 }), 120);
    expect(length(state.velocity)).toBeGreaterThan(10);

    state = run(state, IDLE_INPUT, 60 * 60);
    expect(length(state.velocity)).toBeCloseTo(0, 6);
  });

  it('stops under braking and stays stopped rather than rolling backwards', () => {
    let state = run(createVehicleState({ x: 0, y: 0 }, 0), input({ throttle: 1 }), 180);
    const travelling = length(state.velocity);
    state = run(state, input({ brake: 1 }), 600);
    expect(length(state.velocity)).toBeCloseTo(0, 6);
    // Direction of travel must not have flipped.
    expect(state.velocity.x).toBeGreaterThanOrEqual(-1e-6);
    expect(travelling).toBeGreaterThan(10);
  });

  it('reaches a lower top speed off the racing surface', () => {
    const onTrack = run(createVehicleState({ x: 0, y: 0 }, 0), input({ throttle: 1 }), 60 * 30);
    const offTrack = run(
      createVehicleState({ x: 0, y: 0 }, 0),
      input({ throttle: 1 }),
      60 * 30,
      OFFROAD,
    );
    expect(length(offTrack.velocity)).toBeLessThan(length(onTrack.velocity) * 0.9);
  });
});

describe('stepVehicle reverse', () => {
  const REVERSE_STATS: VehicleStats = { ...STATS, enginePower: 40, maxSpeed: 65, grip: 18 };

  it('approaches REVERSE_SPEED_FRACTION * maxSpeed as a ceiling without reaching it', () => {
    // `REVERSE_SPEED_FRACTION` is a GEARED CEILING, not a measured terminal speed. Reverse
    // thrust is the engine's full force tapered to zero at that ceiling, so resistance and
    // drag still oppose the taper near the top and the car settles just under it — about
    // 30% of `maxSpeed` on tarmac rather than 35%. The old model derived a small constant
    // reverse power to make 35% exact, and that model left reverse physically unable to
    // move the car off-road at all (0.05 u/s after a full second on dirt).
    for (const stats of [STATS, REVERSE_STATS]) {
      const state = run(createVehicleState({ x: 0, y: 0 }, 0), input({ reverse: 1 }), 60 * 60, TARMAC, stats);
      const speed = length(state.velocity);
      const ceiling = REVERSE_SPEED_FRACTION * stats.maxSpeed;
      expect(speed).toBeLessThan(ceiling);
      // Still recognisably in the intended band, not a crawl.
      expect(speed).toBeGreaterThan(ceiling * 0.8);
      // And it really is reverse: negative forward speed, not positive.
      expect(state.velocity.x).toBeLessThan(0);
    }
  });

  it('reverses substantially slower than its forward top speed', () => {
    const forward = run(createVehicleState({ x: 0, y: 0 }, 0), input({ throttle: 1 }), 60 * 60);
    const reverse = run(createVehicleState({ x: 0, y: 0 }, 0), input({ reverse: 1 }), 60 * 60);
    const ratio = length(reverse.velocity) / length(forward.velocity);
    expect(ratio).toBeLessThan(REVERSE_SPEED_FRACTION);
    expect(ratio).toBeGreaterThan(REVERSE_SPEED_FRACTION * 0.8);
  });

  it('gets a stopped car moving backwards off-road, not only on tarmac', () => {
    // The regression this guards: reverse thrust used to be a small constant derived from
    // tarmac's rolling resistance (5.92 u/s² for the reference car) and off-road resistance
    // is 16, so reverse silently stopped working the moment the car left the track — which
    // is exactly when a driver reaches for it. Found by the user at the wheel on 2026-08-15.
    const state = run(createVehicleState({ x: 0, y: 0 }, 0), input({ reverse: 1 }), 60, OFFROAD);
    expect(state.velocity.x).toBeLessThan(-1);
  });

  it('gets a stopped car moving backwards under full reverse', () => {
    const state = run(createVehicleState({ x: 0, y: 0 }, 0), input({ reverse: 1 }), 30);
    expect(state.velocity.x).toBeLessThan(0);
  });

  it('lets throttle override reverse when both are held', () => {
    const state = run(createVehicleState({ x: 0, y: 0 }, 0), input({ throttle: 1, reverse: 1 }), 60);
    // Behaves exactly as throttle alone would: moving forward, not backward.
    const throttleOnly = run(createVehicleState({ x: 0, y: 0 }, 0), input({ throttle: 1 }), 60);
    expect(state.velocity.x).toBeGreaterThan(0);
    expect(state).toEqual(throttleOnly);
  });

  it('slows towards zero under braking while reversing and never flips to forward motion', () => {
    let state = run(createVehicleState({ x: 0, y: 0 }, 0), input({ reverse: 1 }), 180);
    expect(state.velocity.x).toBeLessThan(-5);
    state = run(state, input({ brake: 1 }), 600);
    expect(length(state.velocity)).toBeCloseTo(0, 6);
    expect(state.velocity.x).toBeLessThanOrEqual(1e-6);
  });

  it('reverses slower off-road than on tarmac', () => {
    const onTrack = run(createVehicleState({ x: 0, y: 0 }, 0), input({ reverse: 1 }), 60 * 30);
    const offTrack = run(createVehicleState({ x: 0, y: 0 }, 0), input({ reverse: 1 }), 60 * 30, OFFROAD);
    expect(length(offTrack.velocity)).toBeLessThan(length(onTrack.velocity) * 0.9);
  });

  it('mirrors steering while reversing under real reverse thrust, not just injected velocity', () => {
    // Build up reverse speed the same way a player would, then steer left.
    let state = run(createVehicleState({ x: 0, y: 0 }, 0), input({ reverse: 1 }), 120);
    expect(state.velocity.x).toBeLessThan(0);
    const before = state.heading;
    state = run(state, input({ reverse: 1, steer: 1 }), 10);
    expect(state.heading).toBeLessThan(before);
  });
});

describe('stepVehicle steering', () => {
  it('cannot pivot on the spot', () => {
    const state = run(createVehicleState({ x: 0, y: 0 }, 0), input({ steer: 1 }), 120);
    expect(state.heading).toBeCloseTo(0, 6);
    expect(length(state.velocity)).toBeCloseTo(0, 6);
  });

  it('turns left for positive steer, matching the left-positive convention', () => {
    let state = run(createVehicleState({ x: 0, y: 0 }, 0), input({ throttle: 1 }), 120);
    const before = state.heading;
    state = run(state, input({ throttle: 1, steer: 1 }), 30);
    expect(state.heading).toBeGreaterThan(before);
  });

  it('mirrors steering while reversing', () => {
    // Push the car backwards along its own heading, then steer left.
    const backwards: VehicleState = {
      ...createVehicleState({ x: 0, y: 0 }, 0),
      velocity: { x: -20, y: 0 },
    };
    const state = run(backwards, input({ steer: 1 }), 10);
    expect(state.heading).toBeLessThan(0);
  });

  it('loses steering authority as speed rises', () => {
    const slow: VehicleState = {
      ...createVehicleState({ x: 0, y: 0 }, 0),
      velocity: { x: STATS.maxSpeed * 0.2, y: 0 },
    };
    const fast: VehicleState = {
      ...createVehicleState({ x: 0, y: 0 }, 0),
      velocity: { x: STATS.maxSpeed, y: 0 },
    };
    const slowTurn = Math.abs(run(slow, input({ steer: 1 }), 1).heading);
    const fastTurn = Math.abs(run(fast, input({ steer: 1 }), 1).heading);
    expect(fastTurn).toBeLessThan(slowTurn);
    expect(fastTurn).toBeGreaterThan(0);
  });

  it('keeps heading inside (-PI, PI]', () => {
    const state = run(
      { ...createVehicleState({ x: 0, y: 0 }, 0), velocity: { x: 40, y: 0 } },
      input({ throttle: 1, steer: 1 }),
      60 * 30,
    );
    expect(state.heading).toBeGreaterThan(-Math.PI);
    expect(state.heading).toBeLessThanOrEqual(Math.PI);
  });

  it('normalizeAngle folds into (-PI, PI]', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 12);
    expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(normalizeAngle(Math.PI * 2 + 0.5)).toBeCloseTo(0.5, 12);
  });
});

describe('stepVehicle grip clamp — the drift mechanic', () => {
  /** Builds a car pointing along +X with a pure sideways velocity. */
  function slidingSideways(lateralSpeed: number): VehicleState {
    const heading = 0;
    const left = perpendicularLeft(fromAngle(heading));
    return {
      ...createVehicleState({ x: 0, y: 0 }, heading),
      velocity: { x: left.x * lateralSpeed, y: left.y * lateralSpeed },
    };
  }

  it('reports the drift threshold as grip over stiffness', () => {
    expect(driftThreshold(STATS, TARMAC)).toBeCloseTo(STATS.grip / LATERAL_GRIP_STIFFNESS, 12);
    expect(driftThreshold(STATS, OFFROAD)).toBeLessThan(driftThreshold(STATS, TARMAC));
  });

  it('grips below the threshold and lets go above it', () => {
    const threshold = driftThreshold(STATS, TARMAC);

    const gripping = stepVehicle(
      slidingSideways(threshold * 0.95),
      IDLE_INPUT,
      STATS,
      TARMAC,
      DT,
    );
    expect(gripping.telemetry.isSliding).toBe(false);
    expect(gripping.telemetry.gripUsage).toBeLessThan(1);

    const letting = stepVehicle(slidingSideways(threshold * 1.05), IDLE_INPUT, STATS, TARMAC, DT);
    expect(letting.telemetry.isSliding).toBe(true);
    expect(letting.telemetry.gripUsage).toBe(1);
  });

  it('recovers a slide instead of sticking in it', () => {
    let state = slidingSideways(driftThreshold(STATS, TARMAC) * 4);
    let sawSliding = false;
    for (let i = 0; i < 600; i += 1) {
      const result = stepVehicle(state, IDLE_INPUT, STATS, TARMAC, DT);
      sawSliding = sawSliding || result.telemetry.isSliding;
      state = result.state;
    }
    expect(sawSliding).toBe(true);
    const finalLateral = stepVehicle(state, IDLE_INPUT, STATS, TARMAC, DT).telemetry;
    expect(Math.abs(finalLateral.lateralSpeed)).toBeLessThan(0.01);
    expect(finalLateral.isSliding).toBe(false);
  });

  it('slides sooner off the racing surface than on it', () => {
    const lateral = driftThreshold(STATS, TARMAC) * 0.9;
    expect(stepVehicle(slidingSideways(lateral), IDLE_INPUT, STATS, TARMAC, DT).telemetry.isSliding).toBe(
      false,
    );
    expect(
      stepVehicle(slidingSideways(lateral), IDLE_INPUT, STATS, OFFROAD, DT).telemetry.isSliding,
    ).toBe(true);
  });

  it('produces a real slip angle when cornering hard at speed', () => {
    // Accelerate to near top speed, then ask for maximum steering.
    let state = run(createVehicleState({ x: 0, y: 0 }, 0), input({ throttle: 1 }), 60 * 20);
    let peakSlip = 0;
    for (let i = 0; i < 120; i += 1) {
      const result = stepVehicle(state, input({ throttle: 1, steer: 1 }), STATS, TARMAC, DT);
      peakSlip = Math.max(peakSlip, Math.abs(result.telemetry.slipAngle));
      state = result.state;
    }
    // A few degrees of slip minimum — otherwise the car is on rails and the
    // whole drift mechanic is invisible to the player.
    expect(peakSlip).toBeGreaterThan(0.05);
  });

  it('lets a low-grip car slide where a high-grip car holds on', () => {
    const slippery: VehicleStats = { ...STATS, grip: 12 };
    const sticky: VehicleStats = { ...STATS, grip: 44 };

    /**
     * Corners at a fraction of top speed and reports whether the tyres let go.
     *
     * Moderate speed and steering on purpose. At full lock and top speed the
     * demanded lateral acceleration is v * yawRate — roughly 107 units/s² for
     * these stats — which exceeds EVERY car's grip, so all of them slide and the
     * comparison would say nothing. The interesting difference lives in the
     * middle of the range.
     *
     * Throttle is off and the window is short so that speed stays near
     * `speedFraction`. Holding the throttle down instead accelerates the car to
     * its top speed within the window, which collapses every case back into the
     * everything-slides regime.
     */
    const cornerAt = (
      stats: VehicleStats,
      speedFraction: number,
      steer: number,
    ): { slid: boolean; peakSlip: number } => {
      let state: VehicleState = {
        ...createVehicleState({ x: 0, y: 0 }, 0),
        velocity: { x: stats.maxSpeed * speedFraction, y: 0 },
      };
      let slid = false;
      let peakSlip = 0;
      for (let i = 0; i < 30; i += 1) {
        const result = stepVehicle(state, input({ steer }), stats, TARMAC, DT);
        slid = slid || result.telemetry.isSliding;
        peakSlip = Math.max(peakSlip, Math.abs(result.telemetry.slipAngle));
        state = result.state;
      }
      return { slid, peakSlip };
    };

    expect(cornerAt(slippery, 0.4, 0.5).slid).toBe(true);
    expect(cornerAt(sticky, 0.4, 0.5).slid).toBe(false);

    // And whatever the corner, less grip must always mean more slip.
    for (const [fraction, steer] of [
      [0.4, 0.5],
      [0.7, 0.7],
      [1, 1],
    ] as const) {
      expect(cornerAt(slippery, fraction, steer).peakSlip).toBeGreaterThan(
        cornerAt(sticky, fraction, steer).peakSlip,
      );
    }
  });
});

describe('stepVehicle spinout decay', () => {
  it('decays an imposed spin towards zero', () => {
    const spun: VehicleState = { ...createVehicleState({ x: 0, y: 0 }, 0), yawSpin: 9 };
    // Retention is YAW_SPIN_DECAY_PER_SECOND^t, so a spin is all but gone in a
    // couple of seconds — long enough to be a real punishment, short enough not
    // to take a player out of the race.
    expect(Math.abs(run(spun, IDLE_INPUT, 60).yawSpin)).toBeLessThan(9 * 0.2);
    expect(Math.abs(run(spun, IDLE_INPUT, 240).yawSpin)).toBeLessThan(0.01);
    expect(run(spun, IDLE_INPUT, 240).yawSpin).not.toBe(0);
  });

  it('rotates the car while the spin lasts', () => {
    const spun: VehicleState = { ...createVehicleState({ x: 0, y: 0 }, 0), yawSpin: 9 };
    expect(Math.abs(run(spun, IDLE_INPUT, 30).heading)).toBeGreaterThan(0.5);
  });
});

describe('InputCommand reverse field', () => {
  it('defaults reverse to 0 in IDLE_INPUT', () => {
    expect(IDLE_INPUT.reverse).toBe(0);
  });

  it('sanitizeInput clamps reverse below 0 and above 1', () => {
    expect(sanitizeInput(input({ reverse: -5 })).reverse).toBe(0);
    expect(sanitizeInput(input({ reverse: 5 })).reverse).toBe(1);
    expect(sanitizeInput(input({ reverse: 0.4 })).reverse).toBe(0.4);
  });
});

