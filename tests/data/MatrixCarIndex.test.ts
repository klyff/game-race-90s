import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { matrixHeroNumber, parseCarSetManifest } from '../../src/data/cars/CarManifest.ts';
import {
  garageCarouselIds,
  MATRIX_CAR_INDEX,
  MATRIX_CAR_INDEX_SIZE,
  isMatrixCarIndex,
  matrixCarRow,
  matrixIndexCarId,
  tourIndexCarIds,
} from '../../src/data/cars/MatrixCarIndex.ts';
import { GARAGE_CATALOG } from '../../src/domain/progress/GarageCatalog.ts';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifest = parseCarSetManifest(
  JSON.parse(readFileSync(join(projectRoot, 'public', 'assets', 'cars', 'cars.json'), 'utf-8')),
);

describe('MatrixCarIndex', () => {
  it('authors 33 consecutive folders with unique garage ids', () => {
    expect(MATRIX_CAR_INDEX_SIZE).toBe(33);
    expect(MATRIX_CAR_INDEX.map(row => row.n)).toEqual(
      Array.from({ length: 33 }, (_, index) => index + 1),
    );
    const ids = MATRIX_CAR_INDEX.map(row => row.carId);
    expect(new Set(ids).size).toBe(33);
  });

  it('points every row at its own matrix folder', () => {
    for (const row of MATRIX_CAR_INDEX) {
      expect(matrixHeroNumber(row.carId)).toBe(row.n);
      expect(matrixIndexCarId(row.n)).toBe(row.carId);
      expect(isMatrixCarIndex(row.n)).toBe(true);
    }
  });

  it('keeps the pink Mini on 16 and the camo tank on 18', () => {
    expect(matrixCarRow(16).displayName).toBe('PINK MINI');
    expect(matrixCarRow(16).carId).toBe('car-16');
    expect(matrixCarRow(27).displayName).toBe('Red Hatch');
    expect(matrixCarRow(18).displayName).toBe('CAMO STAR');
    expect(matrixCarRow(6).displayName).toBe('Yellow Haul');
    expect(matrixCarRow(15).displayName).toBe('TRICOLOR');
    expect(matrixCarRow(30).displayName).toBe('VERDÃO');
  });

  it('walks shop ids for 1–20, clock ids for 21–33, then the Delorean', () => {
    const tour = tourIndexCarIds();
    expect(tour).toHaveLength(33);
    expect(tour[0]).toBe('car-1');
    expect(tour[15]).toBe('car-16');
    expect(tour[20]).toBe('car_21');
    expect(tour[32]).toBe('car_33');
    expect(garageCarouselIds()).toEqual([...tour, 'delorean']);
    const shopNumbers = new Set(
      GARAGE_CATALOG.map(entry => matrixHeroNumber(entry.carId)).filter(
        (n): n is number => n !== undefined,
      ),
    );
    for (const row of MATRIX_CAR_INDEX) {
      if (shopNumbers.has(row.n)) {
        expect(GARAGE_CATALOG.some(entry => entry.carId === row.carId)).toBe(true);
      } else {
        expect(row.carId).toBe(`car_${row.n}`);
      }
    }
  });

  it('overlays the same name onto every cars.json sheet that shares a folder', () => {
    for (const car of manifest.cars) {
      const n = matrixHeroNumber(car.id);
      if (n === undefined || !isMatrixCarIndex(n)) {
        continue;
      }
      expect(car.displayName).toBe(matrixCarRow(n).displayName);
      expect(car.archetype).toBe(matrixCarRow(n).archetype);
    }
  });
});
