import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCarSetManifest } from '../../src/data/cars/CarManifest.ts';
import { collisionBoxForCarId, withCollisionBox } from './collision-map.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MANIFEST_PATH = join(REPO_ROOT, 'public', 'assets', 'cars', 'cars.json');

function main(): void {
  const manifest = parseCarSetManifest(JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8')));
  const next = {
    ...manifest,
    cars: manifest.cars.map((car) => {
      const { collisionBox: _legacy, ...rest } = car as typeof car & { collisionBox?: unknown };
      return {
        ...rest,
        stats: withCollisionBox(car.stats, collisionBoxForCarId(car.id)),
      };
    }),
  };
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`wrote collisionSquare (mid) for ${next.cars.length} cars → ${MANIFEST_PATH}`);
}

main();
