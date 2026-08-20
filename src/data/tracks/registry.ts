import { thunderBasin } from './thunder-basin.track.ts';
import { thunderBasinTwo } from './thunder-basin-2.track.ts';
import { chromeVergeOne } from './chrome-verge-1.track.ts';
import { bogmireDeepOne } from './bogmire-deep-1.track.ts';
import { GENERATED_TRACKS } from './generated-tracks.ts';
import { isAuthoredTrackId } from './planets.ts';
import type { TrackDefinition } from '../../domain/track/TrackDefinition.ts';

/**
 * Every circuit in the game: hand-authored lips first, then `gen:tracks`
 * output with those ids stripped so the authored copy wins.
 */
export const TRACKS: readonly TrackDefinition[] = [
  thunderBasin,
  thunderBasinTwo,
  chromeVergeOne,
  bogmireDeepOne,
  ...GENERATED_TRACKS.filter(track => !isAuthoredTrackId(track.id)),
];

export function findTrack(id: string): TrackDefinition {
  const track = TRACKS.find((candidate) => candidate.id === id);
  if (track === undefined) {
    const known = TRACKS.map((candidate) => candidate.id).join(', ');
    throw new Error(`Unknown track id "${id}". Registered tracks: ${known}`);
  }
  return track;
}
