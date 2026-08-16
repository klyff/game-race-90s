import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAR_FRAME_HEIGHT, CAR_FRAME_WIDTH } from '../../src/domain/constants.ts';
import {
  overlayCellBorders,
  packPreviewGrid,
  stackVertically,
  writePng,
} from './raster/png.ts';
import type { Bitmap } from './raster/png.ts';
import { CAR_MODELS } from './registry.ts';
import { computeSetFit, renderCar } from './renderCar.ts';
import type { CarModelDef } from './schema.ts';

/**
 * Writes magnified contact sheets so cars can be judged by eye.
 *
 *   npm run gen:preview              # a sheet per car, plus the roster
 *   npm run gen:preview -- havac     # one car, registered or not
 *   npm run gen:preview -- --roster  # only the side-by-side roster sheet
 *
 * A car that is not yet in `registry.ts` is loaded straight from
 * `cars/<id>.car.ts`. That is what lets several art agents work in parallel:
 * each one previews its own car without touching a shared file.
 */
const PREVIEW_COLUMNS = 8;
const PREVIEW_ZOOM = 4;
/** Angles sampled per car in the roster comparison sheet. */
const ROSTER_ANGLES = 8;
const PREVIEW_BACKGROUND: readonly [number, number, number, number] = [38, 42, 48, 255];
const PREVIEW_BORDER: readonly [number, number, number] = [58, 64, 72];

const HERE = dirname(fileURLToPath(import.meta.url));
const PREVIEW_DIRECTORY = join(HERE, '..', '..', '.preview');

function toGrid(frames: readonly Uint8Array[], columns: number): Bitmap {
  const grid = packPreviewGrid(
    frames,
    CAR_FRAME_WIDTH,
    CAR_FRAME_HEIGHT,
    columns,
    PREVIEW_ZOOM,
    PREVIEW_BACKGROUND,
  );
  overlayCellBorders(
    grid,
    CAR_FRAME_WIDTH * PREVIEW_ZOOM,
    CAR_FRAME_HEIGHT * PREVIEW_ZOOM,
    PREVIEW_BORDER,
  );
  return grid;
}

function looksLikeCarModel(value: unknown): value is CarModelDef {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<CarModelDef>;
  return typeof candidate.id === 'string' && Array.isArray(candidate.parts);
}

async function loadUnregistered(id: string): Promise<CarModelDef> {
  const path = join(HERE, 'cars', `${id}.car.ts`);
  if (!existsSync(path)) {
    const known = CAR_MODELS.map((car) => car.id).join(', ');
    throw new Error(
      `No car "${id}": it is not registered (${known}) and ${path} does not exist.`,
    );
  }
  const module: Record<string, unknown> = await import(path);
  const found = Object.values(module).find(looksLikeCarModel);
  if (found === undefined) {
    throw new Error(`${path} does not export a CarModelDef.`);
  }
  if (found.id !== id) {
    throw new Error(`${path} declares id "${found.id}" but the file is named "${id}.car.ts".`);
  }
  return found;
}

async function resolveTargets(ids: readonly string[]): Promise<CarModelDef[]> {
  if (ids.length === 0) return [...CAR_MODELS];
  const resolved: CarModelDef[] = [];
  for (const id of ids) {
    const registered = CAR_MODELS.find((car) => car.id === id);
    resolved.push(registered ?? (await loadUnregistered(id)));
  }
  return resolved;
}

async function main(): Promise<void> {
  const flags = process.argv.slice(2);
  const rosterOnly = flags.includes('--roster');
  const targets = await resolveTargets(flags.filter((flag) => !flag.startsWith('--')));
  mkdirSync(PREVIEW_DIRECTORY, { recursive: true });

  // Unregistered cars join the measurement set so the shared scale an author
  // sees now is the scale their car will ship with.
  const registeredIds = new Set(CAR_MODELS.map((car) => car.id));
  const fitSet = [...CAR_MODELS, ...targets.filter((car) => !registeredIds.has(car.id))];
  const fit = computeSetFit(fitSet);

  const rosterRows: Bitmap[] = [];

  for (const def of targets) {
    const rendered = renderCar(def, fit);

    if (!rosterOnly) {
      const grid = toGrid(rendered.frames, PREVIEW_COLUMNS);
      writePng(join(PREVIEW_DIRECTORY, `${def.id}.png`), grid);
      console.log(`${def.id}: ${grid.width}x${grid.height} -> .preview/${def.id}.png`);
    }

    // One row per car, every fourth angle: the view that actually answers
    // "are these five distinguishable at a glance, and lit the same way?"
    const stride = Math.max(1, Math.floor(rendered.frames.length / ROSTER_ANGLES));
    const sampled = rendered.frames.filter((_, index) => index % stride === 0).slice(0, ROSTER_ANGLES);
    rosterRows.push(toGrid(sampled, ROSTER_ANGLES));
  }

  if (rosterRows.length > 1 || rosterOnly) {
    const roster = stackVertically(rosterRows);
    writePng(join(PREVIEW_DIRECTORY, 'roster.png'), roster);
    console.log(
      `roster: ${roster.width}x${roster.height} -> .preview/roster.png ` +
        `(rows: ${targets.map((car) => car.id).join(', ')})`,
    );
  }

  console.log(
    `\nScale ${fit.scale.toFixed(3)} px/unit, shared across ${fitSet.length} car(s): ` +
      `${fitSet.map((car) => car.id).join(', ')}`,
  );
}

await main();
