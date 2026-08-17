/**
 * Character sheet for one rival. Always an odd count of traits (7), each 1..10.
 * Every decision is a weighted sum of the traits that apply to that maneuver.
 *
 * Two motives sit under every call — they are not traits, they are why the
 * agent races at all:
 *   1. I have to win.
 *   2. I cannot let anyone else win.
 * The agent does not know who the human is. Contest is against the field.
 */

import type { TrackSpline } from '../track/TrackSpline.ts';

export const RIVAL_TRAIT = {
  /** Ousadia. Late brake, commit to the curve, go for the gap. */
  DARING: 'daring',
  /** Precisão. Use the known path as entry / exit marks. */
  PRECISION: 'precision',
  /** Ir pra cima. Close the car ahead. */
  ATTACK: 'attack',
  /** Segurar posição. Cover the car behind. */
  BLOCK: 'block',
  /** Sangue-frio. Hold the plan when the pack squeezes. */
  COMPOSURE: 'composure',
  /** Eu tenho que vencer. */
  AMBITION: 'ambition',
  /** Não deixar ninguém vencer — o pelotão inteiro, não o player. */
  CONTEST: 'contest',
} as const;

export const RIVAL_TRAIT_IDS = [
  RIVAL_TRAIT.DARING,
  RIVAL_TRAIT.PRECISION,
  RIVAL_TRAIT.ATTACK,
  RIVAL_TRAIT.BLOCK,
  RIVAL_TRAIT.COMPOSURE,
  RIVAL_TRAIT.AMBITION,
  RIVAL_TRAIT.CONTEST,
] as const;

export type RivalTraitId = (typeof RIVAL_TRAIT_IDS)[number];
export type RivalTraits = { readonly [K in RivalTraitId]: number };

const TRAIT_SALTS: Record<RivalTraitId, number> = {
  daring: 0x51ed,
  precision: 0xa11e,
  attack: 0x0ffe,
  block: 0xb10c,
  composure: 0xc001,
  ambition: 0xa1b1,
  contest: 0xc07e,
};

const STRAIGHT_CURVATURE = 0.006;
const FAST_STRAIGHT = 0.6;

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function hash32(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** One point from 1 to 10, mixed so the seven scores are not the same byte. */
function traitScore(hash: number, salt: number): number {
  return 1 + ((Math.imul(hash ^ salt, 0x9e3779b1) >>> 24) % 10);
}

export function traitsFor(seed: string): RivalTraits {
  const hash = hash32(seed);
  return {
    daring: traitScore(hash, TRAIT_SALTS.daring),
    precision: traitScore(hash, TRAIT_SALTS.precision),
    attack: traitScore(hash, TRAIT_SALTS.attack),
    block: traitScore(hash, TRAIT_SALTS.block),
    composure: traitScore(hash, TRAIT_SALTS.composure),
    ambition: traitScore(hash, TRAIT_SALTS.ambition),
    contest: traitScore(hash, TRAIT_SALTS.contest),
  };
}

/** 0..1 mean of the named traits. */
export function traitWeight(traits: RivalTraits, ids: readonly RivalTraitId[]): number {
  if (ids.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const id of ids) {
    sum += traits[id];
  }
  return sum / (ids.length * 10);
}

/**
 * On a fast straight, use the known path as the entry/exit of the next curve
 * to decide when to lift and when to stay in it. That maneuver is daring —
 * an 8/10 ousado takes it; a 3/10 does not.
 */
export function commitCornerPlan(traits: RivalTraits, speedRatio: number, onStraight: boolean): boolean {
  if (!onStraight || speedRatio < FAST_STRAIGHT) {
    return false;
  }
  const daring = traits.daring / 10;
  const precision = traits.precision / 10;
  const motive = traitWeight(traits, [RIVAL_TRAIT.AMBITION, RIVAL_TRAIT.CONTEST]);
  return daring * 0.55 + precision * 0.2 + motive * 0.25 >= 0.55;
}

/**
 * How hard to go for the car ahead, right now. Daring is applied at the
 * instant of the dive, not as a permanent mood.
 */
export function goForPass(traits: RivalTraits, gap: number): number {
  const close = gap < 18 ? 1 : gap < 36 ? 0.55 : 0.2;
  const daringNow = traits.daring / 10;
  const attack = traits.attack / 10;
  const motive = traitWeight(traits, [RIVAL_TRAIT.AMBITION, RIVAL_TRAIT.CONTEST]);
  const cool = traits.composure / 10;
  return clamp(attack * 0.28 + daringNow * 0.34 + motive * 0.22 + cool * 0.06 + close * 0.1, 0, 1);
}

/** How hard to cover the car behind. Same field — no player flag. */
export function coverBehind(traits: RivalTraits, gap: number): number {
  const close = gap < 16 ? 1 : gap < 28 ? 0.5 : 0.15;
  return clamp(traitWeight(traits, [RIVAL_TRAIT.BLOCK, RIVAL_TRAIT.CONTEST]) * 0.75 + close * 0.25, 0, 1);
}

export interface CornerMarks {
  readonly entry: number;
  readonly exit: number;
}

/** Next curve ahead, as distances along the lap from `distance`. */
export function nextCornerMarks(spline: TrackSpline, distance: number): CornerMarks | null {
  const step = 8;
  const horizon = 180;
  let entry: number | null = null;
  for (let ahead = 12; ahead < horizon; ahead += step) {
    const curve = Math.abs(spline.curvatureAt(spline.wrap(distance + ahead), 25));
    if (entry === null && curve > STRAIGHT_CURVATURE) {
      entry = ahead;
    } else if (entry !== null && curve < STRAIGHT_CURVATURE * 0.65) {
      return { entry, exit: ahead };
    }
  }
  return entry === null ? null : { entry, exit: horizon };
}

export function isStraight(spline: TrackSpline, distance: number): boolean {
  return Math.abs(spline.curvatureAt(distance, 25)) < STRAIGHT_CURVATURE;
}

/**
 * Aim distance when the corner plan is on: daring slides the mark from
 * entry (timid) toward exit (8/10 ousado).
 */
export function cornerCommitLookAhead(traits: RivalTraits, marks: CornerMarks): number {
  const daring = traits.daring / 10;
  const raw = marks.entry + (marks.exit - marks.entry) * daring;
  return clamp(raw, 14, 56);
}
