/**
 * Strip fit, in the order the owner asked:
 *
 *  1. Consume every pose. Do not look at a destination box yet.
 *  2. The largest pose is the box for every image.
 *  3. Apply the old contain once to that box.
 *  4. Centre each pose inside the box (same mapping for every index).
 */

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Box {
  readonly width: number;
  readonly height: number;
}

/** Inner square the old per-pose contain used: 64 − 4px − 4px. */
export function innerCell(frame: number, margin: number): number {
  return Math.max(1, frame - margin * 2);
}

/** Step 2 — one box, the max width and max height of every consumed pose. */
export function boxFromPoses(sizes: readonly Size[]): Box {
  let width = 1;
  let height = 1;
  for (const size of sizes) {
    width = Math.max(width, size.width);
    height = Math.max(height, size.height);
  }
  return { width, height };
}

/** Step 3 — the old contain, once, on the shared box. */
export function containScale(box: Box, inner: number): number {
  return Math.min(inner / box.width, inner / box.height);
}

/** Top-left of `content` when it is centred in `box`. */
export function centerInBox(content: Size, box: Box): { readonly x: number; readonly y: number } {
  return {
    x: (box.width - content.width) / 2,
    y: (box.height - content.height) / 2,
  };
}
