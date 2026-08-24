/**
 * Live fleet rules. Only isometric-car-spinner cars (`N-slug`) race, shop,
 * or stay in a save. Matrix / hyphen / Delorean / nogo ids are obsolete.
 *
 * Sheets may still live in `cars.json` for tests and leftover art. Runtime
 * shop, NPCs, watch, and saves must go through these helpers.
 */

/** Gone. Do not shop, race, feature, or keep in a save. */
export const RETIRED_CAR_IDS = ['car-1'] as const;

/** @deprecated Matrix leftover. Treated as out of service with every non-spinner id. */
export const UNAVAILABLE_CAR_IDS = ['delorean'] as const;

/** World-1 stand-in for any retired / parked / matrix pick. */
export const FLEET_DEFAULT_CAR_ID = '2-sportivo-blue-combat';

/**
 * Live inventory id (`1-muscle-car-gray-number9`). Local copy so this file
 * does not import CarManifest (CarManifest already imports FleetStatus).
 */
export function isLiveSpinnerCarId(carId: string): boolean {
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
