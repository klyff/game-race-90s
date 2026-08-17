/**
 * Post-race pub interiors. Results picks one at random and paints the
 * podium, ranking and purse on top of it.
 */

export const PUB_BACKGROUND_DIRECTORY = 'assets/ui';

export interface PubBackground {
  readonly id: string;
  readonly file: string;
}

export const PUB_BACKGROUNDS: readonly PubBackground[] = [
  { id: 'pub-1', file: 'pub_1.png' },
  { id: 'pub-2', file: 'pub_2.png' },
  { id: 'pub-3', file: 'pub_3.png' },
  { id: 'pub-4', file: 'pub_4.png' },
  { id: 'pub-5', file: 'pub_5.png' },
  { id: 'pub-6', file: 'pub_6.png' },
];

export function pubBackgroundUrl(pub: PubBackground): string {
  return `${PUB_BACKGROUND_DIRECTORY}/${pub.file}`;
}

export function pubBackgroundKey(pub: PubBackground): string {
  return `pub:${pub.id}`;
}

export function pickPubBackground(
  pubs: readonly PubBackground[],
  random: () => number = Math.random,
): PubBackground | undefined {
  if (pubs.length === 0) {
    return undefined;
  }
  return pubs[Math.floor(random() * pubs.length)];
}
