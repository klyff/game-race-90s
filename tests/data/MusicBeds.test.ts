import { describe, expect, it } from 'vitest';
import {
  MUSIC_BED_VOLUME,
  MUSIC_BEDS,
  musicBedKey,
  musicBedUrl,
  pickMusicBed,
} from '../../src/data/audio/MusicBeds.ts';
import {
  NARRATOR_CATEGORY,
  NARRATOR_VOICES,
  narratorClipFile,
  pickNarratorVoice,
  narratorLines,
} from '../../src/data/audio/NarratorBank.ts';
import { setAudioMuted, isAudioMuted } from '../../src/adapters/audio/AudioPrefs.ts';
import {
  clearLoadedMusicBeds,
  loadedMusicBeds,
  markMusicBedLoaded,
  pickLoadedMusicBed,
} from '../../src/adapters/audio/BedRegistry.ts';

describe('MusicBeds', () => {
  it('plays recorded beds at half volume', () => {
    expect(MUSIC_BED_VOLUME).toBe(0.5);
  });

  it('lists ten original beds with distinct ids', () => {
    expect(MUSIC_BEDS).toHaveLength(10);
    expect(new Set(MUSIC_BEDS.map(bed => bed.id)).size).toBe(10);
  });

  it('builds a public url and a boot cache key', () => {
    const bed = MUSIC_BEDS[0]!;
    expect(musicBedUrl(bed)).toBe(`assets/audio/music/beds/${bed.file}`);
    expect(musicBedKey(bed)).toBe(`music-bed:${bed.id}`);
  });

  it('returns undefined when the pool is empty', () => {
    expect(pickMusicBed([])).toBeUndefined();
  });

  it('picks from the pool with an injected random', () => {
    expect(pickMusicBed(MUSIC_BEDS, () => 0)?.id).toBe(MUSIC_BEDS[0]!.id);
    expect(pickMusicBed(MUSIC_BEDS, () => 0.99)?.id).toBe(MUSIC_BEDS[9]!.id);
  });
});

describe('BedRegistry', () => {
  it('only randomizes beds that actually loaded', () => {
    clearLoadedMusicBeds();
    expect(loadedMusicBeds()).toEqual([]);
    markMusicBedLoaded('green-flag');
    markMusicBedLoaded('missing-id');
    expect(loadedMusicBeds().map(bed => bed.id)).toEqual(['green-flag']);
    expect(pickLoadedMusicBed(() => 0)?.id).toBe('green-flag');
    clearLoadedMusicBeds();
  });
});

describe('NarratorBank', () => {
  it('records every line in both Echo and Verse', () => {
    expect(NARRATOR_VOICES).toEqual(['echo', 'verse']);
    expect(pickNarratorVoice(() => 0)).toBe('echo');
    expect(pickNarratorVoice(() => 0.9)).toBe('verse');
    expect(narratorClipFile('echo', 'engines-hot')).toBe('echo-engines-hot.mp3');
  });

  it('covers start, damage, boost, banter, behind, weapons, final lap and finish', () => {
    const lines = narratorLines('en');
    const categories = new Set(lines.map(line => line.category));
    expect([...categories].sort()).toEqual(Object.values(NARRATOR_CATEGORY).slice().sort());
    expect(lines.filter(line => line.category === NARRATOR_CATEGORY.RACE_START)).toHaveLength(6);
    expect(lines.some(line => line.id === 'lok-thant-enzo' && line.weight === 3)).toBe(true);
  });
});

describe('AudioPrefs', () => {
  it('remembers mute across screens', () => {
    setAudioMuted(false);
    expect(isAudioMuted()).toBe(false);
    setAudioMuted(true);
    expect(isAudioMuted()).toBe(true);
    setAudioMuted(false);
  });
});
