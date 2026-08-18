import {
  CAMERA_CORNER_CURVATURE,
  CAMERA_CURVATURE_SPAN_UNITS,
  CAMERA_STRAIGHT_CURVATURE,
} from '../camera/CameraPreset.ts';
import type { TrackDefinition } from '../track/TrackDefinition.ts';
import { TrackSpline } from '../track/TrackSpline.ts';
import { crateSlotCount, drumSlotCount } from './TrapRules.ts';
import type { TrackTrapCatalog, TrapSlot } from './TrapCatalog.ts';

const SAMPLE_STEP_UNITS = 12;
const GRID_CLEAR_UNITS = 40;
const RAMP_PAD_UNITS = 8;
const MIN_GAP_UNITS = 8;
const SHOULDER_FRACTION = 0.45;

type SampleKind = 'straight' | 'sweeper' | 'corner' | 'tight';

function classify(absC: number): SampleKind {
  if (absC >= 0.025) {
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

function scoreKind(kind: SampleKind, tInSegment: number): number {
  if (kind === 'straight') {
    return 3;
  }
  if (kind === 'sweeper') {
    return tInSegment >= 0.7 ? 2.6 : 2;
  }
  if (kind === 'corner') {
    return 0.5;
  }
  return 0.2;
}

function inRamp(distance: number, track: TrackDefinition, spline: TrackSpline): boolean {
  for (const zone of track.rampZones ?? []) {
    const fromStart = spline.signedDelta(zone.triggerDistance - RAMP_PAD_UNITS, distance);
    const window = zone.triggerLength + 2 * RAMP_PAD_UNITS;
    if (fromStart >= 0 && fromStart <= window) {
      return true;
    }
  }
  return false;
}

function nearGrid(distance: number, track: TrackDefinition, spline: TrackSpline): boolean {
  const fromLine = Math.abs(spline.signedDelta(track.startLineDistance, distance));
  return fromLine < GRID_CLEAR_UNITS;
}

function farEnough(distance: number, taken: readonly number[], spline: TrackSpline): boolean {
  for (const other of taken) {
    if (Math.abs(spline.signedDelta(distance, other)) < MIN_GAP_UNITS) {
      return false;
    }
  }
  return true;
}

interface Candidate {
  readonly distance: number;
  readonly score: number;
}

function collectCandidates(track: TrackDefinition, spline: TrackSpline): Candidate[] {
  const count = Math.max(1, Math.floor(spline.totalLength / SAMPLE_STEP_UNITS));
  const samples: { distance: number; kind: SampleKind }[] = [];
  for (let i = 0; i < count; i += 1) {
    const distance = i * SAMPLE_STEP_UNITS;
    const absC = Math.abs(spline.curvatureAt(distance, CAMERA_CURVATURE_SPAN_UNITS));
    samples.push({ distance, kind: classify(absC) });
  }

  const candidates: Candidate[] = [];
  let runStart = 0;
  for (let i = 1; i <= samples.length; i += 1) {
    const prev = samples[i - 1]!;
    const next = samples[i % samples.length];
    const split = i === samples.length || next!.kind !== prev.kind;
    if (!split) {
      continue;
    }
    const run = samples.slice(runStart, i);
    const length = run.length;
    for (let k = 0; k < run.length; k += 1) {
      const sample = run[k]!;
      if (nearGrid(sample.distance, track, spline) || inRamp(sample.distance, track, spline)) {
        continue;
      }
      const tInSegment = length <= 1 ? 1 : k / (length - 1);
      candidates.push({
        distance: sample.distance,
        score: scoreKind(sample.kind, tInSegment),
      });
    }
    runStart = i;
  }

  candidates.sort((a, b) => b.score - a.score || a.distance - b.distance);
  return candidates;
}

function pickSlots(
  candidates: readonly Candidate[],
  count: number,
  spline: TrackSpline,
  occupied: number[],
  shoulder: number,
  startSide: number,
): TrapSlot[] {
  const slots: TrapSlot[] = [];
  let side = startSide;
  for (const candidate of candidates) {
    if (slots.length >= count) {
      break;
    }
    if (!farEnough(candidate.distance, occupied, spline)) {
      continue;
    }
    occupied.push(candidate.distance);
    slots.push({ distance: candidate.distance, lateral: side * shoulder });
    side *= -1;
  }
  return slots;
}

/**
 * Shoulder seats for crates and drums. Pool size follows the planet's world index.
 * Race load then picks a seeded subset — this is the full candidate list.
 */
export function analyzeTrackTraps(track: TrackDefinition, worldIndex: number): TrackTrapCatalog {
  const spline = new TrackSpline(track.controlPoints);
  const world = Number.isFinite(worldIndex) && worldIndex >= 1 ? Math.floor(worldIndex) : 1;
  const shoulder = track.halfWidth + SHOULDER_FRACTION * track.shoulderWidth;
  const candidates = collectCandidates(track, spline);
  const occupied: number[] = [];
  const drums = pickSlots(candidates, drumSlotCount(world), spline, occupied, shoulder, 1);
  const crates = pickSlots(candidates, crateSlotCount(world), spline, occupied, shoulder, -1);
  return {
    trackId: track.id,
    worldIndex: world,
    crates,
    drums,
  };
}
