import { thunderBasin } from './thunder-basin.track.ts';
import { GENERATED_TRACKS } from './generated-tracks.ts';
import type { TrackDefinition } from '../../domain/track/TrackDefinition.ts';

/**
 * Every circuit in the game: the hand-authored `thunder-basin` (planet 1, track 1)
 * followed by the procedurally generated tracks from `npm run gen:tracks`.
 */
export const TRACKS: readonly TrackDefinition[] = [thunderBasin, ...GENERATED_TRACKS];

export function findTrack(id: string): TrackDefinition {
  const track = TRACKS.find((candidate) => candidate.id === id);
  if (track === undefined) {
    const known = TRACKS.map((candidate) => candidate.id).join(', ');
    throw new Error(`Unknown track id "${id}". Registered tracks: ${known}`);
  }
  return track;
}
