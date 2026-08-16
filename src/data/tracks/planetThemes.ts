/**
 * Per-planet look: road palette + the keys Boot loads for the ground tile and
 * the area-select illustration. Colours were pulled from the commissioned
 * contact sheets in `docs/art-briefs/references/` so the procedural road
 * agrees with the art instead of fighting it (T-036).
 *
 * Assets live under `public/` and are loaded by key, never imported.
 */

import { planetForTrackId, PLANETS } from './planets.ts';

export interface PlanetTheme {
  readonly planetId: string;
  readonly wall: number;
  readonly shoulder: number;
  readonly tarmac: number;
  readonly kerb: number;
  readonly marking: number;
  readonly chequerDark: number;
  /** Fallback fill when the ground tile has not loaded. */
  readonly ground: number;
  /** Phaser texture key, `ground-<slug>`. */
  readonly groundKey: string;
  /** Phaser texture key, `planet-<slug>`. */
  readonly artKey: string;
  readonly groundFile: string;
  readonly artFile: string;
}

function theme(
  planetId: string,
  colours: Omit<PlanetTheme, 'planetId' | 'groundKey' | 'artKey' | 'groundFile' | 'artFile'>,
): PlanetTheme {
  return {
    planetId,
    ...colours,
    groundKey: `ground-${planetId}`,
    artKey: `planet-${planetId}`,
    groundFile: `${planetId}.png`,
    artFile: `${planetId}.png`,
  };
}

/** Thunder Basin defaults — the colours the renderer shipped with before themes. */
export const DEFAULT_THEME: PlanetTheme = theme('thunder-basin', {
  wall: 0xaca898,
  shoulder: 0x6b4a2e,
  tarmac: 0x2a2a2e,
  kerb: 0xe0c21a,
  marking: 0xf2f2f2,
  chequerDark: 0x101010,
  ground: 0x5a3018,
});

export const PLANET_THEMES: readonly PlanetTheme[] = [
  DEFAULT_THEME,
  theme('chrome-verge', {
    wall: 0x8a8880,
    shoulder: 0x3a3a38,
    tarmac: 0x1a1a1c,
    kerb: 0xff8a1a,
    marking: 0xe8e0d0,
    chequerDark: 0x101010,
    ground: 0x2a2a28,
  }),
  theme('bogmire-deep', {
    wall: 0x3a4a28,
    shoulder: 0x1a2418,
    tarmac: 0x121610,
    kerb: 0x7cff4a,
    marking: 0xc8e8a0,
    chequerDark: 0x081008,
    ground: 0x0e1a0c,
  }),
  theme('cryo-hollow', {
    wall: 0xd8e8f0,
    shoulder: 0x8ab4c8,
    tarmac: 0x2a3a48,
    kerb: 0x7ec8ff,
    marking: 0xf4fbff,
    chequerDark: 0x102028,
    ground: 0xb8d4e0,
  }),
  theme('ferro-rust', {
    wall: 0xb86a3a,
    shoulder: 0x6a3018,
    tarmac: 0x2a1a12,
    kerb: 0xff6a20,
    marking: 0xf0d0a0,
    chequerDark: 0x140804,
    ground: 0x8a3a18,
  }),
  theme('vulkanis', {
    wall: 0x4a3a30,
    shoulder: 0x1a1010,
    tarmac: 0x121010,
    kerb: 0xff3a00,
    marking: 0xffc080,
    chequerDark: 0x080404,
    ground: 0x1a0c0c,
  }),
  theme('neon-kasbah', {
    wall: 0xc8a060,
    shoulder: 0x8a6a40,
    tarmac: 0x1a1220,
    kerb: 0xff40c8,
    marking: 0x80ffff,
    chequerDark: 0x100818,
    ground: 0xc8a878,
  }),
  theme('ash-reach', {
    wall: 0x8a8a88,
    shoulder: 0x5a5a58,
    tarmac: 0x2a2a2a,
    kerb: 0xc8c8c0,
    marking: 0xe8e8e4,
    chequerDark: 0x101010,
    ground: 0x6a6a68,
  }),
  theme('voidport', {
    wall: 0x4a5a68,
    shoulder: 0x1a2030,
    tarmac: 0x101418,
    kerb: 0xffd21a,
    marking: 0xc0d8ff,
    chequerDark: 0x08080c,
    ground: 0x1a2030,
  }),
  theme('verdant-fault', {
    wall: 0x6a8a40,
    shoulder: 0x2a4a20,
    tarmac: 0x1a2014,
    kerb: 0xc8e060,
    marking: 0xe8f0c0,
    chequerDark: 0x081008,
    ground: 0x2a4a22,
  }),
];

export function themeForPlanetId(planetId: string): PlanetTheme {
  return PLANET_THEMES.find(entry => entry.planetId === planetId) ?? DEFAULT_THEME;
}

export function themeForTrackId(trackId: string): PlanetTheme {
  const planet = planetForTrackId(trackId);
  return planet === undefined ? DEFAULT_THEME : themeForPlanetId(planet.id);
}

/** Every planet has a theme row — a missing one is a data bug, not a runtime one. */
export function everyPlanetHasTheme(): boolean {
  return PLANETS.every(planet => PLANET_THEMES.some(theme => theme.planetId === planet.id));
}
