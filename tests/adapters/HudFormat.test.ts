/**
 * Tests for the HUD formatter.
 *
 * Covers: position ordinals (1-25, 101-113 with special 11/12/13 handling), race time formatting
 * (0, 5.5, 59.99, 60, 83.456, 611.5 seconds), countdown state transitions and "GO!" display,
 * lap clamping (never showing LAP 4/3), ammo at edge cases, integrity at 0/0.5/1 and out of range,
 * speed formatting and the speed bar fraction (including overspeed clamping and a zero/negative
 * maxSpeed guard), NaN/Infinity handling in all numeric fields, and no trailing whitespace in any
 * output.
 */

import { describe, it, expect } from 'vitest';
import {
  formatHud,
  formatSpeed,
  formatSpeedDigits,
  positionOrdinal,
  formatRaceTime,
  type HudReadout,
} from '../../src/adapters/render/HudFormat.ts';
import { RACE_PHASE } from '../../src/domain/constants.ts';

/**
 * Factory function to build a default readout, allowing selective field overrides.
 * Used like: `readout({ lap: 2, totalLaps: 3 })`.
 */
function readout(overrides?: Partial<HudReadout>): HudReadout {
  return {
    phase: RACE_PHASE.RACING,
    countdownRemaining: 0,
    elapsedSeconds: 0,
    position: 1,
    totalRacers: 4,
    lap: 0,
    totalLaps: 3,
    ammo: 5,
    ammoCapacity: 5,
    integrity: 1.0,
    standings: [],
    speed: 0,
    maxSpeed: 78,
    ...overrides,
  };
}

describe('positionOrdinal', () => {
  describe('standard ordinals (1-10)', () => {
    it('formats 1 as "1st"', () => {
      expect(positionOrdinal(1)).toBe('1st');
    });

    it('formats 2 as "2nd"', () => {
      expect(positionOrdinal(2)).toBe('2nd');
    });

    it('formats 3 as "3rd"', () => {
      expect(positionOrdinal(3)).toBe('3rd');
    });

    it('formats 4 as "4th"', () => {
      expect(positionOrdinal(4)).toBe('4th');
    });

    it('formats 5 as "5th"', () => {
      expect(positionOrdinal(5)).toBe('5th');
    });

    it('formats 10 as "10th"', () => {
      expect(positionOrdinal(10)).toBe('10th');
    });
  });

  describe('11/12/13 exceptions', () => {
    it('formats 11 as "11th" (not "11st")', () => {
      expect(positionOrdinal(11)).toBe('11th');
    });

    it('formats 12 as "12th" (not "12nd")', () => {
      expect(positionOrdinal(12)).toBe('12th');
    });

    it('formats 13 as "13th" (not "13rd")', () => {
      expect(positionOrdinal(13)).toBe('13th');
    });

    it('formats 111 as "111th" (not "111st")', () => {
      expect(positionOrdinal(111)).toBe('111th');
    });

    it('formats 112 as "112th" (not "112nd")', () => {
      expect(positionOrdinal(112)).toBe('112th');
    });

    it('formats 113 as "113th" (not "113rd")', () => {
      expect(positionOrdinal(113)).toBe('113th');
    });
  });

  describe('ordinals 1-25 (full range check)', () => {
    const expected = [
      '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th',
      '11th', '12th', '13th', '14th', '15th', '16th', '17th', '18th', '19th', '20th',
      '21st', '22nd', '23rd', '24th', '25th',
    ];

    expected.forEach((exp, i) => {
      it(`formats ${i + 1} as "${exp}"`, () => {
        expect(positionOrdinal(i + 1)).toBe(exp);
      });
    });
  });

  describe('edge cases', () => {
    it('formats 101 as "101st"', () => {
      expect(positionOrdinal(101)).toBe('101st');
    });

    it('returns "?" for non-finite values (NaN)', () => {
      expect(positionOrdinal(NaN)).toBe('?');
    });

    it('returns "?" for Infinity', () => {
      expect(positionOrdinal(Infinity)).toBe('?');
    });

    it('returns "?" for negative Infinity', () => {
      expect(positionOrdinal(-Infinity)).toBe('?');
    });

    it('returns "?" for positions < 1', () => {
      expect(positionOrdinal(0)).toBe('?');
      expect(positionOrdinal(-5)).toBe('?');
    });

    it('floors fractional positions', () => {
      expect(positionOrdinal(2.7)).toBe('2nd');
      expect(positionOrdinal(11.9)).toBe('11th');
    });
  });
});

describe('formatRaceTime', () => {
  describe('zero and small values', () => {
    it('formats 0 seconds as "0:00.00"', () => {
      expect(formatRaceTime(0)).toBe('0:00.00');
    });

    it('formats 1 second as "0:01.00"', () => {
      expect(formatRaceTime(1)).toBe('0:01.00');
    });

    it('formats 5.5 seconds as "0:05.50"', () => {
      expect(formatRaceTime(5.5)).toBe('0:05.50');
    });

    it('formats 9.99 seconds as "0:09.99"', () => {
      expect(formatRaceTime(9.99)).toBe('0:09.99');
    });
  });

  describe('minute boundaries', () => {
    it('formats 59.99 seconds as "0:59.99"', () => {
      expect(formatRaceTime(59.99)).toBe('0:59.99');
    });

    it('formats 60 seconds as "1:00.00"', () => {
      expect(formatRaceTime(60)).toBe('1:00.00');
    });

    it('formats 61 seconds as "1:01.00"', () => {
      expect(formatRaceTime(61)).toBe('1:01.00');
    });

    it('formats 83.456 seconds as "1:23.45"', () => {
      expect(formatRaceTime(83.456)).toBe('1:23.45');
    });

    it('formats 611.5 seconds as "10:11.50"', () => {
      expect(formatRaceTime(611.5)).toBe('10:11.50');
    });
  });

  describe('centisecond rounding', () => {
    it('floors centiseconds: 1.004 -> "0:01.00"', () => {
      expect(formatRaceTime(1.004)).toBe('0:01.00');
    });

    it('floors centiseconds: 1.005 -> "0:01.00" (truncates, does not round)', () => {
      expect(formatRaceTime(1.005)).toBe('0:01.00');
    });

    it('floors centiseconds: 1.999 -> "0:01.99" (does not round up)', () => {
      const result = formatRaceTime(1.999);
      expect(result).toBe('0:01.99');
    });

    it('handles flooring at 59.999 seconds', () => {
      const result = formatRaceTime(59.999);
      expect(result).toBe('0:59.99');
    });
  });

  describe('padding', () => {
    it('pads seconds with leading zero: 5 seconds -> "0:05.00"', () => {
      expect(formatRaceTime(5)).toBe('0:05.00');
    });

    it('pads centiseconds with leading zero: 1.1 seconds -> "0:01.10"', () => {
      expect(formatRaceTime(1.1)).toBe('0:01.10');
    });

    it('pads centiseconds with zero: 60.001 seconds -> "1:00.00"', () => {
      expect(formatRaceTime(60.001)).toBe('1:00.00');
    });
  });

  describe('edge cases', () => {
    it('returns "?:??.??" for NaN', () => {
      expect(formatRaceTime(NaN)).toBe('?:??.??');
    });

    it('returns "?:??.??" for Infinity', () => {
      expect(formatRaceTime(Infinity)).toBe('?:??.??');
    });

    it('returns "?:??.??" for negative Infinity', () => {
      expect(formatRaceTime(-Infinity)).toBe('?:??.??');
    });

    it('returns "?:??.??" for negative seconds', () => {
      expect(formatRaceTime(-5)).toBe('?:??.??');
    });
  });
});

describe('formatHud (integration)', () => {
  describe('position formatting', () => {
    it('formats position 1 as "1st"', () => {
      const hud = formatHud(readout({ position: 1 }));
      expect(hud.position).toBe('1st');
    });

    it('formats position 2 as "2nd"', () => {
      const hud = formatHud(readout({ position: 2 }));
      expect(hud.position).toBe('2nd');
    });

    it('formats position 11 as "11th" (not "11st")', () => {
      const hud = formatHud(readout({ position: 11 }));
      expect(hud.position).toBe('11th');
    });

    it('handles non-finite position gracefully', () => {
      const hud = formatHud(readout({ position: NaN }));
      expect(hud.position).toBe('?');
    });
  });

  describe('lap formatting', () => {
    it('formats lap count and total', () => {
      const hud = formatHud(readout({ lap: 2, totalLaps: 3 }));
      expect(hud.lap).toBe('LAP 2/3');
    });

    it('clamps lap to not exceed totalLaps', () => {
      const hud = formatHud(readout({ lap: 4, totalLaps: 3 }));
      expect(hud.lap).toBe('LAP 3/3');
      expect(hud.lap).not.toBe('LAP 4/3');
    });

    it('displays LAP 0/3 when no laps completed', () => {
      const hud = formatHud(readout({ lap: 0, totalLaps: 3 }));
      expect(hud.lap).toBe('LAP 0/3');
    });

    it('handles zero laps completed and zero total laps', () => {
      const hud = formatHud(readout({ lap: 0, totalLaps: 0 }));
      expect(hud.lap).toBe('LAP 0/0');
    });

    it('clamps negative lap count to 0', () => {
      const hud = formatHud(readout({ lap: -5, totalLaps: 3 }));
      expect(hud.lap).toBe('LAP 0/3');
    });

    it('clamps negative total laps to 0', () => {
      const hud = formatHud(readout({ lap: 2, totalLaps: -1 }));
      expect(hud.lap).toBe('LAP 0/0');
    });

    it('handles NaN lap gracefully', () => {
      const hud = formatHud(readout({ lap: NaN, totalLaps: 3 }));
      // NaN is not finite, so Math.max(0, Math.min(NaN, 3)) -> 0
      expect(hud.lap).toBe('LAP 0/3');
    });
  });

  describe('time formatting', () => {
    it('formats elapsed time', () => {
      const hud = formatHud(readout({ elapsedSeconds: 83.456 }));
      expect(hud.time).toBe('1:23.45');
    });

    it('formats zero elapsed time', () => {
      const hud = formatHud(readout({ elapsedSeconds: 0 }));
      expect(hud.time).toBe('0:00.00');
    });

    it('handles non-finite elapsed time', () => {
      const hud = formatHud(readout({ elapsedSeconds: NaN }));
      expect(hud.time).toBe('?:??.??');
    });
  });

  describe('ammo formatting', () => {
    it('formats ammo count and capacity', () => {
      const hud = formatHud(readout({ ammo: 3, ammoCapacity: 5 }));
      expect(hud.ammo).toBe('AMMO 3/5');
    });

    it('displays ammo at zero', () => {
      const hud = formatHud(readout({ ammo: 0, ammoCapacity: 5 }));
      expect(hud.ammo).toBe('AMMO 0/5');
    });

    it('displays ammo at capacity', () => {
      const hud = formatHud(readout({ ammo: 5, ammoCapacity: 5 }));
      expect(hud.ammo).toBe('AMMO 5/5');
    });

    it('clamps negative ammo to 0', () => {
      const hud = formatHud(readout({ ammo: -1, ammoCapacity: 5 }));
      expect(hud.ammo).toBe('AMMO 0/5');
    });

    it('clamps negative ammo capacity to 0', () => {
      const hud = formatHud(readout({ ammo: 3, ammoCapacity: -1 }));
      expect(hud.ammo).toBe('AMMO 3/0');
    });

    it('handles NaN ammo gracefully', () => {
      const hud = formatHud(readout({ ammo: NaN, ammoCapacity: 5 }));
      expect(hud.ammo).toBe('AMMO 0/5');
    });

    it('shows missile / mine / oil counts when the loadout is present', () => {
      const hud = formatHud(readout({ ammo: 3, ammoCapacity: 5, oil: 2, mines: 1 }));
      expect(hud.ammo).toBe('3  1  2');
    });

    it('appends turbo charges after the weapon loadout', () => {
      const hud = formatHud(readout({ ammo: 3, ammoCapacity: 5, oil: 2, mines: 1, turbos: 4 }));
      expect(hud.ammo).toBe('3  1  2  4');
    });

  });

  describe('countdown formatting', () => {
    it('shows "3" when countdown is between 3 and 4 seconds', () => {
      const hud = formatHud(
        readout({
          phase: RACE_PHASE.COUNTDOWN,
          countdownRemaining: 3.5,
        }),
      );
      expect(hud.countdown).toBe('3');
    });

    it('shows "2" when countdown is between 2 and 3 seconds', () => {
      const hud = formatHud(
        readout({
          phase: RACE_PHASE.COUNTDOWN,
          countdownRemaining: 2.9,
        }),
      );
      expect(hud.countdown).toBe('2');
    });

    it('shows "1" when countdown is between 1 and 2 seconds', () => {
      const hud = formatHud(
        readout({
          phase: RACE_PHASE.COUNTDOWN,
          countdownRemaining: 1.5,
        }),
      );
      expect(hud.countdown).toBe('1');
    });

    it('shows "GOOOO!" during the final second (0 < countdown <= 1)', () => {
      const hud = formatHud(
        readout({
          phase: RACE_PHASE.COUNTDOWN,
          countdownRemaining: 0.5,
        }),
      );
      expect(hud.countdown).toBe('GOOOO!');
    });

    it('shows "GOOOO!" at exactly 1 second remaining', () => {
      const hud = formatHud(
        readout({
          phase: RACE_PHASE.COUNTDOWN,
          countdownRemaining: 1.0,
        }),
      );
      expect(hud.countdown).toBe('GOOOO!');
    });

    it('shows null when countdown reaches zero (in COUNTDOWN phase)', () => {
      const hud = formatHud(
        readout({
          phase: RACE_PHASE.COUNTDOWN,
          countdownRemaining: 0,
        }),
      );
      expect(hud.countdown).toBeNull();
    });

    it('shows null when phase is RACING', () => {
      const hud = formatHud(
        readout({
          phase: RACE_PHASE.RACING,
          countdownRemaining: 3.5,
        }),
      );
      expect(hud.countdown).toBeNull();
    });

    it('shows null when phase is FINISHED', () => {
      const hud = formatHud(
        readout({
          phase: RACE_PHASE.FINISHED,
          countdownRemaining: 0,
        }),
      );
      expect(hud.countdown).toBeNull();
    });

    it('shows null when countdown is negative (race already started)', () => {
      const hud = formatHud(
        readout({
          phase: RACE_PHASE.COUNTDOWN,
          countdownRemaining: -1,
        }),
      );
      expect(hud.countdown).toBeNull();
    });

    it('handles NaN countdownRemaining during COUNTDOWN phase', () => {
      const hud = formatHud(
        readout({
          phase: RACE_PHASE.COUNTDOWN,
          countdownRemaining: NaN,
        }),
      );
      // NaN is not finite, so formatCountdown should return null
      expect(hud.countdown).toBeNull();
    });
  });

  describe('integrity formatting', () => {
    it('formats integrity 1.0 as 100%', () => {
      const hud = formatHud(readout({ integrity: 1.0 }));
      expect(hud.integrityPercent).toBe(100);
    });

    it('formats integrity 0.5 as 50%', () => {
      const hud = formatHud(readout({ integrity: 0.5 }));
      expect(hud.integrityPercent).toBe(50);
    });

    it('formats integrity 0 as 0%', () => {
      const hud = formatHud(readout({ integrity: 0 }));
      expect(hud.integrityPercent).toBe(0);
    });

    it('clamps integrity > 1 to 100%', () => {
      const hud = formatHud(readout({ integrity: 1.5 }));
      expect(hud.integrityPercent).toBe(100);
    });

    it('clamps integrity < 0 to 0%', () => {
      const hud = formatHud(readout({ integrity: -0.5 }));
      expect(hud.integrityPercent).toBe(0);
    });

    it('rounds integrity to nearest percent', () => {
      const hud1 = formatHud(readout({ integrity: 0.504 }));
      expect(hud1.integrityPercent).toBe(50);

      const hud2 = formatHud(readout({ integrity: 0.505 }));
      expect(hud2.integrityPercent).toBe(51);
    });

    it('returns 0% for NaN integrity', () => {
      const hud = formatHud(readout({ integrity: NaN }));
      expect(hud.integrityPercent).toBe(0);
    });

    it('returns 0% for Infinity integrity', () => {
      const hud = formatHud(readout({ integrity: Infinity }));
      expect(hud.integrityPercent).toBe(0);
    });

    it('returns 0% for -Infinity integrity', () => {
      const hud = formatHud(readout({ integrity: -Infinity }));
      expect(hud.integrityPercent).toBe(0);
    });
  });

  describe('all numeric fields with NaN/Infinity', () => {
    it('never outputs NaN or Infinity in any string field', () => {
      const hud = formatHud(
        readout({
          position: NaN,
          elapsedSeconds: Infinity,
          lap: -Infinity,
          ammo: NaN,
          countdownRemaining: Infinity,
          integrity: -Infinity,
          speed: NaN,
          maxSpeed: Infinity,
        }),
      );

      const allStrings = [
        hud.position,
        hud.lap,
        hud.time,
        hud.ammo,
        hud.speed,
        hud.speedDigits,
        hud.countdown ?? '',
      ].join('|');
      expect(allStrings).not.toContain('NaN');
      expect(allStrings).not.toContain('Infinity');
    });
  });

  describe('trailing whitespace', () => {
    it('no string field has trailing whitespace (default readout)', () => {
      const hud = formatHud(readout());
      expect(hud.position).not.toMatch(/\s$/);
      expect(hud.lap).not.toMatch(/\s$/);
      expect(hud.time).not.toMatch(/\s$/);
      expect(hud.ammo).not.toMatch(/\s$/);
      expect(hud.speed).not.toMatch(/\s$/);
      // speedDigits is deliberately LEFT-padded ("  0", " 78"), so it is allowed to
      // have leading whitespace. Only a TRAILING space would be a bug (it would shift
      // the three seven-segment cells the field is meant to fill exactly).
      expect(hud.speedDigits).not.toMatch(/\s$/);
      if (hud.countdown !== null) {
        expect(hud.countdown).not.toMatch(/\s$/);
      }
    });

    it('no string field has trailing whitespace (with bad inputs)', () => {
      const hud = formatHud(
        readout({
          position: NaN,
          lap: -5,
          totalLaps: -1,
          elapsedSeconds: Infinity,
          ammo: NaN,
          ammoCapacity: -1,
          integrity: -Infinity,
          speed: -Infinity,
          maxSpeed: NaN,
        }),
      );
      expect(hud.position).not.toMatch(/\s$/);
      expect(hud.lap).not.toMatch(/\s$/);
      expect(hud.time).not.toMatch(/\s$/);
      expect(hud.ammo).not.toMatch(/\s$/);
      expect(hud.speed).not.toMatch(/\s$/);
      expect(hud.speedDigits).not.toMatch(/\s$/);
      if (hud.countdown !== null) {
        expect(hud.countdown).not.toMatch(/\s$/);
      }
    });

    it('no string field has trailing whitespace (countdown race)', () => {
      const hud = formatHud(
        readout({
          phase: RACE_PHASE.COUNTDOWN,
          countdownRemaining: 0.5,
        }),
      );
      expect(hud.position).not.toMatch(/\s$/);
      expect(hud.lap).not.toMatch(/\s$/);
      expect(hud.time).not.toMatch(/\s$/);
      expect(hud.ammo).not.toMatch(/\s$/);
      expect(hud.speed).not.toMatch(/\s$/);
      expect(hud.speedDigits).not.toMatch(/\s$/);
      if (hud.countdown !== null) {
        expect(hud.countdown).not.toMatch(/\s$/);
      }
    });

    it('speedDigits is allowed leading whitespace but is always exactly 3 characters', () => {
      const hud = formatHud(readout({ speed: 0 }));
      expect(hud.speedDigits).toBe('  0');
      expect(hud.speedDigits).toHaveLength(3);
    });
  });

  describe('formatSpeed', () => {
    it('formats 0 as "0 MPH"', () => {
      expect(formatSpeed(0)).toBe('0 MPH');
    });

    it('formats 78 u/s (marauder maxSpeed) as "195 MPH"', () => {
      expect(formatSpeed(78)).toBe('195 MPH');
    });

    it('formats 95 u/s (air-blade maxSpeed) as "237 MPH"', () => {
      expect(formatSpeed(95)).toBe('237 MPH');
    });

    it('always ends in " MPH"', () => {
      expect(formatSpeed(12.3)).toMatch(/ MPH$/);
      expect(formatSpeed(0)).toMatch(/ MPH$/);
      expect(formatSpeed(-40)).toMatch(/ MPH$/);
    });

    describe('rounding', () => {
      it('rounds 31.2 u/s to a whole MPH number', () => {
        expect(formatSpeed(31.2)).toBe('78 MPH');
      });

      it('rounds 31.3 u/s to a whole MPH number', () => {
        expect(formatSpeed(31.3)).toBe('78 MPH');
      });
    });

    describe('non-finite input', () => {
      it('returns a finite "0 MPH"-shaped string for NaN, never "NaN MPH"', () => {
        const result = formatSpeed(NaN);
        expect(result).toBe('0 MPH');
        expect(result).not.toContain('NaN');
      });

      it('returns a finite "0 MPH"-shaped string for Infinity, never "Infinity MPH"', () => {
        const result = formatSpeed(Infinity);
        expect(result).toBe('0 MPH');
        expect(result).not.toContain('Infinity');
      });

      it('returns a finite "0 MPH"-shaped string for -Infinity, never "-Infinity MPH"', () => {
        const result = formatSpeed(-Infinity);
        expect(result).toBe('0 MPH');
        expect(result).not.toContain('Infinity');
      });
    });

    it('formats a negative speed (reversing) as its magnitude', () => {
      expect(formatSpeed(-78)).toBe('195 MPH');
    });
  });

  describe('formatSpeedDigits', () => {
    it('formats 0 as "  0"', () => {
      expect(formatSpeedDigits(0)).toBe('  0');
    });

    it('formats 78 u/s (marauder maxSpeed) as "195"', () => {
      expect(formatSpeedDigits(78)).toBe('195');
    });

    it('formats 95 u/s (air-blade maxSpeed) as "237"', () => {
      expect(formatSpeedDigits(95)).toBe('237');
    });

    it('space-pads a two-digit result to three characters', () => {
      // 31.2 u/s * 2.5 MPH_PER_WORLD_UNIT = 78, which is two digits.
      expect(formatSpeedDigits(31.2)).toBe(' 78');
    });

    describe('always exactly 3 characters', () => {
      const inputs = [0, 1, 31.2, 78, 95, 399.6, 999, 1000, 1e9, -78, -1e9, NaN, Infinity, -Infinity];

      inputs.forEach(input => {
        it(`is exactly 3 characters for input ${input}`, () => {
          expect(formatSpeedDigits(input)).toHaveLength(3);
        });
      });
    });

    describe('clamping', () => {
      it('clamps a value that would exceed 999 to "999"', () => {
        // 1000 u/s * 2.5 = 2500 MPH, far past the three-cell display's ceiling.
        expect(formatSpeedDigits(1000)).toBe('999');
      });

      it('clamps a huge value to "999"', () => {
        expect(formatSpeedDigits(1e9)).toBe('999');
      });
    });

    describe('non-finite input', () => {
      it('returns "  0" for NaN', () => {
        expect(formatSpeedDigits(NaN)).toBe('  0');
      });

      it('returns "  0" for Infinity', () => {
        expect(formatSpeedDigits(Infinity)).toBe('  0');
      });

      it('returns "  0" for -Infinity', () => {
        expect(formatSpeedDigits(-Infinity)).toBe('  0');
      });
    });

    it('formats a negative speed (reversing) as its magnitude', () => {
      expect(formatSpeedDigits(-78)).toBe('195');
    });

    describe('agreement with formatSpeed', () => {
      // The number embedded in formatSpeed's "<n> MPH" string must always match the
      // digits from formatSpeedDigits, parsed back to a number. If these two ever
      // disagreed, the seven-segment gauge and the text readout would show different
      // speeds for the same car at the same instant.
      const speeds = [0, 1, 12.3, 31.2, 31.3, 39, 78, 95, 100, 500, 999.4, 1000, 1e6, -40, -78, NaN, Infinity, -Infinity];

      speeds.forEach(speed => {
        it(`agrees with formatSpeed for speed=${speed}`, () => {
          const fromSpeedText = formatSpeed(speed);
          const parsedFromSpeed = Number(fromSpeedText.replace(' MPH', ''));
          const parsedFromDigits = Number(formatSpeedDigits(speed).trim());

          // Only compare when formatSpeed's value itself is below the digits' clamp
          // ceiling; above 999 formatSpeedDigits intentionally caps while formatSpeed
          // does not, so the two are allowed to diverge only in that guarded range.
          if (parsedFromSpeed <= 999) {
            expect(parsedFromDigits).toBe(parsedFromSpeed);
          } else {
            expect(parsedFromDigits).toBe(999);
          }
        });
      });
    });
  });

  describe('speedFraction (via formatHud)', () => {
    it('is 0 at rest', () => {
      const hud = formatHud(readout({ speed: 0, maxSpeed: 78 }));
      expect(hud.speedFraction).toBe(0);
    });

    it('is 1 at maxSpeed', () => {
      const hud = formatHud(readout({ speed: 78, maxSpeed: 78 }));
      expect(hud.speedFraction).toBe(1);
    });

    it('is clamped to 1, not above, during a post-collision overspeed of 1.2x maxSpeed', () => {
      const hud = formatHud(readout({ speed: 78 * 1.2, maxSpeed: 78 }));
      expect(hud.speedFraction).toBe(1);
    });

    it('is exactly 0.5 at half of maxSpeed', () => {
      const hud = formatHud(readout({ speed: 39, maxSpeed: 78 }));
      expect(hud.speedFraction).toBe(0.5);
    });

    it('is finite and 0 when maxSpeed is 0', () => {
      const hud = formatHud(readout({ speed: 50, maxSpeed: 0 }));
      expect(hud.speedFraction).toBe(0);
      expect(Number.isFinite(hud.speedFraction)).toBe(true);
    });

    it('is finite and 0 when maxSpeed is negative', () => {
      const hud = formatHud(readout({ speed: 50, maxSpeed: -78 }));
      expect(hud.speedFraction).toBe(0);
      expect(Number.isFinite(hud.speedFraction)).toBe(true);
    });

    it('is finite and 0 when maxSpeed is NaN', () => {
      const hud = formatHud(readout({ speed: 50, maxSpeed: NaN }));
      expect(hud.speedFraction).toBe(0);
      expect(Number.isFinite(hud.speedFraction)).toBe(true);
    });

    it('is finite and 0 when maxSpeed is Infinity', () => {
      const hud = formatHud(readout({ speed: 50, maxSpeed: Infinity }));
      expect(hud.speedFraction).toBe(0);
      expect(Number.isFinite(hud.speedFraction)).toBe(true);
    });
  });

  describe('realistic race scenarios', () => {
    it('formats a typical mid-race HUD display', () => {
      const hud = formatHud(
        readout({
          phase: RACE_PHASE.RACING,
          countdownRemaining: 0,
          elapsedSeconds: 45.67,
          position: 2,
          totalRacers: 4,
          lap: 1,
          totalLaps: 3,
          ammo: 2,
          ammoCapacity: 5,
          integrity: 0.75,
        }),
      );

      expect(hud.position).toBe('2nd');
      expect(hud.lap).toBe('LAP 1/3');
      expect(hud.time).toBe('0:45.67');
      expect(hud.ammo).toBe('AMMO 2/5');
      expect(hud.countdown).toBeNull();
      expect(hud.integrityPercent).toBe(75);
    });

    it('formats a race finish display', () => {
      const hud = formatHud(
        readout({
          phase: RACE_PHASE.FINISHED,
          countdownRemaining: 0,
          elapsedSeconds: 125.89,
          position: 1,
          totalRacers: 4,
          lap: 3,
          totalLaps: 3,
          ammo: 1,
          ammoCapacity: 5,
          integrity: 0.3,
        }),
      );

      expect(hud.position).toBe('1st');
      expect(hud.lap).toBe('LAP 3/3');
      expect(hud.time).toBe('2:05.89');
      expect(hud.ammo).toBe('AMMO 1/5');
      expect(hud.countdown).toBeNull();
      expect(hud.integrityPercent).toBe(30);
    });

    it('formats a countdown start display', () => {
      const hud = formatHud(
        readout({
          phase: RACE_PHASE.COUNTDOWN,
          countdownRemaining: 2.3,
          elapsedSeconds: 0,
          position: 2,
          totalRacers: 4,
          lap: 0,
          totalLaps: 3,
          ammo: 5,
          ammoCapacity: 5,
          integrity: 1.0,
        }),
      );

      expect(hud.position).toBe('2nd');
      expect(hud.lap).toBe('LAP 0/3');
      expect(hud.time).toBe('0:00.00');
      expect(hud.ammo).toBe('AMMO 5/5');
      expect(hud.countdown).toBe('2');
      expect(hud.integrityPercent).toBe(100);
    });
  });
});
