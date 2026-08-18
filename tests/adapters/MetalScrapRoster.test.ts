import { IMPACT_DAMAGE_THRESHOLD } from '../../src/domain/vehicle/CarIntegrity.ts';
import {
  scrapCountForHit,
  scrapFileName,
  scrapRosterPick,
  scrapRosterSeed,
  scrapTextureKey,
  SCRAP_HARD_COUNT,
  SCRAP_HARD_SPEED,
  SCRAP_LIGHT_COUNT,
  SCRAP_MEDIUM_COUNT,
  SCRAP_MEDIUM_SPEED,
  SCRAP_ROSTER_SIZE,
  SCRAP_SPRITES,
} from '../../src/adapters/render/MetalScrapRoster.ts';

describe('scrapCountForHit', () => {
  it('throws nothing below the damage threshold', () => {
    expect(scrapCountForHit(IMPACT_DAMAGE_THRESHOLD, false)).toBe(0);
    expect(scrapCountForHit(0, false)).toBe(0);
    expect(scrapCountForHit(Number.NaN, false)).toBe(0);
  });

  it('throws five scraps on a light hit, one toward each side', () => {
    expect(scrapCountForHit(IMPACT_DAMAGE_THRESHOLD + 0.1, false)).toBe(SCRAP_LIGHT_COUNT);
    expect(scrapCountForHit(SCRAP_MEDIUM_SPEED - 0.1, false)).toBe(SCRAP_LIGHT_COUNT);
  });

  it('throws twelve scraps on a medium hit', () => {
    expect(scrapCountForHit(SCRAP_MEDIUM_SPEED, false)).toBe(SCRAP_MEDIUM_COUNT);
    expect(scrapCountForHit(SCRAP_HARD_SPEED - 0.1, false)).toBe(SCRAP_MEDIUM_COUNT);
  });

  it('throws fifteen scraps on a hard hit', () => {
    expect(scrapCountForHit(SCRAP_HARD_SPEED, false)).toBe(SCRAP_HARD_COUNT);
    expect(scrapCountForHit(80, false)).toBe(SCRAP_HARD_COUNT);
  });

  it('launches the whole roster when the car explodes', () => {
    expect(scrapCountForHit(0, true)).toBe(SCRAP_ROSTER_SIZE);
    expect(scrapCountForHit(3, true)).toBe(SCRAP_ROSTER_SIZE);
  });
});

describe('scrapRosterPick', () => {
  it('draws a unique subset of the roster', () => {
    const pick = scrapRosterPick(5, 22);
    expect(pick).toHaveLength(5);
    expect(new Set(pick).size).toBe(5);
    expect(pick.every(index => index >= 0 && index < SCRAP_ROSTER_SIZE)).toBe(true);
  });

  it('can empty the whole roster', () => {
    const pick = scrapRosterPick(SCRAP_ROSTER_SIZE, 1);
    expect(pick).toHaveLength(SCRAP_ROSTER_SIZE);
    expect(new Set(pick).size).toBe(SCRAP_ROSTER_SIZE);
  });

  it('same seed draws the same pieces, a different seed does not', () => {
    expect(scrapRosterPick(8, scrapRosterSeed(18, 3))).toEqual(
      scrapRosterPick(8, scrapRosterSeed(18, 3)),
    );
    expect(scrapRosterPick(8, scrapRosterSeed(18, 3))).not.toEqual(
      scrapRosterPick(8, scrapRosterSeed(18, 4)),
    );
  });

  it('names the files scrap-01 through scrap-45', () => {
    expect(SCRAP_SPRITES).toHaveLength(SCRAP_ROSTER_SIZE);
    expect(scrapFileName(0)).toBe('scrap-01.png');
    expect(scrapFileName(44)).toBe('scrap-45.png');
    expect(scrapTextureKey(0)).toBe('debris-scrap-01');
    expect(scrapTextureKey(44)).toBe('debris-scrap-45');
  });
});
