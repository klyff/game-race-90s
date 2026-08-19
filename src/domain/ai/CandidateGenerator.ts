/**
 * Corridor futures from the car's actual (s0, d0), not an idealized centreline.
 * Dedup geometrically before scoring — IDs are not diversity.
 */

import { clamp } from './math.ts';

export const CANDIDATE_KIND = {
  KEEP: 'KEEP',
  LINE: 'LINE',
  INSIDE: 'INSIDE',
  OUTSIDE: 'OUTSIDE',
  PASS_LEFT: 'PASS_LEFT',
  PASS_RIGHT: 'PASS_RIGHT',
  GAP: 'GAP',
  DEFEND: 'DEFEND',
  SLOW: 'SLOW',
  HIGH_EXIT: 'HIGH_EXIT',
} as const;

export type CandidateKind = (typeof CANDIDATE_KIND)[keyof typeof CANDIDATE_KIND];

export interface PathCandidate {
  readonly id: string;
  readonly kind: CandidateKind;
  readonly targetLateral: number;
  readonly speedScale: number;
}

export const MIN_MEANINGFUL_LATERAL = 0.55;

export function generatePathCandidates(
  currentLateral: number,
  lineLateral: number,
  maxOffset: number,
  gapLateral: number | null,
): readonly PathCandidate[] {
  const cap = Math.max(0.5, maxOffset);
  const raw: PathCandidate[] = [
    { id: 'KEEP', kind: CANDIDATE_KIND.KEEP, targetLateral: currentLateral, speedScale: 1 },
    { id: 'LINE', kind: CANDIDATE_KIND.LINE, targetLateral: lineLateral, speedScale: 1 },
    { id: 'INSIDE', kind: CANDIDATE_KIND.INSIDE, targetLateral: lineLateral - cap * 0.5, speedScale: 1 },
    { id: 'OUTSIDE', kind: CANDIDATE_KIND.OUTSIDE, targetLateral: lineLateral + cap * 0.5, speedScale: 1 },
    { id: 'PASS_LEFT', kind: CANDIDATE_KIND.PASS_LEFT, targetLateral: currentLateral + cap * 0.58, speedScale: 1 },
    { id: 'PASS_RIGHT', kind: CANDIDATE_KIND.PASS_RIGHT, targetLateral: currentLateral - cap * 0.58, speedScale: 1 },
    { id: 'FAR_LEFT', kind: CANDIDATE_KIND.PASS_LEFT, targetLateral: cap * 0.75, speedScale: 0.96 },
    { id: 'FAR_RIGHT', kind: CANDIDATE_KIND.PASS_RIGHT, targetLateral: -cap * 0.75, speedScale: 0.96 },
    { id: 'DEFEND', kind: CANDIDATE_KIND.DEFEND, targetLateral: currentLateral * 0.35, speedScale: 0.92 },
    { id: 'SLOW', kind: CANDIDATE_KIND.SLOW, targetLateral: lineLateral, speedScale: 0.72 },
    { id: 'HIGH_EXIT', kind: CANDIDATE_KIND.HIGH_EXIT, targetLateral: lineLateral * 0.25, speedScale: 1.05 },
  ];
  if (gapLateral !== null && Number.isFinite(gapLateral)) {
    raw.push({
      id: 'GAP',
      kind: CANDIDATE_KIND.GAP,
      targetLateral: gapLateral,
      speedScale: 0.94,
    });
  }
  const clamped = raw.map(candidate => ({
    ...candidate,
    targetLateral: clamp(candidate.targetLateral, -cap, cap),
    speedScale: clamp(candidate.speedScale, 0.55, 1.08),
  }));
  return dedupCandidates(clamped);
}

export function dedupCandidates(
  candidates: readonly PathCandidate[],
  threshold: number = MIN_MEANINGFUL_LATERAL,
): readonly PathCandidate[] {
  const unique: PathCandidate[] = [];
  for (const candidate of candidates) {
    const same = unique.find(
      existing =>
        Math.abs(existing.targetLateral - candidate.targetLateral) < threshold &&
        Math.abs(existing.speedScale - candidate.speedScale) < 0.08,
    );
    if (same === undefined) {
      unique.push(candidate);
    }
  }
  return unique;
}

export function lateralDistance(a: number, b: number): number {
  return Math.abs(a - b);
}
