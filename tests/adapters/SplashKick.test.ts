import { describe, expect, it } from 'vitest';
import { resolveNarratorClip } from '../../src/data/audio/NarratorBank.ts';
import {
  SPLASH_KICK_DURATION_SECONDS,
  SPLASH_KICK_LINE,
  SPLASH_KICK_VOICE,
} from '../../src/adapters/audio/SplashKick.ts';

describe('SplashKick', () => {
  it('shouts a real boom take, not a guitar lick', () => {
    expect(SPLASH_KICK_DURATION_SECONDS).toBeGreaterThan(0.8);
    expect(SPLASH_KICK_DURATION_SECONDS).toBeLessThan(2);
    const clip = resolveNarratorClip({ lineId: SPLASH_KICK_LINE, voice: SPLASH_KICK_VOICE });
    expect(clip?.file).toBe('echo-boooom.mp3');
  });
});
