import {
  MUSIC_BEDS,
  musicBedKey,
  musicBedUrl,
  pickMusicBed,
  type MusicBed,
} from '../../data/audio/MusicBeds.ts';

const loaded = new Set<string>();
let lastPickedBedId: string | undefined;

export function markMusicBedLoaded(id: string): void {
  loaded.add(id);
}

/** Queue every catalog bed. Caller marks the keys optional so a missing file is not fatal. */
export function queueMusicBedLoads(
  beds: readonly MusicBed[],
  enqueue: (key: string, url: string) => void,
): void {
  for (const bed of beds) {
    enqueue(musicBedKey(bed), musicBedUrl(bed));
  }
}

/** Register only the beds that actually arrived in a cache. */
export function markMusicBedsPresentInCache(exists: (key: string) => boolean): void {
  for (const bed of MUSIC_BEDS) {
    if (exists(musicBedKey(bed))) {
      markMusicBedLoaded(bed.id);
    }
  }
}

export function clearLoadedMusicBeds(): void {
  loaded.clear();
  lastPickedBedId = undefined;
}

export function loadedMusicBeds(beds: readonly MusicBed[] = MUSIC_BEDS): readonly MusicBed[] {
  return beds.filter(bed => loaded.has(bed.id));
}

/** Random loaded bed. Skips the last pick when another file is available. */
export function pickLoadedMusicBed(random: () => number = Math.random): MusicBed | undefined {
  const beds = loadedMusicBeds();
  const pool =
    beds.length > 1 && lastPickedBedId !== undefined
      ? beds.filter(bed => bed.id !== lastPickedBedId)
      : beds;
  const picked = pickMusicBed(pool, random);
  if (picked !== undefined) {
    lastPickedBedId = picked.id;
  }
  return picked;
}
