import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';

/** What the planet select receives from the splash screen. */
export interface PlanetSelectData {
  readonly manifest: CarSetManifest;
  readonly linesByTrack: Record<string, TrackLinesManifest>;
  readonly carId: string;
  readonly lastPlanetId?: string;
}

/** What the track select receives once a planet is chosen. */
export interface TrackSelectData extends PlanetSelectData {
  readonly planetId: string;
  readonly lastTrackId?: string;
}
