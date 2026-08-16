/**
 * Offline track generator (T-048).
 *
 *   npm run gen:tracks
 *
 * Emits every planet's tracks as a single generated data module
 * (`src/data/tracks/generated-tracks.ts`) that the registry re-exports. Planet 1
 * track 1 stays the hand-authored `thunder-basin`; everything else is procedural.
 *
 * For each track it searches a handful of seeds and keeps the geometry whose
 * FASTEST car (a clean centreline lap, surfaceGrip applied) matches the planet's
 * featured `bestCarId` — the lever that makes "one car is best on this planet"
 * true rather than aspirational. It prints a report of matches vs mismatches.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseCarSetManifest } from '../../src/data/cars/CarManifest.ts';
import type { CarSetManifest } from '../../src/data/cars/CarManifest.ts';
import {
  ANCHOR_TRACK_ID,
  PLANETS,
  TRACKS_PER_PLANET,
  planetTrackId,
  planetTrackName,
} from '../../src/data/tracks/planets.ts';
import type { PlanetDefinition } from '../../src/data/tracks/planets.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import type { TrackDefinition } from '../../src/domain/track/TrackDefinition.ts';
import type { Vec2 } from '../../src/domain/math/Vec2.ts';
import { simulateLap } from '../shared/lapSim.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const carsJsonPath = join(root, 'public', 'assets', 'cars', 'cars.json');
const outPath = join(root, 'src', 'data', 'tracks', 'generated-tracks.ts');

/** Seeds tried per track before settling for the best-effort geometry. */
const SEEDS_PER_TRACK = 16;
/** A lap this many steps long is treated as a did-not-finish for selection. */
const EVAL_STEP_BUDGET = 6000;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A closed, jittered ellipse whose corner count/tightness and straight follow the planet bias. */
function generateGeometry(planet: PlanetDefinition, seed: number): Vec2[] {
  const rng = mulberry32(seed);
  const t = planet.terrain;
  const pointCount = 15 + Math.round(t.cornerTightness * 5);
  const baseRadius = 170 + t.straightBias * 140;
  const elongation = 1 + t.straightBias * 0.9;
  const squash = 1 - t.straightBias * 0.22;
  const lobes = 2 + Math.round(t.cornerTightness * 4);
  const amplitude = 0.1 + t.cornerTightness * 0.32;
  const phase = rng() * Math.PI * 2;
  const phase2 = rng() * Math.PI * 2;

  const points: Vec2[] = [];
  for (let i = 0; i < pointCount; i += 1) {
    const angle = (i / pointCount) * Math.PI * 2;
    // Flatten the +X apex into a clean main straight where the start line sits.
    const nearApex = Math.pow(Math.max(0, Math.cos(angle)), 4);
    const straightMask = 1 - nearApex * (0.55 + 0.4 * t.straightBias);
    const wobble = Math.sin(lobes * angle + phase) + 0.45 * Math.sin(2 * lobes * angle + phase2);
    const jitter = (rng() - 0.5) * 0.1;
    const radius = baseRadius * (1 + amplitude * straightMask * wobble + jitter);
    const x = Math.cos(angle) * radius * elongation;
    const y = Math.sin(angle) * radius * squash;
    points.push({ x: Math.round(x), y: Math.round(y) });
  }
  return points;
}

function buildTrack(planet: PlanetDefinition, n: number, controlPoints: Vec2[]): TrackDefinition {
  return {
    id: planetTrackId(planet, n),
    displayName: planetTrackName(planet, n),
    controlPoints,
    halfWidth: planet.terrain.halfWidth,
    shoulderWidth: 9,
    laps: 3,
    checkpointCount: 8,
    startLineDistance: 0,
    gridLateralOffsets: [-9, 9],
    gridRowSpacing: 11,
    surfaceGrip: planet.terrain.surfaceGrip,
  };
}

interface Evaluation {
  readonly fastestCarId: string | null;
  readonly fastestSeconds: number;
  readonly completed: number;
  readonly total: number;
  readonly bestCarSeconds: number;
}

function evaluate(manifest: CarSetManifest, planet: PlanetDefinition, track: TrackDefinition): Evaluation {
  const spline = new TrackSpline(track.controlPoints);
  let fastestCarId: string | null = null;
  let fastestSeconds = Number.POSITIVE_INFINITY;
  let bestCarSeconds = Number.POSITIVE_INFINITY;
  let completed = 0;

  for (const car of manifest.cars) {
    const result = simulateLap(car.stats, track, spline, undefined, EVAL_STEP_BUDGET);
    if (!result.completed) {
      continue;
    }
    completed += 1;
    if (car.id === planet.bestCarId) {
      bestCarSeconds = result.lapSeconds;
    }
    if (result.lapSeconds < fastestSeconds) {
      fastestSeconds = result.lapSeconds;
      fastestCarId = car.id;
    }
  }

  return { fastestCarId, fastestSeconds, completed, total: manifest.cars.length, bestCarSeconds };
}

interface Chosen {
  readonly track: TrackDefinition;
  readonly evaluation: Evaluation;
  readonly seed: number;
}

/** Rank a candidate: match + all-complete first, then smallest gap to the featured car. */
function chooseTrack(manifest: CarSetManifest, planet: PlanetDefinition, n: number): Chosen {
  const baseSeed = planet.seed * 100 + n * 13;
  let best: Chosen | null = null;
  let bestScore = -Infinity;

  for (let k = 0; k < SEEDS_PER_TRACK; k += 1) {
    const seed = baseSeed + k * 2654435761;
    const track = buildTrack(planet, n, generateGeometry(planet, seed));
    const evaluation = evaluate(manifest, planet, track);
    if (evaluation.fastestCarId === null) {
      continue;
    }
    const match = evaluation.fastestCarId === planet.bestCarId;
    const allComplete = evaluation.completed === evaluation.total;
    const gap = Number.isFinite(evaluation.bestCarSeconds)
      ? evaluation.bestCarSeconds - evaluation.fastestSeconds
      : 999;
    // Higher is better: matching the featured car dominates, then a full grid
    // finishing, then a small gap between the featured car and the actual fastest.
    const score = (match ? 1000 : 0) + (allComplete ? 100 : 0) - gap;
    if (score > bestScore) {
      bestScore = score;
      best = { track, evaluation, seed };
    }
  }

  if (best === null) {
    // Nothing produced a finisher; fall back to the base seed so output is deterministic.
    const track = buildTrack(planet, n, generateGeometry(planet, baseSeed));
    best = { track, evaluation: evaluate(manifest, planet, track), seed: baseSeed };
  }
  return best;
}

function serialize(tracks: readonly TrackDefinition[]): string {
  const body = tracks
    .map(track => {
      const points = track.controlPoints
        .map(p => `    { x: ${p.x}, y: ${p.y} },`)
        .join('\n');
      return `  {
    id: ${JSON.stringify(track.id)},
    displayName: ${JSON.stringify(track.displayName)},
    controlPoints: [
${points}
    ],
    halfWidth: ${track.halfWidth},
    shoulderWidth: ${track.shoulderWidth},
    laps: ${track.laps},
    checkpointCount: ${track.checkpointCount},
    startLineDistance: ${track.startLineDistance},
    gridLateralOffsets: [${track.gridLateralOffsets.join(', ')}],
    gridRowSpacing: ${track.gridRowSpacing},
    surfaceGrip: ${track.surfaceGrip},
  },`;
    })
    .join('\n');

  return `// GENERATED by \`npm run gen:tracks\` — do not edit by hand.
// Planet 1 track 1 (thunder-basin) is authored separately and is NOT in this list.
import type { TrackDefinition } from '../../domain/track/TrackDefinition.ts';

export const GENERATED_TRACKS: readonly TrackDefinition[] = [
${body}
];
`;
}

const manifest = parseCarSetManifest(JSON.parse(readFileSync(carsJsonPath, 'utf8')));
const generated: TrackDefinition[] = [];
let matches = 0;
let considered = 0;

console.log('Generating 30 tracks across 10 planets...\n');
for (const planet of PLANETS) {
  console.log(`${planet.displayName}  (featured: ${planet.bestCarId})`);
  for (let n = 1; n <= TRACKS_PER_PLANET; n += 1) {
    const trackId = planetTrackId(planet, n);
    if (trackId === ANCHOR_TRACK_ID) {
      console.log(`  ${trackId.padEnd(18)} (authored, kept)`);
      continue;
    }
    const chosen = chooseTrack(manifest, planet, n);
    generated.push(chosen.track);
    considered += 1;
    const fastest = chosen.evaluation.fastestCarId ?? 'none';
    const ok = fastest === planet.bestCarId;
    if (ok) matches += 1;
    console.log(
      `  ${trackId.padEnd(18)} fastest=${fastest.padEnd(12)} ${ok ? 'MATCH' : 'miss '}  ` +
        `finishers=${chosen.evaluation.completed}/${chosen.evaluation.total}`,
    );
  }
}

writeFileSync(outPath, serialize(generated));
console.log(`\nWrote ${generated.length} tracks to ${outPath}`);
console.log(`Featured-car match: ${matches}/${considered} generated tracks.`);
