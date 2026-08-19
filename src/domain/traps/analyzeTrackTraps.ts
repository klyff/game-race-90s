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
/** Straight: stay this far inside the kerb so a grown crate/drum does not hang into dirt. */
const STRAIGHT_INSET_UNITS = 5.5;
/** Extra inset on corners / tights, as a fraction of `halfWidth`. */
const CORNER_INSET_FRACTION = 0.32;
const TIGHT_INSET_FRACTION = 0.4;
/** Collision puck that must remain inside `halfWidth`. */
const PUCK_UNITS = 2.6;
/** Extra pull-in for drums so the taller still sits on the ribbon, not the kerb. */
const DRUM_EXTRA_INSET = 2.8;

export type SampleKind = 'straight' | 'sweeper' | 'corner' | 'tight';

const SEAT_LOOKAHEAD_UNITS = 24;

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
  readonly kind: SampleKind;
  readonly curvature: number;
}

/** Absolute lateral that keeps the puck on the tarmac for this bend. */
export function trapSeat(halfWidth: number, kind: SampleKind, extraInset: number = 0): number {
  const half = Number.isFinite(halfWidth) && halfWidth > 0 ? halfWidth : 8;
  let inset = STRAIGHT_INSET_UNITS;
  if (kind === 'corner' || kind === 'sweeper') {
    inset = Math.max(inset, half * CORNER_INSET_FRACTION);
  }
  if (kind === 'tight') {
    inset = Math.max(inset, half * TIGHT_INSET_FRACTION);
  }
  const extra = Number.isFinite(extraInset) && extraInset > 0 ? extraInset : 0;
  return Math.max(5, half - Math.max(inset, PUCK_UNITS) - extra);
}

/** Bend at this mark, or 24 u ahead/behind — a straight that is already the mouth of a hairpin. */
function seatKindAt(spline: TrackSpline, distance: number): SampleKind {
  const here = Math.abs(spline.curvatureAt(distance, CAMERA_CURVATURE_SPAN_UNITS));
  const ahead = Math.abs(spline.curvatureAt(distance + SEAT_LOOKAHEAD_UNITS, CAMERA_CURVATURE_SPAN_UNITS));
  const behind = Math.abs(spline.curvatureAt(distance - SEAT_LOOKAHEAD_UNITS, CAMERA_CURVATURE_SPAN_UNITS));
  return classify(Math.max(here, ahead, behind));
}

/** Tight apex uses the outside; everywhere else the caller’s alternating side. */
function sideFor(kind: SampleKind, curvature: number, alternate: number): number {
  if (kind !== 'tight') {
    return alternate;
  }
  const bend = Math.sign(curvature);
  return bend === 0 ? alternate : -bend;
}

function collectCandidates(track: TrackDefinition, spline: TrackSpline): Candidate[] {
  const count = Math.max(1, Math.floor(spline.totalLength / SAMPLE_STEP_UNITS));
  const samples: { distance: number; kind: SampleKind; curvature: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const distance = i * SAMPLE_STEP_UNITS;
    const curvature = spline.curvatureAt(distance, CAMERA_CURVATURE_SPAN_UNITS);
    samples.push({ distance, kind: classify(Math.abs(curvature)), curvature });
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
        kind: sample.kind,
        curvature: sample.curvature,
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
  halfWidth: number,
  startSide: number,
  extraInset: number = 0,
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
    const kind = seatKindAt(spline, candidate.distance);
    const seat = trapSeat(halfWidth, kind, extraInset);
    const sign = sideFor(kind, candidate.curvature, side);
    slots.push({ distance: candidate.distance, lateral: sign * seat });
    side *= -1;
  }
  return slots;
}

/**
 * Tarmac seats for crates and drums. Pool size follows the planet's world index.
 * Race load then picks a seeded subset — this is the full candidate list.
 */
export function analyzeTrackTraps(track: TrackDefinition, worldIndex: number): TrackTrapCatalog {
  const spline = new TrackSpline(track.controlPoints);
  const world = Number.isFinite(worldIndex) && worldIndex >= 1 ? Math.floor(worldIndex) : 1;
  const candidates = collectCandidates(track, spline);
  const occupied: number[] = [];
  const drums = pickSlots(
    candidates,
    drumSlotCount(world),
    spline,
    occupied,
    track.halfWidth,
    1,
    DRUM_EXTRA_INSET,
  );
  const crates = pickSlots(candidates, crateSlotCount(world), spline, occupied, track.halfWidth, -1);
  return {
    trackId: track.id,
    worldIndex: world,
    crates,
    drums,
  };
}
