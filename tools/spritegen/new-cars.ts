/**
 * Inbox of new-fleet heroes. The human drops `car_1_hero.png`;
 * the strip is `car_1_strip.png`.
 */

import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cartHeroFile, cartStripFile } from '../../src/data/cars/CarManifest.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const NEW_CARS_DIR = join(REPO_ROOT, 'public', 'assets', 'cars', 'new');
export const CARS_DIR = join(REPO_ROOT, 'public', 'assets', 'cars');

const HERO_NAME = /^(car_\d+)_hero\.png$/i;

export interface NewCarDrop {
  readonly id: string;
  readonly heroPath: string;
  readonly stripPath: string;
  readonly hasStrip: boolean;
}

export function listNewCars(): readonly NewCarDrop[] {
  if (!existsSync(NEW_CARS_DIR)) {
    return [];
  }
  return readdirSync(NEW_CARS_DIR)
    .map((name) => HERO_NAME.exec(name))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => {
      const id = match[1]!.toLowerCase();
      return {
        id,
        heroPath: join(NEW_CARS_DIR, cartHeroFile(id)),
        stripPath: join(CARS_DIR, cartStripFile(id)),
        hasStrip: existsSync(join(CARS_DIR, cartStripFile(id))),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}
