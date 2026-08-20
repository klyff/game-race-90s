/**
 * AfterTrack interiors (the old pubs). Results picks one at random and paints
 * the podium, ranking and purse on top of it.
 */

export const PUB_BACKGROUND_DIRECTORY = 'assets/ui/aftertrack';

export interface PubBackground {
  readonly id: string;
  readonly file: string;
}

export const PUB_BACKGROUNDS: readonly PubBackground[] = [
  { id: 'lounge-01', file: 'lounge-01.png' },
  { id: 'lounge-02', file: 'lounge-02.png' },
  { id: 'lounge-03', file: 'lounge-03.png' },
  { id: 'lounge-04', file: 'lounge-04.png' },
  { id: 'lounge-05', file: 'lounge-05.png' },
  { id: 'lounge-06', file: 'lounge-06.png' },
  { id: 'lounge-07', file: 'lounge-07.png' },
  { id: 'lounge-08', file: 'lounge-08.png' },
  { id: 'lounge-09', file: 'lounge-09.png' },
  { id: 'lounge-10', file: 'lounge-10.png' },
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
