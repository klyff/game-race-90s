import { describe, it, expect } from 'vitest';
import {
  CAR_CONDITION,
  createCarIntegrity,
  applyImpactDamage,
  applyWeaponDamage,
  tickIntegrity,
  DAMAGE_ROLE,
} from '../../src/domain/vehicle/CarIntegrity.ts';
import type { VehicleStats } from '../../src/domain/vehicle/VehicleStats.ts';
import { parseCarSetManifest } from '../../src/data/cars/CarManifest.ts';
import * as fs from 'fs';

/**
 * All car stats from the game manifest. Used to verify that damage mitigation
 * works across the full range of armor values (0.15 to 0.88).
 */
const carManifestJson = fs.readFileSync(
  'public/assets/cars/cars.json',
  'utf-8',
);
const carManifest = parseCarSetManifest(JSON.parse(carManifestJson));
const carsByArmor: Record<string, VehicleStats> = {};
for (const sheet of carManifest.cars) {
  carsByArmor[sheet.id] = sheet.stats;
}
const ARMOR_04: VehicleStats = { ...carsByArmor['1-muscle-car-gray-number9']!, armor: 0.4 };

describe('CarIntegrity', () => {
  describe('createCarIntegrity', () => {
    it('returns a pristine, undamaged car', () => {
      const car = createCarIntegrity();
      expect(car.integrity).toBe(1);
      expect(car.condition).toBe(CAR_CONDITION.HEALTHY);
      expect(car.respawnRemaining).toBe(0);
    });
  });

  describe('applyImpactDamage', () => {
    it('costs zero damage below the threshold speed (5 u/s scrape)', () => {
      const car = createCarIntegrity();
      const damaged = applyImpactDamage(car, 5, carsByArmor['1-muscle-car-gray-number9']);
      expect(damaged.integrity).toBe(1);
      expect(damaged.condition).toBe(CAR_CONDITION.HEALTHY);
    });

    it('costs nearly nothing at exactly the threshold (6 u/s)', () => {
      const car = createCarIntegrity();
      const damaged = applyImpactDamage(car, 6, carsByArmor['1-muscle-car-gray-number9']);
      expect(damaged.integrity).toBe(1); // 0 excess speed = 0 damage
    });

    it('applies measurable damage just above the threshold (13 u/s)', () => {
      const car = createCarIntegrity();
      const damaged = applyImpactDamage(car, 13, carsByArmor['1-muscle-car-gray-number9']);
      expect(damaged.integrity).toBeLessThan(1);
      expect(damaged.integrity).toBeGreaterThan(0.98);
    });

    it('applies severe damage on a high-speed head-on wall hit (78 u/s)', () => {
      const car = createCarIntegrity();
      const damaged = applyImpactDamage(car, 78, ARMOR_04);
      // (78 - 6)² / 3200 * (1 - 0.4) = 5184 / 3200 * 0.6 = 0.972
      // Leaves the car critical, not an automatic wreck.
      expect(damaged.integrity).toBeCloseTo(0.028, 3);
      expect(damaged.condition).toBe(CAR_CONDITION.CRITICAL);
    });

    it('scales damage monotonically with impact speed', () => {
      const car = createCarIntegrity();
      const impact20 = applyImpactDamage(car, 20, carsByArmor['1-muscle-car-gray-number9']);
      const impact40 = applyImpactDamage(car, 40, carsByArmor['1-muscle-car-gray-number9']);
      const impact60 = applyImpactDamage(car, 60, carsByArmor['1-muscle-car-gray-number9']);
      const impact70 = applyImpactDamage(car, 70, carsByArmor['1-muscle-car-gray-number9']);

      expect(impact20.integrity).toBeGreaterThan(impact40.integrity);
      expect(impact40.integrity).toBeGreaterThan(impact60.integrity);
      expect(impact60.integrity).toBeGreaterThan(impact70.integrity);
    });

    it('reduces damage more for high-armor cars (havac 0.6) than low-armor cars (air-blade 0.15)', () => {
      const car = createCarIntegrity();
      const impact78 = 78;

      const denseHavac = applyImpactDamage(car, impact78, carsByArmor['car-18']);
      const fragileBlade = applyImpactDamage(car, impact78, carsByArmor['car-20']);

      // Both should take damage, havac might survive better if not destroyed.
      // havac: (78 - 6)² / 3200 * (1 - 0.6) = 5184 / 3200 * 0.4 = 0.648
      // blade: (78 - 6)² / 3200 * (1 - 0.15) = 5184 / 3200 * 0.85 = 1.377
      // havac: 1 - 0.648 = 0.352
      // blade: max(0, 1 - 1.377) = 0 (destroyed)
      expect(denseHavac.integrity).toBeGreaterThan(0);
      expect(fragileBlade.integrity).toBe(0);
      expect(denseHavac.integrity).toBeGreaterThan(fragileBlade.integrity);
    });

    it('never pushes integrity below 0', () => {
      const car = createCarIntegrity();
      const destroyed = applyImpactDamage(car, 500, carsByArmor['1-muscle-car-gray-number9']);
      expect(destroyed.integrity).toBe(0);
      expect(destroyed.condition).toBe(CAR_CONDITION.DESTROYED);
      expect(destroyed.respawnRemaining).toBe(2.0);
    });

    it('does not apply damage to a destroyed car', () => {
      let car = createCarIntegrity();
      // Destroy it first.
      car = applyImpactDamage(car, 500, carsByArmor['1-muscle-car-gray-number9']);
      expect(car.condition).toBe(CAR_CONDITION.DESTROYED);

      // Try to damage it again.
      const stayDestroyed = applyImpactDamage(car, 78, carsByArmor['1-muscle-car-gray-number9']);
      expect(stayDestroyed.integrity).toBe(0);
      expect(stayDestroyed.condition).toBe(CAR_CONDITION.DESTROYED);
      expect(stayDestroyed.respawnRemaining).toBe(2.0);
    });

    it('handles NaN impact speed by treating it as 0', () => {
      const car = createCarIntegrity();
      const result = applyImpactDamage(car, NaN, carsByArmor['1-muscle-car-gray-number9']);
      expect(result.integrity).toBe(1);
      expect(result.condition).toBe(CAR_CONDITION.HEALTHY);
    });

    it('handles Infinity impact speed safely', () => {
      const car = createCarIntegrity();
      const result = applyImpactDamage(car, Infinity, carsByArmor['1-muscle-car-gray-number9']);
      // Infinity should cause destruction.
      expect(result.integrity).toBe(0);
      expect(result.condition).toBe(CAR_CONDITION.DESTROYED);
    });

    it('handles NaN armor by using a neutral default', () => {
      const car = createCarIntegrity();
      const badStats: VehicleStats = {
        ...carsByArmor['1-muscle-car-gray-number9'],
        armor: NaN,
      };
      const result = applyImpactDamage(car, 50, badStats);
      expect(Number.isFinite(result.integrity)).toBe(true);
      expect(result.integrity).toBeGreaterThanOrEqual(0);
      expect(result.integrity).toBeLessThanOrEqual(1);
    });

    describe('Damage role (victim vs aggressor)', () => {
      it('a victim takes strictly more damage than an aggressor from the identical impact speed and stats', () => {
        const carVictim = createCarIntegrity();
        const carAggressor = createCarIntegrity();

        const victimResult = applyImpactDamage(
          carVictim,
          70,
          carsByArmor['1-muscle-car-gray-number9'],
          DAMAGE_ROLE.VICTIM,
        );
        const aggressorResult = applyImpactDamage(
          carAggressor,
          70,
          carsByArmor['1-muscle-car-gray-number9'],
          DAMAGE_ROLE.AGGRESSOR,
        );

        expect(victimResult.integrity).toBeLessThan(aggressorResult.integrity);
      });

      it("the aggressor's damage is exactly 40% of the victim's for a 70 u/s impact", () => {
        const carVictim = createCarIntegrity();
        const carAggressor = createCarIntegrity();

        const victimResult = applyImpactDamage(
          carVictim,
          70,
          carsByArmor['1-muscle-car-gray-number9'],
          DAMAGE_ROLE.VICTIM,
        );
        const aggressorResult = applyImpactDamage(
          carAggressor,
          70,
          carsByArmor['1-muscle-car-gray-number9'],
          DAMAGE_ROLE.AGGRESSOR,
        );

        const victimDamage = 1 - victimResult.integrity;
        const aggressorDamage = 1 - aggressorResult.integrity;

        expect(aggressorDamage).toBeCloseTo(victimDamage * 0.4, 5);
      });

      it("the aggressor's damage is exactly 40% of the victim's for a 50 u/s impact", () => {
        const carVictim = createCarIntegrity();
        const carAggressor = createCarIntegrity();

        const victimResult = applyImpactDamage(
          carVictim,
          50,
          carsByArmor['1-muscle-car-gray-number9'],
          DAMAGE_ROLE.VICTIM,
        );
        const aggressorResult = applyImpactDamage(
          carAggressor,
          50,
          carsByArmor['1-muscle-car-gray-number9'],
          DAMAGE_ROLE.AGGRESSOR,
        );

        const victimDamage = 1 - victimResult.integrity;
        const aggressorDamage = 1 - aggressorResult.integrity;

        expect(aggressorDamage).toBeCloseTo(victimDamage * 0.4, 5);
      });

      it('omitting the role parameter behaves identically to passing VICTIM', () => {
        const carDefault = createCarIntegrity();
        const carExplicit = createCarIntegrity();

        const defaultResult = applyImpactDamage(carDefault, 70, carsByArmor['1-muscle-car-gray-number9']);
        const explicitResult = applyImpactDamage(
          carExplicit,
          70,
          carsByArmor['1-muscle-car-gray-number9'],
          DAMAGE_ROLE.VICTIM,
        );

        expect(defaultResult.integrity).toBe(explicitResult.integrity);
        expect(defaultResult.condition).toBe(explicitResult.condition);
        expect(defaultResult.respawnRemaining).toBe(explicitResult.respawnRemaining);
      });

      it('a single 70 u/s victim impact on armor 0.4 leaves the car badly hurt', () => {
        const car = createCarIntegrity();
        const damaged = applyImpactDamage(
          car,
          70,
          ARMOR_04,
          DAMAGE_ROLE.VICTIM,
        );

        // Expected: (70 - 6)² / 3200 * (1 - 0.4) = 4096 / 3200 * 0.6 = 0.768
        // So integrity = 0.232
        expect(damaged.integrity).toBeLessThanOrEqual(0.25);
        expect(damaged.integrity).toBeCloseTo(0.232, 3);
      });

      it('a scrape at 5 u/s costs exactly zero, at victim role', () => {
        const car = createCarIntegrity();
        const damaged = applyImpactDamage(
          car,
          5,
          carsByArmor['1-muscle-car-gray-number9'],
          DAMAGE_ROLE.VICTIM,
        );
        expect(damaged.integrity).toBe(1);
      });

      it('a scrape at 5 u/s costs exactly zero, at aggressor role', () => {
        const car = createCarIntegrity();
        const damaged = applyImpactDamage(
          car,
          5,
          carsByArmor['1-muscle-car-gray-number9'],
          DAMAGE_ROLE.AGGRESSOR,
        );
        expect(damaged.integrity).toBe(1);
      });

      it('high armor (havac 0.6) loses strictly less than low armor (air-blade 0.15) from the same victim impact', () => {
        const carHavac = createCarIntegrity();
        const carBlade = createCarIntegrity();

        const havacDamaged = applyImpactDamage(
          carHavac,
          70,
          carsByArmor['car-18'],
          DAMAGE_ROLE.VICTIM,
        );
        const bladeDamaged = applyImpactDamage(
          carBlade,
          70,
          carsByArmor['car-20'],
          DAMAGE_ROLE.VICTIM,
        );

        expect(havacDamaged.integrity).toBeGreaterThan(bladeDamaged.integrity);
      });

      it('high armor (havac 0.6) loses strictly less than low armor (air-blade 0.15) from the same aggressor impact', () => {
        const carHavac = createCarIntegrity();
        const carBlade = createCarIntegrity();

        const havacDamaged = applyImpactDamage(
          carHavac,
          70,
          carsByArmor['car-18'],
          DAMAGE_ROLE.AGGRESSOR,
        );
        const bladeDamaged = applyImpactDamage(
          carBlade,
          70,
          carsByArmor['car-20'],
          DAMAGE_ROLE.AGGRESSOR,
        );

        expect(havacDamaged.integrity).toBeGreaterThan(bladeDamaged.integrity);
      });
    });
  });

  describe('applyWeaponDamage', () => {
    it('applies weapon damage mitigated by armor', () => {
      const car = createCarIntegrity();
      const rawDamage = 0.25;

      const marauderHit = applyWeaponDamage(
        car,
        rawDamage,
        carsByArmor['1-muscle-car-gray-number9'],
      );
      const bladeHit = applyWeaponDamage(car, rawDamage, carsByArmor['car-20']);

      // Both lose integrity, but the bomber loses less (armor 0.4 > 0.16).
      expect(marauderHit.integrity).toBeGreaterThan(bladeHit.integrity);
      expect(marauderHit.integrity).toBe(1 - rawDamage * (1 - carsByArmor['1-muscle-car-gray-number9'].armor));
      expect(bladeHit.integrity).toBe(1 - rawDamage * (1 - carsByArmor['car-20'].armor));
    });

    it('does not apply damage for zero rawDamage', () => {
      const car = createCarIntegrity();
      const result = applyWeaponDamage(car, 0, carsByArmor['1-muscle-car-gray-number9']);
      expect(result.integrity).toBe(1);
    });

    it('clamps negative damage to zero', () => {
      const car = createCarIntegrity();
      const result = applyWeaponDamage(car, -0.5, carsByArmor['1-muscle-car-gray-number9']);
      expect(result.integrity).toBe(1);
    });

    it('does not apply damage to a destroyed car', () => {
      let car = createCarIntegrity();
      car = applyImpactDamage(car, 500, carsByArmor['1-muscle-car-gray-number9']);
      expect(car.condition).toBe(CAR_CONDITION.DESTROYED);

      const stillDestroyed = applyWeaponDamage(car, 0.5, carsByArmor['1-muscle-car-gray-number9']);
      expect(stillDestroyed.integrity).toBe(0);
      expect(stillDestroyed.condition).toBe(CAR_CONDITION.DESTROYED);
    });

    it('handles NaN and Infinity damage safely', () => {
      const car = createCarIntegrity();
      const nanResult = applyWeaponDamage(car, NaN, carsByArmor['1-muscle-car-gray-number9']);
      expect(Number.isFinite(nanResult.integrity)).toBe(true);

      const infResult = applyWeaponDamage(car, Infinity, carsByArmor['1-muscle-car-gray-number9']);
      expect(infResult.integrity).toBe(0);
      expect(infResult.condition).toBe(CAR_CONDITION.DESTROYED);
    });
  });

  describe('tickIntegrity', () => {
    it('does not tick the timer on a healthy car', () => {
      const car = createCarIntegrity();
      const ticked = tickIntegrity(car, 0.5);
      expect(ticked.respawnRemaining).toBe(0);
      expect(ticked.condition).toBe(CAR_CONDITION.HEALTHY);
    });

    it('counts down the respawn timer while destroyed', () => {
      let car = createCarIntegrity();
      car = applyImpactDamage(car, 500, carsByArmor['1-muscle-car-gray-number9']);
      expect(car.respawnRemaining).toBe(2.0);

      const ticked1 = tickIntegrity(car, 0.5);
      expect(ticked1.respawnRemaining).toBe(1.5);
      expect(ticked1.condition).toBe(CAR_CONDITION.DESTROYED);

      const ticked2 = tickIntegrity(ticked1, 0.5);
      expect(ticked2.respawnRemaining).toBe(1.0);

      const ticked3 = tickIntegrity(ticked2, 1.0);
      expect(ticked3.respawnRemaining).toBe(0);
    });

    it('restores a pristine healthy car when respawn timer expires', () => {
      let car = createCarIntegrity();
      car = applyImpactDamage(car, 500, carsByArmor['1-muscle-car-gray-number9']);
      expect(car.integrity).toBe(0);

      const restored = tickIntegrity(car, 2.0);
      expect(restored.integrity).toBe(1);
      expect(restored.condition).toBe(CAR_CONDITION.HEALTHY);
      expect(restored.respawnRemaining).toBe(0);
    });

    it('clamps the timer to 0 if delta overshoots', () => {
      let car = createCarIntegrity();
      car = applyImpactDamage(car, 500, carsByArmor['1-muscle-car-gray-number9']);
      const restored = tickIntegrity(car, 5.0); // Much larger than remaining 2.0
      expect(restored.integrity).toBe(1);
      expect(restored.respawnRemaining).toBe(0);
    });

    it('handles NaN delta safely', () => {
      let car = createCarIntegrity();
      car = applyImpactDamage(car, 500, carsByArmor['1-muscle-car-gray-number9']);
      const ticked = tickIntegrity(car, NaN);
      // NaN is treated as 0, so timer should not change.
      expect(ticked.respawnRemaining).toBe(2.0);
    });
  });

  describe('Condition thresholds', () => {
    it('is HEALTHY above 0.66', () => {
      let car = createCarIntegrity();
      // Damage to 0.67 integrity.
      car = applyWeaponDamage(car, 0.33, carsByArmor['1-muscle-car-gray-number9']);
      expect(car.condition).toBe(CAR_CONDITION.HEALTHY);
    });

    it('is DAMAGED at exactly 0.66 (boundary)', () => {
      const statsNoArmor: VehicleStats = { ...carsByArmor['1-muscle-car-gray-number9'], armor: 0 };
      let car = createCarIntegrity();
      car = applyWeaponDamage(car, 0.34, statsNoArmor);
      expect(car.integrity).toBeCloseTo(0.66, 5);
      expect(car.condition).toBe(CAR_CONDITION.DAMAGED);
    });

    it('is DAMAGED between 0.33 and 0.66', () => {
      const statsNoArmor: VehicleStats = { ...carsByArmor['1-muscle-car-gray-number9'], armor: 0 };
      let car = createCarIntegrity();
      car = applyWeaponDamage(car, 0.5, statsNoArmor); // 0.5 damage with no armor
      expect(car.integrity).toBe(0.5);
      expect(car.condition).toBe(CAR_CONDITION.DAMAGED);
    });

    it('is CRITICAL at exactly 0.33 (boundary)', () => {
      const statsNoArmor: VehicleStats = { ...carsByArmor['1-muscle-car-gray-number9'], armor: 0 };
      let car = createCarIntegrity();
      car = applyWeaponDamage(car, 0.67, statsNoArmor);
      expect(car.integrity).toBeCloseTo(0.33, 5);
      expect(car.condition).toBe(CAR_CONDITION.CRITICAL);
    });

    it('is CRITICAL between 0 and 0.33', () => {
      const statsNoArmor: VehicleStats = { ...carsByArmor['1-muscle-car-gray-number9'], armor: 0 };
      let car = createCarIntegrity();
      car = applyWeaponDamage(car, 0.8, statsNoArmor);
      expect(car.integrity).toBeCloseTo(0.2, 5);
      expect(car.condition).toBe(CAR_CONDITION.CRITICAL);
    });

    it('is DESTROYED at exactly 0', () => {
      let car = createCarIntegrity();
      car = applyImpactDamage(car, 500, carsByArmor['1-muscle-car-gray-number9']);
      expect(car.integrity).toBe(0);
      expect(car.condition).toBe(CAR_CONDITION.DESTROYED);
      expect(car.respawnRemaining).toBe(2.0);
    });
  });

  describe('Realistic clean-lap scenario', () => {
    it('40 glancing 5 u/s wall scrapes leave the car driveable', () => {
      let car = createCarIntegrity();

      // 40 gentle scrapes, each at 5 u/s (below the 6 u/s damage threshold).
      for (let i = 0; i < 40; i++) {
        car = applyImpactDamage(car, 5, carsByArmor['1-muscle-car-gray-number9']);
      }

      // Car should still be driveable: not destroyed.
      expect(car.condition).not.toBe(CAR_CONDITION.DESTROYED);
      expect(car.integrity).toBe(1); // Still pristine — no damage was applied.
      expect(car.respawnRemaining).toBe(0);
    });

    it('40 moderate 25 u/s impacts accumulate significant damage', () => {
      let car = createCarIntegrity();

      // 40 moderate impacts at 25 u/s.
      for (let i = 0; i < 40; i++) {
        car = applyImpactDamage(car, 25, carsByArmor['1-muscle-car-gray-number9']);
        // Verify that repeated damage does accumulate and the condition degrades.
      }

      // Each hit: (25 - 6)² / 3200 * (1 - 0.4) = 361 / 3200 * 0.6 ≈ 0.0677
      // 40 hits ≈ 2.71 damage, but clamped, so car is destroyed
      expect(car.condition).toBe(CAR_CONDITION.DESTROYED);
      expect(car.integrity).toBe(0);
    });
  });

  describe('Integrity is always clamped to [0, 1]', () => {
    it('never goes below 0', () => {
      let car = createCarIntegrity();
      car = applyImpactDamage(car, 1000, carsByArmor['1-muscle-car-gray-number9']);
      expect(car.integrity).toBe(0);
      expect(car.integrity).toBeGreaterThanOrEqual(0);
    });

    it('never goes above 1', () => {
      const car = createCarIntegrity();
      expect(car.integrity).toBe(1);
      expect(car.integrity).toBeLessThanOrEqual(1);
    });

    it('remains clamped after multiple operations', () => {
      let car = createCarIntegrity();
      car = applyWeaponDamage(car, 0.5, carsByArmor['1-muscle-car-gray-number9']);
      car = applyImpactDamage(car, 50, carsByArmor['1-muscle-car-gray-number9']);
      car = applyWeaponDamage(car, 1.0, carsByArmor['1-muscle-car-gray-number9']);
      expect(car.integrity).toBeGreaterThanOrEqual(0);
      expect(car.integrity).toBeLessThanOrEqual(1);
    });
  });

  describe('Pure function semantics', () => {
    it('does not mutate input when applying impact damage', () => {
      const car = createCarIntegrity();
      const before = { ...car };
      applyImpactDamage(car, 50, carsByArmor['1-muscle-car-gray-number9']);
      expect(car).toEqual(before);
    });

    it('does not mutate input when applying weapon damage', () => {
      const car = createCarIntegrity();
      const before = { ...car };
      applyWeaponDamage(car, 0.5, carsByArmor['1-muscle-car-gray-number9']);
      expect(car).toEqual(before);
    });

    it('does not mutate input when ticking integrity', () => {
      let car = createCarIntegrity();
      car = applyImpactDamage(car, 500, carsByArmor['1-muscle-car-gray-number9']);
      const before = { ...car };
      tickIntegrity(car, 1.0);
      expect(car).toEqual(before);
    });
  });
});

describe('Damage arithmetic verification', () => {
  it('documents the formula: 51 u/s head-on = ~38% damage at armor 0.4', () => {
    const car = createCarIntegrity();
    const damaged = applyImpactDamage(car, 51, ARMOR_04);

    // Expected: (51 - 6)² / 3200 * (1 - 0.4) = 2025 / 3200 * 0.6 = 0.3797
    // So integrity ≈ 0.620
    expect(damaged.integrity).toBeCloseTo(0.62, 2);
    expect(1 - damaged.integrity).toBeCloseTo(0.38, 2);
  });

  it('documents the formula: 5 u/s scrape = 0% damage', () => {
    const car = createCarIntegrity();
    const damaged = applyImpactDamage(car, 5, carsByArmor['1-muscle-car-gray-number9']);
    expect(damaged.integrity).toBe(1);
  });

  it('documents armor mitigation: camo tank (0.8) survives better than Ash Comet (0.16) at 51 u/s', () => {
    const car = createCarIntegrity();

    const havacHit = applyImpactDamage(car, 51, carsByArmor['car-18']);
    const bladeHit = applyImpactDamage(car, 51, carsByArmor['car-20']);

    // camo:  (51 - 6)² / 3200 * (1 - 0.8)  = 2025 / 3200 * 0.2  = 0.1266 → 0.873
    // comet: (51 - 6)² / 3200 * (1 - 0.16) = 2025 / 3200 * 0.84 = 0.5316 → 0.468
    expect(havacHit.integrity).toBeCloseTo(0.873, 2);
    expect(bladeHit.integrity).toBeCloseTo(0.468, 2);
    expect(havacHit.integrity).toBeGreaterThan(bladeHit.integrity);
  });
});
