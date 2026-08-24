import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FLEET_DEFAULT_CAR_ID,
  isLiveSpinnerCarId,
  isOutOfServiceCarId,
  isRetiredCarId,
  isUnavailableCarId,
  sanitizeCarId,
  sanitizeOwnedCarIds,
} from '../../src/data/cars/FleetStatus.ts';
import { parseCarSetManifest, playableCarIds } from '../../src/data/cars/CarManifest.ts';
import { parseCareer } from '../../src/domain/progress/Career.ts';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifest = parseCarSetManifest(
  JSON.parse(readFileSync(join(projectRoot, 'public', 'assets', 'cars', 'cars.json'), 'utf-8')),
);

describe('FleetStatus', () => {
  it('keeps only spinner ids live', () => {
    expect(isLiveSpinnerCarId('2-sportivo-blue-combat')).toBe(true);
    expect(isLiveSpinnerCarId('1-muscle-car-gray-number9')).toBe(true);
    expect(isLiveSpinnerCarId('car-1')).toBe(false);
    expect(isLiveSpinnerCarId('car_21')).toBe(false);
    expect(isLiveSpinnerCarId('delorean')).toBe(false);
    expect(isRetiredCarId('car-1')).toBe(true);
    expect(isUnavailableCarId('delorean')).toBe(true);
    expect(isOutOfServiceCarId('car-1')).toBe(true);
    expect(isOutOfServiceCarId('car_21')).toBe(true);
    expect(isOutOfServiceCarId('delorean')).toBe(true);
    expect(isOutOfServiceCarId('2-sportivo-blue-combat')).toBe(false);
  });

  it('still lists leftover matrix sheets for tests, but not as the default live pick', () => {
    const ids = playableCarIds(manifest);
    expect(ids).toContain('2-sportivo-blue-combat');
    expect(ids).not.toContain('car-1');
    expect(ids).not.toContain('delorean');
  });

  it('remaps a save that still holds matrix or Delorean to Blue Combat', () => {
    expect(sanitizeCarId('car-1')).toBe(FLEET_DEFAULT_CAR_ID);
    expect(sanitizeCarId('car_21')).toBe(FLEET_DEFAULT_CAR_ID);
    expect(sanitizeOwnedCarIds(['car-1', 'delorean', '2-sportivo-blue-combat'])).toEqual([
      '2-sportivo-blue-combat',
    ]);
    expect(sanitizeOwnedCarIds(['car-18', 'car_21'])).toEqual(['2-sportivo-blue-combat']);
    const career = parseCareer({
      activeSlotIndex: 0,
      slots: [
        {
          cash: 70_000,
          points: 0,
          ownedCarIds: ['car-1', 'delorean', 'car_21'],
          equippedCarId: 'car-1',
          lastPlanetId: 'thunder-basin',
          lastTrackId: 'thunder-basin',
          rivalNames: ['KIRA'],
          rivalPoints: [0],
          trackPoints: {},
          clearedTrackIds: [],
        },
        null,
        null,
      ],
    });
    expect(career.slots[0]?.ownedCarIds).toEqual(['2-sportivo-blue-combat']);
    expect(career.slots[0]?.equippedCarId).toBe('2-sportivo-blue-combat');
  });
});
