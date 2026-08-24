import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findTrack } from '../../src/data/tracks/registry.ts';
import { findCarSheet, parseCarSetManifest } from '../../src/data/cars/CarManifest.ts';
import { CAR_PERK, SIMULATION_STEP_SECONDS } from '../../src/domain/constants.ts';
import { IDLE_INPUT } from '../../src/domain/input/InputCommand.ts';
import { add, scale } from '../../src/domain/math/Vec2.ts';
import { RaceField } from '../../src/domain/race/RaceField.ts';
import type { RacerEntry } from '../../src/domain/race/RaceField.ts';
import { trackFullHalfWidth } from '../../src/domain/track/TrackDefinition.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import { CAR_PERKS } from '../../src/domain/vehicle/CarPerk.ts';
import { HAZARD_KIND, oilYawSpinForArmor, resetHazardIds } from '../../src/domain/weapons/Hazard.ts';
import { resetMissileIds } from '../../src/domain/weapons/Missile.ts';
import {
  CAR_LENGTH_PER_COLLISION_RADIUS,
  MINE_SIZE_OF_CAR,
  MISSILE_START_COUNT,
  OIL_SIZE_OF_CAR,
} from '../../src/domain/weapons/WeaponConstants.ts';
import {
  createWeaponInventory,
  missileCapacity,
  missileStartCount,
} from '../../src/domain/weapons/WeaponInventory.ts';

const testFileDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(testFileDir, '..', '..');
const manifest = parseCarSetManifest(
  JSON.parse(readFileSync(join(projectRoot, 'public', 'assets', 'cars', 'cars.json'), 'utf-8')),
);
const track = findTrack('thunder-basin');
const tankPerk = CAR_PERKS[CAR_PERK.WAR_TANK];

function freshSpline(): TrackSpline {
  return new TrackSpline(track.controlPoints);
}

beforeEach(() => {
  resetMissileIds();
  resetHazardIds();
});

describe('tank loadout', () => {
  it('starts with double missiles and refills to double capacity', () => {
    const tank = findCarSheet(manifest, 'car-18');
    expect(missileStartCount(tankPerk)).toBe(MISSILE_START_COUNT * 2);
    expect(createWeaponInventory(tankPerk).missiles).toBe(12);
    expect(missileCapacity(tank.stats, tankPerk)).toBe(tank.stats.ammoCapacity * 2);
  });
});

describe('hazard size', () => {
  it('oil is at most 0.9 of a car and a mine is 0.406 of a car', () => {
    expect(OIL_SIZE_OF_CAR).toBe(0.9);
    expect(MINE_SIZE_OF_CAR).toBe(0.406);
  });

  it('a dropped oil slick uses the authored car-length multiple', () => {
    const car = manifest.cars[0]!;
    const field = new RaceField(
      [{ carId: car.id, stats: car.stats, perk: car.perk, isPlayer: true }],
      track,
      freshSpline(),
      { countdownSeconds: 0, npcWeapons: false },
    );
    field.step({ ...IDLE_INPUT, dropOil: true }, SIMULATION_STEP_SECONDS);
    const oil = field.activeHazards.find(hazard => hazard.kind === HAZARD_KIND.OIL)!;
    const carLength = CAR_LENGTH_PER_COLLISION_RADIUS * car.stats.collisionRadius;
    expect(oil.radius).toBeCloseTo((carLength * OIL_SIZE_OF_CAR) / 2, 5);
  });

  it('a dropped mine uses a quarter-car diameter plus a little', () => {
    const car = manifest.cars[0]!;
    const field = new RaceField(
      [{ carId: car.id, stats: car.stats, perk: car.perk, isPlayer: true }],
      track,
      freshSpline(),
      { countdownSeconds: 0, npcWeapons: false },
    );
    field.step({ ...IDLE_INPUT, dropMine: true }, SIMULATION_STEP_SECONDS);
    const mine = field.activeHazards.find(hazard => hazard.kind === HAZARD_KIND.MINE)!;
    const carLength = CAR_LENGTH_PER_COLLISION_RADIUS * car.stats.collisionRadius;
    expect(mine.radius).toBeCloseTo((carLength * MINE_SIZE_OF_CAR) / 2, 5);
  });
});

describe('tank ram spin', () => {
  it('applies an oil-like yawSpin to the other car on contact', () => {
    const tank = findCarSheet(manifest, 'car-18');
    const other = findCarSheet(manifest, '2-sportivo-blue-combat');
    const entries: RacerEntry[] = [
      { carId: tank.id, stats: tank.stats, perk: CAR_PERK.WAR_TANK, isPlayer: true },
      { carId: other.id, stats: other.stats, perk: other.perk, isPlayer: false },
    ];
    const field = new RaceField(entries, track, freshSpline(), {
      countdownSeconds: 0,
      npcWeapons: false,
    });
    const rival = field.racers.find(racer => !racer.isPlayer)!;
    rival.state = { ...rival.state, position: field.player.state.position };
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(rival.state.yawSpin).toBeGreaterThanOrEqual(oilYawSpinForArmor(rival.stats.armor) * 0.99);
  });

  it('credits the player for a hard ram as the aggressor', () => {
    const tank = findCarSheet(manifest, 'car-18');
    const other = findCarSheet(manifest, '2-sportivo-blue-combat');
    const field = new RaceField(
      [
        { carId: tank.id, stats: tank.stats, perk: CAR_PERK.WAR_TANK, isPlayer: true },
        { carId: other.id, stats: other.stats, perk: other.perk, isPlayer: false },
      ],
      track,
      freshSpline(),
      { countdownSeconds: 0, npcWeapons: false },
    );
    const rival = field.racers.find(racer => !racer.isPlayer)!;
    field.player.state = { ...field.player.state, velocity: { x: 40, y: 0 } };
    rival.state = {
      ...rival.state,
      position: add(field.player.state.position, { x: 2, y: 0 }),
      velocity: { x: 0, y: 0 },
    };
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(field.playerWeaponHits.contacts).toBeGreaterThan(0);
  });
});

describe('missile bursts', () => {
  it('explodes at the car wall instead of flying off the track', () => {
    const car = manifest.cars[0]!;
    const field = new RaceField(
      [{ carId: car.id, stats: car.stats, perk: car.perk, isPlayer: true }],
      track,
      freshSpline(),
      { countdownSeconds: 0, npcWeapons: false },
    );
    const spline = freshSpline();
    const frame = spline.frameAt(field.player.distance);
    const wall = trackFullHalfWidth(track);
    field.player.state = {
      ...field.player.state,
      position: add(frame.position, scale(frame.normal, wall - 8)),
      heading: Math.atan2(frame.normal.y, frame.normal.x),
    };
    field.step({ ...IDLE_INPUT, fire: true }, SIMULATION_STEP_SECONDS);

    let bursts = field.weaponBurstsThisStep.length;
    for (let i = 0; i < 180 && bursts === 0; i += 1) {
      field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
      bursts += field.weaponBurstsThisStep.length;
    }
    expect(bursts).toBeGreaterThan(0);
    expect(field.activeMissiles.length).toBe(0);
  });
});
