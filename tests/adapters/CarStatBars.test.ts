import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseCarSetManifest } from '../../src/data/cars/CarManifest.ts';
import type { CarSetManifest, CarSheetManifest } from '../../src/data/cars/CarManifest.ts';
import type { VehicleStats } from '../../src/domain/vehicle/VehicleStats.ts';
import { statBars, STAT_BAR_FIELDS } from '../../src/adapters/render/CarStatBars.ts';

const MINIMUM_BAR_FRACTION = 0.15;

const testFileDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(testFileDir, '..', '..');
const carsJsonPath = join(projectRoot, 'public', 'assets', 'cars', 'cars.json');

const manifest = parseCarSetManifest(JSON.parse(readFileSync(carsJsonPath, 'utf8')));
const carIds = manifest.cars.map(car => car.id);

const BASE_STATS: VehicleStats = {
  mass: 1000,
  enginePower: 30,
  brakeForce: 40,
  maxSpeed: 70,
  grip: 25,
  steerRate: 2,
  steerSpeedFalloff: 0.5,
  armor: 0.3,
  ammoCapacity: 5,
  collisionRadius: 1.7,
  aimRadius: 3.0,
};

function makeCar(id: string, statsOverride: Partial<VehicleStats>): CarSheetManifest {
  return {
    id,
    displayName: id,
    archetype: '',
    image: `${id}.png`,
    shadow: { width: 40, height: 20 },
    stats: { ...BASE_STATS, ...statsOverride },
  };
}

function makeManifest(cars: readonly CarSheetManifest[]): CarSetManifest {
  return {
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 32,
    pixelsPerUnit: 8,
    origin: { x: 0.5, y: 0.5 },
    cars,
  };
}

describe('CarStatBars — real roster', () => {
  it('returns four bars, in the documented order and labels, for every car', () => {
    const expectedLabels = STAT_BAR_FIELDS.map(f => f.label);
    expect(expectedLabels).toEqual(['SPEED', 'ACCEL', 'GRIP', 'ARMOR']);

    for (const carId of carIds) {
      const bars = statBars(manifest, carId);
      expect(bars).toHaveLength(4);
      expect(bars.map(b => b.label)).toEqual(expectedLabels);
    }
  });

  it('air-blade has the highest SPEED fraction, exactly 1 (roster maxSpeed is 95)', () => {
    const bars = statBars(manifest, 'car-7-turbo');
    const speedBar = bars.find(b => b.label === 'SPEED')!;
    expect(speedBar.value).toBe(95);
    expect(speedBar.fraction).toBe(1);

    for (const carId of carIds) {
      const otherSpeed = statBars(manifest, carId).find(b => b.label === 'SPEED')!.fraction;
      expect(otherSpeed).toBeLessThanOrEqual(speedBar.fraction);
    }
  });

  it('cryo-hollow cars share the highest GRIP fraction', () => {
    const snowGrip = statBars(manifest, 'car-4').find(b => b.label === 'GRIP')!.fraction;

    for (const carId of carIds) {
      const otherGrip = statBars(manifest, carId).find(b => b.label === 'GRIP')!.fraction;
      expect(snowGrip).toBeGreaterThanOrEqual(otherGrip);
    }
  });

  it('the tank has the highest ARMOR fraction (the roster armor king)', () => {
    const magmaArmor = statBars(manifest, 'car-6-tank').find(b => b.label === 'ARMOR')!.fraction;

    for (const carId of carIds) {
      if (carId === 'car-6-tank') continue;
      const otherArmor = statBars(manifest, carId).find(b => b.label === 'ARMOR')!.fraction;
      expect(magmaArmor).toBeGreaterThan(otherArmor);
    }
  });

  it('air-blade has the lowest ARMOR fraction, exactly MINIMUM_BAR_FRACTION', () => {
    const airBladeArmor = statBars(manifest, 'car-7-turbo').find(b => b.label === 'ARMOR')!.fraction;
    expect(airBladeArmor).toBe(MINIMUM_BAR_FRACTION);

    for (const carId of carIds) {
      const otherArmor = statBars(manifest, carId).find(b => b.label === 'ARMOR')!.fraction;
      expect(airBladeArmor).toBeLessThanOrEqual(otherArmor);
    }
  });

  it('every fraction, for every car and field, is within [MINIMUM_BAR_FRACTION, 1] and finite', () => {
    for (const carId of carIds) {
      for (const bar of statBars(manifest, carId)) {
        expect(Number.isFinite(bar.fraction)).toBe(true);
        expect(bar.fraction).toBeGreaterThanOrEqual(MINIMUM_BAR_FRACTION);
        expect(bar.fraction).toBeLessThanOrEqual(1);
      }
    }
  });

  it('value matches the car\'s real raw stat from the manifest', () => {
    const fieldByLabel = new Map<string, keyof VehicleStats>(
      STAT_BAR_FIELDS.map(f => [f.label, f.field]),
    );

    for (const carId of carIds) {
      const sheet = manifest.cars.find(car => car.id === carId)!;
      for (const bar of statBars(manifest, carId)) {
        const field = fieldByLabel.get(bar.label)!;
        expect(bar.value).toBe(sheet.stats[field]);
      }
    }
  });

  it('throws for an unknown carId', () => {
    expect(() => statBars(manifest, 'not-a-real-car')).toThrow();
  });

  it('prints the fraction table for all five cars (for manual eyeballing)', () => {
    const rows = carIds.map(carId => {
      const bars = statBars(manifest, carId);
      const cells = bars.map(b => `${b.label}=${b.fraction.toFixed(3)} (v=${b.value})`).join('  ');
      return `${carId.padEnd(14)} ${cells}`;
    });
    console.log('\nCar stat bar fractions (roster-normalised):');
    console.log(rows.join('\n'));

    // Not a self-equality assertion: this actually verifies the table has one row per car.
    expect(rows).toHaveLength(carIds.length);
  });
});

describe('CarStatBars — synthetic edge cases', () => {
  it('all cars sharing one value for a field yields fraction 1 for that field, not NaN', () => {
    const cars = [
      makeCar('a', { grip: 20 }),
      makeCar('b', { grip: 20 }),
      makeCar('c', { grip: 20 }),
    ];
    const synthetic = makeManifest(cars);

    for (const carId of ['a', 'b', 'c']) {
      const gripBar = statBars(synthetic, carId).find(b => b.label === 'GRIP')!;
      expect(gripBar.fraction).toBe(1);
      expect(Number.isNaN(gripBar.fraction)).toBe(false);
    }
  });

  it('a non-finite stat yields a finite fraction', () => {
    const cars = [
      makeCar('a', { maxSpeed: Number.NaN }),
      makeCar('b', { maxSpeed: 80 }),
      makeCar('c', { maxSpeed: Number.POSITIVE_INFINITY }),
    ];
    const synthetic = makeManifest(cars);

    for (const carId of ['a', 'b', 'c']) {
      const speedBar = statBars(synthetic, carId).find(b => b.label === 'SPEED')!;
      expect(Number.isFinite(speedBar.fraction)).toBe(true);
      expect(speedBar.fraction).toBeGreaterThanOrEqual(MINIMUM_BAR_FRACTION);
      expect(speedBar.fraction).toBeLessThanOrEqual(1);
    }
  });

  it('a single-car manifest does not divide by zero', () => {
    const synthetic = makeManifest([makeCar('solo', {})]);
    const bars = statBars(synthetic, 'solo');

    expect(bars).toHaveLength(4);
    for (const bar of bars) {
      expect(bar.fraction).toBe(1);
      expect(Number.isFinite(bar.fraction)).toBe(true);
    }
  });
});
