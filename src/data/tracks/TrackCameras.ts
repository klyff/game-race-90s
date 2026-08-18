import type { CameraPreset, CameraTrigger, CameraTriggerKind } from '../../domain/camera/CameraPreset.ts';
import { CAMERA_TRIGGER_KIND } from '../../domain/camera/CameraPreset.ts';

export class TrackCamerasError extends Error {
  constructor(message: string) {
    super(`cameras.json: ${message}. Run \`npm run gen:cameras\` to regenerate it.`);
    this.name = 'TrackCamerasError';
  }
}

function requireNumber(source: Record<string, unknown>, field: string): number {
  const value = source[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TrackCamerasError(`"${field}" must be a finite number`);
  }
  return value;
}

function requireString(source: Record<string, unknown>, field: string): string {
  const value = source[field];
  if (typeof value !== 'string' || value.length === 0) {
    throw new TrackCamerasError(`"${field}" must be a non-empty string`);
  }
  return value;
}

function parseKind(raw: unknown): CameraTriggerKind {
  if (
    raw === CAMERA_TRIGGER_KIND.CURVE ||
    raw === CAMERA_TRIGGER_KIND.STRAIGHT ||
    raw === CAMERA_TRIGGER_KIND.SPEED ||
    raw === CAMERA_TRIGGER_KIND.RAMP
  ) {
    return raw;
  }
  throw new TrackCamerasError(`unknown trigger kind "${String(raw)}"`);
}

function parseTrigger(raw: unknown): CameraTrigger {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new TrackCamerasError('each trigger must be an object');
  }
  const source = raw as Record<string, unknown>;
  return {
    kind: parseKind(source.kind),
    startDistance: requireNumber(source, 'startDistance'),
    endDistance: requireNumber(source, 'endDistance'),
    zoomBias: requireNumber(source, 'zoomBias'),
    holdSeconds: requireNumber(source, 'holdSeconds'),
    targetZoom: requireNumber(source, 'targetZoom'),
  };
}

export function parseTrackCameraPreset(raw: unknown): CameraPreset {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new TrackCamerasError('root must be an object');
  }
  const source = raw as Record<string, unknown>;
  const triggersRaw = source.triggers;
  if (!Array.isArray(triggersRaw)) {
    throw new TrackCamerasError('"triggers" must be an array');
  }
  return {
    trackId: requireString(source, 'trackId'),
    homeZoom: requireNumber(source, 'homeZoom'),
    maxZoomIn: requireNumber(source, 'maxZoomIn'),
    autoZoomOutMin: requireNumber(source, 'autoZoomOutMin'),
    zoomOut50: requireNumber(source, 'zoomOut50'),
    triggers: triggersRaw.map(parseTrigger),
  };
}
