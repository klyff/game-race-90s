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
  /**
   * How the racing surface is drawn. `asphalt` is a flat ribbon with grooves
   * and grain — shadows stay painted, they never read as raceable ramps.
   * `rock` is leftover packed-slab code; all campaign worlds use asphalt.
   */
  readonly surface: 'asphalt' | 'rock';
}

function theme(
  planetId: string,
  colours: Omit<PlanetTheme, 'planetId' | 'groundKey' | 'artKey' | 'groundFile' | 'artFile' | 'surface'> & {
    readonly surface?: PlanetTheme['surface'];
  },
): PlanetTheme {
  const { surface, ...rest } = colours;
  return {
    planetId,
    ...rest,
    surface: surface ?? 'asphalt',
    groundKey: `ground-${planetId}`,
    artKey: `planet-${planetId}`,
    groundFile: `${planetId}.png`,
    artFile: `${planetId}.jpeg`,
  };
}

/** Thunder Basin — coral asphalt, grainy, grooved. Shadows stay flat paint. */
export const DEFAULT_THEME: PlanetTheme = theme('thunder-basin', {
  wall: 0x7a3a2c,
  shoulder: 0x8a4030,
  tarmac: 0xd47862,
  kerb: 0x5a241c,
  marking: 0xf0b090,
  chequerDark: 0x2a1410,
  ground: 0xa05038,
  propShape: 'blob',
  propHeight: 1.6,
  propWidth: 1.8,
  propColor: 0x9a4a34,
  propAccent: 0xf0b090,
  surface: 'asphalt',
});

export const PLANET_THEMES: readonly PlanetTheme[] = [
  DEFAULT_THEME,
  theme('chrome-verge', {
    wall: 0x6a6860,
    shoulder: 0x4a4840,
    tarmac: 0x5a564c,
    kerb: 0x3a3830,
    marking: 0x8a8070,
    chequerDark: 0x201c18,
    ground: 0x2a2a28,
    propShape: 'spike',
    propHeight: 3.2,
    propWidth: 0.5,
    propColor: 0x52524c,
    propAccent: 0xc07040,
  }),
  theme('bogmire-deep', {
    wall: 0x3a4a28,
    shoulder: 0x24301c,
    tarmac: 0x3a4a30,
    kerb: 0x1a2414,
    marking: 0x6a7a50,
    chequerDark: 0x081008,
    ground: 0x0e1a0c,
    propShape: 'spike',
    propHeight: 1.6,
    propWidth: 0.25,
    propColor: 0x1a2a14,
    propAccent: 0x5a8a38,
  }),
  theme('cryo-hollow', {
    wall: 0xd8e8f0,
    shoulder: 0x8ab4c8,
    tarmac: 0x7a9aaa,
    kerb: 0x4a6a78,
    marking: 0xb8d0dc,
    chequerDark: 0x102028,
    ground: 0xb8d4e0,
    propShape: 'spike',
    propHeight: 2,
    propWidth: 0.6,
    propColor: 0xc8e4f0,
    propAccent: 0xe8f4f8,
  }),
  theme('ferro-rust', {
    wall: 0xb86a3a,
    shoulder: 0x6a3018,
    tarmac: 0x8a4a28,
    kerb: 0x4a2010,
    marking: 0xc08050,
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
    shoulder: 0x2a1814,
    tarmac: 0x4a3028,
    kerb: 0x1a1010,
    marking: 0x6a4838,
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
    tarmac: 0x9a7850,
    kerb: 0x5a4030,
    marking: 0xc8a878,
    chequerDark: 0x201018,
    ground: 0xc8a878,
    propShape: 'spike',
    propHeight: 2.8,
    propWidth: 0.4,
    propColor: 0x6a4a2a,
    propAccent: 0xff40c8,
  }),
  theme('ash-reach', {
    wall: 0x7a6a60,
    shoulder: 0x5a4a42,
    tarmac: 0x6a5a50,
    kerb: 0x3a3028,
    marking: 0x8a7a6c,
    chequerDark: 0x181410,
    ground: 0x6a6a68,
    propShape: 'blob',
    propHeight: 1,
    propWidth: 1.3,
    propColor: 0x8a8a86,
    propAccent: 0xc8b8a8,
  }),
  theme('voidport', {
    wall: 0x4a5a68,
    shoulder: 0x2a3440,
    tarmac: 0x3a4854,
    kerb: 0x1a2430,
    marking: 0x5a6a78,
    chequerDark: 0x08080c,
    ground: 0x1a2030,
    propShape: 'spike',
    propHeight: 2.2,
    propWidth: 0.5,
    propColor: 0x3a4a5a,
    propAccent: 0xc8a040,
  }),
  theme('verdant-fault', {
    wall: 0x6a8a40,
    shoulder: 0x2a4a20,
    tarmac: 0x4a5a30,
    kerb: 0x1a2a14,
    marking: 0x6a7a48,
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
