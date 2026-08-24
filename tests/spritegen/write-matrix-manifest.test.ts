import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverMatrixHeroNumbers } from '../../tools/spritegen/write-matrix-manifest.ts';
import { AVAILABLE_MATRIX_NUMBERS } from '../../src/data/cars/MatrixCarIndex.ts';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('discoverMatrixHeroNumbers', () => {
  it('finds only available public/matrix_car/{N}_hero folders, not parked x_*', () => {
    const numbers = discoverMatrixHeroNumbers(join(projectRoot, 'public', 'matrix_car'));
    expect(numbers).toEqual([1, ...AVAILABLE_MATRIX_NUMBERS]);
    expect(numbers).not.toContain(2);
    expect(numbers).not.toContain(3);
    expect(numbers).not.toContain(31);
    expect(numbers).not.toContain(98);
    expect(numbers).not.toContain(99);
  });
});
