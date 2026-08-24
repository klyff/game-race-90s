/**
 * Headless Debug-IA: 14 autonomous NPCs on RaceField, same log lines as the live
 * `?debugia=1` session. No Phaser, no listen port.
 *
 *   node --experimental-strip-types tools/debug/run-ia.ts
 *   node --experimental-strip-types tools/debug/run-ia.ts --seconds 180 --track thunder-basin-2 --seed 1
 *   node --experimental-strip-types tools/debug/run-ia.ts --seconds 300 --mix 2:2:2
 *
 * `--mix experts:mediums:bobos` draws a skill-band grid (not the 14-racer lottery).
 * A mix run also stretches track.laps so a 5-minute session does not freeze at lap 3.
 *
 * Writes `.tmp/reportIA/drivers/*.log` and `.tmp/reportIA/summary.json`.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseCarSetManifest, findCarSheet, applyAvailableMatrixStrips, playableCarIds } from '../../src/data/cars/CarManifest.ts';
import { findTrack } from '../../src/data/tracks/registry.ts';
import { campaignTrackId } from '../../src/data/tracks/campaign.ts';
import { planetForTrackId } from '../../src/data/tracks/planets.ts';
import { parseTrackLinesManifest } from '../../src/data/tracks/TrackLines.ts';
import { SIMULATION_STEP_SECONDS } from '../../src/domain/constants.ts';
import { IDLE_INPUT } from '../../src/domain/input/InputCommand.ts';
import { RaceField } from '../../src/domain/race/RaceField.ts';
import {
  DEBUG_IA_LOG_INTERVAL_SECONDS,
  debugIaLogFileName,
} from '../../src/adapters/debug/DebugIaReporter.ts';
import {
  drawDebugIaGrid,
  drawSkillMixGrid,
  skillBandForName,
  type SkillMix,
} from '../../src/domain/race/DebugIaField.ts';
import { profileFor } from '../../src/domain/ai/DriverRoster.ts';
import { driverSkill, watchPlanetTwoTracks } from '../../src/domain/race/WatchField.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import { isAirborne } from '../../src/domain/vehicle/Vehicle.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

function argValue(flag: string, fallback: string): string {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return fallback;
  }
  return process.argv[index + 1] ?? fallback;
}

function parseMix(raw: string): SkillMix | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const parts = trimmed.split(/[,:]/).map(part => Number(part));
  if (parts.length !== 3 || parts.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error('--mix expects experts:mediums:bobos (e.g. 2:2:2)');
  }
  return {
    experts: Math.floor(parts[0] ?? 0),
    mediums: Math.floor(parts[1] ?? 0),
    bobos: Math.floor(parts[2] ?? 0),
  };
}

const seconds = Math.max(3, Number(argValue('--seconds', '180')) || 180);
const seed = Math.max(1, Math.floor(Number(argValue('--seed', '1')) || 1));
const worldArg = argValue('--world', '');
const pistaArg = argValue('--pista', '');
const trackFromCampaign =
  worldArg.length > 0 && pistaArg.length > 0
    ? campaignTrackId(Number(worldArg), Number(pistaArg))
    : undefined;
const trackId = trackFromCampaign ?? argValue('--track', watchPlanetTwoTracks()[0] ?? 'thunder-basin-2');
const mix = parseMix(argValue('--mix', ''));
const outRoot = argValue(
  '--out',
  mix
    ? join(root, '.tmp', 'reportIA-mix', `${mix.experts}-${mix.mediums}-${mix.bobos}-${seconds}s`)
    : join(root, '.tmp', 'reportIA'),
);
const driversDir = join(outRoot, 'drivers');

const { pruneIaLogsIfNeeded } = await import('./ia-log-store.ts');
const pruned = pruneIaLogsIfNeeded(outRoot);
if (pruned.purged) {
  console.log(`purged debug-ia logs at ${(pruned.bytes / (1024 * 1024)).toFixed(1)}MB (10MB cap)`);
}

mkdirSync(driversDir, { recursive: true });
mkdirSync(join(outRoot, 'logs'), { recursive: true });

const carsJson = JSON.parse(readFileSync(join(root, 'public/assets/cars/cars.json'), 'utf8'));
const manifest = applyAvailableMatrixStrips(parseCarSetManifest(carsJson));
const authoredTrack = findTrack(trackId);
const lapsArg = argValue('--laps', '');
const lapsOverride = lapsArg.length > 0 ? Math.max(1, Math.floor(Number(lapsArg) || 1)) : undefined;
const laps =
  lapsOverride ??
  (seconds >= 120 ? Math.max(authoredTrack.laps, Math.ceil(seconds / 20)) : authoredTrack.laps);
const track = laps === authoredTrack.laps ? authoredTrack : { ...authoredTrack, laps };
const spline = new TrackSpline(track.controlPoints);
const planet = planetForTrackId(trackId);
const linesPath = join(root, 'public/assets/lines', `${trackId}.json`);
const trackLines = existsSync(linesPath)
  ? parseTrackLinesManifest(JSON.parse(readFileSync(linesPath, 'utf8')))
  : undefined;

const carIds = playableCarIds(manifest);
const grid = mix ? drawSkillMixGrid(carIds, seed, mix) : drawDebugIaGrid(carIds, seed);

const field = new RaceField(
  grid.seats.map(seat => {
    const sheet = findCarSheet(manifest, seat.carId);
    return {
      carId: seat.carId,
      name: seat.name,
      stats: sheet.stats,
      perk: sheet.perk,
      homePlanetId: sheet.homePlanetId,
      worldAdvantage: sheet.worldAdvantage,
      isPlayer: false,
    };
  }),
  track,
  spline,
  {
    trackLines,
    planetId: planet?.id,
    worldIndex: planet?.index,
    trapSeed: seed,
  },
);

const buffers = new Map<string, string[]>();
for (const seat of grid.seats) {
  const file = debugIaLogFileName(seat.name, seat.carId);
  const profile = profileFor(seat.name);
  const skill = driverSkill(profile);
  const band = skillBandForName(seat.name);
  buffers.set(file, [
    `# debug-ia ${file}`,
    `# track=${trackId} seed=${seed} seats=${grid.seats.length} seconds=${seconds} laps=${track.laps}`,
    `# name=${seat.name} car=${seat.carId} band=${band} skill=${skill.toFixed(2)} tier=${profile.tier}`,
  ]);
}

function logEntries(elapsed: number): void {
  const leaderId = field.race.standings[0]?.carId ?? '-';
  const terrain = planet?.terrain;
  const onTarmac = (offset: number) => Math.abs(offset) <= track.halfWidth;
  for (const racer of field.racers) {
    const standing = field.standingOf(racer.carId, racer.gridIndex);
    const snapshot = field.aiDebug(racer.carId, racer.gridIndex);
    const name = grid.seats.find(seat => seat.carId === racer.carId)?.name ?? racer.carId;
    const file = debugIaLogFileName(name, racer.carId);
    const line = [
      `t=${elapsed.toFixed(2)}`,
      `pos=${standing?.position ?? '?'}/${field.racers.length}`,
      `lap=${standing?.lapsCompleted ?? 0}/${track.laps}`,
      `dist=${racer.distance.toFixed(1)}`,
      `spd=${(racer.telemetry?.speed ?? 0).toFixed(1)}`,
      `lat=${racer.lateralOffset.toFixed(2)}`,
      `surf=${onTarmac(racer.lateralOffset) ? 'TARMAC' : 'DIRT'}`,
      `integ=${racer.integrity.integrity.toFixed(2)}`,
      `cond=${racer.integrity.condition}`,
      `th=${racer.lastCommand.throttle.toFixed(2)}`,
      `st=${racer.lastCommand.steer.toFixed(2)}`,
      `brk=${racer.lastCommand.brake.toFixed(2)}`,
      `wpn=${racer.lastCommand.fire ? 'MISSILE' : racer.lastCommand.dropOil ? 'OIL' : racer.lastCommand.dropMine ? 'MINE' : racer.lastCommand.boost ? 'TURBO' : '-'}`,
      `air=${isAirborne(racer.state) ? 1 : 0}`,
      `h=${racer.state.height.toFixed(2)}`,
      `u=${racer.distance.toFixed(1)}`,
      `intent=${snapshot?.intention ?? '-'}`,
      `atk=${snapshot?.attackMethod ?? '-'}`,
      `tgt=${snapshot?.targetId ?? '-'}`,
      `exec=${snapshot?.execution ?? '-'}`,
      `profile=${snapshot?.profile.id ?? name.toLowerCase()}`,
      `tier=${snapshot?.profile.tier ?? '-'}`,
      `band=${skillBandForName(name)}`,
      `skill=${driverSkill(profileFor(name)).toFixed(2)}`,
      `leader=${leaderId}`,
      `zoom=headless`,
      terrain
        ? `terra=${terrain.straightBias.toFixed(2)}/${terrain.cornerTightness.toFixed(2)}/${terrain.surfaceGrip.toFixed(2)}/${terrain.halfWidth}`
        : `terra=-`,
    ].join(' ');
    buffers.get(file)?.push(line);
  }
}

const steps = Math.round(seconds / SIMULATION_STEP_SECONDS);
const logEvery = Math.round(DEBUG_IA_LOG_INTERVAL_SECONDS / SIMULATION_STEP_SECONDS);
const started = Date.now();

console.log(
  `DEBUG-IA headless  ${track.displayName}  ${grid.seats.length} NPC  seed ${seed}  ${seconds}s  laps ${track.laps}${mix ? `  mix ${mix.experts}:${mix.mediums}:${mix.bobos}` : ''}`,
);
console.log(
  grid.seats
    .map((seat, i) => {
      const skill = driverSkill(profileFor(seat.name));
      return `  ${String(i + 1).padStart(2)} ${seat.name.padEnd(12)} ${seat.carId.padEnd(12)} ${seat.slot.padEnd(8)} skill ${skill.toFixed(2)}`;
    })
    .join('\n'),
);

const decisions = createWriteStream(join(outRoot, 'decisions.jsonl'));
function writeDecisions(elapsed: number): void {
  for (const racer of field.racers) {
    const name = grid.seats.find(seat => seat.carId === racer.carId)?.name ?? racer.carId;
    const snapshot = field.aiDebug(racer.carId);
    const cmd = racer.lastCommand;
    decisions.write(
      `${JSON.stringify({
        t: Number(elapsed.toFixed(3)),
        name,
        carId: racer.carId,
        th: Number(cmd.throttle.toFixed(3)),
        st: Number(cmd.steer.toFixed(3)),
        brk: Number(cmd.brake.toFixed(3)),
        wpn: cmd.fire ? 'MISSILE' : cmd.dropOil ? 'OIL' : cmd.dropMine ? 'MINE' : cmd.boost ? 'TURBO' : '-',
        u: Number(racer.distance.toFixed(2)),
        lat: Number(racer.lateralOffset.toFixed(3)),
        air: isAirborne(racer.state) ? 1 : 0,
        intent: snapshot?.intention ?? '-',
        exec: snapshot?.execution ?? '-',
      })}\n`,
    );
  }
}

logEntries(field.race.elapsedSeconds);
writeDecisions(field.race.elapsedSeconds);

for (let step = 1; step <= steps; step += 1) {
  field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
  writeDecisions(field.race.elapsedSeconds);
  if (step % logEvery === 0) {
    logEntries(field.race.elapsedSeconds);
  }
  if (step % (60 * 30) === 0) {
    const leader = field.race.standings[0];
    const name = grid.seats.find(seat => seat.carId === leader?.carId)?.name ?? leader?.carId;
    console.log(
      `  t=${field.race.elapsedSeconds.toFixed(0)}s  phase=${field.race.phase}  leader=${name ?? '-'}  lap=${leader?.lapsCompleted ?? 0}`,
    );
  }
}

decisions.end();
const wallMs = Date.now() - started;
const files: string[] = [];
for (const [file, lines] of buffers) {
  const path = join(driversDir, file);
  writeFileSync(path, `${lines.join('\n')}\n`, 'utf8');
  files.push(path);
}

const standings = field.race.standings.map(entry => {
  const seat = grid.seats.find(item => item.carId === entry.carId);
  const racer = field.racers.find(item => item.carId === entry.carId);
  const snapshot = field.aiDebug(entry.carId);
  return {
    position: entry.position,
    name: seat?.name ?? entry.carId,
    carId: entry.carId,
    tier: seat?.tier,
    slot: seat?.slot,
    band: seat ? skillBandForName(seat.name) : undefined,
    skill: seat ? driverSkill(profileFor(seat.name)) : undefined,
    laps: entry.lapsCompleted,
    finished: entry.finished,
    dist: racer?.distance ?? 0,
    spd: racer?.telemetry?.speed ?? 0,
    lat: racer?.lateralOffset ?? 0,
    integ: racer?.integrity.integrity ?? 0,
    cond: racer?.integrity.condition,
    intent: snapshot?.intention ?? '-',
    exec: snapshot?.execution ?? '-',
  };
});

const summary = {
  trackId,
  trackName: track.displayName,
  seed,
  mix: mix ?? null,
  ramps: track.rampZones?.length ?? 0,
  laps: track.laps,
  simSeconds: field.race.elapsedSeconds,
  requestedSeconds: seconds,
  wallMs,
  phase: field.race.phase,
  seats: grid.seats,
  standings,
  files,
};

writeFileSync(join(outRoot, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
writeFileSync(
  join(outRoot, 'logs', 'collector.log'),
  `${new Date().toISOString()} headless ${seconds}s track=${trackId} seed=${seed} wrote ${files.length} files in ${wallMs}ms\n`,
  'utf8',
);

console.log(`phase ${field.race.phase}  elapsed ${field.race.elapsedSeconds.toFixed(1)}s  wall ${wallMs}ms`);
console.log('standings:');
for (const row of standings) {
  console.log(
    `  P${row.position} ${row.name.padEnd(12)} ${row.carId.padEnd(10)} lap ${row.laps}  integ ${row.integ.toFixed(2)}  ${row.cond}  ${row.intent}`,
  );
}
console.log(`logs: ${driversDir}`);
