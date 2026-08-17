import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SPLASH_CARDS, splashCardUrl } from '../../src/data/cards/SplashCards.ts';

describe('SplashCards', () => {
  it('lists the four family cards in showcase order', () => {
    expect(SPLASH_CARDS.map((card) => card.id)).toEqual(['aline', 'enzo', 'emma', 'klyff']);
  });

  it('points each card at a file that exists on disk', () => {
    const publicRoot = join(process.cwd(), 'public');
    for (const card of SPLASH_CARDS) {
      const url = splashCardUrl(card);
      expect(url).toBe(`assets/cards/${card.file}`);
      expect(existsSync(join(publicRoot, url))).toBe(true);
    }
  });

  it('gives every card a distinct texture key', () => {
    const keys = SPLASH_CARDS.map((card) => card.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
