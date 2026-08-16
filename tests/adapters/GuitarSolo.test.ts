import { describe, expect, it } from 'vitest';
import { GUITAR_SOLO_DURATION_SECONDS, SOLO_NOTES } from '../../src/adapters/audio/GuitarSolo.ts';

describe('GuitarSolo', () => {
  it('is a three-second shred with notes that fit inside the window', () => {
    expect(GUITAR_SOLO_DURATION_SECONDS).toBe(3);
    expect(SOLO_NOTES.length).toBeGreaterThan(8);
    const last = SOLO_NOTES[SOLO_NOTES.length - 1]!;
    expect(last.at + last.hold).toBeLessThanOrEqual(GUITAR_SOLO_DURATION_SECONDS + 0.05);
  });
});
