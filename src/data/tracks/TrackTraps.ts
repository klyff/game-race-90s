import type { TrackTrapCatalog, TrapSlot } from '../../domain/traps/TrapCatalog.ts';

export class TrackTrapsError extends Error {
  constructor(message: string) {
    super(`traps.json: ${message}. Run \`npm run gen:traps\` to regenerate it.`);
    this.name = 'TrackTrapsError';
  }
}

function requireNumber(source: Record<string, unknown>, field: string): number {
  const value = source[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TrackTrapsError(`"${field}" must be a finite number`);
  }
  return value;
}

function requireString(source: Record<string, unknown>, field: string): string {
  const value = source[field];
  if (typeof value !== 'string' || value.length === 0) {
    throw new TrackTrapsError(`"${field}" must be a non-empty string`);
  }
  return value;
}

function parseSlot(raw: unknown): TrapSlot {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new TrackTrapsError('each slot must be an object');
  }
  const source = raw as Record<string, unknown>;
  return {
    distance: requireNumber(source, 'distance'),
    lateral: requireNumber(source, 'lateral'),
  };
}

function parseSlots(raw: unknown, field: string): TrapSlot[] {
  if (!Array.isArray(raw)) {
    throw new TrackTrapsError(`"${field}" must be an array`);
  }
  return raw.map(parseSlot);
}

export function parseTrackTrapCatalog(raw: unknown): TrackTrapCatalog {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new TrackTrapsError('root must be an object');
  }
  const source = raw as Record<string, unknown>;
  return {
    trackId: requireString(source, 'trackId'),
    worldIndex: requireNumber(source, 'worldIndex'),
    crates: parseSlots(source.crates, 'crates'),
    drums: parseSlots(source.drums, 'drums'),
  };
}
