import { describe, expect, it } from 'vitest';
import {
  PUB_BACKGROUNDS,
  pickPubBackground,
  pubBackgroundKey,
  pubBackgroundUrl,
} from '../../src/data/ui/PubBackgrounds.ts';

describe('PubBackgrounds', () => {
  it('lists six distinct pub interiors', () => {
    expect(PUB_BACKGROUNDS).toHaveLength(6);
    expect(new Set(PUB_BACKGROUNDS.map(pub => pub.id)).size).toBe(6);
  });

  it('builds a public url and a boot cache key', () => {
    const pub = PUB_BACKGROUNDS[0]!;
    expect(pubBackgroundUrl(pub)).toBe('assets/ui/pub_1.png');
    expect(pubBackgroundKey(pub)).toBe('pub:pub-1');
  });

  it('returns undefined when the pool is empty', () => {
    expect(pickPubBackground([])).toBeUndefined();
  });

  it('picks from the pool with an injected random', () => {
    expect(pickPubBackground(PUB_BACKGROUNDS, () => 0)?.id).toBe('pub-1');
    expect(pickPubBackground(PUB_BACKGROUNDS, () => 0.99)?.id).toBe('pub-6');
  });
});
