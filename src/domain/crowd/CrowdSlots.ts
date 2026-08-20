import { add, scale } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';
import { trackFullHalfWidth, type TrackDefinition } from '../track/TrackDefinition.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';

export const CROWD_KIND = {
  ROCK: 'rock',
  PUNK: 'punk',
  PIRIGUETE: 'piriguete',
  CHEER: 'cheer',
  FLASHER: 'flasher',
} as const;

export type CrowdKind = (typeof CROWD_KIND)[keyof typeof CROWD_KIND];

export const CROWD_COUNT = 26;
export const CROWD_FLASHER_EVERY = 26;
/** How close the leader must be (arc units) before cheer / flasher swap frame. */
export const CROWD_REACT_RADIUS = 42;
/** First person sits this far before the line; last sits this far after. */
const START_SPAN_BEFORE = 8;
const START_SPAN_AFTER = 72;
/** Extra offset past the wall so feet sit on the dirt, not the ribbon. */
const OUTSIDE_WALL = 2.4;

const CYCLE: readonly CrowdKind[] = [
  CROWD_KIND.ROCK,
  CROWD_KIND.PUNK,
  CROWD_KIND.PIRIGUETE,
  CROWD_KIND.CHEER,
];

export interface CrowdSlot {
  readonly kind: CrowdKind;
  readonly distance: number;
  readonly lateral: number;
}

function hash32(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Same planet + same track always yields the same start crowd. */
export function crowdSeed(planetSeed: number, trackId: string): number {
  const base = Number.isFinite(planetSeed) ? planetSeed >>> 0 : 1;
  return (base ^ hash32(`crowd:${trackId}`)) >>> 0;
}

function wrapDistance(distance: number, length: number): number {
  if (!(length > 0)) {
    return 0;
  }
  const wrapped = distance % length;
  return wrapped < 0 ? wrapped + length : wrapped;
}

export function arcSeparation(a: number, b: number, length: number): number {
  const delta = wrapDistance(a - b, length);
  return Math.min(delta, length - delta);
}

export function crowdIsReacting(
  slot: CrowdSlot,
  leaderDistance: number,
  trackLength: number,
): boolean {
  if (slot.kind !== CROWD_KIND.CHEER && slot.kind !== CROWD_KIND.FLASHER) {
    return false;
  }
  return arcSeparation(slot.distance, leaderDistance, trackLength) <= CROWD_REACT_RADIUS;
}

/**
 * ~26 adults on both shoulders of the start. Always face the camera at runtime.
 * One slot in 26 is the flasher; the rest cycle rock / punk / piriguete / cheer.
 */
export function pickStartCrowd(track: TrackDefinition, seed: number): readonly CrowdSlot[] {
  const start = track.startLineDistance;
  const wall = trackFullHalfWidth(track) + OUTSIDE_WALL;
  const flasherIndex = (Number.isFinite(seed) ? seed >>> 0 : 1) % CROWD_COUNT;
  const span = START_SPAN_BEFORE + START_SPAN_AFTER;
  const slots: CrowdSlot[] = [];
  for (let index = 0; index < CROWD_COUNT; index += 1) {
    const t = index / (CROWD_COUNT - 1);
    const distance = start - START_SPAN_BEFORE + t * span;
    const side = index % 2 === 0 ? 1 : -1;
    const stagger = ((index * 3) % 5) * 0.35;
    slots.push({
      kind: index === flasherIndex ? CROWD_KIND.FLASHER : CYCLE[index % CYCLE.length]!,
      distance,
      lateral: side * (wall + stagger),
    });
  }
  return slots;
}

export function crowdWorldPosition(spline: TrackSpline, slot: CrowdSlot): Vec2 {
  const frame = spline.frameAt(slot.distance);
  return add(frame.position, scale(frame.normal, slot.lateral));
}
