import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { CLOCK_DIRECTION, frameIndexForHeading } from '../../src/data/cars/CarManifest.ts';
import { CAR_SPRITE_FRAMES } from '../../src/domain/constants.ts';
import { MISSILE_SHEET } from '../../src/scenes/sceneKeys.ts';

const testFileDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(testFileDir, '..', '..');
const stripPath = join(projectRoot, 'public', 'assets', 'weapons', 'missile_strip_28.png');

describe('missile heading clock', () => {
  it('shares the car 32 CCW map — world NE is frame 0 / 6h', () => {
    expect(frameIndexForHeading(Math.PI / 4, MISSILE_SHEET.frameCount, CLOCK_DIRECTION.COUNTER_CLOCKWISE)).toBe(0);
    expect(frameIndexForHeading(Math.PI / 4, CAR_SPRITE_FRAMES)).toBe(0);
  });

  it('shares the car 32 CCW map — world +X is frame 6', () => {
    expect(frameIndexForHeading(0, MISSILE_SHEET.frameCount, CLOCK_DIRECTION.COUNTER_CLOCKWISE)).toBe(6);
    expect(frameIndexForHeading(0, CAR_SPRITE_FRAMES)).toBe(6);
  });

  it('maps screen cardinals to 8 / 16 / 24 on the remuxed CCW strip', () => {
    // 3h = screen right = world −π/4
    expect(frameIndexForHeading(-Math.PI / 4, MISSILE_SHEET.frameCount, CLOCK_DIRECTION.COUNTER_CLOCKWISE)).toBe(8);
    // 12h = screen up = world 5π/4
    expect(frameIndexForHeading((5 * Math.PI) / 4, MISSILE_SHEET.frameCount, CLOCK_DIRECTION.COUNTER_CLOCKWISE)).toBe(16);
    // 9h = screen left = world 3π/4
    expect(frameIndexForHeading((3 * Math.PI) / 4, MISSILE_SHEET.frameCount, CLOCK_DIRECTION.COUNTER_CLOCKWISE)).toBe(24);
  });
});

describe('missile_strip_28.png clock gate', () => {
  it('is a 32×28 horizontal strip', () => {
    const png = PNG.sync.read(readFileSync(stripPath));
    expect(png.width).toBe(MISSILE_SHEET.frameWidth * MISSILE_SHEET.frameCount);
    expect(png.height).toBe(MISSILE_SHEET.frameHeight);
  });

  it('keeps frame 0 nose in the lower half — 6h, not 12h', () => {
    const png = PNG.sync.read(readFileSync(stripPath));
    const cell = MISSILE_SHEET.frameWidth;
    let warmY = 0;
    let warmCount = 0;
    for (let y = 0; y < png.height; y += 1) {
      for (let x = 0; x < cell; x += 1) {
        const i = (y * png.width + x) * 4;
        const r = png.data[i] ?? 0;
        const g = png.data[i + 1] ?? 0;
        const b = png.data[i + 2] ?? 0;
        const a = png.data[i + 3] ?? 0;
        if (a < 50) {
          continue;
        }
        // Yellow/orange tip or thruster — not the red fins, which sit at the
        // tail of a 12h dart and would fake a "lower half" pass.
        const warmTip = r > 180 && g > 100 && b < 90;
        if (warmTip) {
          warmY += y;
          warmCount += 1;
        }
      }
    }
    expect(warmCount).toBeGreaterThan(2);
    expect(warmY / warmCount).toBeGreaterThan(png.height / 2);
  });
});
