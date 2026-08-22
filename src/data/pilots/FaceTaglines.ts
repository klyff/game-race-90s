/**
 * One-line flavor under the body on CHOOSE YOUR FACE.
 * First punch of each bio — not the full card copy.
 */

const LINES: Readonly<Record<string, string>> = {
  KLYFF: 'He built this circus and he still shows up to race it.',
  ALINE: 'Owner of the RunnersCity beauty empire.',
  ENZO: 'The prodigy. Nobody can hold him.',
  FLUFE: 'Secret Keeper of every side in RunnersCity.',
  DAVE: 'A lightning-bolt tribute to David Bowie.',
  RAZOR: 'South Central punk who turned a switchblade into a wheel.',
  NIKKI: 'Fire-haired rock girl with a wild laugh.',
  DIEGO: 'Biker chaplain of the Eastside.',
  LUNA: 'The tattooer who inks half the grid.',
  BLAZE: 'Rock-and-roll burnout with a perfect mullet.',
  KIRA: 'Japanese punk. She is snarling and loving it.',
  SNAKE: 'West Coast gangster. Cool half-lidded stare.',
  RIO: 'Afro-Brazilian street queen.',
  JETT: 'The skinny one. Tongue out, both hands throwing horns.',
  NOVA: 'Androgynous club kid with one gold canine.',
  CRUZ: 'Chicano old-school. Proud chin-up grin.',
  ASH: 'Punk with a crooked smile and a rusted rally car.',
  ZARA: 'Nigerian-British glam metal. Lion laugh.',
  VINCE: 'The fat one. He is roaring with laughter.',
  RUBY: 'Indigenous American rockabilly. Wink and a smirk.',
  HEX: 'Goth racer. Deadpan almost-smile.',
};

export function faceTagline(name: string): string {
  return LINES[name.trim().toUpperCase()] ?? '';
}
