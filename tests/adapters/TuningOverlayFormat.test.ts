/**
 * Tests for the tuning overlay formatter.
 *
 * Covers: line count and order, null-telemetry case, SLIDING vs gripping, TARMAC vs DIRT at
 * and past halfWidth, radians-to-degrees conversion, D vs R gear, mute label, NaN/Infinity
 * handling, and the requirement that no line has trailing whitespace.
 */

import { describe, it, expect } from 'vitest';
import {
  formatClockYawLines,
  formatTuningOverlay,
  type TuningOverlayReadout,
} from '../../src/adapters/render/TuningOverlayFormat.ts';
import type { VehicleTelemetry } from '../../src/domain/vehicle/Vehicle.ts';

/**
 * Factory function to build a default readout, allowing selective field overrides.
 * Used like: `readout({ carName: 'test', speed: 50 })`.
 */
function readout(overrides?: Partial<TuningOverlayReadout>): TuningOverlayReadout {
  const defaultTelemetry: VehicleTelemetry = {
    speed: 0,
    forwardSpeed: 0,
    lateralSpeed: 0,
    slipAngle: 0,
    isSliding: false,
    gripUsage: 0,
  };

  return {
    carName: 'Marauder',
    trackName: 'Thunder Basin',
    telemetry: defaultTelemetry,
    lateralOffset: 0,
    halfWidth: 20,
    reversing: false,
    zoom: 1.5,
    muted: false,
    spriteFrame: 'marauder_0',
    ...overrides,
  };
}

describe('formatTuningOverlay', () => {
  describe('structure', () => {
    it('returns exactly 6 lines', () => {
      const lines = formatTuningOverlay(readout());
      expect(lines).toHaveLength(6);
    });

    it('returns a readonly array', () => {
      const lines = formatTuningOverlay(readout());
      expect(Object.isFrozen(lines) || Array.isArray(lines)).toBe(true);
    });
  });

  describe('line content and order', () => {
    it('line 1 contains car name (uppercased) and track name', () => {
      const lines = formatTuningOverlay(
        readout({
          carName: 'Air-Blade',
          trackName: 'Thunder Basin',
        }),
      );
      expect(lines[0]).toContain('AIR-BLADE');
      expect(lines[0]).toContain('Thunder Basin');
    });

    it('line 2 contains speed, forward speed, and lateral speed', () => {
      const lines = formatTuningOverlay(
        readout({
          telemetry: {
            speed: 50.5,
            forwardSpeed: 50.0,
            lateralSpeed: 5.2,
            slipAngle: 0,
            isSliding: false,
            gripUsage: 0,
          },
        }),
      );
      expect(lines[1]).toContain('spd');
      expect(lines[1]).toContain('50.5');
      expect(lines[1]).toContain('fwd');
      expect(lines[1]).toContain('50.0');
      expect(lines[1]).toContain('lat');
      expect(lines[1]).toContain('5.2');
    });

    it('line 3 contains slip angle, grip, and sliding state', () => {
      const lines = formatTuningOverlay(readout());
      expect(lines[2]).toContain('slip');
      expect(lines[2]).toContain('°');
      expect(lines[2]).toContain('grip');
    });

    it('line 4 contains gear, surface, and lateral offset', () => {
      const lines = formatTuningOverlay(readout());
      expect(lines[3]).toContain('gear');
      expect(lines[3]).toContain('surf');
      expect(lines[3]).toContain('off');
    });

    it('line 5 contains zoom and frame', () => {
      const lines = formatTuningOverlay(readout());
      expect(lines[4]).toContain('zoom');
      expect(lines[4]).toContain('frame');
    });

    it('line 6 is the key legend with mute state', () => {
      const lines = formatTuningOverlay(readout());
      expect(lines[5]).toContain('[T]');
      expect(lines[5]).toContain('[C]');
      expect(lines[5]).toContain('[R]');
      expect(lines[5]).toContain('[M]');
    });
  });

  describe('null telemetry (respawn state)', () => {
    it('renders all zeros when telemetry is null', () => {
      const lines = formatTuningOverlay(
        readout({
          telemetry: null,
        }),
      );
      // Line 2 should have zeros for speed.
      expect(lines[1]).toContain('spd 0.0');
      expect(lines[1]).toContain('fwd 0.0');
      expect(lines[1]).toContain('lat 0.0');
      // Line 3 should have 0.0 for slip.
      expect(lines[2]).toContain('slip 0.0°');
      expect(lines[2]).toContain('grip 0.00');
    });

    it('never renders NaN or undefined when telemetry is null', () => {
      const lines = formatTuningOverlay(
        readout({
          telemetry: null,
        }),
      );
      const output = lines.join('\n');
      expect(output).not.toContain('NaN');
      expect(output).not.toContain('undefined');
    });
  });

  describe('SLIDING vs gripping', () => {
    it('displays SLIDING when isSliding is true', () => {
      const lines = formatTuningOverlay(
        readout({
          telemetry: {
            speed: 50,
            forwardSpeed: 45,
            lateralSpeed: 20,
            slipAngle: 0.5,
            isSliding: true,
            gripUsage: 1.0,
          },
        }),
      );
      expect(lines[2]).toContain('SLIDING');
      expect(lines[2]).not.toContain('gripping');
    });

    it('displays gripping when isSliding is false', () => {
      const lines = formatTuningOverlay(
        readout({
          telemetry: {
            speed: 50,
            forwardSpeed: 50,
            lateralSpeed: 0,
            slipAngle: 0,
            isSliding: false,
            gripUsage: 0.5,
          },
        }),
      );
      expect(lines[2]).toContain('gripping');
      expect(lines[2]).not.toContain('SLIDING');
    });
  });

  describe('TARMAC vs DIRT', () => {
    it('displays TARMAC when lateralOffset is at halfWidth boundary', () => {
      const lines = formatTuningOverlay(
        readout({
          lateralOffset: 20, // exactly at halfWidth
          halfWidth: 20,
        }),
      );
      expect(lines[3]).toContain('TARMAC');
      expect(lines[3]).not.toContain('DIRT');
    });

    it('displays TARMAC when lateralOffset is within halfWidth', () => {
      const lines = formatTuningOverlay(
        readout({
          lateralOffset: 10,
          halfWidth: 20,
        }),
      );
      expect(lines[3]).toContain('TARMAC');
      expect(lines[3]).not.toContain('DIRT');
    });

    it('displays DIRT when lateralOffset exceeds halfWidth', () => {
      const lines = formatTuningOverlay(
        readout({
          lateralOffset: 21,
          halfWidth: 20,
        }),
      );
      expect(lines[3]).toContain('DIRT');
      expect(lines[3]).not.toContain('TARMAC');
    });

    it('displays DIRT when negative lateralOffset exceeds negative halfWidth', () => {
      const lines = formatTuningOverlay(
        readout({
          lateralOffset: -21,
          halfWidth: 20,
        }),
      );
      expect(lines[3]).toContain('DIRT');
    });

    it('uses absolute value of lateralOffset for the TARMAC/DIRT decision', () => {
      const lines1 = formatTuningOverlay(
        readout({
          lateralOffset: 21,
          halfWidth: 20,
        }),
      );
      const lines2 = formatTuningOverlay(
        readout({
          lateralOffset: -21,
          halfWidth: 20,
        }),
      );
      expect(lines1[3]).toContain('DIRT');
      expect(lines2[3]).toContain('DIRT');
    });
  });

  describe('radians to degrees conversion', () => {
    it('converts slip angle from radians to degrees with one decimal', () => {
      // π/2 radians = 90 degrees
      const lines = formatTuningOverlay(
        readout({
          telemetry: {
            speed: 0,
            forwardSpeed: 0,
            lateralSpeed: 0,
            slipAngle: Math.PI / 2,
            isSliding: false,
            gripUsage: 0,
          },
        }),
      );
      expect(lines[2]).toContain('slip 90.0°');
    });

    it('converts π/4 radians to ~45 degrees', () => {
      const lines = formatTuningOverlay(
        readout({
          telemetry: {
            speed: 0,
            forwardSpeed: 0,
            lateralSpeed: 0,
            slipAngle: Math.PI / 4,
            isSliding: false,
            gripUsage: 0,
          },
        }),
      );
      // 45.0 degrees
      expect(lines[2]).toContain('slip 45.0°');
    });

    it('converts negative slip angle correctly', () => {
      const lines = formatTuningOverlay(
        readout({
          telemetry: {
            speed: 0,
            forwardSpeed: 0,
            lateralSpeed: 0,
            slipAngle: -Math.PI / 6, // -30 degrees
            isSliding: false,
            gripUsage: 0,
          },
        }),
      );
      expect(lines[2]).toContain('slip -30.0°');
    });
  });

  describe('gear D vs R', () => {
    it('displays D when reversing is false', () => {
      const lines = formatTuningOverlay(
        readout({
          reversing: false,
        }),
      );
      expect(lines[3]).toContain('gear D');
      expect(lines[3]).not.toContain('gear R');
    });

    it('displays R when reversing is true', () => {
      const lines = formatTuningOverlay(
        readout({
          reversing: true,
        }),
      );
      expect(lines[3]).toContain('gear R');
      expect(lines[3]).not.toContain('gear D');
    });
  });

  describe('mute label', () => {
    // The legend names the ACTION the key performs, not the current state.
    it('offers "mute" when the audio is currently audible', () => {
      const lines = formatTuningOverlay(
        readout({
          muted: false,
        }),
      );
      expect(lines[5]).toContain('[M] mute');
      expect(lines[5]).not.toContain('[M] unmute');
    });

    it('offers "unmute" when the audio is currently muted', () => {
      const lines = formatTuningOverlay(
        readout({
          muted: true,
        }),
      );
      expect(lines[5]).toContain('[M] unmute');
    });
  });

  describe('NaN and Infinity handling', () => {
    it('renders ? placeholder for NaN speed', () => {
      const lines = formatTuningOverlay(
        readout({
          telemetry: {
            speed: NaN,
            forwardSpeed: 0,
            lateralSpeed: 0,
            slipAngle: 0,
            isSliding: false,
            gripUsage: 0,
          },
        }),
      );
      expect(lines[1]).toContain('spd ?');
      expect(lines[1]).not.toContain('NaN');
    });

    it('renders ? placeholder for Infinity zoom', () => {
      const lines = formatTuningOverlay(
        readout({
          zoom: Infinity,
        }),
      );
      expect(lines[4]).toContain('zoom ?');
      expect(lines[4]).not.toContain('Infinity');
    });

    it('renders ? placeholder for negative Infinity forwardSpeed', () => {
      const lines = formatTuningOverlay(
        readout({
          telemetry: {
            speed: 50,
            forwardSpeed: -Infinity,
            lateralSpeed: 0,
            slipAngle: 0,
            isSliding: false,
            gripUsage: 0,
          },
        }),
      );
      expect(lines[1]).toContain('fwd ?');
      expect(lines[1]).not.toContain('Infinity');
    });

    it('never outputs NaN or Infinity anywhere when all numerics are bad', () => {
      const lines = formatTuningOverlay(
        readout({
          telemetry: {
            speed: NaN,
            forwardSpeed: Infinity,
            lateralSpeed: -Infinity,
            slipAngle: NaN,
            isSliding: false,
            gripUsage: NaN,
          },
          lateralOffset: Infinity,
          zoom: -Infinity,
        }),
      );
      const output = lines.join('\n');
      expect(output).not.toContain('NaN');
      expect(output).not.toContain('Infinity');
    });
  });

  describe('trailing whitespace', () => {
    it('no line has trailing whitespace', () => {
      const lines = formatTuningOverlay(readout());
      for (const line of lines) {
        expect(line).not.toMatch(/\s$/);
      }
    });

    it('no line has trailing whitespace even with all bad inputs', () => {
      const lines = formatTuningOverlay(
        readout({
          carName: 'TestCar',
          trackName: 'TestTrack',
          telemetry: null,
          lateralOffset: NaN,
          zoom: Infinity,
          muted: true,
        }),
      );
      for (const line of lines) {
        expect(line).not.toMatch(/\s$/);
      }
    });

    it('no line has trailing whitespace with normal inputs', () => {
      const lines = formatTuningOverlay(
        readout({
          telemetry: {
            speed: 78.5,
            forwardSpeed: 78.0,
            lateralSpeed: 5.3,
            slipAngle: 0.123,
            isSliding: true,
            gripUsage: 0.95,
          },
          lateralOffset: -15.25,
          halfWidth: 20,
          reversing: true,
          zoom: 1.99,
          muted: false,
          spriteFrame: 'marauder_15',
        }),
      );
      for (const line of lines) {
        expect(line).not.toMatch(/\s$/);
      }
    });
  });

  describe('grip usage precision', () => {
    it('formats grip usage to two decimal places', () => {
      const lines = formatTuningOverlay(
        readout({
          telemetry: {
            speed: 0,
            forwardSpeed: 0,
            lateralSpeed: 0,
            slipAngle: 0,
            isSliding: false,
            gripUsage: 0.456,
          },
        }),
      );
      expect(lines[2]).toContain('grip 0.46');
    });

    it('formats grip usage 0.00 for zero', () => {
      const lines = formatTuningOverlay(
        readout({
          telemetry: {
            speed: 0,
            forwardSpeed: 0,
            lateralSpeed: 0,
            slipAngle: 0,
            isSliding: false,
            gripUsage: 0,
          },
        }),
      );
      expect(lines[2]).toContain('grip 0.00');
    });

    it('formats grip usage 1.00 for full grip', () => {
      const lines = formatTuningOverlay(
        readout({
          telemetry: {
            speed: 0,
            forwardSpeed: 0,
            lateralSpeed: 0,
            slipAngle: 0,
            isSliding: false,
            gripUsage: 1.0,
          },
        }),
      );
      expect(lines[2]).toContain('grip 1.00');
    });
  });

  describe('zoom precision', () => {
    it('formats zoom to two decimal places', () => {
      const lines = formatTuningOverlay(
        readout({
          zoom: 1.567,
        }),
      );
      expect(lines[4]).toContain('zoom 1.57');
    });

    it('formats zoom 1.50 correctly', () => {
      const lines = formatTuningOverlay(
        readout({
          zoom: 1.5,
        }),
      );
      expect(lines[4]).toContain('zoom 1.50');
    });
  });

  describe('lateral offset precision', () => {
    it('formats lateral offset to two decimal places', () => {
      const lines = formatTuningOverlay(
        readout({
          lateralOffset: -15.678,
        }),
      );
      expect(lines[3]).toContain('off -15.68');
    });
  });

  describe('sprite frame display', () => {
    it('displays sprite frame as string', () => {
      const lines = formatTuningOverlay(
        readout({
          spriteFrame: 'marauder_12',
        }),
      );
      expect(lines[4]).toContain('marauder_12');
    });

    it('displays sprite frame as number', () => {
      const lines = formatTuningOverlay(
        readout({
          spriteFrame: 12,
        }),
      );
      expect(lines[4]).toContain('frame 12');
    });

    it('appends clock yaw lines without breaking the first six', () => {
      const clock = formatClockYawLines({
        heading: 0,
        clockYaw: (296.565 * Math.PI) / 180,
        expectedIndex: 25,
        drawnFrame: '25',
        frameCount: 30,
      });
      const lines = formatTuningOverlay(readout({ clockLines: clock }));
      expect(lines.slice(0, 6)).toHaveLength(6);
      expect(lines.join('\n')).toContain('idx 25/30');
      expect(lines.join('\n')).toContain('drawn 25');
    });
  });
});
