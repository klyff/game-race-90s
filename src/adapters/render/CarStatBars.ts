/**
 * Comparative stat bars for the car-select panel (T-018).
 *
 * A 90s car-select screen never showed absolute numbers — it showed bars that
 * answered one question: "is this car's grip better or worse than the others?"
 * That means every bar is normalised against the *roster*, not against some
 * absolute maximum baked into the data. Swap one car's stats and every other
 * car's bars can shift, because the comparison is the whole point.
 *
 * Pure (no Phaser, no DOM, no `Date.now()`, no `Math.random()`) so it can be
 * unit-tested in Node and reused by whatever renders the actual panel.
 */

import type { CarSetManifest } from '../../data/cars/CarManifest.ts';
import type { VehicleStats } from '../../domain/vehicle/VehicleStats.ts';

/** One labelled bar on the car-select panel. */
export interface StatBar {
  /** Short uppercase label, e.g. 'SPEED'. Fits a narrow panel. */
  readonly label: string;
  /** 0..1, normalised across the roster. Never NaN, never outside the range. */
  readonly fraction: number;
  /** The raw stat value, for an optional numeric readout. */
  readonly value: number;
}

/**
 * The weakest car in the roster must still render a visible stub, never an
 * empty slot — an empty bar reads as broken data, not as "this stat is low".
 */
const MINIMUM_BAR_FRACTION = 0.15;

/** Which stats the panel shows, in display order — what a driver actually feels. */
export const STAT_BAR_FIELDS = [
  { label: 'SPEED', field: 'maxSpeed' },
  { label: 'ACCEL', field: 'enginePower' },
  { label: 'GRIP', field: 'grip' },
  { label: 'ARMOR', field: 'armor' },
] as const satisfies readonly { readonly label: string; readonly field: keyof VehicleStats }[];

/** A stat value safe to feed into normalisation math; non-finite reads as 0. */
function safeStat(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/**
 * Maps a raw value onto `[MINIMUM_BAR_FRACTION, 1]` given the roster's `[min, max]`
 * for that field.
 *
 * When every car shares the same value the range is zero, and a plain
 * `(value - min) / (max - min)` would divide by zero and produce `NaN` — a
 * `NaN` width draws nothing at all in Phaser, with no error. In that case every
 * bar is defined to be full: there is no basis for comparison, so nothing
 * should read as weak.
 */
function normalise(value: number, min: number, max: number): number {
  const range = max - min;
  if (range <= 0) {
    return 1;
  }
  const t = (safeStat(value) - min) / range;
  return MINIMUM_BAR_FRACTION + t * (1 - MINIMUM_BAR_FRACTION);
}

/**
 * The bars for one car, normalised against every car in `manifest`.
 *
 * Throws if `carId` is not in the manifest — a silent empty panel is worse
 * than a loud failure, since the player would never know why the panel looked
 * broken for one car.
 */
export function statBars(manifest: CarSetManifest, carId: string): readonly StatBar[] {
  const target = manifest.cars.find(car => car.id === carId);
  if (target === undefined) {
    const known = manifest.cars.map(car => car.id).join(', ');
    throw new Error(`statBars: unknown car "${carId}". Known cars: ${known}`);
  }

  return STAT_BAR_FIELDS.map(({ label, field }) => {
    const values = manifest.cars.map(car => safeStat(car.stats[field]));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const rawValue = target.stats[field];

    return {
      label,
      fraction: normalise(rawValue, min, max),
      value: rawValue,
    };
  });
}
