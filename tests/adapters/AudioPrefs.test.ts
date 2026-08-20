import { describe, expect, it } from 'vitest';
import {
  isAudioMuted,
  isFocusAudioMuted,
  isUserAudioMuted,
  setAudioMuted,
  setFocusMuted,
} from '../../src/adapters/audio/AudioPrefs.ts';

describe('AudioPrefs focus mute', () => {
  it('ORs user mute and focus mute, and refocus keeps a user mute', () => {
    setAudioMuted(false);
    setFocusMuted(false);
    expect(isAudioMuted()).toBe(false);

    setFocusMuted(true);
    expect(isFocusAudioMuted()).toBe(true);
    expect(isAudioMuted()).toBe(true);

    setFocusMuted(false);
    expect(isAudioMuted()).toBe(false);

    setAudioMuted(true);
    setFocusMuted(true);
    setFocusMuted(false);
    expect(isUserAudioMuted()).toBe(true);
    expect(isAudioMuted()).toBe(true);

    setAudioMuted(false);
    expect(isAudioMuted()).toBe(false);
  });
});
