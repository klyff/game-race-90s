import { describe, expect, it } from 'vitest';
import {
  PODIUM_BODY_GAP,
  PODIUM_BODY_SCALE,
  PODIUM_FOOT_GAP,
  PODIUM_NAME_GAP,
  WINNER_FOOT_LIFT,
  podiumBodyXs,
  podiumFootY,
  podiumNameY,
  winnerFootY,
} from '../../src/adapters/render/PodiumLayout.ts';

describe('podiumBodyXs', () => {
  it('parks 2nd and 3rd against the winner box without overlap', () => {
    const firstW = 130;
    const sideW = 93;
    const xs = podiumBodyXs({ screenW: 1920, firstW, secondW: sideW, thirdW: sideW });
    expect(xs.first).toBe(960);
    const reach = firstW / 2 + PODIUM_BODY_GAP + sideW / 2;
    expect(xs.first - xs.second).toBeCloseTo(reach);
    expect(xs.third - xs.first).toBeCloseTo(reach);
    expect(xs.second + sideW / 2).toBeLessThanOrEqual(xs.first - firstW / 2 - PODIUM_BODY_GAP + 0.01);
    expect(xs.third - sideW / 2).toBeGreaterThanOrEqual(xs.first + firstW / 2 + PODIUM_BODY_GAP - 0.01);
  });

  it('stays farther apart when the winner body is wider', () => {
    const slim = podiumBodyXs({ screenW: 1920, firstW: 80, secondW: 80, thirdW: 80 });
    const wide = podiumBodyXs({ screenW: 1920, firstW: 200, secondW: 80, thirdW: 80 });
    expect(wide.first - wide.second).toBeGreaterThan(slim.first - slim.second);
    expect(wide.third - wide.first).toBeGreaterThan(slim.third - slim.first);
  });
});

describe('podiumFootY', () => {
  it('parks soles 15px above the board top', () => {
    expect(podiumFootY(800)).toBe(800 - PODIUM_FOOT_GAP);
    expect(PODIUM_FOOT_GAP).toBe(15);
  });

  it('lifts the winner another 15px', () => {
    expect(winnerFootY(800)).toBe(podiumFootY(800) - WINNER_FOOT_LIFT);
    expect(WINNER_FOOT_LIFT).toBe(15);
  });

  it('scales every body 15% and parks the name above the crown', () => {
    expect(PODIUM_BODY_SCALE).toBeCloseTo(1.15);
    expect(podiumNameY(800, 400)).toBe(800 - 400 - PODIUM_NAME_GAP);
  });
});
