/**
 * Destination tickets after a planet unlock. Results routes here only when
 * the player just took 1st on a world's last track.
 */

import { campaignSlotForTrackId } from '../tracks/campaign.ts';
import { PLANETS, TRACKS_PER_PLANET } from '../tracks/planets.ts';

export const WORLD_PASS_DIRECTORY = 'assets/ui/aftertrack';

export type WorldPassKind = 'next-world' | 'championship';

export interface WorldPassBackground {
  readonly id: string;
  readonly file: string;
  readonly kind: WorldPassKind;
  readonly headline: string;
  readonly title: string;
}

const PASSES: readonly WorldPassBackground[] = [
  {
    id: 'chrome-verge',
    file: 'pass-chrome-verge.png',
    kind: 'next-world',
    headline: 'YOU GOT A PASS',
    title: 'CHROME VERGE',
  },
  {
    id: 'bogmire-deep',
    file: 'pass-bogmire-deep.png',
    kind: 'next-world',
    headline: 'YOU GOT A PASS',
    title: 'BOGMIRE DEEP',
  },
  {
    id: 'cryo-hollow',
    file: 'pass-cryo-hollow.png',
    kind: 'next-world',
    headline: 'YOU GOT A PASS',
    title: 'CRYO HOLLOW',
  },
  {
    id: 'ferro-rust',
    file: 'pass-ferro-rust.png',
    kind: 'next-world',
    headline: 'YOU GOT A PASS',
    title: 'FERRO RUST',
  },
  {
    id: 'vulkanis',
    file: 'pass-vulkanis.png',
    kind: 'next-world',
    headline: 'YOU GOT A PASS',
    title: 'VULKANIS',
  },
  {
    id: 'neon-kasbah',
    file: 'pass-neon-kasbah.png',
    kind: 'next-world',
    headline: 'YOU GOT A PASS',
    title: 'NEON KASBAH',
  },
  {
    id: 'ash-reach',
    file: 'pass-ash-reach.png',
    kind: 'next-world',
    headline: 'YOU GOT A PASS',
    title: 'ASH REACH',
  },
  {
    id: 'voidport',
    file: 'pass-voidport.png',
    kind: 'next-world',
    headline: 'YOU GOT A PASS',
    title: 'VOIDPORT',
  },
  {
    id: 'verdant-fault',
    file: 'pass-verdant-fault.png',
    kind: 'next-world',
    headline: 'YOU GOT A PASS',
    title: 'VERDANT FAULT',
  },
  {
    id: 'championship',
    file: 'pass-championship.png',
    kind: 'championship',
    headline: 'YOU FINISHED THE CIRCUIT',
    title: 'CHAMPION',
  },
];

export const WORLD_PASS_BACKGROUNDS: readonly WorldPassBackground[] = PASSES;

export function worldPassUrl(pass: WorldPassBackground): string {
  return `${WORLD_PASS_DIRECTORY}/${pass.file}`;
}

export function worldPassKey(pass: WorldPassBackground): string {
  return `world-pass:${pass.id}`;
}

export function worldPassById(id: string): WorldPassBackground | undefined {
  return PASSES.find(pass => pass.id === id);
}

/**
 * Ticket for this finish, or undefined when the AfterTrack should go
 * straight to the garage. `wonTrackIds` is the set from BEFORE this race
 * was recorded, so a re-win of an already-opened last track stays quiet.
 */
export function worldPassForFinish(
  trackId: string,
  playerPosition: number,
  wonTrackIds: readonly string[],
): WorldPassBackground | undefined {
  if (playerPosition !== 1) {
    return undefined;
  }
  const slot = campaignSlotForTrackId(trackId);
  if (slot === null || slot.trackN !== TRACKS_PER_PLANET) {
    return undefined;
  }
  if (wonTrackIds.includes(trackId)) {
    return undefined;
  }
  const next = PLANETS.find(planet => planet.index === slot.planetIndex + 1);
  if (next !== undefined) {
    return worldPassById(next.id);
  }
  return worldPassById('championship');
}
