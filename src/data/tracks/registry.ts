import { thunderBasin } from './thunder-basin.track.ts';
import { thunderBasinTwo } from './thunder-basin-2.track.ts';
import { GENERATED_TRACKS } from './generated-tracks.ts';
import type { TrackDefinition } from '../../domain/track/TrackDefinition.ts';

/**
 * Every circuit in the game: hand-authored World 1 I + II, then the
 * procedurally generated tracks from `npm run gen:tracks`.
 */
export const TRACKS: readonly TrackDefinition[] = [
  thunderBasin,
  thunderBasinTwo,
  ...GENERATED_TRACKS,
];

export function findTrack(id: string): TrackDefinition {
  const track = TRACKS.find((candidate) => candidate.id === id);
  if (track === undefined) {
    const known = TRACKS.map((candidate) => candidate.id).join(', ');
    throw new Error(`Unknown track id "${id}". Registered tracks: ${known}`);
  }
  return track;
}
