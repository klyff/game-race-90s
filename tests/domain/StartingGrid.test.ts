import { describe, it, expect } from 'vitest';
import { distance } from '../../src/domain/math/Vec2.ts';
import { buildStartingGrid, GRID_LOOK_AHEAD_UNITS, lookAheadHeading } from '../../src/domain/race/StartingGrid.ts';
import { frameIndexForHeading } from '../../src/data/cars/CarManifest.ts';
import { findTrack } from '../../src/data/tracks/registry.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';

describe('buildStartingGrid', () => {
  const track = findTrack('thunder-basin');
  const spline = new TrackSpline(track.controlPoints);

  describe('empty and boundary cases', () => {
    it('returns empty array for count 0', () => {
      const grid = buildStartingGrid(0, track, spline);
      expect(grid).toEqual([]);
    });

    it('throws if count is negative', () => {
      expect(() => buildStartingGrid(-1, track, spline)).toThrow(
        /count must be a non-negative finite number/,
      );
    });

    it('throws if count is NaN', () => {
      expect(() => buildStartingGrid(NaN, track, spline)).toThrow(
        /count must be a non-negative finite number/,
      );
    });

    it('throws if count is Infinity', () => {
      expect(() => buildStartingGrid(Infinity, track, spline)).toThrow(
        /count must be a non-negative finite number/,
      );
    });
  });

  describe('single car (pole position)', () => {
    it('places one car at pole at startLineDistance - setbackUnits', () => {
      const grid = buildStartingGrid(1, track, spline);
      expect(grid).toHaveLength(1);

      const pole = grid[0]!;
      expect(pole.index).toBe(0);
      expect(pole.lateralOffset).toBe(track.gridLateralOffsets[0]);

      // Thunder Basin has startLineDistance = 0, so setback of 14 wraps to near end.
      // Expected: spline.wrap(0 - 14) ≈ totalLength - 14.
      const expectedDistance = spline.wrap(track.startLineDistance - 14);
      expect(pole.distance).toBeCloseTo(expectedDistance, 5);
    });

    it('respects custom setbackUnits', () => {
      const customSetback = 20;
      const grid = buildStartingGrid(1, track, spline, customSetback);

      const pole = grid[0]!;
      const expectedDistance = spline.wrap(track.startLineDistance - customSetback);
      expect(pole.distance).toBeCloseTo(expectedDistance, 5);
    });

    it('pole faces the start-line arrow (zero → 50 m), not the slot tangent', () => {
      const grid = buildStartingGrid(1, track, spline);
      const pole = grid[0]!;
      const startHeading = lookAheadHeading(spline, track.startLineDistance);
      expect(pole.heading).toBeCloseTo(startHeading, 5);

      const here = spline.positionAt(track.startLineDistance);
      const there = spline.positionAt(spline.wrap(track.startLineDistance + GRID_LOOK_AHEAD_UNITS));
      expect(there.x - here.x).not.toBeCloseTo(0, 2);
    });

    it('Basin pole uses 4h (a025), not a000 facing the screen', () => {
      const grid = buildStartingGrid(1, track, spline);
      expect(frameIndexForHeading(grid[0]!.heading, 30)).toBe(25);
    });
  });

  describe('multiple cars, row filling', () => {
    it('fills first row across all gridLateralOffsets, then moves to next row', () => {
      const grid = buildStartingGrid(4, track, spline);
      expect(grid).toHaveLength(4);

      // Thunder Basin: gridLateralOffsets = [-9, 9], gridRowSpacing = 11.
      // Cars 0, 1 on row 0; cars 2, 3 on row 1.

      // Row 0 distance.
      const row0Distance = spline.wrap(track.startLineDistance - 14);

      // Row 1 distance: 11 units further back.
      const row1Distance = spline.wrap(track.startLineDistance - 14 - 11);

      // Car 0: row 0, offset -9
      expect(grid[0]!.distance).toBeCloseTo(row0Distance, 5);
      expect(grid[0]!.lateralOffset).toBe(-9);

      // Car 1: row 0, offset 9
      expect(grid[1]!.distance).toBeCloseTo(row0Distance, 5);
      expect(grid[1]!.lateralOffset).toBe(9);

      // Car 2: row 1, offset -9
      expect(grid[2]!.distance).toBeCloseTo(row1Distance, 5);
      expect(grid[2]!.lateralOffset).toBe(-9);

      // Car 3: row 1, offset 9
      expect(grid[3]!.distance).toBeCloseTo(row1Distance, 5);
      expect(grid[3]!.lateralOffset).toBe(9);
    });

    it('handles more cars than one row: extends to 3rd row', () => {
      const grid = buildStartingGrid(6, track, spline);
      expect(grid).toHaveLength(6);

      // 2 offsets, so rows are: 0-1 (row 0), 2-3 (row 1), 4-5 (row 2).
      const row0Distance = spline.wrap(track.startLineDistance - 14);
      const row1Distance = spline.wrap(track.startLineDistance - 14 - 11);
      const row2Distance = spline.wrap(track.startLineDistance - 14 - 22);

      expect(grid[0]!.distance).toBeCloseTo(row0Distance, 5);
      expect(grid[1]!.distance).toBeCloseTo(row0Distance, 5);
      expect(grid[2]!.distance).toBeCloseTo(row1Distance, 5);
      expect(grid[3]!.distance).toBeCloseTo(row1Distance, 5);
      expect(grid[4]!.distance).toBeCloseTo(row2Distance, 5);
      expect(grid[5]!.distance).toBeCloseTo(row2Distance, 5);
    });
  });

  describe('large count', () => {
    it('produces distinct slots for large count (7 cars)', () => {
      const grid = buildStartingGrid(7, track, spline);
      expect(grid).toHaveLength(7);

      // Check all indices are sequential.
      for (let i = 0; i < 7; i += 1) {
        expect(grid[i]!.index).toBe(i);
      }

      // Check no two slots share the same (distance, lateralOffset) pair.
      const seen = new Set<string>();
      for (const slot of grid) {
        const key = `${slot.distance.toFixed(5)},${slot.lateralOffset}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    });
  });

  describe('lateral offsets within bounds', () => {
    it('every slot has |lateralOffset| <= halfWidth', () => {
      const grid = buildStartingGrid(10, track, spline);

      for (const slot of grid) {
        expect(Math.abs(slot.lateralOffset)).toBeLessThanOrEqual(track.halfWidth);
      }
    });

    it('throws if gridLateralOffsets contains values beyond halfWidth', () => {
      // This is an input validation that should catch badly configured tracks.
      const badTrack = {
        ...track,
        gridLateralOffsets: [-30, 30], // Exceeds halfWidth of 20
      };

      expect(() => buildStartingGrid(1, badTrack, spline)).toThrow(
        /exceeds halfWidth/,
      );
    });
  });

  describe('heading consistency', () => {
    it('every slot faces the start-line arrow, even back rows in a hairpin', () => {
      const expectedHeading = lookAheadHeading(spline, track.startLineDistance);
      const grid = buildStartingGrid(5, track, spline);

      for (const slot of grid) {
        expect(Math.abs(slot.heading - expectedHeading)).toBeLessThan(1e-5);
      }
    });

    it('Basin II and Bogmire back rows keep the start index, not the slot curve', () => {
      const basinTwo = findTrack('thunder-basin-2');
      const basinTwoSpline = new TrackSpline(basinTwo.controlPoints);
      const basinTwoGrid = buildStartingGrid(6, basinTwo, basinTwoSpline);
      for (const slot of basinTwoGrid) {
        expect(frameIndexForHeading(slot.heading, 30)).toBe(25);
      }

      const bogmire = findTrack('bogmire-deep-1');
      const bogmireSpline = new TrackSpline(bogmire.controlPoints);
      const startIndex = frameIndexForHeading(
        lookAheadHeading(bogmireSpline, bogmire.startLineDistance),
        30,
      );
      expect(startIndex).toBe(7);
      for (const slot of buildStartingGrid(6, bogmire, bogmireSpline)) {
        expect(frameIndexForHeading(slot.heading, 30)).toBe(startIndex);
      }
    });
  });

  describe('position calculation', () => {
    it('position is centreline point offset by lateral offset along normal', () => {
      const grid = buildStartingGrid(1, track, spline);
      const slot = grid[0]!;

      const frame = spline.frameAt(slot.distance);
      const expectedX = frame.position.x + frame.normal.x * slot.lateralOffset;
      const expectedY = frame.position.y + frame.normal.y * slot.lateralOffset;

      expect(slot.position.x).toBeCloseTo(expectedX, 5);
      expect(slot.position.y).toBeCloseTo(expectedY, 5);
    });

    it('position distance to centreline point equals lateralOffset', () => {
      const grid = buildStartingGrid(4, track, spline);

      for (const slot of grid) {
        const frame = spline.frameAt(slot.distance);
        const distToFrame = distance(slot.position, frame.position);

        // Should be |lateralOffset|, accounting for floating-point tolerance.
        expect(distToFrame).toBeCloseTo(Math.abs(slot.lateralOffset), 5);
      }
    });
  });

  describe('wrap-around at lap boundary', () => {
    it('wrap works correctly when startLineDistance is 0 (Thunder Basin)', () => {
      // Thunder Basin has startLineDistance = 0.
      // Pole at 0 - 14 = -14, which should wrap to near totalLength - 14.
      const grid = buildStartingGrid(1, track, spline);
      const pole = grid[0]!;

      // Wrapped distance should be positive and close to totalLength - 14.
      expect(pole.distance).toBeGreaterThanOrEqual(0);
      expect(pole.distance).toBeLessThan(spline.totalLength);

      // Specifically: wrap(-14) = totalLength - 14 (since -14 % totalLength + totalLength).
      const expected = spline.wrap(-14);
      expect(pole.distance).toBeCloseTo(expected, 5);
    });

    it('negative setback wraps correctly', () => {
      // Use a negative setback that goes further backwards.
      const grid = buildStartingGrid(1, track, spline, -50);
      const pole = grid[0]!;

      // Distance = wrap(0 - (-50)) = wrap(50).
      const expected = spline.wrap(50);
      expect(pole.distance).toBeCloseTo(expected, 5);
    });
  });

  describe('setback parameter', () => {
    it('default setback is 14', () => {
      const gridDefault = buildStartingGrid(1, track, spline);
      const gridExplicit = buildStartingGrid(1, track, spline, 14);

      expect(gridDefault[0]!.distance).toBeCloseTo(gridExplicit[0]!.distance, 10);
    });

    it('larger setback places cars further back', () => {
      const grid14 = buildStartingGrid(2, track, spline, 14);
      const grid20 = buildStartingGrid(2, track, spline, 20);

      // With setback 20, row 0 should be 6 units further back.
      // distance = wrap(startLine - setback).
      // Since wrap is arc-length, a larger setback means a smaller distance (further back on the lap).
      // Actually, larger negative offset means larger wrapped value.
      // startLine=0, setback=14: wrap(-14).
      // startLine=0, setback=20: wrap(-20).
      // wrap(-20) = totalLength - 20, wrap(-14) = totalLength - 14.
      // So wrap(-20) < wrap(-14), meaning the grid is further back.
      expect(grid20[0]!.distance).toBeLessThan(grid14[0]!.distance);
    });
  });

  describe('indices and order', () => {
    it('indices are sequential from 0', () => {
      const grid = buildStartingGrid(5, track, spline);

      for (let i = 0; i < 5; i += 1) {
        expect(grid[i]!.index).toBe(i);
      }
    });

    it('pole is first (index 0)', () => {
      const grid = buildStartingGrid(3, track, spline);
      expect(grid[0]!.index).toBe(0);
      expect(grid[0]!.lateralOffset).toBe(track.gridLateralOffsets[0]);
    });

    it('all slots have distinct (distance, lateralOffset) pairs', () => {
      const grid = buildStartingGrid(10, track, spline);
      const pairs: Array<[number, number]> = grid.map(s => [s.distance, s.lateralOffset]);

      // Check uniqueness by converting to strings and using a Set.
      const stringPairs = pairs.map(p => `${p[0].toFixed(5)},${p[1]}`);
      const uniqueCount = new Set(stringPairs).size;
      expect(uniqueCount).toBe(grid.length);
    });
  });

  describe('Thunder Basin specific properties', () => {
    it('Thunder Basin gridLateralOffsets are [-9, 9]', () => {
      expect(track.gridLateralOffsets).toEqual([-9, 9]);
    });

    it('Thunder Basin gridRowSpacing is 11', () => {
      expect(track.gridRowSpacing).toBe(11);
    });

    it('Thunder Basin halfWidth is 20', () => {
      expect(track.halfWidth).toBe(20);
    });

    it('Thunder Basin startLineDistance is 0', () => {
      expect(track.startLineDistance).toBe(0);
    });

    it('Thunder Basin 4-car grid is two rows of two', () => {
      const grid = buildStartingGrid(4, track, spline);

      // Rows: [0, 1] and [2, 3]
      const row0Distance = grid[0]!.distance;
      const row1Distance = grid[2]!.distance;

      expect(grid[0]!.distance).toBeCloseTo(row0Distance, 10);
      expect(grid[1]!.distance).toBeCloseTo(row0Distance, 10);
      expect(grid[2]!.distance).toBeCloseTo(row1Distance, 10);
      expect(grid[3]!.distance).toBeCloseTo(row1Distance, 10);

      // Lateral offsets match the defined array.
      expect(grid[0]!.lateralOffset).toBe(-9);
      expect(grid[1]!.lateralOffset).toBe(9);
      expect(grid[2]!.lateralOffset).toBe(-9);
      expect(grid[3]!.lateralOffset).toBe(9);
    });
  });

  describe('immutability and return type', () => {
    it('returns readonly array', () => {
      const grid = buildStartingGrid(2, track, spline);

      // TypeScript enforces readonly, but runtime check: no push method on frozen arrays.
      // Actually, the return type is readonly, so this is mainly a type check.
      expect(Array.isArray(grid)).toBe(true);
    });

    it('GridSlot properties are readonly', () => {
      const grid = buildStartingGrid(1, track, spline);
      const slot = grid[0]!;

      // Attempt to modify a readonly property should fail at TypeScript level.
      // At runtime, modern objects are not frozen, so this is a type-level guarantee.
      expect(slot.index).toBe(0);
      expect(slot.distance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases with many cars', () => {
    it('produces valid grid for 100 cars', () => {
      const grid = buildStartingGrid(100, track, spline);
      expect(grid).toHaveLength(100);

      // All indices sequential.
      for (let i = 0; i < 100; i += 1) {
        expect(grid[i]!.index).toBe(i);
      }

      // All within track bounds.
      for (const slot of grid) {
        expect(Math.abs(slot.lateralOffset)).toBeLessThanOrEqual(track.halfWidth);
        expect(slot.distance).toBeGreaterThanOrEqual(0);
        expect(slot.distance).toBeLessThan(spline.totalLength);
      }
    });
  });

  describe('consistency with RaceScene.respawn behavior', () => {
    it('pole car matches what RaceScene.respawn places', () => {
      // RaceScene.respawn uses:
      //   const spawnDistance = this.spline.wrap(this.track.startLineDistance - SPAWN_SETBACK_UNITS);
      //   const frame = this.spline.frameAt(spawnDistance);
      //   const lateralOffset = this.track.gridLateralOffsets[0] ?? 0;
      //   position = add(frame.position, scale(frame.normal, lateralOffset));
      //   heading = lookAheadHeading(spline, track.startLineDistance);

      const grid = buildStartingGrid(1, track, spline, 14);
      const slot = grid[0]!;

      const expectedDistance = spline.wrap(track.startLineDistance - 14);
      const expectedFrame = spline.frameAt(expectedDistance);
      const expectedLateralOffset = track.gridLateralOffsets[0] ?? 0;

      expect(slot.distance).toBeCloseTo(expectedDistance, 5);
      expect(slot.lateralOffset).toBe(expectedLateralOffset);
      expect(slot.position.x).toBeCloseTo(
        expectedFrame.position.x + expectedFrame.normal.x * expectedLateralOffset,
        5,
      );
      expect(slot.position.y).toBeCloseTo(
        expectedFrame.position.y + expectedFrame.normal.y * expectedLateralOffset,
        5,
      );
      expect(slot.heading).toBeCloseTo(lookAheadHeading(spline, track.startLineDistance), 5);
    });
  });
});
