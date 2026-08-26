import { describe, it, expect } from 'vitest';
import { rankRacers, standingForSeat } from '../../src/domain/race/PositionRanker.ts';
import type { RacerProgress } from '../../src/domain/race/PositionRanker.ts';

// Helper factory: create a minimal LapProgress object for testing ranking logic.
// Ranking only considers lapsCompleted, nextCheckpoint, totalProgress, and finished.
function progress(
  lapsCompleted: number,
  nextCheckpoint: number,
  totalProgress: number,
  finished: boolean,
) {
  return {
    lapsCompleted,
    nextCheckpoint,
    gatesClaimed: 0, // Not used by ranking; default to 0
    totalProgress,
    finished,
  };
}

describe('PositionRanker', () => {
  describe('rankRacers', () => {
    it('returns empty array for empty input', () => {
      const result = rankRacers([]);
      expect(result).toEqual([]);
    });

    it('ranks a single car in first position', () => {
      const racers: RacerProgress[] = [
        {
          carId: 'car-1',
          progress: progress(1, 0, 100, false),
        },
      ];

      const result = rankRacers(racers);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        carId: 'car-1',
        racerIndex: 0,
        position: 1,
        lapsCompleted: 1,
        finished: false,
      });
    });

    it('ranks two cars on the same lap at different distances', () => {
      const racers: RacerProgress[] = [
        {
          carId: 'car-1',
          progress: progress(1, 3, 180, false),
        },
        {
          carId: 'car-2',
          progress: progress(1, 2, 150, false),
        },
      ];

      const result = rankRacers(racers);

      expect(result).toHaveLength(2);
      expect(result[0].carId).toBe('car-1');
      expect(result[0].position).toBe(1);
      expect(result[1].carId).toBe('car-2');
      expect(result[1].position).toBe(2);
    });

    it('ranks two cars where one is a full lap ahead', () => {
      const racers: RacerProgress[] = [
        {
          carId: 'car-1',
          progress: progress(2, 1, 250, false),
        },
        {
          carId: 'car-2',
          progress: progress(1, 4, 190, false),
        },
      ];

      const result = rankRacers(racers);

      expect(result).toHaveLength(2);
      expect(result[0].carId).toBe('car-1');
      expect(result[0].lapsCompleted).toBe(2);
      expect(result[1].carId).toBe('car-2');
      expect(result[1].lapsCompleted).toBe(1);
    });

    it('handles wrap case: car at lap 2 start ranks ahead of car at 95% of lap 1', () => {
      const tracklength = 200; // Example track length

      const racers: RacerProgress[] = [
        {
          carId: 'car-1',
          progress: progress(2, 0, tracklength, false),
        },
        {
          carId: 'car-2',
          progress: progress(1, 4, tracklength * 0.95, false),
        },
      ];

      const result = rankRacers(racers);

      // car-1 should rank first because it has greater totalProgress
      expect(result[0].carId).toBe('car-1');
      expect(result[1].carId).toBe('car-2');
    });

    it('ranks finished cars ahead of unfinished cars', () => {
      const racers: RacerProgress[] = [
        {
          carId: 'leader',
          progress: progress(2, 4, 350, false),
        },
        {
          carId: 'finisher',
          progress: progress(3, 0, 300, true),
          finishedAtProgress: 300,
        },
      ];

      const result = rankRacers(racers);

      expect(result).toHaveLength(2);
      expect(result[0].carId).toBe('finisher');
      expect(result[0].position).toBe(1);
      expect(result[0].finished).toBe(true);
      expect(result[1].carId).toBe('leader');
      expect(result[1].position).toBe(2);
      expect(result[1].finished).toBe(false);
    });

    it('keeps the on-track leader first when two cars finish in the same step', () => {
      const racers: RacerProgress[] = [
        {
          carId: 'leader',
          progress: progress(3, 0, 350, true),
          finishedAtSeconds: 42,
          finishedAtProgress: 350,
        },
        {
          carId: 'trailer',
          progress: progress(3, 0, 300, true),
          finishedAtSeconds: 42,
          finishedAtProgress: 300,
        },
      ];

      const result = rankRacers(racers);

      expect(result[0].carId).toBe('leader');
      expect(result[0].position).toBe(1);
      expect(result[1].carId).toBe('trailer');
      expect(result[1].position).toBe(2);
    });

    it('ranks the earlier finisher first even when the later car has less overshoot', () => {
      const racers: RacerProgress[] = [
        {
          carId: 'sprinter',
          progress: progress(3, 0, 350, true),
          finishedAtSeconds: 40,
          finishedAtProgress: 350,
        },
        {
          carId: 'crawler',
          progress: progress(3, 0, 300.2, true),
          finishedAtSeconds: 42,
          finishedAtProgress: 300.2,
        },
      ];

      const result = rankRacers(racers);

      expect(result[0].carId).toBe('sprinter');
      expect(result[0].position).toBe(1);
      expect(result[1].carId).toBe('crawler');
      expect(result[1].position).toBe(2);
    });

    it('breaks ties on totalProgress with carId for determinism', () => {
      const racers: RacerProgress[] = [
        {
          carId: 'zebra',
          progress: progress(1, 2, 150, false),
        },
        {
          carId: 'alpha',
          progress: progress(1, 2, 150, false),
        },
      ];

      const result = rankRacers(racers);

      expect(result).toHaveLength(2);
      // 'alpha' comes before 'zebra' alphabetically
      expect(result[0].carId).toBe('alpha');
      expect(result[1].carId).toBe('zebra');
    });

    it('handles duplicate carId deterministically', () => {
      const racers: RacerProgress[] = [
        {
          carId: 'car-1',
          racerIndex: 0,
          progress: progress(1, 2, 150, false),
        },
        {
          carId: 'car-1',
          racerIndex: 3,
          progress: progress(1, 2, 150, false),
        },
      ];

      const result = rankRacers(racers);

      expect(result).toHaveLength(2);
      expect(result[0]?.position).toBe(1);
      expect(result[1]?.position).toBe(2);
      expect(result[0]?.racerIndex).toBe(0);
      expect(result[1]?.racerIndex).toBe(3);
    });

    it('ranks five cars in jumbled input order correctly', () => {
      const racers: RacerProgress[] = [
        {
          carId: 'car-3',
          progress: progress(1, 3, 180, false),
        },
        {
          carId: 'car-1',
          progress: progress(2, 0, 300, true),
          finishedAtSeconds: 40,
          finishedAtProgress: 300,
        },
        {
          carId: 'car-5',
          progress: progress(1, 1, 120, false),
        },
        {
          carId: 'car-2',
          progress: progress(2, 2, 280, true),
          finishedAtSeconds: 38,
          finishedAtProgress: 280,
        },
        {
          carId: 'car-4',
          progress: progress(1, 4, 200, false),
        },
      ];

      const result = rankRacers(racers);

      expect(result).toHaveLength(5);

      // Finished cars first, ordered by finishedAtSeconds (car-2 crossed earlier)
      expect(result[0]).toEqual({
        carId: 'car-2',
        racerIndex: 3,
        position: 1,
        lapsCompleted: 2,
        finished: true,
      });

      expect(result[1]).toEqual({
        carId: 'car-1',
        racerIndex: 1,
        position: 2,
        lapsCompleted: 2,
        finished: true,
      });

      // Unfinished cars, ordered by totalProgress descending
      expect(result[2]).toEqual({
        carId: 'car-4',
        racerIndex: 4,
        position: 3,
        lapsCompleted: 1,
        finished: false,
      });

      expect(result[3]).toEqual({
        carId: 'car-3',
        racerIndex: 0,
        position: 4,
        lapsCompleted: 1,
        finished: false,
      });

      expect(result[4]).toEqual({
        carId: 'car-5',
        racerIndex: 2,
        position: 5,
        lapsCompleted: 1,
        finished: false,
      });
    });

    it('ensures position is 1-based and strictly increasing with no gaps', () => {
      const racers: RacerProgress[] = Array.from({ length: 10 }, (_, i) => ({
        carId: `car-${i}`,
        progress: progress(
          Math.floor(i / 3),
          i % 4,
          100 * (10 - i),
          false,
        ),
      }));

      const result = rankRacers(racers);

      expect(result).toHaveLength(10);

      // Verify position is 1-based and strictly increasing
      for (let i = 0; i < result.length; i++) {
        expect(result[i].position).toBe(i + 1);
      }
    });

    it('falls back to totalProgress for finished cars without finishedAtProgress', () => {
      const racers: RacerProgress[] = [
        {
          carId: 'car-1',
          progress: progress(3, 0, 350, true),
          // No finishedAtProgress provided
        },
        {
          carId: 'car-2',
          progress: progress(3, 0, 300, true),
          // No finishedAtProgress provided
        },
      ];

      const result = rankRacers(racers);

      // Should fall back to totalProgress descending for ordering
      expect(result[0].carId).toBe('car-1');
      expect(result[1].carId).toBe('car-2');
    });

    it('uses recorded finish time ahead of a finisher missing the clock', () => {
      const racers: RacerProgress[] = [
        {
          carId: 'car-1',
          progress: progress(3, 0, 300, true),
          finishedAtSeconds: 41,
          finishedAtProgress: 320,
        },
        {
          carId: 'car-2',
          progress: progress(3, 0, 310, true),
        },
      ];

      const result = rankRacers(racers);

      expect(result[0].carId).toBe('car-1');
      expect(result[1].carId).toBe('car-2');
    });

    it('falls back to higher progress when neither finisher has a clock', () => {
      const racers: RacerProgress[] = [
        {
          carId: 'car-1',
          progress: progress(3, 0, 300, true),
          finishedAtProgress: 320,
        },
        {
          carId: 'car-2',
          progress: progress(3, 0, 310, true),
        },
      ];

      const result = rankRacers(racers);

      expect(result[0].carId).toBe('car-1');
      expect(result[1].carId).toBe('car-2');
    });
  });

  describe('standingForSeat', () => {
    it('does not hand a twin the flag just because they share a car model', () => {
      const standings = rankRacers([
        {
          carId: 'car-2',
          racerIndex: 0,
          progress: progress(3, 0, 400, true),
          finishedAtProgress: 400,
        },
        {
          carId: 'car-2',
          racerIndex: 1,
          progress: progress(2, 2, 280, false),
        },
      ]);

      expect(standingForSeat(standings, 'car-2')?.finished).toBe(true);
      expect(standingForSeat(standings, 'car-2', 0)?.finished).toBe(true);
      expect(standingForSeat(standings, 'car-2', 1)?.finished).toBe(false);
      expect(standingForSeat(standings, 'car-2', 1)?.lapsCompleted).toBe(2);
    });
  });
});
