import { describe, it, expect } from 'vitest';
import { PLANETS } from '../../src/data/tracks/planets.ts';
import {
  DEFAULT_THEME,
  everyPlanetHasTheme,
  PLANET_THEMES,
  themeForPlanetId,
  themeForTrackId,
} from '../../src/data/tracks/planetThemes.ts';
import { planetTrackId } from '../../src/data/tracks/planets.ts';

describe('planetThemes', () => {
  it('covers every campaign planet', () => {
    expect(everyPlanetHasTheme()).toBe(true);
    expect(PLANETS).toHaveLength(10);
  });

  it('looks up a track by its campaign id', () => {
    const cryo = PLANETS.find(planet => planet.id === 'cryo-hollow')!;
    expect(themeForTrackId(planetTrackId(cryo, 2)).planetId).toBe('cryo-hollow');
    expect(themeForTrackId(planetTrackId(cryo, 2)).tarmac).not.toBe(DEFAULT_THEME.tarmac);
  });

  it('falls back to Thunder Basin for an unknown id', () => {
    expect(themeForPlanetId('not-a-planet')).toBe(DEFAULT_THEME);
    expect(themeForTrackId('missing')).toBe(DEFAULT_THEME);
  });

  it('every planet has a sane trackside prop (T-048), distinct from its wall/shoulder colour', () => {
    for (const theme of PLANET_THEMES) {
      expect(theme.propHeight).toBeGreaterThan(0);
      expect(theme.propWidth).toBeGreaterThan(0);
      expect(theme.propColor).not.toBe(theme.wall);
      expect(theme.propColor).not.toBe(theme.shoulder);
      expect(['blob', 'spike']).toContain(theme.propShape);
    }
  });
});
