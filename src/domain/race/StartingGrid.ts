import { add, angleOf, scale } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';
import type { TrackDefinition } from '../track/TrackDefinition.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';

/** How far down the line we read start heading (world units ≈ metres). */
export const GRID_LOOK_AHEAD_UNITS = 50;

/**
 * A single position on the starting grid.
 *
 * Slots fill across `track.gridLateralOffsets` first, then step back one
 * `track.gridRowSpacing` per row, starting from `setbackUnits` before the
 * start line. Every car faces the start-line arrow (point zero → 50 units
 * ahead), not the tangent at its own slot — back rows can sit in a hairpin.
 */
export interface GridSlot {
  readonly index: number;           // 0 = pole
  readonly distance: number;        // arc length along the centreline
  readonly lateralOffset: number;   // signed, positive left
  readonly position: Vec2;
  readonly heading: number;         // radians, start-line arrow (zero → 50 m)
}

/**
 * Pure function: place `count` cars on the grid behind the start line.
 *
 * All cars face along the track, positioned on the centreline offset by the
 * lateral grid layout. Rows fill left-right first (across all `gridLateralOffsets`),
 * then step back `gridRowSpacing` for the next row.
 *
 * @param count Number of cars to place. 0 returns empty. Non-finite or negative
 *        `count` throws.
 * @param track Track definition with grid layout and start line.
 * @param spline Provides frame data (position, tangent) at each distance.
 * @param setbackUnits Distance before the start line (default 14). May be wrapped
 *        to the lap if negative.
 * @returns Array of GridSlot entries in order: pole (index 0) first.
 */
export function buildStartingGrid(
  count: number,
  track: TrackDefinition,
  spline: TrackSpline,
  setbackUnits: number = 14,
): readonly GridSlot[] {
  // Guard: count must be a non-negative integer.
  if (!Number.isFinite(count) || count < 0) {
    throw new Error(`count must be a non-negative finite number, received ${count}`);
  }

  if (count === 0) {
    return [];
  }

  const slots: GridSlot[] = [];
  const offsets = track.gridLateralOffsets;
  const rowSpacing = track.gridRowSpacing;
  const halfWidth = track.halfWidth;
  const heading = lookAheadHeading(spline, track.startLineDistance);

  let index = 0;
  for (let slot = 0; slot < count; slot += 1) {
    // Determine which row and column this slot occupies.
    const columnIndex = slot % offsets.length;
    const rowIndex = Math.floor(slot / offsets.length);

    // Calculate the arc-length distance for this slot.
    // Row 0 sits setbackUnits before the start line.
    const rowDistance = rowIndex * rowSpacing;
    const slotDistance = spline.wrap(track.startLineDistance - setbackUnits - rowDistance);

    // Get the track frame at this distance.
    const frame = spline.frameAt(slotDistance);

    // Apply the lateral offset.
    const lateralOffset = offsets[columnIndex] ?? 0;

    // Check that the slot is on the racing surface.
    if (Math.abs(lateralOffset) > halfWidth) {
      throw new Error(
        `Slot ${index} has lateralOffset ${lateralOffset}, ` +
          `which exceeds halfWidth ${halfWidth}`,
      );
    }

    // Calculate world position: frame.position + normal * lateralOffset.
    const position = add(frame.position, scale(frame.normal, lateralOffset));

    slots.push({
      index,
      distance: slotDistance,
      lateralOffset,
      position,
      heading,
    });

    index += 1;
  }

  return slots;
}

/** World heading from `distance` toward a point `ahead` units along the centreline. */
export function lookAheadHeading(
  spline: TrackSpline,
  distance: number,
  ahead: number = GRID_LOOK_AHEAD_UNITS,
): number {
  const here = spline.positionAt(distance);
  const there = spline.positionAt(spline.wrap(distance + ahead));
  const chord = { x: there.x - here.x, y: there.y - here.y };
  if (chord.x * chord.x + chord.y * chord.y < 1e-8) {
    return angleOf(spline.frameAt(distance).tangent);
  }
  return angleOf(chord);
}
