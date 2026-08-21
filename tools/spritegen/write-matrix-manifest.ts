import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  deloreanHero300Url,
  deloreanStripJsonUrl,
  deloreanStripUrl,
  matrixHero300Url,
  matrixHeroNumber,
  matrixHeroUrl,
  matrixStripJsonUrl,
  matrixStripUrl,
  type CarSetManifest,
  type CarSheetManifest,
} from '../../src/data/cars/CarManifest.ts';
import {
  carStatRow,
  isCarStatMatrixIndex,
} from '../../src/data/cars/CarStatMatrix.ts';
import { isMatrixCarIndex, matrixCarRow } from '../../src/data/cars/MatrixCarIndex.ts';
import { CAR_FRAME_HEIGHT, CAR_FRAME_WIDTH, CAR_PERK, CAR_SPRITE_FRAMES, WORLD_ADVANTAGE } from '../../src/domain/constants.ts';
import type { CarPerkId, WorldAdvantage } from '../../src/domain/constants.ts';
import type { VehicleStats } from '../../src/domain/vehicle/VehicleStats.ts';
import { collisionBoxForCarId, withCollisionBox } from './collision-map.ts';
import { FLEET_CARS } from './fleet.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MATRIX_ROOT = join(REPO_ROOT, 'public', 'matrix_car');
const MANIFEST_PATH = join(REPO_ROOT, 'public', 'assets', 'cars', 'cars.json');

const PIXELS_PER_UNIT = 8.143264;
const ORIGIN = { x: 0.5, y: 0.550512 };
const MATRIX_YAW_FRAMES = 30;
const DEFAULT_SHADOW = { width: 40, height: 20 };
const HERO_FOLDER = /^(\d+)_hero$/;

interface PreviousSheet {
  readonly id: string;
  readonly shadow?: { readonly width: number; readonly height: number };
}

interface LeftoverIdentity {
  readonly perk: CarPerkId;
  readonly homePlanetId: string;
  readonly worldAdvantage: WorldAdvantage;
  readonly stats: VehicleStats;
}

/** Folders 31–33 have names but no CarStatMatrix row yet. Must not clone teaching Marauder. */
const LEFTOVER_IDENTITY: Readonly<Record<number, LeftoverIdentity>> = {
  31: {
    perk: CAR_PERK.TURBO,
    homePlanetId: 'verdant-fault',
    worldAdvantage: WORLD_ADVANTAGE.SECONDARY,
    stats: leftoverStats(980, 33, 44, 76, 28, 2.6, 0.48, 0.36, 8, 1.68, 3.4),
  },
  32: {
    perk: CAR_PERK.ARSENAL,
    homePlanetId: 'thunder-basin',
    worldAdvantage: WORLD_ADVANTAGE.SECONDARY,
    stats: leftoverStats(940, 35, 42, 80, 26, 2.7, 0.5, 0.28, 12, 1.66, 3.2),
  },
  33: {
    perk: CAR_PERK.WAR_TANK,
    homePlanetId: 'chrome-verge',
    worldAdvantage: WORLD_ADVANTAGE.SECONDARY,
    stats: leftoverStats(1100, 32, 40, 70, 29, 2.2, 0.42, 0.5, 8, 1.78, 3.6),
  },
};

function leftoverStats(
  mass: number,
  enginePower: number,
  brakeForce: number,
  maxSpeed: number,
  grip: number,
  steerRate: number,
  steerSpeedFalloff: number,
  armor: number,
  ammoCapacity: number,
  collisionRadius: number,
  aimRadius: number,
): VehicleStats {
  return {
    mass,
    enginePower,
    brakeForce,
    maxSpeed,
    grip,
    steerRate,
    steerSpeedFalloff,
    armor,
    ammoCapacity,
    collisionRadius,
    aimRadius,
  };
}

function leftoverIdentity(n: number): LeftoverIdentity {
  const authored = LEFTOVER_IDENTITY[n];
  if (authored !== undefined) {
    return authored;
  }
  return {
    perk: CAR_PERK.TURBO,
    homePlanetId: 'verdant-fault',
    worldAdvantage: WORLD_ADVANTAGE.SECONDARY,
    stats: leftoverStats(
      880 + n * 6,
      28 + (n % 11),
      40,
      64 + (n % 13),
      22 + (n % 9),
      Number((2.1 + (n % 8) * 0.1).toFixed(2)),
      0.5,
      0.3,
      8,
      1.6,
      3.2,
    ),
  };
}

export function discoverMatrixHeroNumbers(matrixRoot: string = MATRIX_ROOT): readonly number[] {
  if (!existsSync(matrixRoot)) {
    return [];
  }
  const numbers: number[] = [];
  for (const entry of readdirSync(matrixRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const match = HERO_FOLDER.exec(entry.name);
    if (match === null) {
      continue;
    }
    const n = Number(match[1]);
    if (Number.isInteger(n) && n > 0) {
      numbers.push(n);
    }
  }
  return numbers.sort((a, b) => a - b);
}

function folderHasStrip(n: number): boolean {
  return (
    existsSync(join(REPO_ROOT, 'public', matrixStripUrl(n))) &&
    existsSync(join(REPO_ROOT, 'public', matrixStripJsonUrl(n)))
  );
}

function folderHeroImage(n: number): string {
  const hero300 = join(REPO_ROOT, 'public', matrixHero300Url(n));
  if (existsSync(hero300)) {
    return matrixHero300Url(n);
  }
  return matrixHeroUrl(n);
}

function readPreviousSheets(): readonly PreviousSheet[] {
  if (!existsSync(MANIFEST_PATH)) {
    return [];
  }
  try {
    const raw = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8')) as { cars?: PreviousSheet[] };
    return Array.isArray(raw.cars) ? raw.cars : [];
  } catch {
    return [];
  }
}

function previousShadow(previous: readonly PreviousSheet[], carId: string, n?: number): { width: number; height: number } {
  const exact = previous.find(car => car.id === carId);
  if (exact?.shadow !== undefined && exact.shadow.width > 0 && exact.shadow.height > 0) {
    return { width: exact.shadow.width, height: exact.shadow.height };
  }
  if (n !== undefined) {
    const aliased = previous.find(car => matrixHeroNumber(car.id) === n);
    if (aliased?.shadow !== undefined && aliased.shadow.width > 0 && aliased.shadow.height > 0) {
      return { width: aliased.shadow.width, height: aliased.shadow.height };
    }
  }
  return DEFAULT_SHADOW;
}

function sheetForFolder(n: number, previous: readonly PreviousSheet[]): CarSheetManifest {
  const identity = isMatrixCarIndex(n)
    ? matrixCarRow(n)
    : { n, carId: `car_${n}`, displayName: `Car ${n}`, archetype: `Matrix folder ${n}_hero` };
  const leftover = leftoverIdentity(n);
  const authored = isCarStatMatrixIndex(n)
    ? carStatRow(n)
    : { perk: leftover.perk, homePlanetId: leftover.homePlanetId, worldAdvantage: leftover.worldAdvantage, stats: leftover.stats };
  const playable = folderHasStrip(n);
  const sheet: CarSheetManifest = {
    id: identity.carId,
    displayName: identity.displayName,
    archetype: identity.archetype,
    image: playable ? matrixStripUrl(n) : folderHeroImage(n),
    shadow: previousShadow(previous, identity.carId, n),
    stats: withCollisionBox(authored.stats, collisionBoxForCarId(identity.carId)),
    perk: authored.perk,
    homePlanetId: authored.homePlanetId,
    worldAdvantage: authored.worldAdvantage,
  };
  if (!playable) {
    return sheet;
  }
  return {
    ...sheet,
    frameCount: MATRIX_YAW_FRAMES,
    framesJson: matrixStripJsonUrl(n),
  };
}

function deloreanHasStrip(): boolean {
  return (
    existsSync(join(REPO_ROOT, 'public', deloreanStripUrl())) &&
    existsSync(join(REPO_ROOT, 'public', deloreanStripJsonUrl()))
  );
}

function deloreanSheet(previous: readonly PreviousSheet[]): CarSheetManifest {
  const def = FLEET_CARS.find(car => car.id === 'delorean');
  if (def === undefined) {
    throw new Error('FLEET_CARS is missing delorean');
  }
  const playable = deloreanHasStrip();
  const hero300 = join(REPO_ROOT, 'public', deloreanHero300Url());
  const image = playable
    ? deloreanStripUrl()
    : existsSync(hero300)
      ? deloreanHero300Url()
      : 'delorean.png';
  const sheet: CarSheetManifest = {
    id: def.id,
    displayName: def.displayName,
    archetype: def.archetype,
    image,
    shadow: previousShadow(previous, def.id),
    stats: withCollisionBox(def.stats, collisionBoxForCarId(def.id)),
    perk: def.perk,
    homePlanetId: def.homePlanetId,
    worldAdvantage: def.worldAdvantage,
  };
  if (!playable) {
    return sheet;
  }
  return {
    ...sheet,
    frameCount: MATRIX_YAW_FRAMES,
    framesJson: deloreanStripJsonUrl(),
  };
}

export interface MatrixManifestWrite {
  readonly path: string;
  readonly folders: readonly number[];
  readonly playable: readonly number[];
  readonly deloreanPlayable: boolean;
  readonly carCount: number;
}

export function writeMatrixManifest(): MatrixManifestWrite {
  const folders = discoverMatrixHeroNumbers();
  if (folders.length === 0) {
    throw new Error(`no public/matrix_car/{N}_hero folders under ${MATRIX_ROOT}`);
  }
  const previous = readPreviousSheets();
  const playable: number[] = [];
  const cars: CarSheetManifest[] = folders.map(n => {
    if (folderHasStrip(n)) {
      playable.push(n);
    }
    return sheetForFolder(n, previous);
  });
  cars.push(deloreanSheet(previous));
  const deloreanPlayable = deloreanHasStrip();

  const manifest: CarSetManifest = {
    frameWidth: CAR_FRAME_WIDTH,
    frameHeight: CAR_FRAME_HEIGHT,
    frameCount: CAR_SPRITE_FRAMES,
    pixelsPerUnit: PIXELS_PER_UNIT,
    origin: ORIGIN,
    cars,
  };
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  return { path: MANIFEST_PATH, folders, playable, deloreanPlayable, carCount: cars.length };
}

function main(): void {
  const result = writeMatrixManifest();
  console.log(
    `cars.json ← ${result.folders.length} matrix folder(s), ${result.playable.length} playable strip(s), ${result.carCount} roster row(s)`,
  );
  console.log(`  playable: ${result.playable.join(', ') || '(none)'}`);
  if (result.deloreanPlayable) {
    console.log('  special: delorean');
  }
  console.log(`  wrote ${result.path}`);
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  main();
}
