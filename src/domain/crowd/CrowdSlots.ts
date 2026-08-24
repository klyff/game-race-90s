import { add, distance, length, normalize, scale } from '../math/Vec2.ts';
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

/** Original start-line pack. Live races spawn this times `CROWD_COUNT_SCALE`. */
export const CROWD_BASE_COUNT = 26;
export const CROWD_COUNT_SCALE = 6;
export const CROWD_COUNT = CROWD_BASE_COUNT * CROWD_COUNT_SCALE;
/** Denser pack on both shoulders of start/finish (2× the original 26). */
export const CROWD_START_COUNT = CROWD_BASE_COUNT * 2;
export const CROWD_LAP_COUNT = CROWD_COUNT - CROWD_START_COUNT;
export const CROWD_FLASHER_EVERY = 26;
/** How close the leader must be (arc units) before cheer / flasher swap frame. */
export const CROWD_REACT_RADIUS = 42;
/** Person hit circle. Cars on a wall scrape can clip the inner row. */
export const CROWD_HIT_RADIUS = 1.05;
/** First person sits this far before the line; last sits this far after. */
const START_SPAN_BEFORE = 12;
const START_SPAN_AFTER = 88;
/** Inner row: just inside the wall, on the dirt, so a scrape can hit them. */
const INNER_INSET = 0.55;
/** Outer row: past the wall, visual density the cars cannot reach. */
const OUTER_PAD = 2.1;

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

export interface CrowdCarTarget {
  readonly position: Vec2;
  readonly radius: number;
  readonly velocity: Vec2;
  readonly airborne: boolean;
}

export interface CrowdHit {
  readonly slotIndex: number;
  readonly position: Vec2;
  readonly throwVelocity: Vec2;
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

function kindAt(index: number, flasherOffset: number): CrowdKind {
  if (index % CROWD_FLASHER_EVERY === flasherOffset) {
    return CROWD_KIND.FLASHER;
  }
  return CYCLE[index % CYCLE.length]!;
}

function crowdLateral(index: number, wall: number): number {
  const side = index % 2 === 0 ? 1 : -1;
  const stagger = ((index * 5) % 7) * 0.22;
  const inner = index % 3 !== 2;
  const reach = inner ? wall - INNER_INSET - stagger : wall + OUTER_PAD + stagger;
  return side * reach;
}

function inStartSpan(distance: number, start: number, length: number): boolean {
  const along = wrapDistance(distance - start, length);
  return along <= START_SPAN_AFTER || along >= length - START_SPAN_BEFORE;
}

/**
 * ~156 adults: a dense pack on both shoulders of start/finish, the rest
 * ringing the lap. Always face the camera at runtime. One slot in 26 is
 * the flasher; the rest cycle rock / punk / piriguete / cheer.
 */
export function pickTrackCrowd(
  track: TrackDefinition,
  seed: number,
  trackLength: number,
): readonly CrowdSlot[] {
  const start = track.startLineDistance;
  const wall = trackFullHalfWidth(track);
  const length = Number.isFinite(trackLength) && trackLength > 0 ? trackLength : 1;
  const flasherOffset = (Number.isFinite(seed) ? seed >>> 0 : 1) % CROWD_FLASHER_EVERY;
  const span = START_SPAN_BEFORE + START_SPAN_AFTER;
  const slots: CrowdSlot[] = [];

  for (let index = 0; index < CROWD_START_COUNT; index += 1) {
    const t = CROWD_START_COUNT <= 1 ? 0 : index / (CROWD_START_COUNT - 1);
    const distance = start - START_SPAN_BEFORE + t * span;
    slots.push({
      kind: kindAt(index, flasherOffset),
      distance,
      lateral: crowdLateral(index, wall),
    });
  }

  const usable = length - span;
  const lapBudget = Math.max(0, CROWD_COUNT - slots.length);
  if (lapBudget === 0 || usable <= 8) {
    return slots;
  }

  for (let i = 0; i < lapBudget; i += 1) {
    const along = START_SPAN_AFTER + 4 + ((i + 0.5) / lapBudget) * (usable - 8);
    const distance = wrapDistance(start + along, length);
    const index = slots.length;
    slots.push({
      kind: kindAt(index, flasherOffset),
      distance,
      lateral: crowdLateral(index + 1, wall),
    });
  }

  return slots;
}

/** @deprecated Use `pickTrackCrowd` — kept for call-site greps during the rename. */
export function pickStartCrowd(
  track: TrackDefinition,
  seed: number,
  trackLength = 0,
): readonly CrowdSlot[] {
  return pickTrackCrowd(track, seed, trackLength);
}

export function crowdWorldPosition(spline: TrackSpline, slot: CrowdSlot): Vec2 {
  const frame = spline.frameAt(slot.distance);
  return add(frame.position, scale(frame.normal, slot.lateral));
}

/**
 * Indices of standing people a grounded car just overlapped. Throw velocity
 * follows the car so the body flies in the direction of the hit.
 */
export function crowdHitsFromCars(
  worldPositions: readonly Vec2[],
  dead: ReadonlySet<number>,
  cars: readonly CrowdCarTarget[],
): readonly CrowdHit[] {
  const hits: CrowdHit[] = [];
  for (let index = 0; index < worldPositions.length; index += 1) {
    if (dead.has(index)) {
      continue;
    }
    const position = worldPositions[index];
    if (position === undefined) {
      continue;
    }
    for (const car of cars) {
      if (car.airborne) {
        continue;
      }
      const reach = car.radius + CROWD_HIT_RADIUS;
      if (distance(position, car.position) > reach) {
        continue;
      }
      const speed = length(car.velocity);
      const away = add(position, scale(car.position, -1));
      const throwVelocity = speed > 1 ? car.velocity : scale(normalize(away), 8);
      hits.push({ slotIndex: index, position, throwVelocity });
      break;
    }
  }
  return hits;
}
