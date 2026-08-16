/**
 * Measures the distribution of wall impact speeds over the real simulation pipeline.
 *
 * This exists because the damage model's threshold cannot be judged by reading the
 * code: `resolveWallContact` reports only the NORMAL component of the impact, and
 * normal driving glances off walls tangentially. Run it after ANY change to the
 * damage rules or the threshold — T-033 is the defect it found.
 *
 *   node tools/measure-impacts.ts
 */
import { findTrack } from '../src/data/tracks/registry.ts';
import { parseCarSetManifest } from '../src/data/cars/CarManifest.ts';
import { TrackSpline } from '../src/domain/track/TrackSpline.ts';
import { RaceField } from '../src/domain/race/RaceField.ts';
import { SIMULATION_STEP_SECONDS } from '../src/domain/constants.ts';
import { IDLE_INPUT } from '../src/domain/input/InputCommand.ts';
import { readFileSync } from 'node:fs';

const manifest = parseCarSetManifest(
  JSON.parse(readFileSync('public/assets/cars/cars.json', 'utf-8')),
);
const track = findTrack('thunder-basin');

function measure(label: string, steer: number, seconds: number): void {
  const spline = new TrackSpline(track.controlPoints);
  const cars = manifest.cars;
  const entries = [
    ...cars.slice(1).map(car => ({ carId: car.id, stats: car.stats, isPlayer: false })),
    { carId: cars[0]!.id, stats: cars[0]!.stats, isPlayer: true },
  ];
  const field = new RaceField(entries, track, spline, { countdownSeconds: 0 });
  const player = field.player;
  const impacts: number[] = [];
  const explosionsByCar = new Map<string, number>();

  const steps = Math.round(seconds / SIMULATION_STEP_SECONDS);
  for (let i = 0; i < steps; i += 1) {
    field.step({ ...IDLE_INPUT, throttle: 1, steer }, SIMULATION_STEP_SECONDS);
    const impact = field.drainImpact(player);
    if (impact > 0) impacts.push(impact);
    for (const racer of field.racers) {
      field.drainImpact(racer);
      if (racer.explodedThisStep) {
        explosionsByCar.set(racer.carId, (explosionsByCar.get(racer.carId) ?? 0) + 1);
      }
    }
  }

  impacts.sort((a, b) => b - a);
  const overThreshold = impacts.filter(value => value >= 6).length;
  const wrecks = [...explosionsByCar.entries()].map(([id, n]) => `${id}x${n}`).join(' ') || 'none';
  const health = field.racers
    .map(racer => `${racer.carId}=${racer.integrity.integrity.toFixed(2)}`)
    .join(' ');

  console.log(`\n${label}`);
  console.log(
    `  player contacts=${impacts.length} over6=${overThreshold} ` +
      `max=${(impacts[0] ?? 0).toFixed(1)} p50=${(impacts[Math.floor(impacts.length / 2)] ?? 0).toFixed(1)}`,
  );
  console.log(`  explosions: ${wrecks}`);
  console.log(`  integrity after ${seconds}s: ${health}`);
}

measure('player ploughs straight into the first corner (no steering)', 0, 20);
measure('player holds full left lock, scraping the inside', 1, 20);
measure('player on a gentle drift line', 0.25, 30);
measure('NPCs racing clean for a full lap while the player idles', 0, 45);
