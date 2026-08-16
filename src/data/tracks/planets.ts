/**
 * The ten planets of the campaign, drawn from the contact-sheet art briefs.
 *
 * Each planet has a FEATURED car (`bestCarId`) that its tracks are shaped to
 * reward, and a terrain bias that `tools/trackgen` turns into geometry:
 *
 *  - `straightBias`    0..1  longer straights → rewards top speed / acceleration
 *  - `cornerTightness` 0..1  tighter, more frequent corners → rewards grip / steerRate
 *  - `surfaceGrip`     mult  <1 slippery (ice/swamp), 1 normal, >1 extra grip
 *  - `halfWidth`       units road half-width (narrow = technical, wide = brawling room)
 *
 * The offline line search (`npm run gen:lines`) validates each planet by checking
 * that its featured car is (or is closest to) the fastest across the roster; the
 * bias is the lever used to steer that outcome.
 */

export interface PlanetTerrain {
  readonly straightBias: number;
  readonly cornerTightness: number;
  readonly surfaceGrip: number;
  readonly halfWidth: number;
}

export interface PlanetDefinition {
  /** Kebab-case slug; also the prefix of its track ids. */
  readonly id: string;
  /** 1-based campaign order. */
  readonly index: number;
  readonly displayName: string;
  /** The car the planet is tuned to reward and features on its select screen. */
  readonly bestCarId: string;
  /** Base seed for the deterministic track generator. */
  readonly seed: number;
  readonly terrain: PlanetTerrain;
}

/** How many tracks each planet has. Owner: "pelo menos 3 pistas". */
export const TRACKS_PER_PLANET = 3;

export const PLANETS: readonly PlanetDefinition[] = [
  {
    id: 'thunder-basin',
    index: 1,
    displayName: 'Thunder Basin',
    bestCarId: 'marauder',
    seed: 1001,
    terrain: { straightBias: 0.5, cornerTightness: 0.5, surfaceGrip: 1.0, halfWidth: 20 },
  },
  {
    id: 'chrome-verge',
    index: 2,
    displayName: 'Chrome Verge',
    bestCarId: 'delorean',
    seed: 2002,
    terrain: { straightBias: 0.92, cornerTightness: 0.22, surfaceGrip: 1.0, halfWidth: 22 },
  },
  {
    id: 'bogmire-deep',
    index: 3,
    displayName: 'Bogmire Deep',
    bestCarId: 'air-boat',
    seed: 3003,
    terrain: { straightBias: 0.35, cornerTightness: 0.62, surfaceGrip: 0.72, halfWidth: 20 },
  },
  {
    id: 'cryo-hollow',
    index: 4,
    displayName: 'Cryo Hollow',
    bestCarId: 'snow-car',
    seed: 4004,
    terrain: { straightBias: 0.4, cornerTightness: 0.72, surfaceGrip: 0.58, halfWidth: 19 },
  },
  {
    id: 'ferro-rust',
    index: 5,
    displayName: 'Ferro Rust',
    bestCarId: 'havac',
    seed: 5005,
    terrain: { straightBias: 0.32, cornerTightness: 0.5, surfaceGrip: 0.9, halfWidth: 24 },
  },
  {
    id: 'vulkanis',
    index: 6,
    displayName: 'Vulkanis',
    bestCarId: 'magma-rex',
    seed: 6006,
    terrain: { straightBias: 0.3, cornerTightness: 0.55, surfaceGrip: 0.85, halfWidth: 24 },
  },
  {
    id: 'neon-kasbah',
    index: 7,
    displayName: 'Neon Kasbah',
    bestCarId: 'neon-ronin',
    seed: 7007,
    terrain: { straightBias: 0.28, cornerTightness: 0.88, surfaceGrip: 1.0, halfWidth: 16 },
  },
  {
    id: 'ash-reach',
    index: 8,
    displayName: 'Ash Reach',
    bestCarId: 'air-blade',
    seed: 8008,
    terrain: { straightBias: 0.95, cornerTightness: 0.2, surfaceGrip: 1.0, halfWidth: 24 },
  },
  {
    id: 'voidport',
    index: 9,
    displayName: 'Voidport',
    bestCarId: 'battle-trak',
    seed: 9009,
    terrain: { straightBias: 0.55, cornerTightness: 0.48, surfaceGrip: 1.05, halfWidth: 20 },
  },
  {
    id: 'verdant-fault',
    index: 10,
    displayName: 'Verdant Fault',
    bestCarId: 'dirt-devil',
    seed: 10010,
    terrain: { straightBias: 0.38, cornerTightness: 0.78, surfaceGrip: 0.82, halfWidth: 18 },
  },
];

/** The 'thunder-basin' authored track is planet 1, track 1 and keeps its id. */
export const ANCHOR_TRACK_ID = 'thunder-basin';

/** Deterministic track id for planet `planet`, track number `n` (1-based). */
export function planetTrackId(planet: PlanetDefinition, n: number): string {
  if (planet.index === 1 && n === 1) {
    return ANCHOR_TRACK_ID;
  }
  return `${planet.id}-${n}`;
}

/** Human-facing track name, e.g. "Chrome Verge II". */
export function planetTrackName(planet: PlanetDefinition, n: number): string {
  const numeral = ['I', 'II', 'III', 'IV', 'V'][n - 1] ?? String(n);
  return `${planet.displayName} ${numeral}`;
}

export function findPlanet(id: string): PlanetDefinition {
  const planet = PLANETS.find(candidate => candidate.id === id);
  if (planet === undefined) {
    const known = PLANETS.map(candidate => candidate.id).join(', ');
    throw new Error(`Unknown planet id "${id}". Known planets: ${known}`);
  }
  return planet;
}

/** The planet that owns a given track id. */
export function planetForTrackId(trackId: string): PlanetDefinition | undefined {
  return PLANETS.find(planet => {
    for (let n = 1; n <= TRACKS_PER_PLANET; n += 1) {
      if (planetTrackId(planet, n) === trackId) {
        return true;
      }
    }
    return false;
  });
}
