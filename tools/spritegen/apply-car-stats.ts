import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matrixHeroNumber } from '../../src/data/cars/CarManifest.ts';
import { isMatrixCarIndex, matrixCarRow } from '../../src/data/cars/MatrixCarIndex.ts';
import {
  carStatRow,
  isCarStatMatrixIndex,
  overlayAuthoredStats,
} from '../../src/data/cars/CarStatMatrix.ts';
import type { VehicleStats } from '../../src/domain/vehicle/VehicleStats.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MANIFEST_PATH = join(REPO_ROOT, 'public', 'assets', 'cars', 'cars.json');

interface RawCar {
  id?: unknown;
  displayName?: unknown;
  archetype?: unknown;
  stats?: VehicleStats;
  perk?: unknown;
  homePlanetId?: unknown;
  worldAdvantage?: unknown;
}

interface RawManifest {
  cars?: RawCar[];
}

function main(): void {
  const raw = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8')) as RawManifest;
  if (!Array.isArray(raw.cars)) {
    throw new Error(`${MANIFEST_PATH} has no cars array`);
  }

  let updated = 0;
  for (const car of raw.cars) {
    if (typeof car.id !== 'string' || car.stats === undefined) {
      continue;
    }
    const n = matrixHeroNumber(car.id);
    if (n === undefined || !isMatrixCarIndex(n)) {
      continue;
    }
    const identity = matrixCarRow(n);
    car.displayName = identity.displayName;
    car.archetype = identity.archetype;
    if (isCarStatMatrixIndex(n) && car.stats !== undefined) {
      const row = carStatRow(n);
      car.stats = overlayAuthoredStats(car.stats, row.stats);
      car.perk = row.perk;
      car.homePlanetId = row.homePlanetId;
      car.worldAdvantage = row.worldAdvantage;
    }
    updated += 1;
  }

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(raw, null, 2)}\n`);
  console.log(`applied MatrixCarIndex + CarStatMatrix to ${updated} cars in ${MANIFEST_PATH}`);
}

main();
