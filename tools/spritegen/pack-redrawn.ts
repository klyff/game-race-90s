import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAR_SPRITE_FRAMES } from '../../src/domain/constants.ts';
import { parseCarSetManifest } from '../../src/data/cars/CarManifest.ts';
import type { CarSetManifest } from '../../src/data/cars/CarManifest.ts';
import { collisionBoxForCarId, withCollisionBox } from './collision-map.ts';
import { packStrip, writePng } from './raster/png.ts';
import {
  contentBox,
  loadGameFrames,
  shadowFromFrames,
  translateFrame,
} from './redrawn-io.ts';
import { ANCHOR_FRAMES, STRIP_ORIGIN } from './strip-contract.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REDRAWN_ROOT = join(REPO_ROOT, 'tools', 'spritegen', 'redrawn');
const CARS_DIRECTORY = join(REPO_ROOT, 'public', 'assets', 'cars');

function parseArgs(argv: readonly string[]): { carId: string; install: boolean } {
  const tokens = argv.filter((token) => token !== '--');
  const install = tokens.includes('--install');
  const carId = tokens.find((token) => !token.startsWith('--'));
  if (carId === undefined) {
    throw new Error('usage: npm run gen:pack-redrawn -- <carId> [--install]');
  }
  return { carId, install };
}

/**
 * One integer shift for the whole strip, taken from the four 3/4 anchors.
 * Per-frame recentering would wobble as the bbox changes with yaw.
 */
function sharedOriginShift(
  frames: readonly Uint8Array[],
  frameSize: number,
): { dx: number; dy: number } {
  const destX = STRIP_ORIGIN.x * frameSize;
  const destY = STRIP_ORIGIN.y * frameSize;
  let sumDx = 0;
  let sumDy = 0;
  let count = 0;
  for (const index of ANCHOR_FRAMES) {
    const frame = frames[index];
    if (frame === undefined) {
      continue;
    }
    const box = contentBox(frame, frameSize, frameSize);
    if (box === null) {
      continue;
    }
    const cx = (box.x0 + box.x1 + 1) / 2;
    const cy = (box.y0 + box.y1 + 1) / 2;
    sumDx += destX - cx;
    sumDy += destY - cy;
    count += 1;
  }
  if (count === 0) {
    throw new Error('no opaque pixels on anchor frames 0/8/16/24');
  }
  return { dx: Math.round(sumDx / count), dy: Math.round(sumDy / count) };
}

function pinFrames(frames: readonly Uint8Array[], frameSize: number): Uint8Array[] {
  const shift = sharedOriginShift(frames, frameSize);
  if (shift.dx === 0 && shift.dy === 0) {
    return [...frames];
  }
  return frames.map((frame) => translateFrame(frame, frameSize, frameSize, shift.dx, shift.dy));
}

function installStrip(
  carId: string,
  stripPath: string,
  shadow: { width: number; height: number },
  frameSize: number,
): void {
  const manifestPath = join(CARS_DIRECTORY, 'cars.json');
  const manifest: CarSetManifest = parseCarSetManifest(
    JSON.parse(readFileSync(manifestPath, 'utf-8')),
  );
  const car = manifest.cars.find((entry) => entry.id === carId);
  if (car === undefined) {
    const known = manifest.cars.map((entry) => entry.id).join(', ');
    throw new Error(`"${carId}" is not in cars.json. Known: ${known}`);
  }
  const dest = join(CARS_DIRECTORY, car.image);
  writeFileSync(dest, readFileSync(stripPath));
  const next: CarSetManifest = {
    ...manifest,
    cars: manifest.cars.map((entry) =>
      entry.id === carId
        ? {
            ...entry,
            shadow,
            frameWidth: frameSize === manifest.frameWidth ? undefined : frameSize,
            frameHeight: frameSize === manifest.frameHeight ? undefined : frameSize,
            stats: withCollisionBox(entry.stats, collisionBoxForCarId(carId)),
          }
        : entry,
    ),
  };
  writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`installed ${dest}  ${frameSize}×${frameSize}  shadow ${shadow.width}x${shadow.height}`);
}

function main(): void {
  const { carId, install } = parseArgs(process.argv.slice(2));
  const directory = join(REDRAWN_ROOT, carId);
  if (!existsSync(directory)) {
    throw new Error(`missing ${directory} — draw frames there first`);
  }

  const loaded = loadGameFrames(directory);
  const pinned = pinFrames(loaded.frames, loaded.frameSize);
  const strip = packStrip(pinned, loaded.frameSize, loaded.frameSize);
  mkdirSync(directory, { recursive: true });
  const stripPath = join(directory, 'strip.png');
  writePng(stripPath, strip);
  const shadow = shadowFromFrames(pinned, loaded.frameSize);
  console.log(
    `${carId}  ${strip.width}x${strip.height}  ${CAR_SPRITE_FRAMES} frames  shadow ${shadow.width}x${shadow.height}`,
  );
  console.log(`wrote ${stripPath}`);

  if (install) {
    installStrip(carId, stripPath, shadow, loaded.frameSize);
  } else {
    console.log('skipping public/assets/cars (pass --install after the race check)');
  }
}

main();
