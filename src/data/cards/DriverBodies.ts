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

export function driverDefeatKey(name: string): string {
  return `driver-defeat:${name.trim().toUpperCase()}`;
}

export function driverDefeatFile(name: string): string {
  return `${slug(name)}-defeat.png`;
}

export function driverDefeatUrl(name: string): string {
  return `${DRIVER_BODY_DIRECTORY}/${driverDefeatFile(name)}`;
}

export function driverVictoryKey(name: string): string {
  return `driver-victory:${name.trim().toUpperCase()}`;
}

export function driverVictoryFile(name: string): string {
  return `${slug(name)}-victory.png`;
}

export function driverVictoryUrl(name: string): string {
  return `${DRIVER_BODY_DIRECTORY}/${driverVictoryFile(name)}`;
}

export function driverBodyForName(name: string): DriverBody {
  const race = name.trim().toUpperCase();
  return {
    name: race,
    key: driverBodyKey(race),
    file: driverBodyFile(race),
  };
}
