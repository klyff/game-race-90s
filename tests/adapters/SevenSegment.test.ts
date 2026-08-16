import { describe, it, expect } from 'vitest';
import {
  SEGMENT,
  SEGMENT_LAYOUT,
  segmentsFor,
  isSegmentLit,
  segmentsForText,
} from '../../src/adapters/render/SevenSegment.ts';
import type { SegmentName, SegmentRect } from '../../src/adapters/render/SevenSegment.ts';

// All seven segment names, written out literally in a..g order — never derived from the
// implementation, so a bug in SEGMENT itself can't hide from these tests.
const ALL_SEGMENTS: readonly SegmentName[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

// The textbook seven-segment patterns, written out literally per the task brief. Every
// pattern here is hand-transcribed from the a..g diagram, not computed from the
// implementation, so a transcription slip in SevenSegment.ts cannot pass by agreeing
// with itself.
const EXPECTED_PATTERNS: Readonly<Record<string, readonly SegmentName[]>> = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'd', 'e', 'g'],
  '3': ['a', 'b', 'c', 'd', 'g'],
  '4': ['b', 'c', 'f', 'g'],
  '5': ['a', 'c', 'd', 'f', 'g'],
  '6': ['a', 'c', 'd', 'e', 'f', 'g'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  // NOTE: the closed six-segment "9" (a,b,c,d,f,g — top bar closed, no lower-left `e`),
  // not the open five-segment variant (a,b,c,f,g). This is the form used by virtually
  // every calculator/clock seven-segment font, and it is the only form consistent with
  // the well-known lit-segment-count sequence [6,2,5,5,4,5,6,3,7,6] asserted below —
  // the five-segment variant would count 5, not 6, for '9'.
  '9': ['a', 'b', 'c', 'd', 'f', 'g'],
  ' ': [],
};

const EXPECTED_SEGMENT_COUNTS: readonly number[] = [6, 2, 5, 5, 4, 5, 6, 3, 7, 6];

function findRect(segment: SegmentName): SegmentRect {
  const rect = SEGMENT_LAYOUT.find((entry) => entry.segment === segment);
  if (rect === undefined) {
    throw new Error(`no layout entry for segment ${segment}`);
  }
  return rect;
}

function assertFinite(value: number): void {
  expect(Number.isNaN(value)).toBe(false);
  expect(Number.isFinite(value)).toBe(true);
}

describe('SevenSegment', () => {
  describe('digit patterns: exact, literal expectations', () => {
    for (const digit of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      it(`lights exactly ${EXPECTED_PATTERNS[digit].join('') || '(none)'} for '${digit}'`, () => {
        expect(segmentsFor(digit)).toEqual(EXPECTED_PATTERNS[digit]);
      });
    }

    it('lights nothing for a blank space', () => {
      expect(segmentsFor(' ')).toEqual([]);
    });
  });

  describe('well-known special cases', () => {
    it('8 lights all seven segments', () => {
      expect(segmentsFor('8')).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
      expect(segmentsFor('8')).toHaveLength(7);
    });

    it('1 lights exactly two segments', () => {
      expect(segmentsFor('1')).toEqual(['b', 'c']);
      expect(segmentsFor('1')).toHaveLength(2);
    });

    it('blank lights none', () => {
      expect(segmentsFor(' ')).toHaveLength(0);
    });
  });

  describe('segment counts match the well-known sequence', () => {
    it('has [6,2,5,5,4,5,6,3,7,6] lit segments for 0..9', () => {
      const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const counts = digits.map((digit) => segmentsFor(digit).length);
      expect(counts).toEqual(EXPECTED_SEGMENT_COUNTS);
    });
  });

  describe('segmentsFor / isSegmentLit consistency', () => {
    it('agrees for every digit and every segment', () => {
      for (const digit of Object.keys(EXPECTED_PATTERNS)) {
        const lit = segmentsFor(digit);
        for (const segment of ALL_SEGMENTS) {
          expect(isSegmentLit(digit, segment)).toBe(lit.includes(segment));
        }
      }
    });
  });

  describe('unknown characters are treated as blank, never thrown', () => {
    it('treats a letter as blank', () => {
      expect(() => segmentsFor('A')).not.toThrow();
      expect(segmentsFor('A')).toEqual([]);
    });

    it('treats a dash as blank', () => {
      expect(() => segmentsFor('-')).not.toThrow();
      expect(segmentsFor('-')).toEqual([]);
    });

    it('treats the empty string as blank', () => {
      expect(() => segmentsFor('')).not.toThrow();
      expect(segmentsFor('')).toEqual([]);
    });

    it('treats a multi-character string as blank', () => {
      expect(() => segmentsFor('12')).not.toThrow();
      expect(segmentsFor('12')).toEqual([]);
    });

    it('treats a non-string value smuggled through a bad cast as blank', () => {
      const notAString = 42 as unknown as string;
      expect(() => segmentsFor(notAString)).not.toThrow();
      expect(segmentsFor(notAString)).toEqual([]);

      const alsoNotAString = null as unknown as string;
      expect(() => segmentsFor(alsoNotAString)).not.toThrow();
      expect(segmentsFor(alsoNotAString)).toEqual([]);
    });
  });

  describe('segmentsForText', () => {
    it('returns one entry per character, in order', () => {
      const result = segmentsForText('12');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(['b', 'c']);
      expect(result[1]).toEqual(['a', 'b', 'd', 'e', 'g']);
    });

    it('includes a blank entry for a space, without shifting cell count', () => {
      const result = segmentsForText('1 2');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(['b', 'c']);
      expect(result[1]).toEqual([]);
      expect(result[2]).toEqual(['a', 'b', 'd', 'e', 'g']);
    });

    it('yields a blank entry for a non-digit character, keeping cell count', () => {
      const result = segmentsForText('1A2');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(['b', 'c']);
      expect(result[1]).toEqual([]);
      expect(result[2]).toEqual(['a', 'b', 'd', 'e', 'g']);
    });

    it('returns an empty array for an empty string', () => {
      expect(segmentsForText('')).toEqual([]);
    });
  });

  describe('SEGMENT_LAYOUT: shape', () => {
    it('has exactly seven entries, one per segment name, in a..g order, no duplicates', () => {
      expect(SEGMENT_LAYOUT).toHaveLength(7);
      expect(SEGMENT_LAYOUT.map((entry) => entry.segment)).toEqual(ALL_SEGMENTS);

      const uniqueSegments = new Set(SEGMENT_LAYOUT.map((entry) => entry.segment));
      expect(uniqueSegments.size).toBe(7);
    });

    it('matches the SEGMENT constant values', () => {
      expect(SEGMENT_LAYOUT.map((entry) => entry.segment)).toEqual([
        SEGMENT.A,
        SEGMENT.B,
        SEGMENT.C,
        SEGMENT.D,
        SEGMENT.E,
        SEGMENT.F,
        SEGMENT.G,
      ]);
    });
  });

  describe('SEGMENT_LAYOUT: every rect is inside the unit cell and finite', () => {
    for (const segment of ALL_SEGMENTS) {
      it(`segment '${segment}' has a finite, in-bounds, positive rect`, () => {
        const rect = findRect(segment);
        assertFinite(rect.x);
        assertFinite(rect.y);
        assertFinite(rect.width);
        assertFinite(rect.height);

        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width).toBeLessThanOrEqual(1);
        expect(rect.y + rect.height).toBeLessThanOrEqual(1);

        expect(rect.width).toBeGreaterThan(0);
        expect(rect.height).toBeGreaterThan(0);
      });
    }
  });

  describe('SEGMENT_LAYOUT: symmetry', () => {
    it('a and d share the same width and x (top and bottom horizontals aligned)', () => {
      const a = findRect('a');
      const d = findRect('d');
      expect(a.width).toBe(d.width);
      expect(a.x).toBe(d.x);
    });

    it('f and b mirror each other about the cell vertical centre', () => {
      const f = findRect('f');
      const b = findRect('b');
      // Mirroring about x=0.5 maps [x, x+width] to [1-(x+width), 1-x].
      expect(b.x).toBeCloseTo(1 - f.x - f.width, 10);
      expect(b.width).toBeCloseTo(f.width, 10);
      // Same vertical span: the mirror is purely horizontal.
      expect(b.y).toBeCloseTo(f.y, 10);
      expect(b.height).toBeCloseTo(f.height, 10);
    });

    it('e and c mirror each other about the cell vertical centre', () => {
      const e = findRect('e');
      const c = findRect('c');
      expect(c.x).toBeCloseTo(1 - e.x - e.width, 10);
      expect(c.width).toBeCloseTo(e.width, 10);
      expect(c.y).toBeCloseTo(e.y, 10);
      expect(c.height).toBeCloseTo(e.height, 10);
    });

    it('g sits at the vertical middle of the cell', () => {
      const g = findRect('g');
      const centre = g.y + g.height / 2;
      expect(centre).toBeCloseTo(0.5, 10);
    });
  });

  describe('SEGMENT_LAYOUT: orientation flags', () => {
    it('flags a, d, g as horizontal and the rest as vertical', () => {
      for (const segment of ALL_SEGMENTS) {
        const rect = findRect(segment);
        const expectedHorizontal = segment === 'a' || segment === 'd' || segment === 'g';
        expect(rect.horizontal).toBe(expectedHorizontal);
      }
    });

    it('horizontal segments are wider than tall', () => {
      for (const segment of ['a', 'd', 'g'] as const) {
        const rect = findRect(segment);
        expect(rect.width).toBeGreaterThan(rect.height);
      }
    });

    it('vertical segments are taller than wide', () => {
      for (const segment of ['b', 'c', 'e', 'f'] as const) {
        const rect = findRect(segment);
        expect(rect.height).toBeGreaterThan(rect.width);
      }
    });
  });

  describe('purity', () => {
    it('segmentsFor returns equal values across repeated calls', () => {
      expect(segmentsFor('5')).toEqual(segmentsFor('5'));
      expect(segmentsFor(' ')).toEqual(segmentsFor(' '));
    });

    it('isSegmentLit returns equal values across repeated calls', () => {
      expect(isSegmentLit('6', 'e')).toBe(isSegmentLit('6', 'e'));
      expect(isSegmentLit('6', 'b')).toBe(isSegmentLit('6', 'b'));
    });

    it('segmentsForText returns equal values across repeated calls', () => {
      expect(segmentsForText('42 7')).toEqual(segmentsForText('42 7'));
    });

    it('SEGMENT_LAYOUT is frozen and cannot be mutated into a different result', () => {
      const before = JSON.parse(JSON.stringify(SEGMENT_LAYOUT));

      expect(Object.isFrozen(SEGMENT_LAYOUT)).toBe(true);
      expect(Object.isFrozen(SEGMENT_LAYOUT[0])).toBe(true);

      expect(() => {
        // @ts-expect-error -- deliberately attempting a mutation the type forbids.
        SEGMENT_LAYOUT[0].x = 999;
      }).toThrow();

      expect(() => {
        // Cast away `readonly` to prove the runtime (not just the type system) refuses
        // the mutation: `Object.freeze` blocks `push` in strict-mode ESM regardless of
        // what the type checker would otherwise allow.
        (SEGMENT_LAYOUT as SegmentRect[]).push(SEGMENT_LAYOUT[0]);
      }).toThrow();

      expect(JSON.parse(JSON.stringify(SEGMENT_LAYOUT))).toEqual(before);
    });
  });
});
