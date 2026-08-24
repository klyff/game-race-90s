import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CAR_FRAME_HEIGHT,
  CAR_FRAME_WIDTH,
  CAR_SPRITE_FRAMES,
} from '../../src/domain/constants.ts';
import { isBBoxSheet, isSpinnerCarId, parseCarSetManifest } from '../../src/data/cars/CarManifest.ts';
import { garageCarouselIds } from '../../src/data/cars/MatrixCarIndex.ts';

const testFileDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(testFileDir, '..', '..');
const carsDir = join(projectRoot, 'public', 'assets', 'cars');
const manifest = parseCarSetManifest(
  JSON.parse(readFileSync(join(carsDir, 'cars.json'), 'utf-8')),
);

describe('imported fleet sheets', () => {
  it('keeps the set default 64×32 grid and lists only available cars', () => {
    expect(manifest.frameWidth).toBe(CAR_FRAME_WIDTH);
    expect(manifest.frameHeight).toBe(CAR_FRAME_HEIGHT);
    expect(manifest.frameCount).toBe(CAR_SPRITE_FRAMES);
    expect(manifest.cars.map(car => car.id)).toEqual([
      'car-1',
      ...garageCarouselIds(),
      '1-muscle-car-gray-number9',
      '2-sportivo-blue-combat',
    ]);
    for (const car of manifest.cars) {
      expect(isBBoxSheet(car)).toBe(true);
      if (isSpinnerCarId(car.id)) {
        expect(car.frameCount).toBe(32);
      } else {
        expect(car.frameCount).toBe(30);
      }
    }
  });

  it('keeps unique ids matching the available garage roster', () => {
    const ids = manifest.cars.map(car => car.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      'car-1',
      ...garageCarouselIds(),
      '1-muscle-car-gray-number9',
      '2-sportivo-blue-combat',
    ]);
  });
});
