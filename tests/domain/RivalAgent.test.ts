import { describe, expect, it } from 'vitest';
import { buildLineCandidates } from '../../src/domain/race/RacingLine.ts';
import { findTrack } from '../../src/data/tracks/registry.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import {
  chooseLineByAccount,
  lineAccount,
  rivalAgentFor,
  type PathKind,
} from '../../src/domain/vehicle/RivalAgent.ts';

describe('rivalAgentFor', () => {
  it('is deterministic for the same seed', () => {
    expect(rivalAgentFor('KIRA')).toEqual(rivalAgentFor('KIRA'));
  });

  it('gives different brains to different pilots', () => {
    const a = rivalAgentFor('KIRA');
    const b = rivalAgentFor('SNAKE');
    expect(a.pathKind !== b.pathKind || a.laneRegister !== b.laneRegister || a.riskRegister !== b.riskRegister).toBe(
      true,
    );
  });

  it('covers every path kind across the roster', () => {
    const seen = new Set<PathKind>();
    for (const name of ['ALINE', 'ENZO', 'KIRA', 'SNAKE', 'VINCE', 'ZARA', 'HEX', 'RUBY', 'JETT', 'NOVA', 'ASH', 'CRUZ']) {
      seen.add(rivalAgentFor(name).pathKind);
    }
    expect(seen.size).toBeGreaterThan(3);
  });
});

describe('lineAccount', () => {
  it('closes positive for a high-grip car walking a bit on a tight track', () => {
    expect(lineAccount(2, 38, 1, 0.8, false)).toBeGreaterThan(0);
  });

  it('goes negative for a low-grip car walking the same tight line on ice', () => {
    expect(lineAccount(2, 16, 0.58, 0.8, false)).toBeLessThan(lineAccount(2, 38, 1, 0.8, false));
  });

  it('pays a low-grip car for the wide line on a slippery planet', () => {
    expect(lineAccount(3, 16, 0.58, 0.72, true)).toBeGreaterThan(lineAccount(3, 16, 0.58, 0.72, false));
  });
});

describe('chooseLineByAccount', () => {
  const track = findTrack('thunder-basin');
  const spline = new TrackSpline(track.controlPoints);
  const candidates = buildLineCandidates(track, spline, 2.2);

  it('picks a known candidate, not an empty line', () => {
    const agent = rivalAgentFor('KIRA');
    const line = chooseLineByAccount(agent, candidates, 30, 1, 0.5);
    expect(line.offsets.length).toBeGreaterThan(0);
    expect(candidates.some(entry => entry.name === line.name)).toBe(true);
  });

  it('does not give every agent the same line', () => {
    const names = ['KIRA', 'SNAKE', 'VINCE', 'ZARA', 'HEX', 'JETT', 'ASH', 'CRUZ'];
    const picked = new Set(
      names.map(name => chooseLineByAccount(rivalAgentFor(name), candidates, 30, 1, 0.5).name),
    );
    expect(picked.size).toBeGreaterThan(1);
  });
});
