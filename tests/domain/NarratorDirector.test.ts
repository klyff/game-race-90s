import { describe, expect, it } from 'vitest';
import { NarratorDirector, type NarratorSnapshot } from '../../src/domain/audio/NarratorDirector.ts';
import { planNarratorRace } from '../../src/domain/audio/NarratorPlan.ts';
import { RACE_PHASE } from '../../src/domain/constants.ts';

function snapshot(overrides: Partial<NarratorSnapshot> = {}): NarratorSnapshot {
  return {
    phase: RACE_PHASE.RACING,
    countdownRemaining: 0,
    elapsedSeconds: 20,
    playerLap: 1,
    totalLaps: 3,
    lapFraction: 0.2,
    playerPosition: 4,
    totalRacers: 7,
    playerFinished: false,
    turboJustStarted: false,
    impactJustHappened: false,
    weaponJustHappened: false,
    wrongWay: false,
    becameLeader: false,
    ...overrides,
  };
}

describe('NarratorDirector', () => {
  it('fires the planned race-start line at GO, once', () => {
    const plan = planNarratorRace({ lapCount: 3, parSeconds: 50, random: () => 0.2 });
    const director = new NarratorDirector(plan);

    const before = director.update(
      snapshot({ phase: RACE_PHASE.COUNTDOWN, countdownRemaining: 2.4, elapsedSeconds: 0 }),
    );
    expect(before).toBeUndefined();

    const go = director.update(
      snapshot({ phase: RACE_PHASE.COUNTDOWN, countdownRemaining: 0.8, elapsedSeconds: 0 }),
    );
    expect(go?.clip).toEqual(plan.raceStart);

    const again = director.update(
      snapshot({ phase: RACE_PHASE.RACING, countdownRemaining: 0, elapsedSeconds: 0.2 }),
    );
    expect(again?.clip).not.toEqual(plan.raceStart);
  });

  it('speaks one final-lap line at the bell and a different one at half distance', () => {
    const plan = planNarratorRace({ lapCount: 3, parSeconds: 50, random: () => 0.3 });
    const director = new NarratorDirector(plan);
    director.update(snapshot({ phase: RACE_PHASE.COUNTDOWN, countdownRemaining: 0.5 }));

    const start = director.update(snapshot({ playerLap: 3, lapFraction: 0.05, elapsedSeconds: 100 }));
    expect(start?.clip).toEqual(plan.finalLapStart);

    const mid = director.update(snapshot({ playerLap: 3, lapFraction: 0.5, elapsedSeconds: 125 }));
    expect(mid?.clip).toEqual(plan.finalLapMid);
    expect(mid?.clip.lineId).not.toBe(plan.finalLapStart.lineId);
  });

  it('pops the next damage / weapons index instead of talking over the same take', () => {
    const plan = planNarratorRace({ lapCount: 3, parSeconds: 50, random: () => 0.15 });
    const director = new NarratorDirector(plan);
    director.update(snapshot({ phase: RACE_PHASE.COUNTDOWN, countdownRemaining: 0.4 }));

    const first = director.update(snapshot({ weaponJustHappened: true, elapsedSeconds: 20 }));
    const second = director.update(snapshot({ weaponJustHappened: true, elapsedSeconds: 30 }));
    expect(first?.clip).toEqual(plan.weaponsPool[0]);
    expect(second?.clip).toEqual(plan.weaponsPool[1] ?? plan.weaponsPool[0]);
  });

  it('picks victory / second / last from the plan when the player takes the flag', () => {
    const plan = planNarratorRace({ lapCount: 3, parSeconds: 50, random: () => 0.6 });
    const win = new NarratorDirector(plan);
    expect(win.update(snapshot({ playerFinished: true, playerPosition: 1 }))?.clip).toEqual(plan.victory);

    const silver = new NarratorDirector(plan);
    expect(silver.update(snapshot({ playerFinished: true, playerPosition: 2 }))?.clip).toEqual(plan.second);

    const last = new NarratorDirector(plan);
    expect(last.update(snapshot({ playerFinished: true, playerPosition: 7, totalRacers: 7 }))?.clip).toEqual(
      plan.last,
    );

    const bronze = new NarratorDirector(plan);
    expect(bronze.update(snapshot({ playerFinished: true, playerPosition: 3 }))?.clip).toEqual(plan.victory);
  });

  it('goes silent after the flag — no banter, weapons, or crashes', () => {
    const plan = planNarratorRace({ lapCount: 3, parSeconds: 50, random: () => 0.15 });
    const director = new NarratorDirector(plan);
    director.update(snapshot({ phase: RACE_PHASE.COUNTDOWN, countdownRemaining: 0.4 }));
    expect(director.update(snapshot({ playerFinished: true, playerPosition: 1 }))?.clip).toEqual(
      plan.victory,
    );

    expect(director.update(snapshot({ impactJustHappened: true, elapsedSeconds: 80 }))).toBeUndefined();
    expect(director.update(snapshot({ weaponJustHappened: true, elapsedSeconds: 81 }))).toBeUndefined();
    expect(director.update(snapshot({ becameLeader: true, elapsedSeconds: 82 }))).toBeUndefined();
  });

  it('releases a scheduled banter line when the race clock reaches it', () => {
    const plan = planNarratorRace({ lapCount: 3, parSeconds: 50, random: () => 0.45 });
    const director = new NarratorDirector(plan);
    director.update(snapshot({ phase: RACE_PHASE.COUNTDOWN, countdownRemaining: 0.2 }));

    const first = plan.banter[0];
    if (first === undefined) {
      throw new Error('expected scheduled banter');
    }
    const early = director.update(snapshot({ elapsedSeconds: first.atSeconds - 0.2, playerPosition: 2 }));
    expect(early?.clip).not.toEqual(first.clip);

    const due = director.update(snapshot({ elapsedSeconds: first.atSeconds + 0.05, playerPosition: 2 }));
    expect(due?.clip).toEqual(first.clip);
  });
});
