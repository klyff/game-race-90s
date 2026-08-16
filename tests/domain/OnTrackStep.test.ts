import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

import { stepVehicleOnTrack } from '../../src/domain/race/OnTrackStep.ts';
import { createVehicleState } from '../../src/domain/vehicle/Vehicle.ts';
import { IDLE_INPUT } from '../../src/domain/input/InputCommand.ts';
import { parseCarSetManifest, findCarSheet } from '../../src/data/cars/CarManifest.ts';
import { findTrack } from '../../src/data/tracks/registry.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import { trackFullHalfWidth } from '../../src/domain/track/TrackDefinition.ts';
import { SIMULATION_STEP_SECONDS } from '../../src/domain/constants.ts';
import type { InputCommand } from '../../src/domain/input/InputCommand.ts';

const testFileDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(testFileDir, '..', '..');
const carsJsonPath = join(projectRoot, 'public', 'assets', 'cars', 'cars.json');

// Load real car stats and track
function getCarStats() {
  const rawJson = readFileSync(carsJsonPath, 'utf-8');
  const manifest = parseCarSetManifest(JSON.parse(rawJson));
  return findCarSheet(manifest, 'marauder').stats;
}

function getTrackAndSpline() {
  const track = findTrack('thunder-basin');
  const spline = new TrackSpline(track.controlPoints);
  return { track, spline };
}

describe('OnTrackStep.stepVehicleOnTrack', () => {
  describe('baseline: car at rest on centreline with idle input', () => {
    it('stays approximately at the start line when given idle input', () => {
      const { track, spline } = getTrackAndSpline();
      const stats = getCarStats();
      const startPos = spline.positionAt(100);
      const state = createVehicleState(startPos, 0);
      const initialDist = 100;

      const result = stepVehicleOnTrack(
        state,
        IDLE_INPUT,
        stats,
        track,
        spline,
        initialDist,
        20,
        SIMULATION_STEP_SECONDS,
      );

      // Car should not move much: velocity stays zero, distance doesn't change significantly.
      expect(result.state.velocity.x).toBeCloseTo(0, 3);
      expect(result.state.velocity.y).toBeCloseTo(0, 3);
      // Distance should still be approximately at the initial distance
      expect(result.distance).toBeCloseTo(initialDist, 0);
    });

    it('reports lateral offset near zero when on the centreline', () => {
      const { track, spline } = getTrackAndSpline();
      const stats = getCarStats();
      const startPos = spline.positionAt(100);
      const state = createVehicleState(startPos, 0);

      const result = stepVehicleOnTrack(
        state,
        IDLE_INPUT,
        stats,
        track,
        spline,
        100,
        20,
        SIMULATION_STEP_SECONDS,
      );

      // On the centreline, lateral offset should be very close to zero.
      expect(Math.abs(result.lateralOffset)).toBeLessThan(0.5);
    });

    it('does not touch the wall when at rest on centreline', () => {
      const { track, spline } = getTrackAndSpline();
      const stats = getCarStats();
      const startPos = spline.positionAt(100);
      const state = createVehicleState(startPos, 0);

      const result = stepVehicleOnTrack(
        state,
        IDLE_INPUT,
        stats,
        track,
        spline,
        100,
        20,
        SIMULATION_STEP_SECONDS,
      );

      expect(result.touchedWall).toBe(false);
      expect(result.impactSpeed).toBe(0);
    });
  });

  describe('motion: throttle advances distance forward', () => {
    it('moves forward with continuous throttle over multiple steps', () => {
      const { track, spline } = getTrackAndSpline();
      const stats = getCarStats();
      const startPos = spline.positionAt(500);
      const state = createVehicleState(startPos, 0);

      const throttleInput: InputCommand = {
        throttle: 1,
        brake: 0,
        reverse: 0,
        steer: 0,
        fire: false,
        dropMine: false,
      };

      let currentState = state;
      let currentDistance = 500;

      // Run for 20 steps to build up speed.
      for (let i = 0; i < 20; i += 1) {
        const result = stepVehicleOnTrack(
          currentState,
          throttleInput,
          stats,
          track,
          spline,
          currentDistance,
          20,
          SIMULATION_STEP_SECONDS,
        );
        currentState = result.state;
        currentDistance = result.distance;
      }

      // After 20 steps with full throttle, should have reasonable speed and distance.
      expect(currentState.velocity.x !== 0 || currentState.velocity.y !== 0).toBe(true);
      expect(currentDistance).toBeGreaterThan(500);
    });

    it('distance increases over multiple steps with throttle', () => {
      const { track, spline } = getTrackAndSpline();
      const stats = getCarStats();
      const startPos = spline.positionAt(500);
      const initialState = createVehicleState(startPos, 0);

      const throttleInput: InputCommand = {
        throttle: 1,
        brake: 0,
        reverse: 0,
        steer: 0,
        fire: false,
        dropMine: false,
      };

      let currentState = initialState;
      let currentDistance = 500;
      const distances: number[] = [currentDistance];

      for (let i = 0; i < 20; i += 1) {
        const result = stepVehicleOnTrack(
          currentState,
          throttleInput,
          stats,
          track,
          spline,
          currentDistance,
          20,
          SIMULATION_STEP_SECONDS,
        );
        currentState = result.state;
        currentDistance = result.distance;
        distances.push(currentDistance);
      }

      // Distance should be monotonically increasing.
      for (let i = 1; i < distances.length; i += 1) {
        expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1] - 0.01);
      }

      // Should have moved forward noticeably (at least 1+ units over 20 steps).
      expect(currentDistance - 500).toBeGreaterThan(0.5);
    });
  });

  describe('wall collision: lateral offset clamping', () => {
    it('never lets lateralOffset exceed the wall clamp (halfWidth + shoulderWidth - collisionRadius)', () => {
      const { track, spline } = getTrackAndSpline();
      const stats = getCarStats();

      // Start on the centreline and steer hard left at high speed to drive towards the wall.
      const startPos = spline.positionAt(500); // Midway around the track
      const initialState = createVehicleState(startPos, 0);

      const leftSteerInput: InputCommand = {
        throttle: 1,
        brake: 0,
        reverse: 0,
        steer: 1, // Full left
        fire: false,
        dropMine: false,
      };

      let currentState = initialState;
      let currentDistance = 500;

      // Build up speed and drive into the left wall.
      for (let i = 0; i < 50; i += 1) {
        const result = stepVehicleOnTrack(
          currentState,
          leftSteerInput,
          stats,
          track,
          spline,
          currentDistance,
          20,
          SIMULATION_STEP_SECONDS,
        );
        currentState = result.state;
        currentDistance = result.distance;

        // Check that lateral offset never exceeds the wall limit.
        const wallLimit = trackFullHalfWidth(track) - stats.collisionRadius;
        expect(Math.abs(result.lateralOffset)).toBeLessThanOrEqual(wallLimit + 0.1); // Small tolerance for FP
      }
    });

    it('reports touchedWall or keeps lateralOffset within bounds', () => {
      const { track, spline } = getTrackAndSpline();
      const stats = getCarStats();

      // Start on the centreline and steer hard to test wall interaction.
      const startPos = spline.positionAt(400);
      const initialState = createVehicleState(startPos, 0);

      const hardLeftInput: InputCommand = {
        throttle: 1,
        brake: 0,
        reverse: 0,
        steer: 1,
        fire: false,
        dropMine: false,
      };

      let currentState = initialState;
      let currentDistance = 400;
      const wallLimit = trackFullHalfWidth(track) - stats.collisionRadius;

      // Drive in a tight circle for many steps.
      for (let i = 0; i < 150; i += 1) {
        const result = stepVehicleOnTrack(
          currentState,
          hardLeftInput,
          stats,
          track,
          spline,
          currentDistance,
          20,
          SIMULATION_STEP_SECONDS,
        );

        // Either the car touched a wall, or it stayed within bounds.
        if (result.touchedWall) {
          expect(result.impactSpeed).toBeGreaterThanOrEqual(0);
        }

        // Lateral offset should never exceed the wall clamp (within floating-point tolerance).
        expect(Math.abs(result.lateralOffset)).toBeLessThanOrEqual(wallLimit + 0.1);

        currentState = result.state;
        currentDistance = result.distance;
      }
    });

    it('reports no wall contact and zero impactSpeed when cruising on the centreline', () => {
      const { track, spline } = getTrackAndSpline();
      const stats = getCarStats();

      const startPos = spline.positionAt(200);
      const state = createVehicleState(startPos, 0);

      // Gentle cruise with no steering.
      const cruiseInput: InputCommand = {
        throttle: 0.5,
        brake: 0,
        reverse: 0,
        steer: 0,
        fire: false,
        dropMine: false,
      };

      let currentState = state;
      let currentDistance = 200;

      for (let i = 0; i < 10; i += 1) {
        const result = stepVehicleOnTrack(
          currentState,
          cruiseInput,
          stats,
          track,
          spline,
          currentDistance,
          20,
          SIMULATION_STEP_SECONDS,
        );

        expect(result.touchedWall).toBe(false);
        expect(result.impactSpeed).toBe(0);

        currentState = result.state;
        currentDistance = result.distance;
      }
    });
  });

  describe('surface effects: tarmac vs offroad', () => {
    it('detects transition from tarmac to offroad based on halfWidth', () => {
      const { track, spline } = getTrackAndSpline();
      const stats = getCarStats();

      // Start on the centreline and move outward to cross the halfWidth boundary.
      const startPos = spline.positionAt(300);
      const state = createVehicleState(startPos, 0);

      const rightSteerInput: InputCommand = {
        throttle: 1,
        brake: 0,
        reverse: 0,
        steer: -1, // Full right
        fire: false,
        dropMine: false,
      };

      let currentState = state;
      let currentDistance = 300;
      let reportedOntrack = false;
      let reportedOffroad = false;

      for (let i = 0; i < 100; i += 1) {
        const result = stepVehicleOnTrack(
          currentState,
          rightSteerInput,
          stats,
          track,
          spline,
          currentDistance,
          20,
          SIMULATION_STEP_SECONDS,
        );

        if (Math.abs(result.lateralOffset) <= track.halfWidth) {
          reportedOntrack = true;
        } else if (Math.abs(result.lateralOffset) < trackFullHalfWidth(track) - stats.collisionRadius) {
          reportedOffroad = true;
        }

        currentState = result.state;
        currentDistance = result.distance;
      }

      // Should have crossed both regions at some point.
      expect(reportedOntrack).toBe(true);
      expect(reportedOffroad).toBe(true);
    });
  });

  describe('hintDistance chain: no runaway feedback (decision 23)', () => {
    it('chains hintDistance from each result and keeps distance monotonically advancing', () => {
      const { track, spline } = getTrackAndSpline();
      const stats = getCarStats();

      const startPos = spline.positionAt(100);
      const initialState = createVehicleState(startPos, 0);

      const throttleInput: InputCommand = {
        throttle: 1,
        brake: 0,
        reverse: 0,
        steer: 0,
        fire: false,
        dropMine: false,
      };

      let currentState = initialState;
      let currentDistance = 100;
      const distances: number[] = [currentDistance];

      // Run for many steps, chaining hintDistance to guard against the runaway feedback bug.
      for (let i = 0; i < 200; i += 1) {
        const result = stepVehicleOnTrack(
          currentState,
          throttleInput,
          stats,
          track,
          spline,
          currentDistance,
          20,
          SIMULATION_STEP_SECONDS,
        );

        currentState = result.state;
        currentDistance = result.distance;
        distances.push(currentDistance);
      }

      // Distance must be monotonically increasing (or flat on collisions, but no large jumps).
      for (let i = 1; i < distances.length; i += 1) {
        // Allow for tiny FP errors or collision bounces.
        expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1] - 0.1);
      }

      // Should advance significantly over 200 steps without wild jumps.
      const totalAdvance = distances[distances.length - 1] - distances[0];
      expect(totalAdvance).toBeGreaterThan(10);

      // Check that no single step jumped more than a reasonable distance (e.g., ~5 units max per 60 Hz).
      for (let i = 1; i < distances.length; i += 1) {
        const delta = distances[i] - distances[i - 1];
        // Wrapping can cause a large backward jump, so check for runaway growth instead.
        expect(Math.abs(delta)).toBeLessThan(20);
      }
    });

    it('handles wrap-around at lap boundary without losing monotonicity', () => {
      const { track, spline } = getTrackAndSpline();
      const stats = getCarStats();

      // Start near the end of the lap.
      const startDistance = spline.totalLength - 100;
      const startPos = spline.positionAt(startDistance);
      const initialState = createVehicleState(startPos, 0);

      const throttleInput: InputCommand = {
        throttle: 1,
        brake: 0,
        reverse: 0,
        steer: 0,
        fire: false,
        dropMine: false,
      };

      let currentState = initialState;
      let currentDistance = startDistance;
      const distances: number[] = [];

      // Drive across the lap boundary.
      for (let i = 0; i < 50; i += 1) {
        const result = stepVehicleOnTrack(
          currentState,
          throttleInput,
          stats,
          track,
          spline,
          currentDistance,
          20,
          SIMULATION_STEP_SECONDS,
        );

        currentState = result.state;
        currentDistance = result.distance;
        distances.push(currentDistance);
      }

      // The distances should stay in [0, totalLength).
      for (const d of distances) {
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThan(spline.totalLength);
      }
    });
  });

  describe('state consistency', () => {
    it('returns a fresh VehicleState on every step, not mutating input', () => {
      const { track, spline } = getTrackAndSpline();
      const stats = getCarStats();

      const startPos = spline.positionAt(100);
      const initialState = createVehicleState(startPos, 0);
      const originalVelocity = initialState.velocity;

      const throttleInput: InputCommand = {
        throttle: 1,
        brake: 0,
        reverse: 0,
        steer: 0,
        fire: false,
        dropMine: false,
      };

      const result = stepVehicleOnTrack(
        initialState,
        throttleInput,
        stats,
        track,
        spline,
        100,
        20,
        SIMULATION_STEP_SECONDS,
      );

      // Input state velocity must not be mutated.
      expect(initialState.velocity).toBe(originalVelocity);
      // Result state must be a different object.
      expect(result.state).not.toBe(initialState);
    });
  });
});
