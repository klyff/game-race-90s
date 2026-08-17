import type Phaser from 'phaser';

/** Near-black ink so ivory and gold read on busy pub / garage art. */
export const PLAQUE_INK = 0x07090f;
export const PLAQUE_LINE = 0xf4e6c4;

export interface PlaquePaint {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly radius?: number;
  readonly fill?: number;
  readonly alpha?: number;
  readonly edge?: number;
}

/**
 * Dark rounded plate, origin at centre. Phaser rectangles cannot round;
 * Graphics.fillRoundedRect is the supported path.
 */
export function paintRoundedPlaque(graphics: Phaser.GameObjects.Graphics, spec: PlaquePaint): void {
  const radius = spec.radius ?? 16;
  const width = spec.width;
  const height = spec.height;
  const fill = spec.fill ?? PLAQUE_INK;
  const alpha = spec.alpha ?? 0.5;
  const edge = spec.edge ?? PLAQUE_LINE;
  const left = spec.x - width / 2;
  const top = spec.y - height / 2;
  graphics.clear();
  graphics.fillStyle(fill, alpha);
  graphics.fillRoundedRect(left, top, width, height, radius);
  graphics.lineStyle(2, edge, 0.7);
  graphics.strokeRoundedRect(left, top, width, height, radius);
}
