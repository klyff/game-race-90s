// Throwaway verification script — NOT part of the shipped codebase, deleted after use.
//
// SpeedoGauge.ts does `import Phaser from 'phaser'` at module scope, and Phaser's own
// device-detection code dereferences `window`/`document`/`navigator`/`screen` as a side
// effect of that import. There is no DOM in plain Node, so importing anything from that
// file — even a pure, Phaser-free function — throws `ReferenceError: window is not
// defined` unless something shims those globals first. This shim exists ONLY so this
// throwaway script can import the real exported helper (rather than re-implementing its
// maths and risking drift); it is not a fix and is not part of the shipped change.
function makeBrowserStub(): any {
  const fn: any = () => stub;
  const stub: any = new Proxy(fn, {
    get: () => stub,
    has: () => false,
    apply: () => stub,
  });
  return stub;
}

function setGlobal(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  });
}

setGlobal('window', makeBrowserStub());
setGlobal('document', makeBrowserStub());
setGlobal('navigator', makeBrowserStub());
setGlobal('screen', makeBrowserStub());

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
