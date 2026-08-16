import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CAR_FRAME_HEIGHT,
  CAR_FRAME_WIDTH,
  CAR_SPRITE_FRAMES,
} from '../../src/domain/constants.ts';
import { packStrip, writePng } from './raster/png.ts';
import { CAR_MODELS } from './registry.ts';
import { computeSetFit, renderCar } from './renderCar.ts';
import type { CarSetManifest, CarSheetManifest } from './schema.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_DIRECTORY = join(REPO_ROOT, 'public', 'assets', 'cars');

function main(): void {
  mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

  const fit = computeSetFit(CAR_MODELS);
  const sheets: CarSheetManifest[] = [];

  for (const def of CAR_MODELS) {
    const rendered = renderCar(def, fit);
    const strip = packStrip(rendered.frames, CAR_FRAME_WIDTH, CAR_FRAME_HEIGHT);
    writePng(join(OUTPUT_DIRECTORY, rendered.manifest.image), strip);
    sheets.push(rendered.manifest);
    console.log(
      `  ${def.id.padEnd(14)} ${strip.width}x${strip.height}  ` +
        `shadow ${rendered.manifest.shadow.width}x${rendered.manifest.shadow.height}`,
    );
  }

  const manifest: CarSetManifest = {
    frameWidth: CAR_FRAME_WIDTH,
    frameHeight: CAR_FRAME_HEIGHT,
    frameCount: CAR_SPRITE_FRAMES,
    pixelsPerUnit: Number(fit.scale.toFixed(6)),
    origin: {
      x: Number((fit.offsetX / CAR_FRAME_WIDTH).toFixed(6)),
      y: Number((fit.offsetY / CAR_FRAME_HEIGHT).toFixed(6)),
    },
    cars: sheets,
  };
  writeFileSync(join(OUTPUT_DIRECTORY, 'cars.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(
    `\n${sheets.length} car(s), ${CAR_SPRITE_FRAMES} frames each` +
      ` @ ${manifest.pixelsPerUnit} px/unit, origin ` +
      `(${manifest.origin.x}, ${manifest.origin.y})`,
  );
}

main();
