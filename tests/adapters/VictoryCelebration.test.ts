import { describe, expect, it } from 'vitest';
import { celebrationIntensity } from '../../src/adapters/render/VictoryIntensity.ts';

describe('celebrationIntensity', () => {
  it('scales confetti and fireworks by podium place', () => {
    expect(celebrationIntensity(1)).toEqual({ confetti: 220, fireworks: 16 });
    expect(celebrationIntensity(2)).toEqual({ confetti: 160, fireworks: 12 });
    expect(celebrationIntensity(3)).toEqual({ confetti: 130, fireworks: 8 });
  });
});
