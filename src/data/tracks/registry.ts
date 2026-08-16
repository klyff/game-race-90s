import { thunderBasin } from './thunder-basin.track.ts';
import type { TrackDefinition } from '../../domain/track/TrackDefinition.ts';

export const TRACKS: readonly TrackDefinition[] = [thunderBasin];

export function findTrack(id: string): TrackDefinition {
  const track = TRACKS.find((candidate) => candidate.id === id);
  if (track === undefined) {
    const known = TRACKS.map((candidate) => candidate.id).join(', ');
    throw new Error(`Unknown track id "${id}". Registered tracks: ${known}`);
  }
  return track;
}
