// Throwaway verification script — NOT part of the shipped codebase, deleted after use.
//
// SpeedoGauge.ts does `import Phaser from 'phaser'` at module scope, and importing the
// real Phaser package runs browser device-detection as a side effect, which throws
// outside a browser/jsdom. `tmp-phaser-stub-hooks.mjs` redirects that one import to an
// empty stub so this script can call the real, pure, Phaser-free `barProfileAt` export
// (rather than re-implementing its maths here and risking drift from the shipped code).
import { register } from 'node:module';

register('./tmp-phaser-stub-hooks.mjs', import.meta.url);

const { barProfileAt } = await import('../src/adapters/render/SpeedoGauge.ts');

const SEGMENT_COUNT = 24;
const SEGMENT_SIZE = 14;
const SEGMENT_GAP = 3;
const ARC_HEIGHT = 58;

const xMax = SEGMENT_COUNT > 1 ? (SEGMENT_COUNT - 1) * (SEGMENT_SIZE + SEGMENT_GAP) : 0;

console.log(`xMax = ${xMax}, arcWidth = ${xMax + SEGMENT_SIZE}, arcBoxHeight = ${ARC_HEIGHT + SEGMENT_SIZE}`);
console.log('i\tt\tx\ty\tangleDeg');

let anyNaN = false;

for (let i = 0; i < SEGMENT_COUNT; i += 1) {
  const t = SEGMENT_COUNT > 1 ? i / (SEGMENT_COUNT - 1) : 0;
  const x = i * (SEGMENT_SIZE + SEGMENT_GAP);
  const { y, angleRad } = barProfileAt(t, ARC_HEIGHT, xMax);
  const angleDeg = (angleRad * 180) / Math.PI;

  if (!Number.isFinite(y) || !Number.isFinite(angleRad)) {
    anyNaN = true;
  }

  console.log(`${i}\t${t.toFixed(4)}\t${x}\t${y.toFixed(3)}\t${angleDeg.toFixed(2)}`);
}

console.log(anyNaN ? 'FOUND NON-FINITE VALUE' : 'all values finite');
