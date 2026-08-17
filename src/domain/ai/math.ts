/** Shared 0..1 helpers for the racing AI. Pure, no allocation beyond returns. */

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * clamp01(amount);
}

/** FNV-1a, same family as RivalAgent — deterministic across sessions. */
export function hash32(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 0..1 from a name + salt. Stable. */
export function hashUnit(text: string, salt: number): number {
  return (Math.imul(hash32(text) ^ salt, 0x9e3779b1) >>> 8) / 0x00ffffff;
}
