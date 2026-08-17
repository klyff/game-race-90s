/**
 * Per-rival racing brain. One shared PaceDriver makes a swarm; Atari-era racers
 * already split the field with a register per car (skill, line, risk).
 *
 * Each agent has two things:
 *  1. Path knowledge — how it thinks the finish is reached (A*, A*+Euclidean,
 *     a line that is not the shortest).
 *  2. A risk register — the extra walk of a better curve is worth it only when
 *     this car's grip on this surface still carries more speed. If the account
 *     closes positive, take the curve; otherwise stay on the short line.
 */

import type { LineCandidate } from '../race/RacingLine.ts';
import type { PaceDriverOptions } from './PaceDriver.ts';
import { traitsFor, type RivalTraits } from './RivalTraits.ts';

export const PATH_KINDS = [
  'astar',
  'astar-euclidean',
  'late-apex',
  'early-apex',
  'wide-line',
  'centreline',
] as const;

export type PathKind = (typeof PATH_KINDS)[number];

export const PATH_CANDIDATE: Record<PathKind, string> = {
  astar: 'classic',
  'astar-euclidean': 'centreline',
  'late-apex': 'late-apex',
  'early-apex': 'early-apex',
  'wide-line': 'drift-entry',
  centreline: 'centreline',
};

export interface RivalAgent {
  readonly seed: string;
  readonly pathKind: PathKind;
  readonly traits: RivalTraits;
  /** 0..255. Higher = more willing to walk extra for a faster curve. */
  readonly riskRegister: number;
  /** Extra lateral offset, world units. Stops two agents stacking on one pixel. */
  readonly laneRegister: number;
  readonly aggression: number;
}

const MID_GRIP = 30;

function hash32(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Deterministic brain from a pilot name or `carId#slot`. Same seed → same agent. */
export function rivalAgentFor(seed: string): RivalAgent {
  const hash = hash32(seed);
  const pathKind = PATH_KINDS[hash % PATH_KINDS.length] ?? 'centreline';
  const traits = traitsFor(seed);
  const riskRegister = (hash >>> 8) & 0xff;
  const laneBits = (hash >>> 16) & 0xff;
  const laneRegister = (laneBits / 255) * 14 - 7;
  const aggression = 0.38 + ((hash >>> 24) / 255) * 0.55;
  return { seed, pathKind, traits, riskRegister, laneRegister, aggression };
}

export function meanAbsOffset(offsets: readonly number[]): number {
  if (offsets.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const offset of offsets) {
    sum += Math.abs(offset);
  }
  return sum / offsets.length;
}

/**
 * Extra walk vs speed kept. High grip on a tight planet pays for the racing
 * line; low grip on ice pays for the wide line so the car does not slide.
 */
export function lineAccount(
  extraWalk: number,
  grip: number,
  surfaceGrip: number,
  cornerTightness: number,
  prefersWide: boolean,
): number {
  const gripRatio = clamp((grip * surfaceGrip) / MID_GRIP, 0, 1.4);
  const speedTerm = prefersWide
    ? (1.2 - gripRatio) * (0.45 + cornerTightness)
    : gripRatio * (0.45 + cornerTightness);
  return speedTerm - Math.max(0, extraWalk) * 0.07;
}

export function chooseLineByAccount(
  agent: RivalAgent,
  candidates: readonly LineCandidate[],
  grip: number,
  surfaceGrip: number,
  cornerTightness: number,
): LineCandidate {
  const fallback: LineCandidate = candidates[0] ?? { name: 'centreline', offsets: [] };
  const shortestWalk = candidates.reduce(
    (best, line) => Math.min(best, meanAbsOffset(line.offsets)),
    Number.POSITIVE_INFINITY,
  );
  const knownName = PATH_CANDIDATE[agent.pathKind];
  const preferred = candidates.find(line => line.name === knownName) ?? fallback;
  const risk = agent.riskRegister / 255;
  const scoreOf = (line: LineCandidate): number => {
    const walk = meanAbsOffset(line.offsets);
    const prefersWide = line.name === 'drift-entry' || line.name === 'late-apex';
    return lineAccount(walk - shortestWalk, grip, surfaceGrip, cornerTightness, prefersWide);
  };
  const knownScore = scoreOf(preferred);
  if (knownScore + risk * 0.2 >= 0) {
    return preferred;
  }
  let best = preferred;
  let bestScore = knownScore;
  for (const line of candidates) {
    const account = scoreOf(line);
    if (account > bestScore) {
      best = line;
      bestScore = account;
    }
  }
  return best;
}

/** Look-ahead / twitch from the agent's path knowledge. Euclidean aims further. */
export function driveOptionsFor(agent: RivalAgent, base: PaceDriverOptions): PaceDriverOptions {
  const euclid = agent.pathKind === 'astar-euclidean';
  const timid = agent.pathKind === 'centreline';
  return {
    ...base,
    lookAheadBase: base.lookAheadBase * (euclid ? 1.6 : timid ? 0.85 : 1),
    lookAheadScaleFactor: base.lookAheadScaleFactor * (euclid ? 1.35 : timid ? 0.8 : 1),
    fullLockBearing: base.fullLockBearing * (0.82 + (1 - agent.aggression) * 0.35),
  };
}
