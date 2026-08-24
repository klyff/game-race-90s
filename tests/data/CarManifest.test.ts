import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  applyAvailableMatrixStrips,
  careerFleetCarIds,
  applyMatrixStripToSheet,
  applyNogoLabs,
  carSheetImageUrl,
  CLOCK_DIRECTION,
  collisionFromMatrixStrip,
  frameIndexForHeading,
  isBBoxSheet,
  isNogoLabCarId,
  isSpinnerCarId,
  parseCarSetManifest,
  parseCarStripJson,
  parseMatrixStripJson,
  parseSpinnerStripJson,
  findCarSheet,
  cartHeroFile,
  cartPortraitFile,
  cartPortraitKey,
  cartPortraitLegacyFile,
  cartStripFile,
  isNewFleetCarId,
  matrixHeroFile,
  matrixHeroNumber,
  matrixHeroUrl,
  matrixStripJsonUrl,
  matrixStripUrl,
  portraitCandidateUrls,
  sheetClock,
  sheetFrameCount,
  SPINNER_HERO_FRAME,
  spinnerHeroUrl,
  spinnerInventoryParts,
  CarManifestError,
} from '../../src/data/cars/CarManifest.ts';
import { CAR_PERK, CAR_SPRITE_FRAMES, CAR_SPRITE_FRAME_ARC } from '../../src/domain/constants.ts';

const testFileDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(testFileDir, '..', '..');
const carsJsonPath = join(projectRoot, 'public', 'assets', 'cars', 'cars.json');
const car18StripJsonPath = join(
  projectRoot,
  'public',
  'matrix_car',
  '18_hero',
  'car_18_strip.json',
);

describe('frameIndexForHeading', () => {
  it('maps world NE (π/4) to frame 0 — nose to screen down / 6h', () => {
    expect(frameIndexForHeading(Math.PI / 4, CAR_SPRITE_FRAMES)).toBe(0);
    expect(frameIndexForHeading(Math.PI / 4, 30)).toBe(0);
  });

  it('maps world +X to hero ~4h, not a000 (Basin bottom straight)', () => {
    expect(frameIndexForHeading(0, 30)).toBe(25);
    expect(frameIndexForHeading(0, CAR_SPRITE_FRAMES)).toBe(6);
    expect(frameIndexForHeading(0, CAR_SPRITE_FRAMES, CLOCK_DIRECTION.CLOCKWISE)).toBe(26);
  });

  it('maps world SW (5π/4) to rear — 12h, facing the camera', () => {
    expect(frameIndexForHeading((5 * Math.PI) / 4, 30)).toBe(15);
  });

  it('wraps a full turn to the same frame as heading 0', () => {
    expect(frameIndexForHeading(Math.PI * 2, 30)).toBe(frameIndexForHeading(0, 30));
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
});

describe('parseCarSetManifest', () => {
  it('accepts and parses the real generated manifest from cars.json', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    expect(manifest).toBeDefined();
  });

  it('real manifest has the available shop cars only', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    const ids = manifest.cars.map(car => car.id);
    expect(ids).toEqual([
      'car-18',
      'car-19',
      'car-20',
      'car_21',
      'delorean',
      '1-muscle-car-gray-number9',
      '2-sportivo-blue-combat',
      '3-red-oh-red',
    ]);
    expect(manifest.cars.length).toBe(8);
  });

  it('real manifest has frameCount 32', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    expect(manifest.frameCount).toBe(32);
  });

  it('points a ready strip folder at strip_64 + JSON and a vitrine-only folder at hero_300', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    const sheet = findCarSheet(manifest, 'car-18');
    expect(sheet.image).toBe(matrixStripUrl(18));
    expect(sheet.framesJson).toBe(matrixStripJsonUrl(18));
    expect(carSheetImageUrl(sheet)).toBe('matrix_car/18_hero/car_18_strip_64.png');
    expect(isBBoxSheet(sheet)).toBe(true);
    expect(sheet.frameCount).toBe(30);
    expect(sheetFrameCount(sheet, manifest)).toBe(30);
    expect(sheet.perk).toBe('anvil');
    expect(sheet.homePlanetId).toBe('vulkanis');
    expect(manifest.cars.some(car => car.id === 'car-3')).toBe(false);
  });

  it('resolves clock id car_18 onto the same sheet as shop id car-18', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    expect(findCarSheet(manifest, 'car_18').id).toBe(findCarSheet(manifest, 'car-18').id);
  });

  it('does not list retired Marauder in the live roster', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    expect(manifest.cars.some(car => car.id === 'car-1' || car.id === 'car_1')).toBe(false);
  });

  it('reads car_18 production_scale frames and midpoint collision from JSON', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    const sheet = findCarSheet(manifest, 'car_18');
    const strip = parseMatrixStripJson(JSON.parse(readFileSync(car18StripJsonPath, 'utf-8')));
    expect(strip.count).toBe(30);
    expect(strip.frames).toHaveLength(30);
    expect(strip.scale).toBeCloseTo(64 / 1700, 10);
    expect(strip.collisionRect.w).toBeGreaterThan(0);
    expect(strip.collisionRect.h).toBeGreaterThan(0);
    expect(strip.frames[0]).toMatchObject({ i: 0, clockIndex: 0 });
    expect(strip.frames[15]).toMatchObject({ i: 15, clockIndex: 15 });
    expect(strip.frames[25]).toMatchObject({ i: 25, clockIndex: 25 });
    const leftmost = strip.frames.reduce((best, frame) => (frame.x < best.x ? frame : best));
    expect(leftmost).toMatchObject({ i: 25, clockIndex: 25 });
    const box = collisionFromMatrixStrip(strip, manifest.pixelsPerUnit);
    const live = applyMatrixStripToSheet(sheet, strip, manifest.pixelsPerUnit);
    expect(live.frameCount).toBe(30);
    expect(live.stats.collisionAlong).toBeCloseTo(box.along, 6);
    expect(live.stats.collisionAcross).toBeCloseTo(box.across, 6);
    expect(live.stats.collisionSquare).toBeCloseTo((box.along + box.across) / 2, 6);
  });

  it('keeps nogo labs at 30 clock frames and names slots by index, not pack i', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const catalog = parseCarSetManifest(JSON.parse(rawJson));
    expect(catalog.cars.some(car => isNogoLabCarId(car.id))).toBe(false);
    const live = applyNogoLabs(applyAvailableMatrixStrips(catalog));
    const nogo99 = findCarSheet(live, 'nogo-99');
    const nogo98 = findCarSheet(live, 'nogo-98');
    expect(nogo99.frameCount).toBe(30);
    expect(nogo98.frameCount).toBe(30);
    expect(nogo99.image).toContain('car_99_strip_64_yaw.png');
    expect(nogo98.image).toContain('car_98_strip_64_yaw.png');
    const strip99 = parseMatrixStripJson(
      JSON.parse(readFileSync(join(projectRoot, 'public', 'matrix_car', '99_hero', 'car_99_strip.json'), 'utf-8')),
    );
    expect(strip99.count).toBe(30);
    expect(strip99.frames[4]?.i).toBe(4);
    expect(strip99.frames[4]?.clockIndex).toBe(4);
    const applied = applyMatrixStripToSheet(nogo99, strip99, live.pixelsPerUnit);
    expect(applied.frameCount).toBe(30);
    const leftover = applyMatrixStripToSheet(findCarSheet(live, 'car-18'), strip99, live.pixelsPerUnit);
    expect(leftover.frameCount).toBe(30);
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
    expect(manifest.cars.length).toBe(8);
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
    expect(isNewFleetCarId('car_2')).toBe(true);
    expect(isNewFleetCarId('car-2')).toBe(false);
    expect(cartPortraitFile('car-16')).toBe('car-16_300px.png');
    expect(cartPortraitFile('car-6-tank')).toBe('car-6-tank_300px.png');
    expect(cartPortraitFile('car-12-strong')).toBe('car-12-strong_300px.png');
    expect(cartPortraitFile('delorean')).toBe('delorean_300px.png');
    expect(cartPortraitLegacyFile('car-16')).toBe('cart_16_300.png');
    expect(cartPortraitKey('car-1')).toBe('cart-portrait:car-1');
  });

  it('names matrix production strip and JSON under N_hero', () => {
    expect(matrixStripUrl(18)).toBe('matrix_car/18_hero/car_18_strip_64.png');
    expect(matrixStripJsonUrl(18)).toBe('matrix_car/18_hero/car_18_strip.json');
  });

  it('points car-1 and car_1 at matrix_car/1_hero/car_1_hero.png', () => {
    expect(matrixHeroNumber('car-1')).toBe(1);
    expect(matrixHeroNumber('car_1')).toBe(1);
    expect(matrixHeroFile(1)).toBe('car_1_hero.png');
    expect(matrixHeroUrl(1)).toBe('matrix_car/1_hero/car_1_hero.png');
    expect(matrixHeroUrl(6)).toBe('matrix_car/6_hero/car_6_hero.png');
    expect(matrixHeroNumber('car-6-tank')).toBe(6);
    expect(matrixHeroNumber('delorean')).toBeUndefined();
    expect(portraitCandidateUrls('delorean')[0]).toBe('matrix_car/delorean_hero/delorean_hero_300.png');
    expect(portraitCandidateUrls('car-1')[0]).toBe('matrix_car/1_hero/car_1_hero_300.png');
    expect(portraitCandidateUrls('car_1')[0]).toBe('matrix_car/1_hero/car_1_hero_300.png');
    expect(portraitCandidateUrls('car-1')).toHaveLength(1);
    expect(isSpinnerCarId('1-muscle-car-gray-number9')).toBe(true);
    expect(isSpinnerCarId('muscle-car-gray-number9')).toBe(false);
    expect(matrixHeroNumber('1-muscle-car-gray-number9')).toBeUndefined();
    expect(portraitCandidateUrls('1-muscle-car-gray-number9')[0]).toBe(
      spinnerHeroUrl('1-muscle-car-gray-number9'),
    );
  });
});

describe('spinner strip atlas', () => {
  const muscleJson = join(
    projectRoot,
    'public',
    'assets',
    'cars',
    '1-muscle-car-gray-number9',
    'car_strip_64x64.json',
  );

  it('parses 32 CCW frames from car_strip_64x64.json', () => {
    const strip = parseSpinnerStripJson(JSON.parse(readFileSync(muscleJson, 'utf-8')));
    expect(strip.count).toBe(32);
    expect(strip.frames).toHaveLength(32);
    expect(strip.frames[0]).toMatchObject({ i: 0, clockIndex: 0 });
    expect(parseCarStripJson(JSON.parse(readFileSync(muscleJson, 'utf-8'))).count).toBe(32);
  });

  it('keeps spinner sheets on the counter-clockwise clock', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    const sheet = findCarSheet(manifest, '1-muscle-car-gray-number9');
    expect(sheet.frameCount).toBe(32);
    expect(sheetClock(sheet, manifest)).toBe(CLOCK_DIRECTION.COUNTER_CLOCKWISE);
    expect(sheetFrameCount(sheet, manifest)).toBe(32);
    expect(SPINNER_HERO_FRAME).toBe(7);
    expect(spinnerInventoryParts(sheet.id)).toEqual({ n: 1, slug: 'muscle-car-gray-number9' });
  });

  it('career fleet is only the numbered spinner cars when they exist', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    expect(careerFleetCarIds(manifest)).toEqual([
      '1-muscle-car-gray-number9',
      '2-sportivo-blue-combat',
      '3-red-oh-red',
    ]);
  });

  it('CCW remap is a bijection over the 32 authored frames — never a flip', () => {
    const seen = new Set<number>();
    for (let clockwise = 0; clockwise < CAR_SPRITE_FRAMES; clockwise += 1) {
      const ccw = clockwise === 0 ? 0 : (CAR_SPRITE_FRAMES - clockwise) % CAR_SPRITE_FRAMES;
      seen.add(ccw);
    }
    expect(seen.size).toBe(32);
    expect(frameIndexForHeading(Math.PI / 4, CAR_SPRITE_FRAMES, CLOCK_DIRECTION.COUNTER_CLOCKWISE)).toBe(0);
    expect(frameIndexForHeading(Math.PI / 4, CAR_SPRITE_FRAMES, CLOCK_DIRECTION.CLOCKWISE)).toBe(0);
  });
});

describe('findCarSheet', () => {
  it('finds a car by known id', () => {
    const rawJson = readFileSync(carsJsonPath, 'utf-8');
    const manifest = parseCarSetManifest(JSON.parse(rawJson));
    const sheet = findCarSheet(manifest, '2-sportivo-blue-combat');
    expect(sheet.id).toBe('2-sportivo-blue-combat');
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
        expect(error.message).toContain('2-sportivo-blue-combat');
        expect(error.message).toContain('car_21');
        expect(error.message).toContain('delorean');
      } else {
        throw error;
      }
    }
  });
});
