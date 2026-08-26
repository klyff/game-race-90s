/**
 * One live audio owner per screen. Scene changes call {@link stopAllScreenAudio}
 * so a bed, solo or kick never bleeds into the next menu or race.
 */
const stops = new Map<symbol, () => void>();

export function registerScreenAudio(stop: () => void): () => void {
  const id = Symbol('screen-audio');
  stops.set(id, stop);
  return () => {
    stops.delete(id);
  };
}

export function stopAllScreenAudio(): void {
  const fns = [...stops.values()];
  stops.clear();
  for (const stop of fns) {
    try {
      stop();
    } catch {
      /* A failed teardown must not block the next scene. */
    }
  }
}
