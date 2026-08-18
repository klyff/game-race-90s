import { MUSIC_BEDS, pickMusicBed, type MusicBed } from '../../data/audio/MusicBeds.ts';

const loaded = new Set<string>();

export function markMusicBedLoaded(id: string): void {
  loaded.add(id);
}

export function clearLoadedMusicBeds(): void {
  loaded.clear();
}

export function loadedMusicBeds(beds: readonly MusicBed[] = MUSIC_BEDS): readonly MusicBed[] {
  return beds.filter(bed => loaded.has(bed.id));
}

export function pickLoadedMusicBed(random: () => number = Math.random): MusicBed | undefined {
  return pickMusicBed(loadedMusicBeds(), random);
}
