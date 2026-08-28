import { describe, expect, it } from 'vitest';
import {
  COMIC_VOICE_BANKS,
  ORIGIN_STRIP_PANEL_COUNT,
  ORIGIN_VOICE_BY_CARD,
  comicVoiceBank,
  pickOriginStrips,
  rollOriginEntryStrips,
} from '../../src/data/cards/OriginComicStrips.ts';
import { ORIGIN_PANELS } from '../../src/data/cards/OriginComic.ts';
import { SPLASH_CARDS } from '../../src/data/cards/SplashCards.ts';

describe('OriginComicStrips', () => {
  it('keeps a voice bank for every splash card page', () => {
    expect(ORIGIN_VOICE_BY_CARD).toHaveLength(ORIGIN_PANELS.length);
    expect(ORIGIN_VOICE_BY_CARD).toHaveLength(SPLASH_CARDS.length);
    expect(ORIGIN_VOICE_BY_CARD).toEqual(['aline', 'enzo', 'emma', 'klyff']);
  });

  it('authors about ten cartoon lines per voice', () => {
    for (const bank of COMIC_VOICE_BANKS) {
      expect(bank.lines.length).toBeGreaterThanOrEqual(10);
    }
  });

  it('gives Chimbler gossip — two tips on each other face and the wider grid', () => {
    const emma = comicVoiceBank('emma');
    expect(emma?.displayName).toBe('CHIMBLER');
    expect(emma?.gossip?.length).toBeGreaterThanOrEqual(50);
    const byAbout = new Map<string, number>();
    for (const tip of emma?.gossip ?? []) {
      byAbout.set(tip.about, (byAbout.get(tip.about) ?? 0) + 1);
    }
    for (const name of ['ALINE', 'ENZO', 'KLYFF', 'CAROL', 'ZOR9', 'HEX']) {
      expect(byAbout.get(name)).toBe(2);
    }
  });

  it('rolls stable strips for one entry seed and reshuffles on another', () => {
    const a = rollOriginEntryStrips(42);
    const b = rollOriginEntryStrips(42);
    const c = rollOriginEntryStrips(99);
    expect(a).toHaveLength(4);
    expect(a[0]).toHaveLength(ORIGIN_STRIP_PANEL_COUNT);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('mixes Chimbler self lines with gossip badges', () => {
    const strips = pickOriginStrips('emma', 7, 12);
    expect(strips.some(panel => panel.badge === 'CHIMBLER')).toBe(true);
    expect(strips.some(panel => panel.badge.startsWith('GOSSIP ·'))).toBe(true);
  });
});
