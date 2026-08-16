// Throwaway module-loader hook, used only by tmp-speedo-table.ts to verify the new
// bar geometry. Redirects the `phaser` import to an empty stub so SpeedoGauge.ts's
// top-level `import Phaser from 'phaser'` succeeds under plain Node without a DOM —
// Phaser's real module runs browser device-detection as an import side effect, which
// throws (`ReferenceError: window is not defined`) outside a browser/jsdom. We never
// construct a SpeedoGauge here, only call its pure, Phaser-free `barProfileAt` export,
// so the stub's contents never matter.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'phaser') {
    return { url: 'phaser-stub:main', shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url === 'phaser-stub:main') {
    return {
      format: 'module',
      source: 'export default {};',
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
