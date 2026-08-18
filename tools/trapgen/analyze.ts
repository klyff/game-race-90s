import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeTrackTraps } from '../../src/domain/traps/analyzeTrackTraps.ts';
import { TRACKS, findTrack } from '../../src/data/tracks/registry.ts';
import { planetForTrackId } from '../../src/data/tracks/planets.ts';

/**
 * Samples every registered circuit and writes trap candidate pools.
 *
 *   npm run gen:traps                 # every track
 *   npm run gen:traps -- thunder-basin
 */
const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(ROOT, '../../public/assets/traps');

function writeCatalog(trackId: string): void {
  const track = findTrack(trackId);
  const worldIndex = planetForTrackId(trackId)?.index ?? 1;
  const catalog = analyzeTrackTraps(track, worldIndex);
  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, `${trackId}.json`);
  writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  console.log(`${trackId}  crates:${catalog.crates.length}  drums:${catalog.drums.length}`);
}

const filter = process.argv.slice(2).filter(arg => !arg.startsWith('-'));
const ids = filter.length > 0 ? filter : TRACKS.map(track => track.id);
for (const id of ids) {
  writeCatalog(id);
}
