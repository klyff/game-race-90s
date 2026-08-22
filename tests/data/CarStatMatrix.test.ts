import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findCarSheet,
  matrixHeroNumber,
  parseCarSetManifest,
} from '../../src/data/cars/CarManifest.ts';
import {
  CAR_STAT_MATRIX,
  CAR_STAT_MATRIX_SIZE,
  carStatRow,
  handlingTuple,
  isCarStatMatrixIndex,
} from '../../src/data/cars/CarStatMatrix.ts';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const carsJsonPath = join(projectRoot, 'public', 'assets', 'cars', 'cars.json');
const manifest = parseCarSetManifest(JSON.parse(readFileSync(carsJsonPath, 'utf-8')));

describe('CarStatMatrix', () => {
  it('authors exactly 30 consecutive rows', () => {
    expect(CAR_STAT_MATRIX_SIZE).toBe(30);
    expect(CAR_STAT_MATRIX.map(row => row.n)).toEqual(
      Array.from({ length: 30 }, (_, index) => index + 1),
    );
  });

  it('gives every index a unique handling tuple — no cloned Marauder blocks', () => {
    const tuples = CAR_STAT_MATRIX.map(row => handlingTuple(row.stats));
    expect(new Set(tuples).size).toBe(30);
  });

  it('keeps Thunder Basin starters slower than the old Marauder 78', () => {
    expect(carStatRow(1).stats.maxSpeed).toBeGreaterThanOrEqual(58);
    expect(carStatRow(1).stats.maxSpeed).toBeLessThanOrEqual(63);
    expect(carStatRow(1).stats.enginePower).toBeLessThan(34);
    expect(carStatRow(2).stats.maxSpeed).toBeLessThan(carStatRow(1).stats.maxSpeed);
    expect(carStatRow(5).stats.maxSpeed).toBeLessThan(carStatRow(2).stats.maxSpeed);
    expect(carStatRow(21).homePlanetId).toBe('thunder-basin');
    expect(carStatRow(21).stats.maxSpeed).toBeLessThan(carStatRow(5).stats.maxSpeed);
  });

  it('keeps row 6 as the war tank and row 18 as a heavy tank', () => {
    const tank = carStatRow(6);
    expect(tank.perk).toBe('war-tank');
    expect(tank.homePlanetId).toBe('vulkanis');
    expect(tank.stats.mass).toBeGreaterThanOrEqual(1500);
    expect(tank.stats.maxSpeed).toBeLessThanOrEqual(54);

    const slag = carStatRow(18);
    expect(slag.homePlanetId).toBe('vulkanis');
    expect(slag.stats.mass).toBeGreaterThanOrEqual(1400);
    expect(slag.stats.maxSpeed).toBeLessThanOrEqual(56);
    expect(slag.stats.maxSpeed).toBeGreaterThan(tank.stats.maxSpeed);
  });

  it('keeps Afterburn as the speed ceiling and Frostbite as the grip ceiling', () => {
    const speeds = CAR_STAT_MATRIX.map(row => row.stats.maxSpeed);
    const grips = CAR_STAT_MATRIX.map(row => row.stats.grip);
    expect(Math.max(...speeds)).toBe(carStatRow(7).stats.maxSpeed);
    expect(Math.max(...grips)).toBe(carStatRow(4).stats.grip);
  });
});

describe('cars.json follows CarStatMatrix for indices 1–30', () => {
  it('overlays authored handling without cloning Marauder across the clock fleet', () => {
    const byIndex = new Map<number, string[]>();
    for (const car of manifest.cars) {
      const n = matrixHeroNumber(car.id);
      if (n === undefined || !isCarStatMatrixIndex(n)) {
        continue;
      }
      const row = carStatRow(n);
      expect(car.stats.maxSpeed).toBe(row.stats.maxSpeed);
      expect(car.stats.enginePower).toBe(row.stats.enginePower);
      expect(car.stats.grip).toBe(row.stats.grip);
      expect(car.stats.steerRate).toBe(row.stats.steerRate);
      expect(car.perk).toBe(row.perk);
      expect(car.homePlanetId).toBe(row.homePlanetId);
      const group = byIndex.get(n) ?? [];
      group.push(handlingTuple(car.stats));
      byIndex.set(n, group);
    }
    expect(byIndex.size).toBe(5);
    expect([...byIndex.keys()].sort((a, b) => a - b)).toEqual([1, 18, 19, 20, 21]);
  });

  it('keeps car_18 a heavy tank on Vulkanis', () => {
    const sheet = findCarSheet(manifest, 'car_18');
    expect(sheet.homePlanetId).toBe('vulkanis');
    expect(sheet.stats.mass).toBeGreaterThanOrEqual(1400);
    expect(sheet.stats.maxSpeed).toBeLessThanOrEqual(56);
    expect(sheet.stats.maxSpeed).toBeLessThan(findCarSheet(manifest, 'car-1').stats.maxSpeed);
  });

  it('does not list parked leftover folders (31–33) in the live roster', () => {
    const leftovers = manifest.cars.filter(car => {
      const n = matrixHeroNumber(car.id);
      return n !== undefined && n > 30;
    });
    expect(leftovers).toEqual([]);
  });
});
