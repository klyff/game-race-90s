import { describe, expect, it } from 'vitest';
import { DEFEAT_STING_DURATION_SECONDS } from '../../src/adapters/audio/DefeatSting.ts';

describe('DefeatSting', () => {
  it('stays under a long motion-sickness sting', () => {
    expect(DEFEAT_STING_DURATION_SECONDS).toBeGreaterThan(1);
    expect(DEFEAT_STING_DURATION_SECONDS).toBeLessThanOrEqual(3);
  });
});
