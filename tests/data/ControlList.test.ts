import { describe, expect, it } from 'vitest';
import { formatHelpBody, formatHelpColumns } from '../../src/data/input/ControlList.ts';

describe('formatHelpBody', () => {
  it('lists drive, weapons, race and menu commands', () => {
    const body = formatHelpBody();
    expect(body).toContain('DRIVE');
    expect(body).toContain('THROTTLE');
    expect(body).toContain('SPACE');
    expect(body).toContain('BRAKE');
    expect(body).not.toContain('HOP');
    expect(body).toContain('DROP LANDMINE');
    expect(body).toContain('DROP OIL');
    expect(body).toContain('WEAPONS');
    expect(body).toContain('FIRE MISSILE');
    expect(body).toContain('WATCH');
    expect(body).toContain('BROADCAST');
    expect(body).toContain('NEXT PLACE');
    expect(body).toContain('P');
    expect(body).toContain('15 BOTS');
    expect(body).toContain('MENUS');
    expect(body).toContain('CONTROLS');
    expect(body).toContain('AUDIO');
    expect(body).toContain('MUTE ALL');
    expect(body).toContain('SFX + MUSIC');
    expect(body).toContain('MUSIC ON / OFF');
    expect(body).toContain('PAUSE ← →');
    expect(body).toContain('NARRATION');
  });

  it('splits the pad into two columns so Help stays in the safe zone', () => {
    const [left, right] = formatHelpColumns();
    expect(left).toContain('DRIVE');
    expect(left).toContain('AUDIO');
    expect(left).toContain('MUTE ALL');
    expect(right).toContain('RACE');
    expect(right).toContain('WATCH');
    expect(right).toContain('MENUS');
    expect(left).not.toContain('WATCH');
    expect(right).not.toContain('THROTTLE');
  });
});
