/**
 * DC-style origin pages: how illegal street races spread before the ten worlds.
 * Faces reuse splash cards already on disk — no new 1700px art.
 */

export interface OriginPanel {
  readonly kicker: string;
  readonly city: string;
  readonly year: string;
  readonly caption: string;
  readonly cardIndex: number;
}

export const ORIGIN_PANELS: readonly OriginPanel[] = [
  {
    kicker: 'CHAPTER ONE',
    city: 'TOKYO',
    year: '1991',
    caption: 'Midnight. Neon alleys. The first illegal runs were a dare, then a religion.',
    cardIndex: 0,
  },
  {
    kicker: 'CHAPTER TWO',
    city: 'LOS ANGELES',
    year: '1993',
    caption: 'Canyons, cop lights, engines as church. The west coast wrote the rules in rubber.',
    cardIndex: 1,
  },
  {
    kicker: 'CHAPTER THREE',
    city: 'RIO',
    year: '1994',
    caption: 'Rachas on the coast. Crowds on the overpass. The flag dropped and the city held its breath.',
    cardIndex: 2,
  },
  {
    kicker: 'CHAPTER FOUR',
    city: 'EVERYWHERE',
    year: 'NOW',
    caption: 'Ten worlds. One circuit. The underground went planetary — and it still starts with a name on a card.',
    cardIndex: 3,
  },
];
