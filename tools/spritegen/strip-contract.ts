/** Shared pin so every redrawn car sits on the same ground point as the live fleet. */
export const STRIP_PIXELS_PER_UNIT = 8.143264;
export const STRIP_ORIGIN = { x: 0.5, y: 0.550512 } as const;
export const STRIP_MARGIN_PX = 4;
/** Redrawn cell. 2× the live 64 so the car is the same world size with more pixels. */
export const REDRAWN_FRAME_SIZE = 128;
export const REDRAWN_PIXELS_PER_UNIT = STRIP_PIXELS_PER_UNIT * (REDRAWN_FRAME_SIZE / 64);
export const HQ_SIZE = 512;
export const ANCHOR_FRAMES = [0, 8, 16, 24] as const;

/** Mean abs RGB below this ⇒ frames 0 and 16 are the same pose. */
export const LOOKALIKE_MAX_MAD = 32;
