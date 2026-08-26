/**
 * Recorded background beds for title and race.
 *
 * Procedural `MusicPlayer` scores stay as the fallback until these files land
 * in `public/assets/audio/music/beds/`. When a bed is loaded, it plays at
 * Menus play at {@link MUSIC_BED_VOLUME}. Splash is louder. The race bed
 * stays quieter so engine, tyres and the narrator stay readable.
 */
export const MUSIC_BED_VOLUME = 0.6;
/** Attract screen only — the rest of the menus stay at {@link MUSIC_BED_VOLUME}. */
export const MUSIC_SPLASH_BED_VOLUME = 0.9;
/** Race bed only — 15–20%. Menus keep {@link MUSIC_BED_VOLUME}. */
export const MUSIC_RACE_BED_VOLUME = 0.18;
export const MUSIC_BED_DIRECTORY = 'assets/audio/music/beds';

export interface MusicBed {
  readonly id: string;
  readonly file: string;
  readonly title: string;
}

/** Ten original hard-rock / punk beds. Drop the MP3s next to this list. */
export const MUSIC_BEDS: readonly MusicBed[] = [
  { id: 'green-flag', file: 'green-flag.mp3', title: 'Green Flag' },
  { id: 'let-the-carnage', file: 'let-the-carnage.mp3', title: 'Let the Carnage' },
  { id: 'iron-chrome', file: 'iron-chrome.mp3', title: 'Iron Chrome' },
  { id: 'black-asphalt', file: 'black-asphalt.mp3', title: 'Black Asphalt' },
  { id: 'starlight-burnout', file: 'starlight-burnout.mp3', title: 'Starlight Burnout' },
  { id: 'oil-and-thunder', file: 'oil-and-thunder.mp3', title: 'Oil and Thunder' },
  { id: 'war-paint', file: 'war-paint.mp3', title: 'War Paint' },
  { id: 'last-lap-riot', file: 'last-lap-riot.mp3', title: 'Last Lap Riot' },
  { id: 'night-rider', file: 'night-rider.mp3', title: 'Night Rider' },
  { id: 'kiss-the-flag', file: 'kiss-the-flag.mp3', title: 'Kiss the Flag' },
];

export function musicBedUrl(bed: MusicBed): string {
  return `${MUSIC_BED_DIRECTORY}/${bed.file}`;
}

export function musicBedKey(bed: MusicBed): string {
  return `music-bed:${bed.id}`;
}

export function pickMusicBed(
  beds: readonly MusicBed[],
  random: () => number = Math.random,
): MusicBed | undefined {
  if (beds.length === 0) {
    return undefined;
  }
  return beds[Math.floor(random() * beds.length)];
}
