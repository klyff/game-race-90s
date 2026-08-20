import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverMatrixHeroNumbers } from '../../tools/spritegen/write-matrix-manifest.ts';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('discoverMatrixHeroNumbers', () => {
  it('finds every public/matrix_car/{N}_hero folder in numeric order', () => {
    const numbers = discoverMatrixHeroNumbers(join(projectRoot, 'public', 'matrix_car'));
    expect(numbers[0]).toBe(1);
    expect(numbers).toContain(3);
    expect(numbers).toContain(18);
    expect(numbers).toContain(31);
    expect(numbers[numbers.length - 1]).toBeGreaterThanOrEqual(31);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  });
});
