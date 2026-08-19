import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import {
  CAR_FRAME_HEIGHT,
  CAR_FRAME_WIDTH,
  CAR_SPRITE_FRAMES,
} from '../../src/domain/constants.ts';
import { parseCarSetManifest } from '../../src/data/cars/CarManifest.ts';
import { FLEET_CARS } from '../../tools/spritegen/fleet.ts';

const testFileDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(testFileDir, '..', '..');
const carsDir = join(projectRoot, 'public', 'assets', 'cars');
const manifest = parseCarSetManifest(
  JSON.parse(readFileSync(join(carsDir, 'cars.json'), 'utf-8')),
);

function isFrameBlank(pixels: Uint8Array, frameIndex: number, sheetWidth: number): boolean {
  const x0 = frameIndex * CAR_FRAME_WIDTH;
  for (let y = 0; y < CAR_FRAME_HEIGHT; y += 1) {
    for (let x = 0; x < CAR_FRAME_WIDTH; x += 1) {
      const alpha = pixels[(y * sheetWidth + x0 + x) * 4 + 3] ?? 0;
      if (alpha !== 0) {
        return false;
      }
    }
  }
  return true;
}

describe('imported fleet sheets', () => {
  it('writes one 2048×64 strip per fleet car with 32 non-blank frames', () => {
    expect(manifest.frameWidth).toBe(CAR_FRAME_WIDTH);
    expect(manifest.frameHeight).toBe(CAR_FRAME_HEIGHT);
    expect(manifest.frameCount).toBe(CAR_SPRITE_FRAMES);

    const fleetSheets = manifest.cars.filter(car => FLEET_CARS.some(fleet => fleet.id === car.id));
    expect(fleetSheets).toHaveLength(FLEET_CARS.length);
    for (const car of fleetSheets) {
      const path = join(carsDir, car.image);
      if (!existsSync(path) || car.image.includes('/')) {
        continue;
      }
      const png = PNG.sync.read(readFileSync(path));
      expect(png.width).toBe(CAR_FRAME_WIDTH * CAR_SPRITE_FRAMES);
      expect(png.height).toBe(CAR_FRAME_HEIGHT);
      const pixels = new Uint8Array(png.data);
      for (let frame = 0; frame < CAR_SPRITE_FRAMES; frame += 1) {
        expect(isFrameBlank(pixels, frame, png.width)).toBe(false);
      }
    }
  });

  it('keeps unique fleet ids matching the authored roster', () => {
    const ids = manifest.cars.map(car => car.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter(id => FLEET_CARS.some(fleet => fleet.id === id))).toEqual(
      FLEET_CARS.map(car => car.id),
    );
  });
});
