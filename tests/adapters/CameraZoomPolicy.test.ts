import { describe, it, expect } from 'vitest';
import { CameraZoomPolicy } from '../../src/adapters/render/CameraZoomPolicy.ts';

describe('CameraZoomPolicy', () => {
  describe('constructor', () => {
    it('accepts default options', () => {
      const policy = new CameraZoomPolicy();
      // Does not throw; instance is created.
      expect(policy).toBeDefined();
    });

    it('accepts custom options', () => {
      const policy = new CameraZoomPolicy({
        cornerZoom: 1.2,
        straightZoom: 2.5,
        cornerCurvature: 1 / 50,
      });
      expect(policy).toBeDefined();
    });

    it('throws if cornerZoom is non-finite', () => {
      expect(
        () => new CameraZoomPolicy({ cornerZoom: Infinity }),
      ).toThrow(/cornerZoom must be a finite positive number/);

      expect(
        () => new CameraZoomPolicy({ cornerZoom: NaN }),
      ).toThrow(/cornerZoom must be a finite positive number/);
    });

    it('throws if cornerZoom is not positive', () => {
      expect(() => new CameraZoomPolicy({ cornerZoom: 0 })).toThrow(
        /cornerZoom must be a finite positive number/,
      );

      expect(() => new CameraZoomPolicy({ cornerZoom: -1 })).toThrow(
        /cornerZoom must be a finite positive number/,
      );
    });

    it('throws if straightZoom is non-finite', () => {
      expect(
        () => new CameraZoomPolicy({ straightZoom: Infinity }),
      ).toThrow(/straightZoom must be a finite positive number/);

      expect(
        () => new CameraZoomPolicy({ straightZoom: NaN }),
      ).toThrow(/straightZoom must be a finite positive number/);
    });

    it('throws if straightZoom is not positive', () => {
      expect(() => new CameraZoomPolicy({ straightZoom: 0 })).toThrow(
        /straightZoom must be a finite positive number/,
      );

      expect(() => new CameraZoomPolicy({ straightZoom: -1 })).toThrow(
        /straightZoom must be a finite positive number/,
      );
    });

    it('throws if cornerCurvature is not positive', () => {
      expect(() => new CameraZoomPolicy({ cornerCurvature: 0 })).toThrow(
        /cornerCurvature must be positive/,
      );

      expect(() => new CameraZoomPolicy({ cornerCurvature: -1 })).toThrow(
        /cornerCurvature must be positive/,
      );
    });
  });

  describe('targetZoom', () => {
    const policy = new CameraZoomPolicy();
    const defaultCornerZoom = 1.5;
    const defaultStraightZoom = 2.0;

    it('returns cornerZoom when stationary on any track', () => {
      // Speed = 0: pace = 0, so targetZoom = cornerZoom regardless of straightness.
      expect(policy.targetZoom(0, 100, 0)).toBe(defaultCornerZoom);
      expect(policy.targetZoom(0, 100, 0.025)).toBe(defaultCornerZoom); // tight corner
      expect(policy.targetZoom(0, 100, 0.009)).toBe(defaultCornerZoom); // fast sweeper
    });

    it('returns cornerZoom at full speed in a corner at or above cornerCurvature', () => {
      // Curvature at exactly 1/70 threshold.
      const threshold = 1 / 70;
      const result = policy.targetZoom(100, 100, threshold);
      // straightness = 1 - min(1, 1/70 / 1/70) = 1 - 1 = 0.
      expect(result).toBe(defaultCornerZoom);
    });

    it('returns cornerZoom at full speed when curvature exceeds threshold', () => {
      // Curvature well above threshold.
      const result = policy.targetZoom(100, 100, 0.1);
      // straightness → 0 as curvature increases.
      expect(result).toBe(defaultCornerZoom);
    });

    it('returns straightZoom at full speed on a dead straight', () => {
      // Curvature = 0: straightness = 1, pace = 1, so targetZoom = straightZoom.
      expect(policy.targetZoom(100, 100, 0)).toBe(defaultStraightZoom);
    });

    it('returns intermediate zoom at half speed on a straight', () => {
      // Half speed: pace = 0.5, straightness = 1.
      // targetZoom = 1.5 + (2.0 - 1.5) * 1 * 0.5 = 1.5 + 0.25 = 1.75.
      const result = policy.targetZoom(50, 100, 0);
      expect(result).toBeCloseTo(1.75, 10);
    });

    it('respects curvature sign: left and right corners zoom identically', () => {
      // Positive and negative curvature of the same magnitude should give the same zoom.
      const leftCorner = policy.targetZoom(100, 100, 0.05);
      const rightCorner = policy.targetZoom(100, 100, -0.05);
      expect(leftCorner).toBe(rightCorner);
    });

    it('treats negative speed (reversing) as positive absolute value', () => {
      // A car reversing at 50 u/s should behave the same as one going forward at 50 u/s.
      const forward = policy.targetZoom(50, 100, 0);
      const backward = policy.targetZoom(-50, 100, 0);
      expect(backward).toBe(forward);
    });

    it('returns cornerZoom when maxSpeed is non-positive', () => {
      // maxSpeed = 0: pace is undefined, return cornerZoom.
      expect(policy.targetZoom(50, 0, 0)).toBe(defaultCornerZoom);
      expect(policy.targetZoom(50, -1, 0)).toBe(defaultCornerZoom);
    });

    it('returns cornerZoom when speed is non-finite', () => {
      expect(policy.targetZoom(NaN, 100, 0)).toBe(defaultCornerZoom);
      expect(policy.targetZoom(Infinity, 100, 0)).toBe(defaultCornerZoom);
    });

    it('returns cornerZoom when maxSpeed is non-finite', () => {
      expect(policy.targetZoom(50, NaN, 0)).toBe(defaultCornerZoom);
      expect(policy.targetZoom(50, Infinity, 0)).toBe(defaultCornerZoom);
    });

    it('never returns NaN for any combination of inputs', () => {
      const testCases = [
        [0, 100, 0],
        [50, 100, 0],
        [100, 100, 0],
        [100, 100, 0.01],
        [100, 100, 0.1],
        [100, 100, -0.05],
        [-50, 100, 0],
        [NaN, 100, 0],
        [Infinity, 100, 0],
        [50, 0, 0],
        [50, NaN, 0],
        [50, Infinity, 0],
        [50, 100, NaN],
        [50, 100, Infinity],
      ];

      for (const [speed, maxSpeed, curvature] of testCases) {
        const zoom = policy.targetZoom(
          speed as number,
          maxSpeed as number,
          curvature as number,
        );
        expect(Number.isNaN(zoom)).toBe(false);
        expect(Number.isFinite(zoom)).toBe(true);
      }
    });

    it('always returns a value within [cornerZoom, straightZoom]', () => {
      // Sweep a range of speeds and curvatures.
      const speeds = [-100, -50, 0, 25, 50, 75, 100, 150];
      const curvatures = [-0.1, -0.05, -0.01, 0, 0.01, 0.05, 0.1];
      const maxSpeeds = [50, 100, 200];

      for (const speed of speeds) {
        for (const curvature of curvatures) {
          for (const maxSpeed of maxSpeeds) {
            const zoom = policy.targetZoom(speed, maxSpeed, curvature);
            expect(zoom).toBeGreaterThanOrEqual(defaultCornerZoom);
            expect(zoom).toBeLessThanOrEqual(defaultStraightZoom);
          }
        }
      }
    });

    it('respects custom options', () => {
      const customPolicy = new CameraZoomPolicy({
        cornerZoom: 1.0,
        straightZoom: 3.0,
        cornerCurvature: 0.05,
      });

      // At zero curvature (straight) and full speed, should return 3.0.
      expect(customPolicy.targetZoom(100, 100, 0)).toBe(3.0);

      // At or above the threshold, should return 1.0.
      expect(customPolicy.targetZoom(100, 100, 0.05)).toBe(1.0);
      expect(customPolicy.targetZoom(100, 100, 0.1)).toBe(1.0);

      // At half speed on a straight: 1.0 + (3.0 - 1.0) * 1 * 0.5 = 2.0.
      expect(customPolicy.targetZoom(50, 100, 0)).toBeCloseTo(2.0, 10);
    });

    it('produces smooth interpolation: curvature near threshold', () => {
      // Thunder Basin: west hairpin has radius 39.8 (curvature ≈ 0.025),
      // threshold is 1/70 ≈ 0.0143.
      // The hairpin (0.025) should read as a full corner: straightness → 0, zoom → 1.5.
      const hairpinZoom = policy.targetZoom(100, 100, 0.025);
      expect(hairpinZoom).toBeLessThanOrEqual(defaultCornerZoom + 0.05); // close to corner

      // Fast sweeper has radius ~110 (curvature ≈ 0.009), should be ~2/3 corner.
      const sweeperZoom = policy.targetZoom(100, 100, 0.009);
      // straightness = 1 - min(1, 0.009 / 0.0143) ≈ 1 - 0.63 ≈ 0.37.
      // targetZoom = 1.5 + 0.5 * 0.37 * 1 ≈ 1.685.
      expect(sweeperZoom).toBeGreaterThan(defaultCornerZoom);
      expect(sweeperZoom).toBeLessThan(defaultStraightZoom);
      expect(sweeperZoom).toBeCloseTo(1.685, 2);
    });

    it('both straightness and pace are required for full zoom-in', () => {
      // Full speed on a corner: pace = 1, straightness = 0, zoom = 1.5.
      expect(policy.targetZoom(100, 100, 0.05)).toBe(defaultCornerZoom);

      // Full straight but stationary: pace = 0, straightness = 1, zoom = 1.5.
      expect(policy.targetZoom(0, 100, 0)).toBe(defaultCornerZoom);

      // Both full: pace = 1, straightness = 1, zoom = 2.0.
      expect(policy.targetZoom(100, 100, 0)).toBe(defaultStraightZoom);
    });

    it('handles boundary: curvature much smaller than threshold', () => {
      // Very small positive curvature: straightness ≈ 0.993.
      const result = policy.targetZoom(100, 100, 0.0001);
      expect(result).toBeCloseTo(defaultStraightZoom, 2);
    });

    it('handles boundary: curvature much larger than threshold', () => {
      // Very large curvature: straightness → 0.
      const result = policy.targetZoom(100, 100, 1.0);
      expect(result).toBeCloseTo(defaultCornerZoom, 5);
    });
  });

  describe('zoom snapping (zoomStep quantisation)', () => {
    const policyWithSnap = new CameraZoomPolicy({ zoomStep: 0.5 });
    const policyNoSnap = new CameraZoomPolicy({ zoomStep: 0 });
    const policyLargeStep = new CameraZoomPolicy({ zoomStep: 1.0 });

    it('snaps to multiples of zoomStep: 0.5 yields 1.5 or 2.0', () => {
      // At full speed on a straight: unsnapped would be 2.0, snapped is exactly 2.0.
      expect(policyWithSnap.targetZoom(100, 100, 0)).toBe(2.0);

      // At stationary in a corner: unsnapped would be 1.5, snapped is exactly 1.5.
      expect(policyWithSnap.targetZoom(0, 100, 0.025)).toBe(1.5);

      // At half speed on a straight: unsnapped would be 1.75, snapped to nearest 0.5 = 2.0.
      expect(policyWithSnap.targetZoom(50, 100, 0)).toBe(2.0);

      // At 25% speed on a straight: unsnapped would be 1.625, snapped to nearest 0.5 = 1.5.
      expect(policyWithSnap.targetZoom(25, 100, 0)).toBe(1.5);
    });

    it('always returns a multiple of zoomStep when snapping is enabled', () => {
      // Sweep a range of speeds and curvatures; all results should be multiples of 0.5.
      const speeds = [0, 25, 50, 75, 100];
      const curvatures = [0, 0.009, 0.025, 0.05];

      for (const speed of speeds) {
        for (const curvature of curvatures) {
          const zoom = policyWithSnap.targetZoom(speed, 100, curvature);
          const quotient = zoom / 0.5;
          // Check that zoom is a multiple of 0.5 (quotient should be an integer).
          expect(Math.abs(quotient - Math.round(quotient))).toBeLessThan(1e-10);
        }
      }
    });

    it('zoomStep: 0 behaves exactly as before (no snapping)', () => {
      // Compare unsnapped and explicitly no-snap versions on several inputs.
      const unsnappedPolicy = new CameraZoomPolicy();
      const testCases = [
        [0, 100, 0],
        [50, 100, 0],
        [100, 100, 0],
        [100, 100, 0.025],
        [75, 100, 0.009],
      ];

      for (const [speed, maxSpeed, curvature] of testCases) {
        const unsnapped = unsnappedPolicy.targetZoom(
          speed as number,
          maxSpeed as number,
          curvature as number,
        );
        const noSnap = policyNoSnap.targetZoom(
          speed as number,
          maxSpeed as number,
          curvature as number,
        );
        expect(noSnap).toBe(unsnapped);
      }
    });

    it('zoomStep larger than the band still yields a value inside [cornerZoom, straightZoom]', () => {
      // zoomStep: 1.0 with cornerZoom: 1.5 and straightZoom: 2.0 means only one valid snap (1.5 or 2.0).
      // Most values round to one or the other, so the final clamp always holds.
      const speeds = [0, 25, 50, 75, 100, 150];
      const curvatures = [0, 0.01, 0.05];

      for (const speed of speeds) {
        for (const curvature of curvatures) {
          const zoom = policyLargeStep.targetZoom(speed, 100, curvature);
          expect(zoom).toBeGreaterThanOrEqual(1.5);
          expect(zoom).toBeLessThanOrEqual(2.0);
          // Should snap to exactly 1.5 or 2.0 (or 2.0 if rounding goes above).
          const rounded = Math.round(zoom / 1.0) * 1.0;
          expect(Math.abs(zoom - Math.max(1.5, Math.min(2.0, rounded)))).toBeLessThan(
            1e-10,
          );
        }
      }
    });

    it('snapping preserves clamping: rounded values never escape [cornerZoom, straightZoom]', () => {
      // Create a policy where snapping could theoretically round outside the band.
      // Use zoomStep: 0.3 with the default 1.5–2.0 band.
      const trickPolicy = new CameraZoomPolicy({ zoomStep: 0.3 });

      // Test a broad range; all results must stay in [1.5, 2.0].
      const speeds = [0, 10, 25, 50, 75, 100, 200];
      const curvatures = [-0.1, -0.05, 0, 0.01, 0.05, 0.1];

      for (const speed of speeds) {
        for (const curvature of curvatures) {
          const zoom = trickPolicy.targetZoom(speed, 100, curvature);
          expect(zoom).toBeGreaterThanOrEqual(1.5);
          expect(zoom).toBeLessThanOrEqual(2.0);
        }
      }
    });

    it('constructor throws if zoomStep is negative', () => {
      expect(() => new CameraZoomPolicy({ zoomStep: -0.5 })).toThrow(
        /zoomStep must be a finite non-negative number/,
      );
      expect(() => new CameraZoomPolicy({ zoomStep: -1 })).toThrow(
        /zoomStep must be a finite non-negative number/,
      );
    });

    it('constructor throws if zoomStep is not finite', () => {
      expect(() => new CameraZoomPolicy({ zoomStep: NaN })).toThrow(
        /zoomStep must be a finite non-negative number/,
      );
      expect(() => new CameraZoomPolicy({ zoomStep: Infinity })).toThrow(
        /zoomStep must be a finite non-negative number/,
      );
    });

    it('snapping works across a full lap sweep: 0.5 step at various speeds', () => {
      // Simulate sampling along the full lap at different speeds.
      // Thunder Basin parameters: corners at ~0.025 (hairpin), ~0.009 (sweeper), ~0 (straights).
      const cornerCurvature = 0.025; // hairpin
      const sweeperCurvature = 0.009; // fast sweeper
      const straightCurvature = 0; // dead straight
      const speeds = [25, 50, 75, 100];
      const maxSpeed = 78;

      for (const speed of speeds) {
        // In a corner: should snap to 1.5.
        const cornerZoom = policyWithSnap.targetZoom(speed, maxSpeed, cornerCurvature);
        expect(cornerZoom).toBe(1.5);

        // On a sweeper: somewhere between 1.5 and 2.0, rounded to 0.5.
        const sweeperZoom = policyWithSnap.targetZoom(speed, maxSpeed, sweeperCurvature);
        expect([1.5, 2.0]).toContain(sweeperZoom);

        // On a straight: should snap to 1.5 (low speed) or 2.0 (high speed).
        const straightZoom = policyWithSnap.targetZoom(
          speed,
          maxSpeed,
          straightCurvature,
        );
        expect([1.5, 2.0]).toContain(straightZoom);
      }
    });
  });
});
