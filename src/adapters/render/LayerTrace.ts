/**
 * One-shot paint-order audit for the race display list.
 *
 * Construction logs fire from TrackRenderer / RaceScene as each Phaser object
 * is created. Keys 1–7 in a debug-IA race hide layers back-to-front so a black
 * frame can be attributed to a specific depth, not guessed from a screenshot.
 */

export const LAYER_TRACE_PREFIX = '[layers]';

export function traceLayer(step: string, depth: number, detail = ''): void {
  const extra = detail.length > 0 ? `  ${detail}` : '';
  console.info(`${LAYER_TRACE_PREFIX} ${step.padEnd(22)} depth=${depth}${extra}`);
}

type ListedObject = Phaser.GameObjects.GameObject & {
  depth: number;
  visible: boolean;
};

export function dumpDisplayList(scene: Phaser.Scene): void {
  const rows = [...scene.children.list]
    .map(object => object as ListedObject)
    .sort((a, b) => a.depth - b.depth)
    .map(object => ({
      depth: Number(object.depth.toFixed(3)),
      type: object.type,
      name: object.name || '',
      visible: object.visible,
    }));
  console.group(
    `${LAYER_TRACE_PREFIX} display list back→front (${rows.length} objects, fps=${scene.game.loop.actualFps.toFixed(0)})`,
  );
  console.table(rows);
  console.groupEnd();
}

export function logFps(scene: Phaser.Scene, note = ''): void {
  const extra = note.length > 0 ? `  ${note}` : '';
  console.info(
    `${LAYER_TRACE_PREFIX} fps=${scene.game.loop.actualFps.toFixed(0)}  frame=${scene.game.loop.frame}${extra}`,
  );
}

export const PAINT_LAYER_KEYS = [
  { key: '1', id: 'fill', label: 'groundFill  depth -1002' },
  { key: '2', id: 'tile', label: 'groundTile  depth -1001' },
  { key: '3', id: 'road', label: 'road Graphics/bake  depth -1000' },
  { key: '4', id: 'tyres', label: 'tyre marks  depth -999' },
  { key: '5', id: 'cars', label: 'cars  depthOf(x+y)' },
  { key: '6', id: 'crates', label: 'crates/barrels/weapons' },
  { key: '7', id: 'fx', label: 'explosions/burns' },
] as const;

export type PaintLayerId = (typeof PAINT_LAYER_KEYS)[number]['id'];
