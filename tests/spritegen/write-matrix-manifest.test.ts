import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverMatrixHeroNumbers } from '../../tools/spritegen/write-matrix-manifest.ts';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('discoverMatrixHeroNumbers', () => {
  it('finds no matrix hero folders after the archive was removed', () => {
    const numbers = discoverMatrixHeroNumbers(join(projectRoot, 'public', 'matrix_car'));
    expect(numbers).toEqual([]);
  });
});
