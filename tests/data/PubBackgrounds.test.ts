import { describe, expect, it } from 'vitest';
import {
  PUB_BACKGROUNDS,
  pickPubBackground,
  pubBackgroundKey,
  pubBackgroundUrl,
} from '../../src/data/ui/PubBackgrounds.ts';

describe('PubBackgrounds', () => {
  it('lists ten distinct AfterTrack lounges', () => {
    expect(PUB_BACKGROUNDS).toHaveLength(10);
    expect(new Set(PUB_BACKGROUNDS.map(pub => pub.id)).size).toBe(10);
  });

  it('builds a public url and a boot cache key', () => {
    const pub = PUB_BACKGROUNDS[0]!;
    expect(pubBackgroundUrl(pub)).toBe('assets/ui/aftertrack/lounge-01.png');
    expect(pubBackgroundKey(pub)).toBe('pub:lounge-01');
  });

  it('returns undefined when the pool is empty', () => {
    expect(pickPubBackground([])).toBeUndefined();
  });

  it('picks from the pool with an injected random', () => {
    expect(pickPubBackground(PUB_BACKGROUNDS, () => 0)?.id).toBe('lounge-01');
    expect(pickPubBackground(PUB_BACKGROUNDS, () => 0.99)?.id).toBe('lounge-10');
  });
});
