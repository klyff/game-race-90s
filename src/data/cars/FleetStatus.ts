/**
 * Live fleet rules. Only isometric-car-spinner cars (`N-slug`) race, shop,
 * or stay in a save. Matrix / hyphen / Delorean / nogo ids are obsolete.
 *
 * Marauder (`car-1`) is gone from `cars.json`. Runtime shop, NPCs, watch,
 * and saves must go through these helpers.
 */

/** Gone. Do not shop, race, feature, or keep in a save. */
export const RETIRED_CAR_IDS = [
  'car-1',
  '4-wasteland-pickup-sand-mg',
  '5-raider-sedan-cream-cannon',
  '6-war-muscle-red-bomber',
  '7-scav-wagon-olive-cannon',
  '4-pickup-army-green-wasteland',
] as const;

/** @deprecated Matrix leftover. Treated as out of service with every non-spinner id. */
export const UNAVAILABLE_CAR_IDS = ['delorean'] as const;

/**
 * Player-only flagships. Shop/career may own them; NPCs, watch packs, and
 * debug-IA grids never drive them — rivals stay on the shared fleet.
 */
export const PLAYER_ONLY_CAR_IDS = ['10-delorean-steel-flux'] as const;

/** World-1 stand-in for any retired / parked / matrix pick. */
export const FLEET_DEFAULT_CAR_ID = '2-sportivo-blue-combat';

/** Strip `carId#seat` so grid twins share the base inventory id. */
export function baseCarId(carId: string): string {
  const hash = carId.indexOf('#');
  return hash >= 0 ? carId.slice(0, hash) : carId;
}

export function isPlayerOnlyCarId(carId: string): boolean {
  return (PLAYER_ONLY_CAR_IDS as readonly string[]).includes(baseCarId(carId));
}

/**
 * Live spinner id that NPCs may drive. Player-only flagships stay shop/player.
 * Fake/debug ids (`car-1`) are not "npc allowed" here — callers that race
 * synthetic fleets should filter with `isPlayerOnlyCarId` alone.
 */
export function isNpcAllowedCarId(carId: string): boolean {
  const id = baseCarId(carId);
  return isLiveSpinnerCarId(id) && !isPlayerOnlyCarId(id);
}

/**
 * Live inventory id (`1-muscle-car-gray-number9`). Local copy so this file
 * does not import CarManifest (CarManifest already imports FleetStatus).
 */
export function isLiveSpinnerCarId(carId: string): boolean {
  if ((RETIRED_CAR_IDS as readonly string[]).includes(carId)) {
    return false;
  }
  if (carId === 'delorean' || /^nogo-\d+$/.test(carId) || /^car[-_]\d+/.test(carId)) {
    return false;
  }
  return /^\d+-.+$/.test(carId);
}

export function isRetiredCarId(carId: string): boolean {
  return (RETIRED_CAR_IDS as readonly string[]).includes(carId) || !isLiveSpinnerCarId(carId);
}

export function isUnavailableCarId(carId: string): boolean {
  return (UNAVAILABLE_CAR_IDS as readonly string[]).includes(carId);
}

export function isOutOfServiceCarId(carId: string): boolean {
  return !isLiveSpinnerCarId(carId);
}

export function sanitizeCarId(carId: string, fallback = FLEET_DEFAULT_CAR_ID): string {
  if (carId.length === 0 || isOutOfServiceCarId(carId)) {
    return fallback;
  }
  return carId;
}

export function sanitizeOwnedCarIds(ownedCarIds: readonly string[]): readonly string[] {
  const live: string[] = [];
  for (const id of ownedCarIds) {
    if (id.length === 0) {
      continue;
    }
    const next = isLiveSpinnerCarId(id) ? id : FLEET_DEFAULT_CAR_ID;
    if (!live.includes(next)) {
      live.push(next);
    }
  }
  return live;
}
