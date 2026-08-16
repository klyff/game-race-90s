import { describe, it, expect } from 'vitest';
import type { SlotProgress } from '../../src/domain/progress/SaveSlots.ts';
import {
  SLOT_COUNT,
  SAVE_BYTE_BUDGET,
  createEmptySave,
  createSlot,
  writeSlot,
  clearSlot,
  recordRaceResult,
  serializeSave,
  parseSave,
  fitsInCookie,
} from '../../src/domain/progress/SaveSlots.ts';

describe('SaveSlots', () => {
  describe('createEmptySave', () => {
    it('creates a save with exactly 3 null slots', () => {
      const save = createEmptySave();
      expect(save.slots).toHaveLength(SLOT_COUNT);
      expect(save.slots).toEqual([null, null, null]);
    });
  });

  describe('writeSlot and readback', () => {
    it('round-trips through serialization', () => {
      const save1 = createEmptySave();
      const slot = createSlot('KLY', 'marauder', 1000);
      const save2 = writeSlot(save1, 0, slot);
      const save3 = recordRaceResult(save2, 0, 'thunder-basin', 33.22, true, 2000);

      const serialized = serializeSave(save3);
      const parsed = parseSave(serialized);

      expect(parsed.slots[0]).toEqual(save3.slots[0]);
      expect(parsed.slots[1]).toEqual(null);
      expect(parsed.slots[2]).toEqual(null);
    });
  });

  describe('writeSlot out-of-bounds', () => {
    it('with index -1 leaves save unchanged', () => {
      const save = createEmptySave();
      const slot = createSlot('ABC', 'marauder', 1000);
      const result = writeSlot(save, -1, slot);
      expect(result).toEqual(save);
    });

    it('with index 3 leaves save unchanged', () => {
      const save = createEmptySave();
      const slot = createSlot('ABC', 'marauder', 1000);
      const result = writeSlot(save, 3, slot);
      expect(result).toEqual(save);
    });

    it('with index 99 leaves save unchanged', () => {
      const save = createEmptySave();
      const slot = createSlot('ABC', 'marauder', 1000);
      const result = writeSlot(save, 99, slot);
      expect(result).toEqual(save);
    });

    it('never throws', () => {
      const save = createEmptySave();
      const slot = createSlot('ABC', 'marauder', 1000);
      expect(() => writeSlot(save, -1, slot)).not.toThrow();
      expect(() => writeSlot(save, 3, slot)).not.toThrow();
      expect(() => writeSlot(save, 99, slot)).not.toThrow();
    });
  });

  describe('recordRaceResult lap tracking', () => {
    it('keeps the faster lap when a slower one arrives', () => {
      const save = createEmptySave();
      const slot = createSlot('KLY', 'marauder', 1000);
      let s = writeSlot(save, 0, slot);

      // First lap: 35 seconds
      s = recordRaceResult(s, 0, 'thunder-basin', 35.0, false, 2000);
      expect((s.slots[0] as SlotProgress).bestLaps['thunder-basin']).toBe(35.0);

      // Slower lap: 40 seconds
      s = recordRaceResult(s, 0, 'thunder-basin', 40.0, false, 3000);
      expect((s.slots[0] as SlotProgress).bestLaps['thunder-basin']).toBe(35.0);
    });

    it('replaces lap when a faster one arrives', () => {
      const save = createEmptySave();
      const slot = createSlot('KLY', 'marauder', 1000);
      let s = writeSlot(save, 0, slot);

      // First lap: 35 seconds
      s = recordRaceResult(s, 0, 'thunder-basin', 35.0, false, 2000);
      expect((s.slots[0] as SlotProgress).bestLaps['thunder-basin']).toBe(35.0);

      // Faster lap: 33 seconds
      s = recordRaceResult(s, 0, 'thunder-basin', 33.0, false, 3000);
      expect((s.slots[0] as SlotProgress).bestLaps['thunder-basin']).toBe(33.0);
    });
  });

  describe('recordRaceResult win tracking', () => {
    it('adds track to tracksWon only once even with multiple wins', () => {
      const save = createEmptySave();
      const slot = createSlot('KLY', 'marauder', 1000);
      let s = writeSlot(save, 0, slot);

      // First win
      s = recordRaceResult(s, 0, 'thunder-basin', 33.0, true, 2000);
      expect((s.slots[0] as SlotProgress).tracksWon).toEqual(['thunder-basin']);

      // Second win on same track
      s = recordRaceResult(s, 0, 'thunder-basin', 32.5, true, 3000);
      expect((s.slots[0] as SlotProgress).tracksWon).toEqual(['thunder-basin']);
    });

    it('adds new tracks to tracksWon without removing old ones', () => {
      const save = createEmptySave();
      const slot = createSlot('KLY', 'marauder', 1000);
      let s = writeSlot(save, 0, slot);

      s = recordRaceResult(s, 0, 'track-1', 30.0, true, 2000);
      s = recordRaceResult(s, 0, 'track-2', 35.0, true, 3000);
      s = recordRaceResult(s, 0, 'track-3', 40.0, true, 4000);

      expect((s.slots[0] as SlotProgress).tracksWon).toEqual([
        'track-1',
        'track-2',
        'track-3',
      ]);
    });

    it('does not add track when won is false', () => {
      const save = createEmptySave();
      const slot = createSlot('KLY', 'marauder', 1000);
      let s = writeSlot(save, 0, slot);

      s = recordRaceResult(s, 0, 'track-1', 30.0, false, 2000);
      expect((s.slots[0] as SlotProgress).tracksWon).toEqual([]);
    });

    it('bumps updatedAt on each call', () => {
      const save = createEmptySave();
      const slot = createSlot('KLY', 'marauder', 1000);
      let s = writeSlot(save, 0, slot);

      expect((s.slots[0] as SlotProgress).updatedAt).toBe(1000);

      s = recordRaceResult(s, 0, 'track-1', 30.0, true, 2000);
      expect((s.slots[0] as SlotProgress).updatedAt).toBe(2000);

      s = recordRaceResult(s, 0, 'track-1', 30.5, true, 3000);
      expect((s.slots[0] as SlotProgress).updatedAt).toBe(3000);
    });
  });

  describe('parseSave error handling', () => {
    it('returns empty save for empty string', () => {
      const result = parseSave('');
      expect(result).toEqual(createEmptySave());
    });

    it('returns empty save for non-JSON string', () => {
      const result = parseSave('not json');
      expect(result).toEqual(createEmptySave());
    });

    it('returns empty save for empty object', () => {
      const result = parseSave(encodeURIComponent('{}'));
      expect(result).toEqual(createEmptySave());
    });

    it('returns empty save for empty array', () => {
      const result = parseSave(encodeURIComponent('[]'));
      expect(result).toEqual(createEmptySave());
    });

    it('returns empty save for array of wrong length', () => {
      const result = parseSave(encodeURIComponent('[null, null]'));
      expect(result).toEqual(createEmptySave());

      const result2 = parseSave(encodeURIComponent('[null, null, null, null]'));
      expect(result2).toEqual(createEmptySave());
    });

    it('never throws on any input', () => {
      expect(() => parseSave('')).not.toThrow();
      expect(() => parseSave('not json')).not.toThrow();
      expect(() => parseSave('{"a":1}')).not.toThrow();
      expect(() => parseSave('\x00\x01\x02')).not.toThrow();
    });
  });

  describe('parseSave partial corruption', () => {
    it('drops a single corrupt slot to null while keeping valid ones', () => {
      const good1 = {
        n: 'ABC',
        c: 'marauder',
        w: [],
        b: {},
        u: 1000,
      };
      const bad = {
        n: 'XYZ',
        c: 'battle-trak',
        w: 'not-an-array', // corrupt
        b: {},
        u: 2000,
      };
      const good2 = {
        n: 'DEF',
        c: 'air-blade',
        w: [],
        b: {},
        u: 3000,
      };

      const json = JSON.stringify([good1, bad, good2]);
      const result = parseSave(encodeURIComponent(json));

      expect(result.slots[0]).toEqual({
        name: 'ABC',
        carId: 'marauder',
        tracksWon: [],
        bestLaps: {},
        updatedAt: 1000,
      });
      expect(result.slots[1]).toBeNull();
      expect(result.slots[2]).toEqual({
        name: 'DEF',
        carId: 'air-blade',
        tracksWon: [],
        bestLaps: {},
        updatedAt: 3000,
      });
    });

    it('handles negative and non-finite lap times', () => {
      const slotWithBadTimes = {
        n: 'ABC',
        c: 'marauder',
        w: [],
        b: { track1: -5.0, track2: Infinity },
        u: 1000,
      };
      const json = JSON.stringify([slotWithBadTimes, null, null]);
      const result = parseSave(encodeURIComponent(json));

      expect(result.slots[0]).toBeNull();
    });

    it('handles negative and non-finite updatedAt', () => {
      const slotWithBadTime = {
        n: 'ABC',
        c: 'marauder',
        w: [],
        b: {},
        u: -1000,
      };
      const json = JSON.stringify([slotWithBadTime, null, null]);
      const result = parseSave(encodeURIComponent(json));

      expect(result.slots[0]).toBeNull();
    });
  });

  describe('serialization size and cookie safety', () => {
    it('realistic full save fits in cookie budget', () => {
      const save = createEmptySave();

      // Build a realistic save with 3 slots, 10 tracks each
      let s = save;
      for (let slotIdx = 0; slotIdx < 3; slotIdx++) {
        const name = String.fromCharCode(65 + slotIdx).repeat(3); // AAA, BBB, CCC
        const carId = slotIdx === 0 ? 'marauder' : slotIdx === 1 ? 'dirt-devil' : 'havac';
        const slot = createSlot(name, carId, 1000 + slotIdx * 1000);
        s = writeSlot(s, slotIdx, slot);

        // Add 10 track records per slot
        for (let trackIdx = 0; trackIdx < 10; trackIdx++) {
          const trackId = `track-${trackIdx}`;
          const lapTime = 30.0 + trackIdx * 0.5;
          const won = trackIdx % 2 === 0;
          s = recordRaceResult(s, slotIdx, trackId, lapTime, won, 2000 + trackIdx * 100);
        }
      }

      const serialized = serializeSave(s);
      expect(fitsInCookie(serialized)).toBe(true);
      expect(serialized.length).toBeLessThan(SAVE_BYTE_BUDGET);
    });

    it('serialized form contains no semicolons, commas, quotes or whitespace', () => {
      const save = createEmptySave();
      const slot = createSlot('KLY', 'marauder', 1000);
      let s = writeSlot(save, 0, slot);
      s = recordRaceResult(s, 0, 'thunder-basin', 33.22, true, 2000);

      const serialized = serializeSave(s);

      expect(serialized).not.toContain(';');
      expect(serialized).not.toContain(',');
      expect(serialized).not.toContain('"');
      expect(serialized).not.toContain(' ');
      expect(serialized).not.toContain('\n');
      expect(serialized).not.toContain('\t');
    });

    it('realistic save is well under the budget', () => {
      const save = createEmptySave();
      let s = save;
      for (let slotIdx = 0; slotIdx < 3; slotIdx++) {
        const slot = createSlot(`PLY${slotIdx}`, 'marauder', 1000);
        s = writeSlot(s, slotIdx, slot);
        for (let trackIdx = 0; trackIdx < 10; trackIdx++) {
          const trackId = `track-${trackIdx}`;
          s = recordRaceResult(s, slotIdx, trackId, 30.5, true, 2000);
        }
      }

      const serialized = serializeSave(s);
      expect(serialized.length).toBeLessThan(SAVE_BYTE_BUDGET * 0.5);
    });
  });

  describe('name normalization', () => {
    it('normalizes lowercase to uppercase', () => {
      const save = createEmptySave();
      const slot = createSlot('kly', 'marauder', 1000);
      const s = writeSlot(save, 0, slot);

      expect((s.slots[0] as SlotProgress).name).toBe('KLY');
    });

    it('removes non-A-Z characters', () => {
      const save = createEmptySave();
      const slot = createSlot('ab3!', 'marauder', 1000);
      const s = writeSlot(save, 0, slot);

      expect((s.slots[0] as SlotProgress).name).toBe('AB');
    });

    it('truncates to 3 characters', () => {
      const save = createEmptySave();
      const slot = createSlot('toolong', 'marauder', 1000);
      const s = writeSlot(save, 0, slot);

      expect((s.slots[0] as SlotProgress).name).toBe('TOO');
    });

    it('handles mixed case with numbers and symbols', () => {
      const save = createEmptySave();
      const slot = createSlot('a1b2c3d4e5', 'marauder', 1000);
      const s = writeSlot(save, 0, slot);

      expect((s.slots[0] as SlotProgress).name).toBe('ABC');
    });

    it('handles empty string after filtering', () => {
      const save = createEmptySave();
      const slot = createSlot('123!@#', 'marauder', 1000);
      const s = writeSlot(save, 0, slot);

      expect((s.slots[0] as SlotProgress).name).toBe('');
    });
  });

  describe('clearSlot', () => {
    it('sets a slot to null', () => {
      const save = createEmptySave();
      const slot = createSlot('KLY', 'marauder', 1000);
      let s = writeSlot(save, 0, slot);
      expect(s.slots[0]).not.toBeNull();

      s = clearSlot(s, 0);
      expect(s.slots[0]).toBeNull();
    });

    it('respects out-of-bounds indices', () => {
      const save = createEmptySave();
      const slot = createSlot('KLY', 'marauder', 1000);
      let s = writeSlot(save, 0, slot);

      s = clearSlot(s, -1);
      expect(s.slots[0]).not.toBeNull();

      s = clearSlot(s, 3);
      expect(s.slots[0]).not.toBeNull();
    });
  });
});
