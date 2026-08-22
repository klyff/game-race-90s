/**
 * Full-body standing poses for character select. Filenames are
 * `{slug}-profile.png` — FLUFE uses flufe, not emma.
 */

export const DRIVER_BODY_DIRECTORY = 'assets/bodies';

export interface DriverBody {
  readonly name: string;
  readonly key: string;
  readonly file: string;
}

function slug(name: string): string {
  return name.trim().toLowerCase();
}

export function driverBodyKey(name: string): string {
  return `driver-body:${name.trim().toUpperCase()}`;
}

export function driverBodyFile(name: string): string {
  return `${slug(name)}-profile.png`;
}

export function driverBodyUrl(name: string): string {
  return `${DRIVER_BODY_DIRECTORY}/${driverBodyFile(name)}`;
}

export function driverBodyForName(name: string): DriverBody {
  const race = name.trim().toUpperCase();
  return {
    name: race,
    key: driverBodyKey(race),
    file: driverBodyFile(race),
  };
}
