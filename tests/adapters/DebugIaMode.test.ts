import { describe, expect, it } from 'vitest';

import {
  debugIaMixFromSearch,
  debugIaModeFromSearch,
  debugIaSeedFromSearch,
  debugIaTrackFromSearch,
} from '../../src/adapters/progress/DebugIaMode.ts';
import { debugIaLogFileName } from '../../src/adapters/debug/DebugIaReporter.ts';

describe('DebugIaMode', () => {
  it('accepts debugia query flags', () => {
    expect(debugIaModeFromSearch('?debugia=1')).toBe(true);
    expect(debugIaModeFromSearch('?watch=1')).toBe(false);
    expect(debugIaTrackFromSearch('?debugia=1&track=thunder-basin-2')).toBe('thunder-basin-2');
    expect(debugIaSeedFromSearch('?seed=123')).toBe(123);
    expect(debugIaMixFromSearch('?mix=2:2:2')).toEqual({ experts: 2, mediums: 2, bobos: 2 });
    expect(debugIaMixFromSearch('?debugia=1')).toBeUndefined();
  });

  it('names a per-driver run log', () => {
    expect(debugIaLogFileName('KLYFF', 'car-1')).toBe('KLYFF__car-1-run-1.log');
    expect(debugIaLogFileName('aline', 'car_13')).toBe('ALINE__car_13-run-1.log');
  });
});
