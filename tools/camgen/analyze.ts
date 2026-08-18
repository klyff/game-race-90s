import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeTrackCameras } from '../../src/domain/camera/analyzeTrackCameras.ts';
import { TRACKS, findTrack } from '../../src/data/tracks/registry.ts';

/**
 * Samples every registered circuit and writes camera presets.
 *
 *   npm run gen:cameras                 # every track
 *   npm run gen:cameras -- thunder-basin
 */
const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(ROOT, '../../public/assets/cameras');

function writePreset(trackId: string): void {
  const preset = analyzeTrackCameras(findTrack(trackId));
  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, `${trackId}.json`);
  writeFileSync(path, `${JSON.stringify(preset, null, 2)}\n`, 'utf8');
  const counts = preset.triggers.reduce<Record<string, number>>((acc, trigger) => {
    acc[trigger.kind] = (acc[trigger.kind] ?? 0) + 1;
    return acc;
  }, {});
  const summary = Object.entries(counts)
    .map(([kind, count]) => `${kind}:${count}`)
    .join(' ') || 'none';
  console.log(`${trackId}  zoom50=${preset.zoomOut50.toFixed(3)}  ${summary}`);
}

const filter = process.argv.slice(2).filter(arg => !arg.startsWith('-'));
const ids = filter.length > 0 ? filter : TRACKS.map(track => track.id);
for (const id of ids) {
  writePreset(id);
}
