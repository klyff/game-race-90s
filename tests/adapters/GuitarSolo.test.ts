import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  GUITAR_SOLO_DURATION_SECONDS,
  ROCK_SCREAM_DURATION_SECONDS,
  TRANSITION_STING_DURATION_SECONDS,
} from '../../src/adapters/audio/GuitarSolo.ts';
import {
  GUITAR_SOLO_STING,
  ROCK_SCREAM_STING,
  SCREEN_STINGS,
  screenStingUrl,
} from '../../src/data/audio/ScreenStings.ts';

describe('GuitarSolo / screen stings', () => {
  it('ships recorded MP3 stings for the three-second solo and rock scream', () => {
    expect(GUITAR_SOLO_DURATION_SECONDS).toBe(3);
    expect(ROCK_SCREAM_DURATION_SECONDS).toBe(2);
    expect(TRANSITION_STING_DURATION_SECONDS).toBe(3);
    expect(SCREEN_STINGS).toHaveLength(2);
    const publicRoot = join(process.cwd(), 'public');
    for (const sting of SCREEN_STINGS) {
      expect(existsSync(join(publicRoot, screenStingUrl(sting)))).toBe(true);
    }
    expect(GUITAR_SOLO_STING.file).toBe('guitar-solo.mp3');
    expect(ROCK_SCREAM_STING.file).toBe('rock-scream.mp3');
  });
});
