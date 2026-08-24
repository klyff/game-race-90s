import { ISO_X, ISO_Y } from '../constants.ts';
import type { TrackDefinition } from '../track/TrackDefinition.ts';
import { TrackSpline } from '../track/TrackSpline.ts';
import {
  CAMERA_AUTO_ZOOM_OUT_MIN,
  CAMERA_CLOSE_ZOOM,
  CAMERA_CORNER_CURVATURE,
  CAMERA_CURVATURE_SPAN_UNITS,
  CAMERA_HOME_ZOOM,
  CAMERA_MAX_ZOOM_IN,
  CAMERA_RAMP_ZOOM,
  CAMERA_TIGHT_ZOOM,
  CAMERA_STRAIGHT_CURVATURE,
  CAMERA_TIGHT_CURVATURE,
  CAMERA_TRIGGER_HOLD_SECONDS,
  CAMERA_TRIGGER_KIND,
  CAMERA_WIDE_ZOOM,
  type CameraPreset,
  type CameraTrigger,
  type CameraTriggerKind,
} from './CameraPreset.ts';

const SAMPLE_STEP_UNITS = 8;
const MIN_CORNER_LENGTH = 24;
const MIN_STRAIGHT_LENGTH = 80;
const SPEED_STRAIGHT_LENGTH = 400;
const REFERENCE_VIEW_WIDTH = 1440;
const REFERENCE_VIEW_HEIGHT = 900;
const PIXELS_PER_UNIT = 8.143264;

type SampleKind = 'straight' | 'sweeper' | 'corner' | 'tight';

interface RawSegment {
  kind: SampleKind;
  start: number;
  end: number;
  length: number;
  peakAbs: number;
}

function classify(absC: number): SampleKind {
  if (absC >= CAMERA_TIGHT_CURVATURE) {
    return 'tight';
  }
  if (absC >= CAMERA_CORNER_CURVATURE) {
    return 'corner';
  }
  if (absC < CAMERA_STRAIGHT_CURVATURE) {
    return 'straight';
  }
  return 'sweeper';
}

function segmentLength(spline: TrackSpline, start: number, end: number): number {
  const delta = spline.signedDelta(start, end);
  return delta >= 0 ? delta : spline.totalLength + delta;
}

function collectSegments(spline: TrackSpline): RawSegment[] {
  const count = Math.max(1, Math.floor(spline.totalLength / SAMPLE_STEP_UNITS));
  const samples: { distance: number; kind: SampleKind; absC: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const distance = i * SAMPLE_STEP_UNITS;
    const absC = Math.abs(spline.curvatureAt(distance, CAMERA_CURVATURE_SPAN_UNITS));
    samples.push({ distance, kind: classify(absC), absC });
  }
  if (samples.length === 0) {
    return [];
  }

  const segments: RawSegment[] = [];
  let current: RawSegment = {
    kind: samples[0]!.kind,
    start: samples[0]!.distance,
    end: samples[0]!.distance,
    length: 0,
    peakAbs: samples[0]!.absC,
  };
  for (const sample of samples.slice(1)) {
    if (sample.kind === current.kind) {
      current.end = sample.distance;
      current.peakAbs = Math.max(current.peakAbs, sample.absC);
    } else {
      current.length = segmentLength(spline, current.start, current.end) + SAMPLE_STEP_UNITS;
      segments.push(current);
      current = {
        kind: sample.kind,
        start: sample.distance,
        end: sample.distance,
        length: 0,
        peakAbs: sample.absC,
      };
    }
  }
  current.length = segmentLength(spline, current.start, current.end) + SAMPLE_STEP_UNITS;
  segments.push(current);

  if (segments.length > 1 && segments[0]!.kind === segments[segments.length - 1]!.kind) {
    const last = segments.pop()!;
    const first = segments[0]!;
    first.start = last.start;
    first.peakAbs = Math.max(first.peakAbs, last.peakAbs);
    first.length += last.length;
  }
  return segments;
}

function triggerFromSegment(segment: RawSegment): CameraTrigger | null {
  if (segment.kind === 'tight') {
    return {
      kind: CAMERA_TRIGGER_KIND.CURVE,
      startDistance: segment.start,
      endDistance: segment.end + SAMPLE_STEP_UNITS,
      zoomBias: 0.3,
      holdSeconds: CAMERA_TRIGGER_HOLD_SECONDS,
      targetZoom: CAMERA_TIGHT_ZOOM,
    };
  }
  if (segment.kind === 'corner' && segment.length >= MIN_CORNER_LENGTH) {
    return {
      kind: CAMERA_TRIGGER_KIND.CURVE,
      startDistance: segment.start,
      endDistance: segment.end + SAMPLE_STEP_UNITS,
      zoomBias: 0.1,
      holdSeconds: CAMERA_TRIGGER_HOLD_SECONDS,
      targetZoom: CAMERA_CLOSE_ZOOM,
    };
  }
  if (segment.kind === 'straight' && segment.length >= SPEED_STRAIGHT_LENGTH) {
    return {
      kind: CAMERA_TRIGGER_KIND.SPEED,
      startDistance: segment.start,
      endDistance: segment.end + SAMPLE_STEP_UNITS,
      zoomBias: -0.35,
      holdSeconds: CAMERA_TRIGGER_HOLD_SECONDS,
      targetZoom: CAMERA_AUTO_ZOOM_OUT_MIN,
    };
  }
  if (segment.kind === 'straight' && segment.length >= MIN_STRAIGHT_LENGTH) {
    return {
      kind: CAMERA_TRIGGER_KIND.STRAIGHT,
      startDistance: segment.start,
      endDistance: segment.end + SAMPLE_STEP_UNITS,
      zoomBias: -0.15,
      holdSeconds: CAMERA_TRIGGER_HOLD_SECONDS,
      targetZoom: CAMERA_WIDE_ZOOM,
    };
  }
  return null;
}

function referenceZoomOut50(spline: TrackSpline): number {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const count = Math.max(1, Math.floor(spline.totalLength / SAMPLE_STEP_UNITS));
  for (let i = 0; i < count; i += 1) {
    const point = spline.positionAt(i * SAMPLE_STEP_UNITS);
    const screenX = (point.x - point.y) * ISO_X * PIXELS_PER_UNIT;
    const screenY = (point.x + point.y) * ISO_Y * PIXELS_PER_UNIT;
    minX = Math.min(minX, screenX);
    maxX = Math.max(maxX, screenX);
    minY = Math.min(minY, screenY);
    maxY = Math.max(maxY, screenY);
  }
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  return zoomToFitFraction(width, height, REFERENCE_VIEW_WIDTH, REFERENCE_VIEW_HEIGHT, 0.5);
}

/**
 * Phaser zoom that fits `fraction` of the screen-space AABB into the viewport.
 * 1 = the whole circuit (debug-IA). >1 adds margin (player). 0.5 is the `]` key.
 */
export function zoomToFitFraction(
  boundsWidth: number,
  boundsHeight: number,
  viewWidth: number,
  viewHeight: number,
  fraction: number,
): number {
  const width = Math.max(1, boundsWidth);
  const height = Math.max(1, boundsHeight);
  const viewW = Math.max(1, viewWidth);
  const viewH = Math.max(1, viewHeight);
  const frac = Number.isFinite(fraction) ? Math.min(2, Math.max(0.05, fraction)) : 0.5;
  return Math.min(viewW / (width * frac), viewH / (height * frac));
}

/** Phaser zoom that fits half the screen-space AABB into the live viewport. */
export function zoomToFitHalfBounds(
  boundsWidth: number,
  boundsHeight: number,
  viewWidth: number,
  viewHeight: number,
): number {
  return zoomToFitFraction(boundsWidth, boundsHeight, viewWidth, viewHeight, 0.5);
}

/**
 * Classify a track into camera triggers: long straights, speed runs, corners,
 * tight hairpins, and authored ramps. Sweepers are left to the live policy.
 */
export function analyzeTrackCameras(track: TrackDefinition): CameraPreset {
  const spline = new TrackSpline(track.controlPoints);
  const triggers: CameraTrigger[] = [];
  for (const segment of collectSegments(spline)) {
    const trigger = triggerFromSegment(segment);
    if (trigger !== null) {
      triggers.push(trigger);
    }
  }
  for (const zone of track.rampZones ?? []) {
    triggers.push({
      kind: CAMERA_TRIGGER_KIND.RAMP,
      startDistance: zone.triggerDistance,
      endDistance: zone.triggerDistance + zone.triggerLength,
      zoomBias: -0.1,
      holdSeconds: CAMERA_TRIGGER_HOLD_SECONDS,
      targetZoom: CAMERA_RAMP_ZOOM,
    });
  }
  return {
    trackId: track.id,
    homeZoom: CAMERA_HOME_ZOOM,
    maxZoomIn: CAMERA_MAX_ZOOM_IN,
    autoZoomOutMin: CAMERA_AUTO_ZOOM_OUT_MIN,
    zoomOut50: referenceZoomOut50(spline),
    triggers,
  };
}

export function countTriggers(
  preset: CameraPreset,
  kind: CameraTriggerKind,
): number {
  return preset.triggers.filter(trigger => trigger.kind === kind).length;
}
