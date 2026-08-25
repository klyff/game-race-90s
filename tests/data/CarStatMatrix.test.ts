import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCarSetManifest } from '../../src/data/cars/CarManifest.ts';
import {
  CAR_STAT_MATRIX,
  CAR_STAT_MATRIX_SIZE,
  carStatRow,
  handlingTuple,
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

describe('cars.json is the live spinner fleet', () => {
  it('does not list matrix leftover ids', () => {
    expect(manifest.cars.map(car => car.id)).toEqual([
      '1-muscle-car-gray-number9',
      '2-sportivo-blue-combat',
      '3-red-oh-red',
      '5-all-pink-fury',
      '6-suv-black-noir',
    ]);
    expect(manifest.cars.some(car => car.id === 'car_18' || car.id === 'delorean')).toBe(false);
  });
});
