/**
 * Chooses which cars the NPCs drive, given the player's pick.
 *
 * The rule the project owner asked for: an NPC never drives the car the player
 * chose, and no two NPCs drive the same car. With five cars on a five-car grid
 * that makes the NPC field exactly "the rest of the roster", which is why this is
 * a selection and not a random draw — a race should be reproducible, and a shuffle
 * here would make every bug report unrepeatable.
 */

/**
 * Pure. Returns `npcCount` car ids drawn from `rosterIds`, skipping `playerCarId`.
 *
 * Roster order is preserved, so the same inputs always produce the same field.
 *
 * Degradation is deliberate rather than accidental, because the grid is sized from
 * the racer count and must never be handed an empty slot:
 *  - fewer cars available than NPCs asked for: the roster is reused from the start,
 *    so cars repeat rather than the field coming back short. Duplicates are ugly but
 *    a missing racer would desync the grid, the standings and the HUD.
 *  - an empty roster, or a roster holding only the player's car: returns empty,
 *    because there is nothing honest to return. The caller races alone.
 */
export function assignNpcCars(
  rosterIds: readonly string[],
  playerCarId: string,
  npcCount: number,
): readonly string[] {
  if (!Number.isFinite(npcCount) || npcCount <= 0) {
    return [];
  }

  const available = rosterIds.filter(id => id !== playerCarId);
  if (available.length === 0) {
    return [];
  }

  const wanted = Math.floor(npcCount);
  const assigned: string[] = [];
  for (let index = 0; index < wanted; index += 1) {
    // The modulo only ever bites when the roster is smaller than the field; with the
    // v1 roster of five and a five-car grid it is a straight walk down the list.
    const id = available[index % available.length];
    if (id !== undefined) {
      assigned.push(id);
    }
  }
  return assigned;
}
