/**
 * Chooses which cars the NPCs drive, given the player's pick.
 *
 * The rule the project owner asked for: an NPC never drives the car the player
 * chose, and no two NPCs drive the same car. Player-only flagships (DeLorean)
 * are stripped even when they sit in the fleet. The 20-car roster is larger than
 * the five-car career grid, so this is a walk down the list rather than "everyone
 * else" — a race should be reproducible, and a shuffle here would make every
 * bug report unrepeatable.
 */

import { isNpcAllowedCarId, isPlayerOnlyCarId } from '../../data/cars/FleetStatus.ts';

/**
 * Pure. Returns `npcCount` car ids drawn from `rosterIds`, skipping `playerCarId`
 * and every player-only flagship.
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

  const available = rosterIds.filter(id => id !== playerCarId && !isPlayerOnlyCarId(id));
  if (available.length === 0) {
    return [];
  }

  const wanted = Math.floor(npcCount);
  const assigned: string[] = [];
  for (let index = 0; index < wanted; index += 1) {
    // The modulo only ever bites when the roster is smaller than the field; with
    // twenty models and a seven-car grid it is a straight walk down the list.
    const id = available[index % available.length];
    if (id !== undefined) {
      assigned.push(id);
    }
  }
  return assigned;
}

/** Grid-unique id so two seats on the same model do not share finish/HUD state. */
export function seatCarId(carId: string, seat: number): string {
  if (carId.includes('#')) {
    return carId;
  }
  return `${carId}#${seat}`;
}

/**
 * Career field when the spinner inventory is small: player keeps their pick
 * if it is in the fleet; otherwise the world-1 default. NPCs take every
 * other fleet car, repeating to fill the grid. Planet roster only orders
 * who appears first — it does not hide the rest of the fleet.
 */
export function resolveCareerField(
  fleetIds: readonly string[],
  planetRosterIds: readonly string[],
  playerCarId: string,
  npcCount: number,
  fallbackPlayerId: string,
): { readonly playerCarId: string; readonly npcIds: readonly string[] } {
  const fleet = fleetIds.filter(id => id.length > 0);
  const player =
    (fleet.includes(playerCarId) ? playerCarId : undefined) ??
    (fleet.includes(fallbackPlayerId) ? fallbackPlayerId : undefined) ??
    fleet[0] ??
    playerCarId;
  const planetIds = planetRosterIds.filter(id => fleet.includes(id) && isNpcAllowedCarId(id));
  const extra = fleet.filter(id => !planetIds.includes(id) && isNpcAllowedCarId(id));
  const npcSource = planetIds.length > 0 ? [...planetIds, ...extra] : fleet.filter(isNpcAllowedCarId);
  return {
    playerCarId: player,
    npcIds: assignNpcCars(npcSource, player, npcCount),
  };
}
