import { describe, it, expect } from 'vitest';
import {
  campaignTracks,
  isPlanetUnlocked,
  isTrackUnlocked,
  nextCampaignTrack,
  planetTracks,
} from '../../src/data/tracks/campaign.ts';
import { PLANETS, TRACKS_PER_PLANET, planetTrackId } from '../../src/data/tracks/planets.ts';

const planet1 = PLANETS[0]!;
const planet2 = PLANETS[1]!;

describe('campaign — structure', () => {
  it('lists three tracks per planet in order', () => {
    const tracks = planetTracks(planet1);
    expect(tracks).toHaveLength(TRACKS_PER_PLANET);
    expect(tracks[0]!.id).toBe(planetTrackId(planet1, 1));
    expect(tracks[2]!.id).toBe(planetTrackId(planet1, 3));
  });

  it('flattens every planet into one ordered campaign', () => {
    const all = campaignTracks();
    expect(all).toHaveLength(PLANETS.length * TRACKS_PER_PLANET);
    expect(all[0]!.id).toBe(planetTrackId(planet1, 1));
  });
});

describe('campaign — planet unlocks', () => {
  it('always unlocks the first planet', () => {
    expect(isPlanetUnlocked(planet1, [])).toBe(true);
  });

  it('locks a later planet until the previous planet last track is won', () => {
    expect(isPlanetUnlocked(planet2, [])).toBe(false);
    const lastOfPlanet1 = planetTrackId(planet1, TRACKS_PER_PLANET);
    expect(isPlanetUnlocked(planet2, [lastOfPlanet1])).toBe(true);
  });
});

describe('campaign — track unlocks', () => {
  it('opens track 1 of an unlocked planet', () => {
    expect(isTrackUnlocked(planet1, 1, [], [])).toBe(true);
  });

  it('locks track 2 until track 1 is cleared (top-3)', () => {
    expect(isTrackUnlocked(planet1, 2, [], [])).toBe(false);
    const track1 = planetTrackId(planet1, 1);
    expect(isTrackUnlocked(planet1, 2, [track1], [])).toBe(true);
  });

  it('keeps every track of a locked planet closed', () => {
    // planet2 not unlocked, even if its own track 1 would otherwise be free.
    expect(isTrackUnlocked(planet2, 1, [], [])).toBe(false);
  });
});

describe('campaign — next track', () => {
  it('chains within a planet then across the boundary', () => {
    const first = planetTrackId(planet1, 1);
    const next = nextCampaignTrack(first);
    expect(next?.id).toBe(planetTrackId(planet1, 2));

    const lastOfPlanet1 = planetTrackId(planet1, TRACKS_PER_PLANET);
    expect(nextCampaignTrack(lastOfPlanet1)?.id).toBe(planetTrackId(planet2, 1));
  });

  it('returns null after the final track', () => {
    const lastPlanet = PLANETS[PLANETS.length - 1]!;
    const lastTrack = planetTrackId(lastPlanet, TRACKS_PER_PLANET);
    expect(nextCampaignTrack(lastTrack)).toBeNull();
  });
});
