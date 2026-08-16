import type { TrackLinesManifest, RacingLine } from '../../domain/race/RacingLine.ts';

/** Raised when a generated lines file is missing or malformed. */
export class TrackLinesError extends Error {
  constructor(message: string) {
    super(`lines.json: ${message}. Run \`npm run gen:lines\` to regenerate it.`);
    this.name = 'TrackLinesError';
  }
}

function requireNumber(source: Record<string, unknown>, field: string): number {
  const value = source[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TrackLinesError(`"${field}" must be a finite number`);
  }
  return value;
}

function requireString(source: Record<string, unknown>, field: string): string {
  const value = source[field];
  if (typeof value !== 'string' || value.length === 0) {
    throw new TrackLinesError(`"${field}" must be a non-empty string`);
  }
  return value;
}

function parseLine(raw: unknown): RacingLine {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new TrackLinesError('each line must be an object');
  }
  const source = raw as Record<string, unknown>;
  const offsetsRaw = source.offsets;
  if (!Array.isArray(offsetsRaw) || offsetsRaw.some(v => typeof v !== 'number')) {
    throw new TrackLinesError('line.offsets must be a number array');
  }
  return {
    trackId: requireString(source, 'trackId'),
    carId: requireString(source, 'carId'),
    candidateName: requireString(source, 'candidateName'),
    offsets: offsetsRaw as number[],
    lapSeconds: requireNumber(source, 'lapSeconds'),
    wallContacts: requireNumber(source, 'wallContacts'),
  };
}

/** Parse the offline `public/assets/lines/<track>.json` payload. */
export function parseTrackLinesManifest(raw: unknown): TrackLinesManifest {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new TrackLinesError('root must be an object');
  }
  const source = raw as Record<string, unknown>;
  const linesRaw = source.lines;
  if (!Array.isArray(linesRaw)) {
    throw new TrackLinesError('"lines" must be an array');
  }
  return {
    trackId: requireString(source, 'trackId'),
    parTime: requireNumber(source, 'parTime'),
    parCarId: requireString(source, 'parCarId'),
    lines: linesRaw.map(parseLine),
  };
}
