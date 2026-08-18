import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  frameIndexForHeading,
  parseCarSetManifest,
  findCarSheet,
  cartHeroFile,
  cartPortraitFile,
  cartPortraitKey,
  cartPortraitLegacyFile,
  cartStripFile,
  CarManifestError,
} from '../../src/data/cars/CarManifest.ts';
import { CAR_PERK, CAR_SPRITE_FRAMES, CAR_SPRITE_FRAME_ARC } from '../../src/domain/constants.ts';

const testFileDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(testFileDir, '..', '..');
const carsJsonPath = join(projectRoot, 'public', 'assets', 'cars', 'cars.json');

describe('frameIndexForHeading', () => {
  it('maps heading 0 to frame 0', () => {
    expect(frameIndexForHeading(0, CAR_SPRITE_FRAMES)).toBe(0);
  });

  it('maps exactly one frame arc to frame 1', () => {
    const index = frameIndexForHeading(CAR_SPRITE_FRAME_ARC, CAR_SPRITE_FRAMES);
    expect(index).toBe(1);
  });

  it('maps a full turn (2π) back to frame 0', () => {
    const index = frameIndexForHeading(Math.PI * 2, CAR_SPRITE_FRAMES);
    expect(index).toBe(0);
  });

  it('wraps negative headings to the top of the range', () => {
    // Negative one frame arc should wrap to the last frame (31 at 32 frames)
    const index = frameIndexForHeading(-CAR_SPRITE_FRAME_ARC, CAR_SPRITE_FRAMES);
    expect(index).toBe(CAR_SPRITE_FRAMES - 1);
  });

  it('rounds down values just under half a frame arc', () => {
    // Half frame arc minus a small epsilon
    const halfArc = CAR_SPRITE_FRAME_ARC / 2;
    const index = frameIndexForHeading(halfArc - 0.001, CAR_SPRITE_FRAMES);
    expect(index).toBe(0);
  });

  it('rounds up values just over half a frame arc', () => {
    // Half frame arc plus a small epsilon
    const halfArc = CAR_SPRITE_FRAME_ARC / 2;
    const index = frameIndexForHeading(halfArc + 0.001, CAR_SPRITE_FRAMES);
    expect(index).toBe(1);
  });

  it('always returns an integer in [0, frameCount) for large positive headings', () => {
    for (let heading = 0; heading <= 100; heading += 0.5) {
      const index = frameIndexForHeading(heading, CAR_SPRITE_FRAMES);
      expect(Number.isInteger(index)).toBe(true);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(CAR_SPRITE_FRAMES);
    }
  });

  it('always returns an integer in [0, frameCount) for large negative headings', () => {
    for (let heading = -100; heading <= 0; heading += 0.5) {
      const index = frameIndexForHeading(heading, CAR_SPRITE_FRAMES);
      expect(Number.isInteger(index)).toBe(true);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(CAR_SPRITE_FRAMES);
    }
  });

  it('asserts the frame arc convention is 2π / frameCount', () => {
    const expectedArc = (Math.PI * 2) / CAR_SPRITE_FRAMES;
    expect(CAR_SPRITE_FRAME_ARC).toBeCloseTo(expectedArc, 10);
  });

  it('ensures worst-case angular error never exceeds half a frame arc', () => {
    let maxAngularError = 0;

    // Test a sweep of several hundred headings
    for (let i = 0; i < 500; i += 1) {
      // Mix positive and negative, with both regular and large magnitudes
      const heading = (i - 250) * 0.1;
      const index = frameIndexForHeading(heading, CAR_SPRITE_FRAMES);
      const frameHeading = index * CAR_SPRITE_FRAME_ARC;

      // Calculate the angular difference, accounting for wrap-around
      let delta = heading - frameHeading;
      while (delta > Math.PI) {
        delta -= Math.PI * 2;
      }
      while (delta < -Math.PI) {
        delta += Math.PI * 2;
      }

      const angularError = Math.abs(delta);
      maxAngularError = Math.max(maxAngularError, angularError);
    }

    const halfFrameArc = CAR_SPRITE_FRAME_ARC / 2;
    expect(maxAngularError).toBeLessThanOrEqual(halfFrameArc + 1e-10); // Small epsilon for floating point
  });
});

describe('parseCarSetManifest', () => {
  it('accepts and parses the real generated manifest from cars.json', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    expect(manifest).toBeDefined();
  });

  it('real manifest has the full 21-car fleet', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    expect(manifest.cars.length).toBe(21);
  });

  it('real manifest has frameCount 32', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    expect(manifest.frameCount).toBe(32);
  });

  it('real manifest has frameWidth and frameHeight of 64', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    expect(manifest.frameWidth).toBe(64);
    expect(manifest.frameHeight).toBe(64);
  });

  it('real manifest has pixelsPerUnit greater than 1', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    expect(manifest.pixelsPerUnit).toBeGreaterThan(1);
  });

  it('real manifest origin.y is NOT 0.5', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    expect(manifest.origin.y).not.toBe(0.5);
  });

  it('rejects input that is not an object', () => {
    expect(() => parseCarSetManifest(null)).toThrow(CarManifestError);
    expect(() => parseCarSetManifest('not an object')).toThrow(CarManifestError);
    expect(() => parseCarSetManifest(123)).toThrow(CarManifestError);
    expect(() => parseCarSetManifest([])).toThrow(CarManifestError);
  });

  it('rejects manifest with missing pixelsPerUnit', () => {
    const invalid = {
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 32,
      origin: { x: 0.5, y: 0.5 },
      cars: [],
    };
    expect(() => parseCarSetManifest(invalid)).toThrow(CarManifestError);
  });

  it('rejects manifest with zero pixelsPerUnit', () => {
    const invalid = {
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 32,
      pixelsPerUnit: 0,
      origin: { x: 0.5, y: 0.5 },
      cars: [
        {
          id: 'test',
          image: 'test.png',
          shadow: { width: 10, height: 10 },
          stats: {},
        },
      ],
    };
    expect(() => parseCarSetManifest(invalid)).toThrow(CarManifestError);
  });

  it('rejects manifest with negative pixelsPerUnit', () => {
    const invalid = {
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 32,
      pixelsPerUnit: -5,
      origin: { x: 0.5, y: 0.5 },
      cars: [
        {
          id: 'test',
          image: 'test.png',
          shadow: { width: 10, height: 10 },
          stats: {},
        },
      ],
    };
    expect(() => parseCarSetManifest(invalid)).toThrow(CarManifestError);
  });

  it('rejects manifest with missing origin', () => {
    const invalid = {
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 32,
      pixelsPerUnit: 8.0,
      cars: [
        {
          id: 'test',
          image: 'test.png',
          shadow: { width: 10, height: 10 },
          stats: {},
        },
      ],
    };
    expect(() => parseCarSetManifest(invalid)).toThrow(CarManifestError);
  });

  it('rejects manifest with empty cars array', () => {
    const invalid = {
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 32,
      pixelsPerUnit: 8.0,
      origin: { x: 0.5, y: 0.5 },
      cars: [],
    };
    expect(() => parseCarSetManifest(invalid)).toThrow(CarManifestError);
  });

  it('rejects a car with no id', () => {
    const invalid = {
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 32,
      pixelsPerUnit: 8.0,
      origin: { x: 0.5, y: 0.5 },
      cars: [
        {
          image: 'test.png',
          shadow: { width: 10, height: 10 },
          stats: {},
        },
      ],
    };
    expect(() => parseCarSetManifest(invalid)).toThrow(CarManifestError);
  });

  it('rejects a car with no image', () => {
    const invalid = {
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 32,
      pixelsPerUnit: 8.0,
      origin: { x: 0.5, y: 0.5 },
      cars: [
        {
          id: 'test',
          shadow: { width: 10, height: 10 },
          stats: {},
        },
      ],
    };
    expect(() => parseCarSetManifest(invalid)).toThrow(CarManifestError);
  });

  it('rejects a car with missing shadow', () => {
    const invalid = {
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 32,
      pixelsPerUnit: 8.0,
      origin: { x: 0.5, y: 0.5 },
      cars: [
        {
          id: 'test',
          image: 'test.png',
          stats: {},
        },
      ],
    };
    expect(() => parseCarSetManifest(invalid)).toThrow(CarManifestError);
  });

  it('rejects frameCount that disagrees with CAR_SPRITE_FRAMES', () => {
    const invalid = {
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 16,
      pixelsPerUnit: 8.0,
      origin: { x: 0.5, y: 0.5 },
      cars: [
        {
          id: 'test',
          image: 'test.png',
          shadow: { width: 10, height: 10 },
          stats: {},
        },
      ],
    };
    expect(() => parseCarSetManifest(invalid)).toThrow(CarManifestError);
  });

  it('parses and exposes a valid perk on a car', () => {
    const withPerk = {
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 32,
      pixelsPerUnit: 8.0,
      origin: { x: 0.5, y: 0.5 },
      cars: [
        {
          id: 'test',
          image: 'test.png',
          shadow: { width: 10, height: 10 },
          stats: {},
          perk: CAR_PERK.BULLDOZER,
        },
      ],
    };
    const manifest = parseCarSetManifest(withPerk);
    expect(manifest.cars[0]?.perk).toBe(CAR_PERK.BULLDOZER);
  });

  it('parses a car with no perk key, leaving perk undefined', () => {
    const withoutPerk = {
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 32,
      pixelsPerUnit: 8.0,
      origin: { x: 0.5, y: 0.5 },
      cars: [
        {
          id: 'test',
          image: 'test.png',
          shadow: { width: 10, height: 10 },
          stats: {},
        },
      ],
    };
    const manifest = parseCarSetManifest(withoutPerk);
    expect(manifest.cars[0]?.perk).toBeUndefined();
  });

  it('rejects a car with an unrecognised perk value, naming it in the message', () => {
    const invalid = {
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 32,
      pixelsPerUnit: 8.0,
      origin: { x: 0.5, y: 0.5 },
      cars: [
        {
          id: 'test',
          image: 'test.png',
          shadow: { width: 10, height: 10 },
          stats: {},
          perk: 'nonsense',
        },
      ],
    };
    expect(() => parseCarSetManifest(invalid)).toThrow(CarManifestError);
    try {
      parseCarSetManifest(invalid);
      expect.fail('Should have thrown');
    } catch (error) {
      if (error instanceof CarManifestError) {
        expect(error.message).toContain('nonsense');
      } else {
        throw error;
      }
    }
  });

  it.each([7, null, {}])('rejects a car with a non-string perk value %p', perk => {
    const invalid = {
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 32,
      pixelsPerUnit: 8.0,
      origin: { x: 0.5, y: 0.5 },
      cars: [
        {
          id: 'test',
          image: 'test.png',
          shadow: { width: 10, height: 10 },
          stats: {},
          perk,
        },
      ],
    };
    expect(() => parseCarSetManifest(invalid)).toThrow(CarManifestError);
  });

  it('real manifest gives every fleet car a home planet and 0.9/0.7 advantage', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    for (const car of manifest.cars) {
      expect(car.homePlanetId).toBeTruthy();
      expect(car.worldAdvantage === 0.9 || car.worldAdvantage === 0.7).toBe(true);
    }
  });

  it('real manifest gives every fleet car collisionAlong/Across on stats', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    for (const car of manifest.cars) {
      expect(car.stats.collisionAlong).toBeGreaterThan(0);
      expect(car.stats.collisionAcross).toBeGreaterThan(0);
      expect(car.stats.collisionSquareMin).toBe(Math.min(car.stats.collisionAlong!, car.stats.collisionAcross!));
      expect(car.stats.collisionSquareMax).toBe(Math.max(car.stats.collisionAlong!, car.stats.collisionAcross!));
      expect(car.stats.collisionSquare).toBeCloseTo(
        (car.stats.collisionSquareMin! + car.stats.collisionSquareMax!) / 2,
        4,
      );
    }
  });

  it('folds a legacy sheet collisionBox into stats', () => {
    const valid = {
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 32,
      pixelsPerUnit: 8.0,
      origin: { x: 0.5, y: 0.5 },
      cars: [
        {
          id: 'test',
          image: 'test.png',
          shadow: { width: 10, height: 10 },
          stats: {},
          collisionMap: [
            { along: 2.2, across: 1.1 },
            { along: 1.6, across: 0.7 },
          ],
        },
      ],
    };
    const manifest = parseCarSetManifest(valid);
    expect(manifest.cars[0]?.stats.collisionAlong).toBe(2.2);
    expect(manifest.cars[0]?.stats.collisionAcross).toBe(1.1);
    expect(manifest.cars[0]?.stats.collisionSquare).toBeCloseTo(1.65, 4);
  });

  it('rejects a collisionBox without along/across', () => {
    const invalid = {
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 32,
      pixelsPerUnit: 8.0,
      origin: { x: 0.5, y: 0.5 },
      cars: [
        {
          id: 'test',
          image: 'test.png',
          shadow: { width: 10, height: 10 },
          stats: {},
          collisionBox: { along: 0, across: 1 },
        },
      ],
    };
    expect(() => parseCarSetManifest(invalid)).toThrow(CarManifestError);
  });

  it('real manifest gives every fleet car a perk that is a member of CAR_PERK', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    const knownPerks: readonly string[] = Object.values(CAR_PERK);
    expect(manifest.cars.length).toBe(21);
    for (const car of manifest.cars) {
      expect(car.perk).toBeDefined();
      expect(knownPerks).toContain(car.perk);
    }
  });
});

describe('cart portraits', () => {
  it('names stills {carId}_300px.png so tank/turbo/strong keep their suffix', () => {
    expect(cartHeroFile('car_1')).toBe('car_1_hero.png');
    expect(cartStripFile('car_1')).toBe('car_1_strip.png');
    expect(cartPortraitFile('car-16')).toBe('car-16_300px.png');
    expect(cartPortraitFile('car-6-tank')).toBe('car-6-tank_300px.png');
    expect(cartPortraitFile('car-12-strong')).toBe('car-12-strong_300px.png');
    expect(cartPortraitFile('delorean')).toBe('delorean_300px.png');
    expect(cartPortraitLegacyFile('car-16')).toBe('cart_16_300.png');
    expect(cartPortraitKey('car-1')).toBe('cart-portrait:car-1');
  });
});

describe('findCarSheet', () => {
  it('finds a car by known id', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    const sheet = findCarSheet(manifest, 'car-1');
    expect(sheet.id).toBe('car-1');
  });

  it('throws CarManifestError for unknown id', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    expect(() => findCarSheet(manifest, 'unknown-car')).toThrow(CarManifestError);
  });

  it('CarManifestError for unknown id includes list of known ids', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    try {
      findCarSheet(manifest, 'unknown-car');
      expect.fail('Should have thrown');
    } catch (error) {
      if (error instanceof CarManifestError) {
        expect(error.message).toContain('car-1');
        expect(error.message).toContain('car-6-tank');
        expect(error.message).toContain('delorean');
      } else {
        throw error;
      }
    }
  });
});
