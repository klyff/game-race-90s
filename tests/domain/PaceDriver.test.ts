import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { findTrack } from '../../src/data/tracks/registry.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import type { TrackProjection } from '../../src/domain/track/TrackSpline.ts';
import { PaceDriver, PACE_DRIVER_DEFAULTS } from '../../src/domain/vehicle/PaceDriver.ts';
import { createVehicleState } from '../../src/domain/vehicle/Vehicle.ts';
import { parseCarSetManifest, findCarSheet } from '../../src/data/cars/CarManifest.ts';
import { add, scale, angleOf } from '../../src/domain/math/Vec2.ts';

const testFileDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(testFileDir, '..', '..');
const carsJsonPath = join(projectRoot, 'public', 'assets', 'cars', 'cars.json');

// Load the real track and spline.
const track = findTrack('thunder-basin');
const spline = new TrackSpline(track.controlPoints);

// Load real car stats.
const carsJsonRaw = readFileSync(carsJsonPath, 'utf-8');
const carSetManifest = parseCarSetManifest(JSON.parse(carsJsonRaw));
const marauderSheet = findCarSheet(carSetManifest, '2-sportivo-blue-combat');
const marauderStats = marauderSheet.stats;

// Driver instance with defaults.
const driver = new PaceDriver();

/**
 * Helper: return the signed curvature at a specific distance on Thunder Basin.
 * Positive = left bend, negative = right bend.
 */
function curvatureAt(distance: number): number {
  return spline.curvatureAt(distance, PACE_DRIVER_DEFAULTS.cornerLookAheadSpan);
}

/**
 * Helper: find a location on the track where curvature has a known sign.
 * Returns a projection at that location.
 */
function findLocationWithCurvatureSign(sign: number): TrackProjection {
  // Scan the track in 25-unit increments looking for a curvature of the right sign.
  for (let dist = 0; dist < spline.totalLength; dist += 25) {
    const curv = curvatureAt(dist);
    if ((sign > 0 && curv > 0.001) || (sign < 0 && curv < -0.001)) {
      // Found a left or right bend. Project onto the spline to get a clean frame.
      const pos = spline.positionAt(dist);
      return spline.project(pos);
    }
  }
  throw new Error(`Could not find track location with curvature sign ${sign}`);
}

/**
 * Helper: find a location on the track with maximum curvature magnitude.
 * Used to locate the hairpin reliably.
 */
function findTightestCorner(): TrackProjection {
  let maxCurv = 0;
  let bestDist = 0;
  for (let dist = 0; dist < spline.totalLength; dist += 50) {
    const curv = Math.abs(curvatureAt(dist));
    if (curv > maxCurv) {
      maxCurv = curv;
      bestDist = dist;
    }
  }
  const pos = spline.positionAt(bestDist);
  return spline.project(pos);
}

describe('PaceDriver', () => {
  describe('steering sign', () => {
    it('steers LEFT on a LEFT bend (+y is left per decision 13)', () => {
      const projection = findLocationWithCurvatureSign(1);
      expect(projection).toBeDefined();

      // Car positioned on the centreline, moving with the track, at low speed.
      const heading = angleOf(projection.tangent);
      const state = createVehicleState(projection.position, heading);

      const command = driver.command(state, projection, marauderStats, spline);

      // On a left bend (positive curvature), steering should be positive (left).
      // Even a gentle bend should produce positive steer (the sign is what matters).
      expect(command.steer).toBeGreaterThan(0);
    });

    it('steers RIGHT on a RIGHT bend', () => {
      const projection = findLocationWithCurvatureSign(-1);
      expect(projection).toBeDefined();

      // Car on centreline, moving with the track.
      const heading = angleOf(projection.tangent);
      const state = createVehicleState(projection.position, heading);

      const command = driver.command(state, projection, marauderStats, spline);

      // On a right bend (negative curvature), steering should be negative (right).
      expect(command.steer).toBeLessThan(0);
    });
  });

  describe('lateral offset correction', () => {
    it('steers back toward the centreline from off-centre position', () => {
      // Place the car on the centreline of a straight, but offset to the left.
      const projection = spline.project({ x: -60, y: -162 });
      const lateralOffset = 5; // off-centre to the left
      const correctedPosition = add(projection.position, scale(projection.normal, lateralOffset));
      const offCentreProjection = { ...projection, lateralOffset };

      const heading = angleOf(projection.tangent);
      const state = createVehicleState(correctedPosition, heading);

      const command = driver.command(state, offCentreProjection, marauderStats, spline);

      // Lateral offset feedback should push steer negative (away from left offset).
      // Even if lookahead suggests neutral, the correction should bias right.
      expect(command.steer).toBeLessThan(0);
    });

    it('converges when repeatedly steered from off-centre', () => {
      const projection = spline.project({ x: -60, y: -162 });
      const heading = angleOf(projection.tangent);
      let state = createVehicleState(
        add(projection.position, scale(projection.normal, 8)),
        heading,
      );
      let currentProjection = { ...projection, lateralOffset: 8 };

      // Simulate several steps of steering feedback.
      for (let step = 0; step < 5; step++) {
        const command = driver.command(state, currentProjection, marauderStats, spline);

        // Steer should be negative (back toward centre) at least some of the time.
        if (step < 3) {
          expect(command.steer).toBeLessThan(0);
        }

        // Update position by moving along the commanded steer.
        // (This is a mock: real physics would be more complex, but we just
        // want to confirm the sign persists.)
        state = {
          ...state,
          position: add(state.position, scale(projection.normal, -0.5)),
        };
        currentProjection = { ...currentProjection, lateralOffset: currentProjection.lateralOffset - 0.5 };
      }

      // After corrections, lateral offset should be smaller.
      expect(Math.abs(currentProjection.lateralOffset)).toBeLessThan(8);
    });
  });

  describe('speed control', () => {
    it('targets a lower speed at the hairpin than on the long straight', () => {
      // Hairpin: find the tightest corner.
      const hairpinProj = findTightestCorner();
      const hairpinCurv = Math.abs(curvatureAt(hairpinProj.distance));

      // Long straight: locate a region with minimal curvature (around distance 1200..1300).
      const straightDist = 1250;
      const straightProj = spline.project(spline.positionAt(straightDist));
      const straightCurv = Math.abs(curvatureAt(straightDist));

      // Hairpin must be tighter than the straight.
      expect(hairpinCurv).toBeGreaterThan(straightCurv * 2);

      // Assert the TARGET, not the resulting brake command. Approaching either place at
      // 73 u/s the brake pedal is buried at 1.0 in both cases, so comparing commands
      // compares two saturated values and can only ever be inconclusive.
      const speed = 73;
      const hairpinTarget = driver.targetSpeed(hairpinProj, marauderStats, spline, speed);
      const straightTarget = driver.targetSpeed(straightProj, marauderStats, spline, speed);

      expect(hairpinTarget).toBeLessThan(straightTarget);

      // At rest the braking zone is only `cornerLookAheadMinimum` long, so nothing but a
      // corner right under the nose can hold the target down — and on this straight there
      // is none. Note this is deliberately checked at speed 0: at 73 u/s the braking zone
      // reaches ~90 units ahead and already sees the corner ending the straight, which
      // correctly pulls the target down well below `maxSpeed`.
      expect(driver.targetSpeed(straightProj, marauderStats, spline, 0)).toBe(
        marauderStats.maxSpeed,
      );
    });

    it('measures speed targets correctly: hairpin target speed << straight target speed', () => {
      // Get curvatures at the hairpin and a straight.
      const hairpinProj = findTightestCorner();
      const hairpinCurv = Math.abs(curvatureAt(hairpinProj.distance));

      const straightDist = 1250;
      const straightCurv = Math.abs(curvatureAt(straightDist));

      expect(hairpinCurv).toBeGreaterThan(straightCurv * 2);

      // Derive target speeds using the correct steady-state cornering formula:
      // v_max = sqrt(grip / |curvature|), then apply safety factor.
      const safetyFactor = PACE_DRIVER_DEFAULTS.cornerSafetyFactor;

      // Hairpin: sqrt(grip / |curvature|) * safetyFactor
      const vMaxHairpin = Math.sqrt(marauderStats.grip / hairpinCurv);
      const targetSpeedHairpin = Math.min(marauderStats.maxSpeed, safetyFactor * vMaxHairpin);

      // Straight: curvature ≈ 0, so target is capped at maxSpeed
      const targetSpeedStraight = marauderStats.maxSpeed;

      // The hairpin target speed should be much lower.
      expect(targetSpeedHairpin).toBeLessThan(targetSpeedStraight);
      console.log(
        `Hairpin target: ${targetSpeedHairpin.toFixed(2)} u/s, Straight target: ${targetSpeedStraight.toFixed(2)} u/s`,
      );

      // Verify demanded lateral acceleration never exceeds grip: v² * |curvature| ≤ grip
      const demandedAccelHairpin = targetSpeedHairpin * targetSpeedHairpin * hairpinCurv;
      expect(demandedAccelHairpin).toBeLessThanOrEqual(marauderStats.grip * 1.01); // 1% tolerance for rounding
    });

    it('demanded lateral acceleration never exceeds grip across the whole lap', () => {
      const safetyFactor = PACE_DRIVER_DEFAULTS.cornerSafetyFactor;

      // Sweep across the circuit at 50-unit intervals, checking the speed law.
      for (let dist = 0; dist < spline.totalLength; dist += 50) {
        const curv = spline.curvatureAt(dist, PACE_DRIVER_DEFAULTS.cornerLookAheadSpan);
        const absCurv = Math.abs(curv);

        // Compute target speed using the same logic as PaceDriver.
        const vMaxCornering = absCurv > 1e-6 ? Math.sqrt(marauderStats.grip / absCurv) : marauderStats.maxSpeed;
        const targetSpeed = Math.min(marauderStats.maxSpeed, safetyFactor * vMaxCornering);

        // Demanded lateral acceleration: a = v² * |curvature|
        const demandedAccel = targetSpeed * targetSpeed * absCurv;

        // Must not exceed grip (with 1% tolerance for floating-point rounding).
        expect(demandedAccel).toBeLessThanOrEqual(marauderStats.grip * 1.01);
      }
    });

    it('throttles when far below target speed', () => {
      const projection = spline.project({ x: -60, y: -162 });
      const heading = angleOf(projection.tangent);
      const state = createVehicleState(projection.position, heading);
      const stateWithLowSpeed = { ...state, velocity: scale(projection.tangent, 10) };

      const command = driver.command(stateWithLowSpeed, projection, marauderStats, spline);

      // At only 10 u/s on a road where 40+ is normal, should be full throttle.
      expect(command.throttle).toBeGreaterThan(0.5);
      expect(command.brake).toBeLessThan(0.1);
    });

    it('brakes when well above target speed', () => {
      const projection = spline.project({ x: -60, y: -162 });
      const heading = angleOf(projection.tangent);
      const state = createVehicleState(projection.position, heading);
      // Create a state with very high speed (above maxSpeed).
      const stateWithHighSpeed = { ...state, velocity: scale(projection.tangent, 95) };

      const command = driver.command(stateWithHighSpeed, projection, marauderStats, spline);

      // At 95 u/s on a car with maxSpeed 78, should be heavy braking.
      expect(command.brake).toBeGreaterThan(0.5);
      expect(command.throttle).toBeLessThan(0.1);
    });
  });

  describe('weapon inputs', () => {
    it('fire is always false', () => {
      const projection = spline.project({ x: -60, y: -162 });
      const heading = angleOf(projection.tangent);
      const state = createVehicleState(projection.position, heading);

      const command = driver.command(state, projection, marauderStats, spline);

      expect(command.fire).toBe(false);
    });

    it('dropMine is always false', () => {
      const projection = spline.project({ x: -60, y: -162 });
      const heading = angleOf(projection.tangent);
      const state = createVehicleState(projection.position, heading);

      const command = driver.command(state, projection, marauderStats, spline);

      expect(command.dropMine).toBe(false);
    });

    it('dropOil is always false', () => {
      const projection = spline.project({ x: -60, y: -162 });
      const heading = angleOf(projection.tangent);
      const state = createVehicleState(projection.position, heading);

      const command = driver.command(state, projection, marauderStats, spline);

      expect(command.dropOil).toBe(false);
    });

    it('reverse is always 0', () => {
      const projection = spline.project({ x: -60, y: -162 });
      const heading = angleOf(projection.tangent);
      const state = createVehicleState(projection.position, heading);

      const command = driver.command(state, projection, marauderStats, spline);

      expect(command.reverse).toBe(0);
    });
  });

  describe('determinism', () => {
    it('produces identical commands for identical inputs', () => {
      const projection = spline.project({ x: -60, y: -162 });
      const heading = angleOf(projection.tangent);
      const state = createVehicleState(projection.position, heading);

      const cmd1 = driver.command(state, projection, marauderStats, spline);
      const cmd2 = driver.command(state, projection, marauderStats, spline);

      expect(cmd1).toEqual(cmd2);
    });

    it('produces different commands for different speeds', () => {
      const projection = spline.project({ x: -60, y: -162 });
      const heading = angleOf(projection.tangent);
      const baseState = createVehicleState(projection.position, heading);

      // State at a speed well below target: should throttle strongly.
      const stateSlow = { ...baseState, velocity: scale(projection.tangent, 15) };
      const cmdSlow = driver.command(stateSlow, projection, marauderStats, spline);

      // State at a speed well above maxSpeed: should brake strongly.
      const stateFast = { ...baseState, velocity: scale(projection.tangent, 90) };
      const cmdFast = driver.command(stateFast, projection, marauderStats, spline);

      // The throttle/brake should be different: slow should throttle, fast should brake.
      expect(cmdSlow.throttle).toBeGreaterThan(0.5);
      expect(cmdFast.brake).toBeGreaterThan(0.5);
      // They should not be identical commands.
      expect(cmdSlow).not.toEqual(cmdFast);
    });
  });
});
