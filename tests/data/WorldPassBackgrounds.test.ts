import { describe, expect, it } from 'vitest';
import { planetTrackId, PLANETS, TRACKS_PER_PLANET } from '../../src/data/tracks/planets.ts';
import {
  WORLD_PASS_BACKGROUNDS,
  worldPassForFinish,
  worldPassKey,
  worldPassUrl,
} from '../../src/data/ui/WorldPassBackgrounds.ts';

const planet1 = PLANETS[0]!;
const planet2 = PLANETS[1]!;
const lastPlanet = PLANETS[PLANETS.length - 1]!;

describe('WorldPassBackgrounds', () => {
  it('lists one ticket per destination plus championship', () => {
    expect(WORLD_PASS_BACKGROUNDS).toHaveLength(10);
    expect(new Set(WORLD_PASS_BACKGROUNDS.map(pass => pass.id)).size).toBe(10);
  });

  it('builds a public url and a cache key', () => {
    const pass = WORLD_PASS_BACKGROUNDS[0]!;
    expect(worldPassUrl(pass)).toBe('assets/ui/ticketpass/pass-chrome-verge.png');
    expect(worldPassKey(pass)).toBe('world-pass:chrome-verge');
  });

  it('stays quiet off the last track or off first place', () => {
    expect(worldPassForFinish(planetTrackId(planet1, 1), 1, [])).toBeUndefined();
    expect(worldPassForFinish(planetTrackId(planet1, TRACKS_PER_PLANET), 2, [])).toBeUndefined();
  });

  it('opens the next world after a first-time win of a planet last track', () => {
    const lastOfPlanet1 = planetTrackId(planet1, TRACKS_PER_PLANET);
    const pass = worldPassForFinish(lastOfPlanet1, 1, []);
    expect(pass?.id).toBe(planet2.id);
    expect(pass?.kind).toBe('next-world');
  });

  it('stays quiet when that last track was already won', () => {
    const lastOfPlanet1 = planetTrackId(planet1, TRACKS_PER_PLANET);
    expect(worldPassForFinish(lastOfPlanet1, 1, [lastOfPlanet1])).toBeUndefined();
  });

  it('hands the championship ticket after the final world last track', () => {
    const last = planetTrackId(lastPlanet, TRACKS_PER_PLANET);
    const pass = worldPassForFinish(last, 1, []);
    expect(pass?.id).toBe('championship');
    expect(pass?.kind).toBe('championship');
  });
});
