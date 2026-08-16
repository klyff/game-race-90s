/**
 * Offline racing-line search (T-043) and parTime generation (T-047).
 *
 *   npm run gen:lines                 # every registered track
 *   npm run gen:lines -- thunder-basin
 *
 * Writes `public/assets/lines/<trackId>.json` and prints a report to read.
 * Never runs in the browser — boot would stall (owner decision, 2026-08-16).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseCarSetManifest } from '../../src/data/cars/CarManifest.ts';
import { TRACKS, findTrack } from '../../src/data/tracks/registry.ts';
import { planetForTrackId } from '../../src/data/tracks/planets.ts';
import {
  buildLineCandidates,
  type RacingLine,
  type TrackLinesManifest,
} from '../../src/domain/race/RacingLine.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import type { TrackDefinition } from '../../src/domain/track/TrackDefinition.ts';
import type { VehicleStats } from '../../src/domain/vehicle/VehicleStats.ts';
import { simulateLap } from '../shared/lapSim.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const outDir = join(root, 'public', 'assets', 'lines');
const carsJsonPath = join(root, 'public', 'assets', 'cars', 'cars.json');

interface EvalResult {
  readonly lapSeconds: number;
  readonly wallContacts: number;
  readonly completed: boolean;
}

/**
 * One lap on a candidate line, via the shared simulator so the track's
 * `surfaceGrip` is applied exactly as it is in a live race.
 */
function evaluateCandidate(
  stats: VehicleStats,
  track: TrackDefinition,
  spline: TrackSpline,
  candidateName: string,
  offsets: readonly number[],
  carId: string,
): EvalResult {
  const line: RacingLine = {
    trackId: track.id,
    carId,
    candidateName,
    offsets,
    lapSeconds: 0,
    wallContacts: 0,
  };
  const result = simulateLap(stats, track, spline, line);
  return {
    lapSeconds: result.completed ? result.lapSeconds : Number.POSITIVE_INFINITY,
    wallContacts: result.wallContacts,
    completed: result.completed,
  };
}

function generateForTrack(trackId: string): TrackLinesManifest {
  const track = findTrack(trackId);
  const spline = new TrackSpline(track.controlPoints);
  const manifest = parseCarSetManifest(JSON.parse(readFileSync(carsJsonPath, 'utf8')));

  const lines: RacingLine[] = [];
  console.log(`\n=== ${track.displayName} (${track.id}) — length ${spline.totalLength.toFixed(1)} ===`);

  for (const sheet of manifest.cars) {
    const candidates = buildLineCandidates(track, spline, sheet.stats.collisionRadius);
    let best: RacingLine | null = null;

    console.log(`\n  ${sheet.id}`);
    for (const candidate of candidates) {
      const result = evaluateCandidate(
        sheet.stats,
        track,
        spline,
        candidate.name,
        candidate.offsets,
        sheet.id,
      );
      const mark = result.completed && result.wallContacts === 0 ? 'ok' : 'reject';
      console.log(
        `    ${candidate.name.padEnd(12)} ${result.completed ? result.lapSeconds.toFixed(2) + 's' : 'DNF'}  walls=${result.wallContacts}  [${mark}]`,
      );

      if (!result.completed || result.wallContacts > 0) {
        continue;
      }
      const line: RacingLine = {
        trackId: track.id,
        carId: sheet.id,
        candidateName: candidate.name,
        offsets: candidate.offsets,
        lapSeconds: result.lapSeconds,
        wallContacts: result.wallContacts,
      };
      if (best === null || line.lapSeconds < best.lapSeconds) {
        best = line;
      }
    }

    // Fall back to the fastest completed candidate even with walls, then centreline.
    if (best === null) {
      for (const candidate of candidates) {
        const result = evaluateCandidate(
          sheet.stats,
          track,
          spline,
          candidate.name,
          candidate.offsets,
          sheet.id,
        );
        if (!result.completed) continue;
        const line: RacingLine = {
          trackId: track.id,
          carId: sheet.id,
          candidateName: candidate.name,
          offsets: candidate.offsets,
          lapSeconds: result.lapSeconds,
          wallContacts: result.wallContacts,
        };
        if (best === null || line.lapSeconds < best.lapSeconds) {
          best = line;
        }
      }
    }

    if (best === null) {
      throw new Error(`No candidate completed a lap for ${sheet.id} on ${track.id}`);
    }
    console.log(`    WINNER → ${best.candidateName} @ ${best.lapSeconds.toFixed(2)}s`);
    lines.push(best);
  }

  // Mid-pack car for parTime: median lap among winners.
  const sorted = [...lines].sort((a, b) => a.lapSeconds - b.lapSeconds);
  const mid = sorted[Math.floor(sorted.length / 2)]!;
  const fastest = sorted[0]!;

  // Report the actual fastest car against the planet's featured car. A mismatch is
  // not fatal (the featured car is the recommended pick, and lap time is grip-
  // dominated), but it is worth seeing at generation time.
  const planet = planetForTrackId(track.id);
  if (planet !== undefined) {
    const match = fastest.carId === planet.bestCarId ? 'MATCH' : 'miss';
    console.log(
      `  fastest=${fastest.carId} @ ${fastest.lapSeconds.toFixed(2)}s  featured=${planet.bestCarId}  [${match}]`,
    );
  }

  return {
    trackId: track.id,
    parTime: mid.lapSeconds,
    parCarId: mid.carId,
    lines,
  };
}

mkdirSync(outDir, { recursive: true });
const filter = process.argv[2];
const tracks = filter ? [findTrack(filter)] : [...TRACKS];

for (const track of tracks) {
  const report = generateForTrack(track.id);
  const outPath = join(outDir, `${track.id}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`\nWrote ${outPath}`);
  console.log(`parTime=${report.parTime.toFixed(2)}s (from ${report.parCarId})`);
}
