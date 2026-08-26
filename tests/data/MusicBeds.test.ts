import { describe, expect, it } from 'vitest';
import {
  MUSIC_BED_VOLUME,
  MUSIC_RACE_BED_VOLUME,
  MUSIC_SPLASH_BED_VOLUME,
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
  markMusicBedsPresentInCache,
  pickLoadedMusicBed,
  queueMusicBedLoads,
} from '../../src/adapters/audio/BedRegistry.ts';

describe('MusicBeds', () => {
  it('plays menu beds at 60% and splash at 90%', () => {
    expect(MUSIC_BED_VOLUME).toBe(0.6);
    expect(MUSIC_SPLASH_BED_VOLUME).toBe(0.9);
    expect(MUSIC_BED_VOLUME).toBeLessThan(MUSIC_SPLASH_BED_VOLUME);
  });

  it('keeps the race bed at 15–20% so engine and narrator stay readable', () => {
    expect(MUSIC_RACE_BED_VOLUME).toBe(0.18);
    expect(MUSIC_RACE_BED_VOLUME).toBeGreaterThanOrEqual(0.15);
    expect(MUSIC_RACE_BED_VOLUME).toBeLessThanOrEqual(0.2);
    expect(MUSIC_RACE_BED_VOLUME).toBeLessThan(MUSIC_BED_VOLUME);
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

  it('does not repeat the last bed when another is loaded', () => {
    clearLoadedMusicBeds();
    markMusicBedLoaded('green-flag');
    markMusicBedLoaded('night-rider');
    expect(pickLoadedMusicBed(() => 0)?.id).toBe('green-flag');
    expect(pickLoadedMusicBed(() => 0)?.id).toBe('night-rider');
    expect(pickLoadedMusicBed(() => 0)?.id).toBe('green-flag');
    clearLoadedMusicBeds();
  });

  it('queues every catalog bed with its public url', () => {
    const queued: Array<{ key: string; url: string }> = [];
    queueMusicBedLoads(MUSIC_BEDS, (key, url) => queued.push({ key, url }));
    expect(queued).toHaveLength(10);
    expect(queued[0]).toEqual({
      key: 'music-bed:green-flag',
      url: 'assets/audio/music/beds/green-flag.mp3',
    });
    expect(queued[9]?.key).toBe('music-bed:kiss-the-flag');
  });

  it('marks only beds whose cache key is present', () => {
    clearLoadedMusicBeds();
    markMusicBedsPresentInCache(key => key === 'music-bed:night-rider' || key === 'music-bed:missing');
    expect(loadedMusicBeds().map(bed => bed.id)).toEqual(['night-rider']);
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
