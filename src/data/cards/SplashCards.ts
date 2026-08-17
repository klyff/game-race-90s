/**
 * The four creator-family cards that play on the splash attract.
 *
 * Filenames match the files on disk exactly — `Aline.png` is capitalised,
 * the others are not. A mismatch here is a silent missing texture on a
 * case-sensitive host (Linux / the deploy), not a TypeScript error.
 */
export const SPLASH_CARD_DIRECTORY = 'assets/cards';

export interface SplashCard {
  readonly id: 'aline' | 'enzo' | 'emma' | 'klyff';
  readonly key: string;
  readonly file: string;
}

/** Showcase order, then the same order around the screen: TL, TR, BL, BR. */
export const SPLASH_CARDS: readonly SplashCard[] = [
  { id: 'aline', key: 'card-aline', file: 'Aline.png' },
  { id: 'enzo', key: 'card-enzo', file: 'enzo.png' },
  { id: 'emma', key: 'card-emma', file: 'emma.png' },
  { id: 'klyff', key: 'card-klyff', file: 'klyff.png' },
];

export function splashCardUrl(card: SplashCard): string {
  return `${SPLASH_CARD_DIRECTORY}/${card.file}`;
}
