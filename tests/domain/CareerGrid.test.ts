import { describe, expect, it } from 'vitest';
import {
  CAREER_NPC_COUNT,
  CAREER_RACER_COUNT,
  careerNpcMix,
  careerSkillLane,
  npcPilotNames,
  npcPilotNamesForPlanet,
} from '../../src/domain/race/CareerGrid.ts';
import { profileFor } from '../../src/domain/ai/DriverRoster.ts';
import { buildStartingGrid } from '../../src/domain/race/StartingGrid.ts';
import { findTrack } from '../../src/data/tracks/registry.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import { REGULAR_PILOTS } from '../../src/data/pilots/PilotRoster.ts';

describe('CareerGrid', () => {
  it('keeps an odd career field: player plus twelve NPCs', () => {
    expect(CAREER_RACER_COUNT).toBe(13);
    expect(CAREER_NPC_COUNT).toBe(12);
    expect(CAREER_RACER_COUNT % 2).toBe(1);
  });

  it('fits the full career field on the starting grid', () => {
    const track = findTrack('thunder-basin');
    const spline = new TrackSpline(track.controlPoints);
    const grid = buildStartingGrid(CAREER_RACER_COUNT, track, spline);
    expect(grid).toHaveLength(CAREER_RACER_COUNT);
  });

  it('picks distinct AI profiles when the rival pool is large enough', () => {
    const rivals = [
      'ALINE',
      'ENZO',
      'FLUFE',
      'DAVE',
      'RAZOR',
      'NIKKI',
      'DIEGO',
      'LUNA',
      'BLAZE',
      'KIRA',
      'SNAKE',
      'RIO',
      'JETT',
      'NOVA',
    ];
    const pilots = npcPilotNames(rivals, CAREER_NPC_COUNT);
    expect(pilots).toHaveLength(CAREER_NPC_COUNT);
    const profileIds = pilots.map(name => profileFor(name).id);
    expect(new Set(profileIds).size).toBe(CAREER_NPC_COUNT);
  });

  it('keeps Thunder Basin off the expert lane', () => {
    expect(careerNpcMix(1)).toEqual({ experts: 0, mediumSmart: 4, mediumDumb: 4, bobos: 4 });
    const pilots = npcPilotNamesForPlanet([...REGULAR_PILOTS], CAREER_NPC_COUNT, 1);
    expect(pilots).toHaveLength(CAREER_NPC_COUNT);
    expect(pilots.filter(name => careerSkillLane(name) === 'expert')).toHaveLength(0);
    expect(pilots.some(name => careerSkillLane(name) === 'mediumDumb' || careerSkillLane(name) === 'bobo')).toBe(
      true,
    );
    expect(pilots.some(name => careerSkillLane(name) === 'mediumSmart')).toBe(true);
  });
});
