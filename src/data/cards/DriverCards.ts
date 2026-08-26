/**
 * Face cards for championship pilots. Filenames match disk exactly —
 * `Aline.png` is capitalised; a mismatch is a silent missing texture.
 *
 * Character select uses these faces. Jokers stay world-10 only.
 */

export const DRIVER_CARD_DIRECTORY = 'assets/cards';

export interface DriverCard {
  readonly name: string;
  readonly key: string;
  readonly file: string;
}

function card(name: string, file: string): DriverCard {
  return { name, key: `driver-card:${name}`, file };
}

/** Regulars (KLYFF first on the face grid) and world-10 jokers. */
export const DRIVER_CARDS: readonly DriverCard[] = [
  card('ALINE', 'Aline.png'),
  card('ENZO', 'enzo.png'),
  card('CAROL', 'carol.png'),
  card('DAVE', 'dave.png'),
  card('RAZOR', 'razor.png'),
  card('FLUFE', 'flufe.png'),
  card('DIEGO', 'diego.png'),
  card('LUNA', 'luna.png'),
  card('BLAZE', 'blaze.png'),
  card('KIRA', 'kira.png'),
  card('SNAKE', 'snake.png'),
  card('RIO', 'rio.png'),
  card('JETT', 'jett.png'),
  card('NOVA', 'nova.png'),
  card('CRUZ', 'cruz.png'),
  card('ASH', 'ash.png'),
  card('ZARA', 'zara.png'),
  card('VINCE', 'vince.png'),
  card('RUBY', 'ruby.png'),
  card('HEX', 'hex.png'),
  card('VIKTOR', 'viktor.png'),
  card('SEAMUS', 'seamus.png'),
  card('NEGAO', 'negao.png'),
  card('LUCA', 'luca.png'),
  card('ZOR9', 'zor9.png'),
  card('KLYFF', 'klyff.png'),
];

export function driverCardForName(name: string): DriverCard | undefined {
  const needle = name.trim().toUpperCase();
  return DRIVER_CARDS.find(entry => entry.name === needle);
}

export function driverCardKey(name: string): string {
  return `driver-card:${name.trim().toUpperCase()}`;
}

export function driverCardUrl(entry: DriverCard): string {
  return `${DRIVER_CARD_DIRECTORY}/${entry.file}`;
}
