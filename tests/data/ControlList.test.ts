import { describe, expect, it } from 'vitest';
import { formatHelpBody } from '../../src/data/input/ControlList.ts';

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
  });
});
