import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { findTrack } from '../../src/data/tracks/registry.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import { parseCarSetManifest, findCarSheet } from '../../src/data/cars/CarManifest.ts';
import { createVehicleState } from '../../src/domain/vehicle/Vehicle.ts';
import type { VehicleStats } from '../../src/domain/vehicle/VehicleStats.ts';
import { stepVehicleOnTrack } from '../../src/domain/race/OnTrackStep.ts';
import { PaceDriver, PACE_DRIVER_DEFAULTS } from '../../src/domain/vehicle/PaceDriver.ts';
import type { InputCommand } from '../../src/domain/input/InputCommand.ts';
import { SIMULATION_STEP_SECONDS } from '../../src/domain/constants.ts';
import { add, scale, angleOf } from '../../src/domain/math/Vec2.ts';

/**
 * Result of driving one complete lap of the track with a specific car.
 */
export interface LapResult {
  readonly lapSeconds: number;
  readonly steps: number;
  readonly completed: boolean;
  readonly maxAbsLateralOffset: number;
  readonly wallContacts: number;
  readonly slidingStepFraction: number;
  readonly topSpeed: number;
  readonly meanSpeed: number;
}

/**
 * Drives one lap of the circuit with a specific car's stats using PaceDriver.
 * Car is placed at starting grid position exactly as RaceScene.respawn does.
 * Uses the exact same pipeline the game uses: project → command → step → re-project → wall.
 */
function driveLap(
  stats: VehicleStats,
  track: ReturnType<typeof findTrack>,
  spline: TrackSpline,
  options?: {
    readonly stepBudget?: number;
    readonly searchWindow?: number;
  },
): LapResult {
  const stepBudget = options?.stepBudget ?? 100_000;
  const searchWindow = options?.searchWindow ?? 50;
  const SPAWN_SETBACK = 14; // Matches RaceScene

  // Place car exactly as RaceScene.respawn does
  const spawnDistance = spline.wrap(track.startLineDistance - SPAWN_SETBACK);
  const spawnFrame = spline.frameAt(spawnDistance);
  const lateralOffset = track.gridLateralOffsets[0] ?? 0;
  const position = add(spawnFrame.position, scale(spawnFrame.normal, lateralOffset));
  const heading = angleOf(spawnFrame.tangent);

  let state = createVehicleState(position, heading);
  const driver = new PaceDriver(PACE_DRIVER_DEFAULTS);

  // Lap tracking: accumulate forward progress using signed delta
  let accumulatedForwardProgress = 0;
  let previousDistance = spawnDistance;
  let hintDistance = spawnDistance;

  // Metrics accumulation
  const speeds: number[] = [];
  let maxAbsLateralOffset = 0;
  let wallContacts = 0;
  let slidingSteps = 0;
  let step = 0;

  for (; step < stepBudget; step += 1) {
    // Project current position onto the centreline using the previous frame's distance as a hint
    const projection = spline.projectNear(state.position, hintDistance, searchWindow);

    // Ask the driver for the next command
    const command: InputCommand = driver.command(state, projection, stats, spline);

    // Execute one simulation step (project → surface → integrate → re-project → wall)
    const result = stepVehicleOnTrack(state, command, stats, track, spline, projection.distance, searchWindow, SIMULATION_STEP_SECONDS);

    // Update state for next frame
    state = result.state;
    hintDistance = result.distance;

    // Accumulate lap progress using signed delta to handle the wrap at the start line
    const delta = spline.signedDelta(previousDistance, result.distance);
    if (delta > 0) {
      accumulatedForwardProgress += delta;
    }
    previousDistance = result.distance;

    // Collect metrics
    const actualSpeed = Math.hypot(state.velocity.x, state.velocity.y);
    speeds.push(actualSpeed);

    maxAbsLateralOffset = Math.max(maxAbsLateralOffset, Math.abs(result.lateralOffset));
    if (result.touchedWall) wallContacts += 1;
    if (result.telemetry.isSliding && result.state.height <= 0) slidingSteps += 1;

    // Check if lap is complete
    if (accumulatedForwardProgress >= spline.totalLength) {
      const lapSeconds = step * SIMULATION_STEP_SECONDS;
      const meanSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      const topSpeed = Math.max(...speeds);
      return {
        lapSeconds,
        steps: step + 1,
        completed: true,
        maxAbsLateralOffset,
        wallContacts,
        slidingStepFraction: slidingSteps / (step + 1),
        topSpeed,
        meanSpeed,
      };
    }
  }

  // Did not complete within step budget
  const finalSpeed = Math.hypot(state.velocity.x, state.velocity.y);
  throw new Error(
    `Car did not complete lap within ${stepBudget} steps. ` +
    `Forward progress: ${accumulatedForwardProgress.toFixed(2)} / ${spline.totalLength.toFixed(2)} units, ` +
    `final speed: ${finalSpeed.toFixed(2)} u/s, ` +
    `lateral offset: ${maxAbsLateralOffset.toFixed(2)}, ` +
    `wall contacts: ${wallContacts}`,
  );
}

const testFileDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(testFileDir, '..', '..');
const carsJsonPath = join(projectRoot, 'public', 'assets', 'cars', 'cars.json');

const track = findTrack('thunder-basin');
const spline = new TrackSpline(track.controlPoints);
const manifest = parseCarSetManifest(JSON.parse(readFileSync(carsJsonPath, 'utf8')));
const carIds = manifest.cars.map(car => car.id);
const trackFullHalfWidth = track.halfWidth + track.shoulderWidth;

describe('LapTimes — full-lap simulation with PaceDriver', () => {
  it('each of the five cars completes a lap', () => {
    // All cars must complete the lap without stalling or getting stuck
    for (const carId of carIds) {
      const sheet = findCarSheet(manifest, carId);
      const result = driveLap(sheet.stats, track, spline);
      expect(result.completed).toBe(true);
    }
  });

  it('leftover Thunder Basin sheet stays under the old Marauder PaceDriver top of 75.3', () => {
    for (const carId of ['car_21'] as const) {
      const sheet = findCarSheet(manifest, carId);
      const result = driveLap(sheet.stats, track, spline);
      expect(result.topSpeed).toBeLessThan(75.3);
    }
  });

  it('lap times fit measured bands (±25% margin)', () => {
    // Measured on 2026-08-18 after CarStatMatrix (Basin teaching band slower):
    // car-1 37.08  car-2 37.27  car-5 37.47  delorean 31.13 (flux, 2026-08-21)  car-9-turbo 39.35
    // car-3 34.07  car-13 34.12  car-4 33.90  car-17 34.33
    // car-8-strong 41.93  car-12-strong 41.47  car-6-tank 46.97  car-18 45.20
    // car-11 33.30  car-15 32.97  car-7-turbo 40.10  car-20 38.50
    // car-10 35.05  car-14 35.67  car-16 34.65  car-19 34.77

    const bands: Record<string, { min: number; max: number }> = {
      '2-sportivo-blue-combat': { min: 27.81, max: 46.35 },
      'car-18': { min: 33.90, max: 56.50 },
      'car-19': { min: 26.08, max: 43.46 },
      'car-20': { min: 28.88, max: 48.13 },
      'car_21': { min: 27.81, max: 46.35 },
      'delorean': { min: 26.65, max: 44.41 },
    };

    const results: Array<{ id: string; lapSeconds: number }> = [];

    for (const carId of carIds) {
      const band = bands[carId];
      if (band === undefined) {
        continue;
      }
      const sheet = findCarSheet(manifest, carId);
      const result = driveLap(sheet.stats, track, spline);
      results.push({ id: carId, lapSeconds: result.lapSeconds });

      expect(result.lapSeconds).toBeGreaterThanOrEqual(band.min);
      expect(result.lapSeconds).toBeLessThanOrEqual(band.max);
    }

    // Print measured table for next reader
    console.log('\nMeasured lap times (reference for bands above):');
    for (const { id, lapSeconds } of results) {
      console.log(`  ${id.padEnd(15)} ${lapSeconds.toFixed(2)}s`);
    }
  });

  it('five cars meaningfully different: spread > 10% and grip beats top speed', () => {
    const results: Array<{ id: string; result: LapResult; maxSpeed: number }> = [];

    for (const carId of carIds) {
      const sheet = findCarSheet(manifest, carId);
      const result = driveLap(sheet.stats, track, spline);
      results.push({ id: carId, result, maxSpeed: sheet.stats.maxSpeed });
    }

    // Spread: fastest to slowest must exceed 10%
    const sorted = [...results].sort((a, b) => a.result.lapSeconds - b.result.lapSeconds);
    const fastest = sorted[0]!.result.lapSeconds;
    const slowest = sorted[sorted.length - 1]!.result.lapSeconds;
    const spreadPercent = ((slowest - fastest) / fastest) * 100;

    console.log(`\nLap time spread: ${spreadPercent.toFixed(1)}% (${fastest.toFixed(2)}s to ${slowest.toFixed(2)}s)`);
    expect(spreadPercent).toBeGreaterThan(10);

    // Correlation: air-blade has the highest maxSpeed (89.1) but should NOT be the fastest by lap
    const airBlade = results.find(r => r.id === 'car-20')!;
    const sportivo = results.find(r => r.id === '2-sportivo-blue-combat')!;
    const airBladeIsHighestMaxSpeed = results.every(r => r.maxSpeed <= airBlade.maxSpeed);
    const airBladeIsNotFastestLap = airBlade.result.lapSeconds > sportivo.result.lapSeconds;

    console.log(`air-blade maxSpeed: ${airBlade.maxSpeed} u/s (highest in cohort)`);
    console.log(`air-blade lap time: ${airBlade.result.lapSeconds.toFixed(2)}s`);
    console.log(`sportivo lap time: ${sportivo.result.lapSeconds.toFixed(2)}s`);
    console.log(`Fact: on Thunder Basin, grip beats top speed — air-blade is not fastest by lap.\n`);

    expect(airBladeIsHighestMaxSpeed).toBe(true);
    expect(airBladeIsNotFastestLap).toBe(true);
  });

  it('projection stays sane: maxAbsLateralOffset within wall clamp', () => {
    // Wall clamp: trackFullHalfWidth - collisionRadius
    for (const carId of carIds) {
      const sheet = findCarSheet(manifest, carId);
      const result = driveLap(sheet.stats, track, spline);
      const wallLimit = trackFullHalfWidth - sheet.stats.collisionRadius;

      expect(result.maxAbsLateralOffset).toBeLessThanOrEqual(wallLimit + 0.1); // Float tolerance
    }
  });

  it('no wall contacts on a clean lap', () => {
    // A properly driven lap should not hit walls
    for (const carId of carIds) {
      const sheet = findCarSheet(manifest, carId);
      const result = driveLap(sheet.stats, track, spline);
      expect(result.wallContacts).toBe(0);
    }
  });

  it('driver not permanently sliding', () => {
    // Sliding is normal in corners, but not for >10% of the lap.
    // Measured 0.0% for all cars, so this guard allows a small amount.
    for (const carId of carIds) {
      const sheet = findCarSheet(manifest, carId);
      const result = driveLap(sheet.stats, track, spline);
      expect(result.slidingStepFraction).toBeLessThan(0.10);
    }
  });
});
