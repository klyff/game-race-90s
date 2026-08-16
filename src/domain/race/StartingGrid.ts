import { add, angleOf, scale } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';
import type { TrackDefinition } from '../track/TrackDefinition.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';

/**
 * A single position on the starting grid.
 *
 * Slots fill across `track.gridLateralOffsets` first, then step back one
 * `track.gridRowSpacing` per row, starting from `setbackUnits` before the
 * start line.
 */
export interface GridSlot {
  readonly index: number;           // 0 = pole
  readonly distance: number;        // arc length along the centreline
  readonly lateralOffset: number;   // signed, positive left
  readonly position: Vec2;
  readonly heading: number;         // radians, along the tangent
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

    // Heading is the angle of the tangent vector.
    const heading = angleOf(frame.tangent);

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
