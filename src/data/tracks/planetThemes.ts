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
  /**
   * Trackside decoration standing along the wall (T-048): a squat rounded
   * `blob` (boulders, scrap, debris) or a standing `spike` (pipes, reeds,
   * pylons). Drawn with the projection's height parameter, so this is what
   * actually replaces a flat colour band with something that reads as each
   * world's terrain, per the owner's "só aquela faixa branca não tá bom" ask.
   */
  readonly propShape: 'blob' | 'spike';
  /** World units, base to tip. */
  readonly propHeight: number;
  /** World units, half-width at the base. */
  readonly propWidth: number;
  readonly propColor: number;
  /** Tip/highlight colour — a glow, a metal fleck, a chevron stripe. */
  readonly propAccent: number;
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
    artFile: `${planetId}.jpeg`,
  };
}

/** Thunder Basin defaults — the colours the renderer shipped with before themes. */
export const DEFAULT_THEME: PlanetTheme = theme('thunder-basin', {
  wall: 0x8a7060,
  shoulder: 0x4a3424,
  tarmac: 0x6a5340,
  kerb: 0x3a2a1c,
  marking: 0xd4c4a8,
  chequerDark: 0x2a2018,
  ground: 0x4a3018,
  propShape: 'blob',
  propHeight: 1.6,
  propWidth: 1.8,
  propColor: 0x7a5840,
  propAccent: 0xc8a070,
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
    propShape: 'spike',
    propHeight: 3.2,
    propWidth: 0.5,
    propColor: 0x52524c,
    propAccent: 0xff8a1a,
  }),
  theme('bogmire-deep', {
    wall: 0x3a4a28,
    shoulder: 0x1a2418,
    tarmac: 0x121610,
    kerb: 0x7cff4a,
    marking: 0xc8e8a0,
    chequerDark: 0x081008,
    ground: 0x0e1a0c,
    propShape: 'spike',
    propHeight: 1.6,
    propWidth: 0.25,
    propColor: 0x1a2a14,
    propAccent: 0x7cff4a,
  }),
  theme('cryo-hollow', {
    wall: 0xd8e8f0,
    shoulder: 0x8ab4c8,
    tarmac: 0x2a3a48,
    kerb: 0x7ec8ff,
    marking: 0xf4fbff,
    chequerDark: 0x102028,
    ground: 0xb8d4e0,
    propShape: 'spike',
    propHeight: 2,
    propWidth: 0.6,
    propColor: 0xc8e4f0,
    propAccent: 0xffffff,
  }),
  theme('ferro-rust', {
    wall: 0xb86a3a,
    shoulder: 0x6a3018,
    tarmac: 0x2a1a12,
    kerb: 0xff6a20,
    marking: 0xf0d0a0,
    chequerDark: 0x140804,
    ground: 0x8a3a18,
    propShape: 'blob',
    propHeight: 1.5,
    propWidth: 1.6,
    propColor: 0x9a4a20,
    propAccent: 0xffe0b0,
  }),
  theme('vulkanis', {
    wall: 0x4a3a30,
    shoulder: 0x1a1010,
    tarmac: 0x121010,
    kerb: 0xff3a00,
    marking: 0xffc080,
    chequerDark: 0x080404,
    ground: 0x1a0c0c,
    propShape: 'spike',
    propHeight: 2.4,
    propWidth: 0.8,
    propColor: 0x2e1a16,
    propAccent: 0xff6a10,
  }),
  theme('neon-kasbah', {
    wall: 0xc8a060,
    shoulder: 0x8a6a40,
    tarmac: 0x1a1220,
    kerb: 0xff40c8,
    marking: 0x80ffff,
    chequerDark: 0x100818,
    ground: 0xc8a878,
    propShape: 'spike',
    propHeight: 2.8,
    propWidth: 0.4,
    propColor: 0x6a4a2a,
    propAccent: 0xff40c8,
  }),
  theme('ash-reach', {
    wall: 0x8a8a88,
    shoulder: 0x5a5a58,
    tarmac: 0x2a2a2a,
    kerb: 0xc8c8c0,
    marking: 0xe8e8e4,
    chequerDark: 0x101010,
    ground: 0x6a6a68,
    propShape: 'blob',
    propHeight: 1,
    propWidth: 1.3,
    propColor: 0x8a8a86,
    propAccent: 0xe8e8e0,
  }),
  theme('voidport', {
    wall: 0x4a5a68,
    shoulder: 0x1a2030,
    tarmac: 0x101418,
    kerb: 0xffd21a,
    marking: 0xc0d8ff,
    chequerDark: 0x08080c,
    ground: 0x1a2030,
    propShape: 'spike',
    propHeight: 2.2,
    propWidth: 0.5,
    propColor: 0x3a4a5a,
    propAccent: 0xffe060,
  }),
  theme('verdant-fault', {
    wall: 0x6a8a40,
    shoulder: 0x2a4a20,
    tarmac: 0x1a2014,
    kerb: 0xc8e060,
    marking: 0xe8f0c0,
    chequerDark: 0x081008,
    ground: 0x2a4a22,
    propShape: 'spike',
    propHeight: 2.6,
    propWidth: 0.7,
    propColor: 0x1a3016,
    propAccent: 0xe8d060,
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
