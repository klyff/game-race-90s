import { createHash } from 'node:crypto';
import {
  CAR_FRAME_HEIGHT,
  CAR_FRAME_WIDTH,
  CAR_SPRITE_FRAMES,
} from '../../src/domain/constants.ts';
import { CAR_MODELS } from '../../tools/spritegen/registry.ts';
import { computeSetFit, renderCar } from '../../tools/spritegen/renderCar.ts';

/**
 * Locks the generated car sprite sheets against accidental change.
 *
 * Five cars are rendered by a shared pipeline at a shared scale computed
 * across the whole set. Editing ONE car's definition silently changes the
 * rendered output of ALL FIVE, because the set-wide fit scale shifts.
 * These hashes turn that invisible coupling into a failing test that names
 * exactly which cars moved.
 */
describe('sprite generation', () => {
  const fit = computeSetFit(CAR_MODELS);

  /**
   * Hashes the raw frame pixels (RGBA bytes) for a car.
   * Feed frame bytes plus frame count and dimensions into the hash.
   */
  function hashFrames(carId: string, frames: readonly Uint8Array[]): string {
    const hash = createHash('sha256');
    hash.update(`${carId}:${frames.length}:${CAR_FRAME_WIDTH}x${CAR_FRAME_HEIGHT}`);
    for (const frame of frames) {
      hash.update(frame);
    }
    return hash.digest('hex');
  }

  /**
   * Checks that a frame is not fully transparent (all alpha = 0).
   */
  function isFrameBlank(frame: Uint8Array): boolean {
    for (let i = 3; i < frame.length; i += 4) {
      if (frame[i] !== 0) return false;
    }
    return true;
  }

  it('renders all cars consistently', () => {
    // Compute hashes for all cars.
    const carHashes: Record<string, string> = {};
    for (const carModel of CAR_MODELS) {
      const rendered = renderCar(carModel, fit);
      carHashes[carModel.id] = hashFrames(carModel.id, rendered.frames);
    }

    // Expected hashes locked in after first successful test run.
    // A mismatch means a car's geometry changed (intentionally or not),
    // shifting the set-wide fit scale and changing all rendered outputs.
    const expectedHashes: Record<string, string> = {
      'marauder': 'baa9e31d19bcdc7b0eed5edc5bd8be8029b6ff05a919539a8fd5644a30cba6e8',
      'dirt-devil': 'a5eaa370ed5047e9fa2b23117a4a12297c1943196ca7d149ca49be99efbf5f88',
      'havac': '4d154afe933ecb7b185eec74fb271f621b749b0955bc7de48657ca35511aeb18',
      'air-blade': '5bf26c20030f9b72e67eb10d8430c8d161bf4dc97f91955773f3f09dcf41b8ef',
      'battle-trak': '85d9b5b67f55aa1fe5e6d489509fa7fafd9959e987688fda699bfcca28918671',
    };

    const changedCars: string[] = [];
    for (const [carId, expected] of Object.entries(expectedHashes)) {
      const actual = carHashes[carId];
      if (actual !== expected) {
        changedCars.push(carId);
        console.log(`${carId}: expected ${expected} but got ${actual}`);
      }
    }

    if (changedCars.length > 0) {
      expect(changedCars).toEqual([]);  // Fail with clear message.
    }
  });

  it('asserts the shared fit scale and origin', () => {
    // The shared fit is computed across the entire car set. This is the
    // coupling that silently shifts every car, so it deserves its own explicit
    // assertion with a clear comment explaining that. If a car's geometry
    // changes, this scale and offsets will shift and all five cars will render
    // at a different size/position.
    expect(fit.scale).toBeCloseTo(8.143264274701124, 4);
    expect(fit.offsetX).toBeCloseTo(32.0, 4);
    expect(fit.offsetY).toBeCloseTo(35.23274906190228, 4);
  });

  it('renders all cars with expected frame properties', () => {
    for (const carModel of CAR_MODELS) {
      const rendered = renderCar(carModel, fit);

      // Assert correct number of frames.
      expect(rendered.frames.length).toBe(CAR_SPRITE_FRAMES);

      // Assert each frame is the correct size in bytes.
      const expectedSize = CAR_FRAME_WIDTH * CAR_FRAME_HEIGHT * 4;
      for (let i = 0; i < rendered.frames.length; i += 1) {
        const frame = rendered.frames[i];
        expect(frame.length).toBe(expectedSize);

        // No frame should be fully transparent — a blank frame means
        // the rendering failed or a geometry definition is broken.
        expect(isFrameBlank(frame)).toBe(false);
      }
    }
  });

  it('validates car registry integrity', () => {
    const ids = new Set<string>();
    for (const car of CAR_MODELS) {
      // Car ids must be unique.
      expect(ids.has(car.id)).toBe(false);
      ids.add(car.id);
    }

    // The full roster is 10 cars.
    expect(CAR_MODELS.length).toBe(10);
  });
});
