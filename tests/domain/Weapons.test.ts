import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findTrack } from '../../src/data/tracks/registry.ts';
import { parseCarSetManifest } from '../../src/data/cars/CarManifest.ts';
import { CAR_PERK, SIMULATION_STEP_SECONDS } from '../../src/domain/constants.ts';
import { IDLE_INPUT } from '../../src/domain/input/InputCommand.ts';
import { RaceField } from '../../src/domain/race/RaceField.ts';
import type { RacerEntry } from '../../src/domain/race/RaceField.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import { CAR_CONDITION } from '../../src/domain/vehicle/CarIntegrity.ts';
import { CAR_PERKS, NEUTRAL_PERK } from '../../src/domain/vehicle/CarPerk.ts';
import { decideMissileAim } from '../../src/domain/weapons/WeaponAim.ts';
import {
  MISSILE_RAW_DAMAGE,
  MISSILE_START_COUNT,
  MISSILE_SPEED_FACTOR,
  OIL_START_COUNT,
} from '../../src/domain/weapons/WeaponConstants.ts';
import {
  createWeaponInventory,
  missileCapacity,
  npcWeaponCooldownSeconds,
  refillWeaponInventory,
} from '../../src/domain/weapons/WeaponInventory.ts';
import { findMissileHit, launchMissile, resetMissileIds, stepMissile } from '../../src/domain/weapons/Missile.ts';
import { HAZARD_KIND, oilYawSpinForArmor, resetHazardIds } from '../../src/domain/weapons/Hazard.ts';

const testFileDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(testFileDir, '..', '..');
const carsJsonPath = join(projectRoot, 'public', 'assets', 'cars', 'cars.json');
const manifest = parseCarSetManifest(JSON.parse(readFileSync(carsJsonPath, 'utf-8')));
const track = findTrack('thunder-basin');

function freshSpline(): TrackSpline {
  return new TrackSpline(track.controlPoints);
}

function twoCarField(): RaceField {
  const a = manifest.cars[0]!;
  const b = manifest.cars[1]!;
  const entries: RacerEntry[] = [
    { carId: a.id, stats: a.stats, isPlayer: false, perk: a.perk },
    { carId: b.id, stats: b.stats, isPlayer: true, perk: b.perk },
  ];
  return new RaceField(entries, track, freshSpline(), { countdownSeconds: 0 });
}

beforeEach(() => {
  resetMissileIds();
  resetHazardIds();
});

describe('WeaponInventory', () => {
  it('starts every car with 3 missiles and 2 oil', () => {
    const inv = createWeaponInventory();
    expect(inv.missiles).toBe(MISSILE_START_COUNT);
    expect(inv.oil).toBe(OIL_START_COUNT);
  });

  it('Arsenal raises the missile refill ceiling by reloadMultiplier', () => {
    const battle = manifest.cars.find(car => car.id === 'battle-trak')!;
    const arsenal = CAR_PERKS[CAR_PERK.ARSENAL];
    expect(missileCapacity(battle.stats, NEUTRAL_PERK)).toBe(15);
    expect(missileCapacity(battle.stats, arsenal)).toBe(45);
    const refilled = refillWeaponInventory(createWeaponInventory(), battle.stats, arsenal);
    expect(refilled.missiles).toBe(45);
  });

  it('shortens NPC cooldown by reloadMultiplier', () => {
    const arsenal = CAR_PERKS[CAR_PERK.ARSENAL];
    expect(npcWeaponCooldownSeconds(1.2, arsenal)).toBeCloseTo(0.4, 5);
    expect(npcWeaponCooldownSeconds(1.2, NEUTRAL_PERK)).toBeCloseTo(1.2, 5);
  });
});

describe('Missile flight', () => {
  it('travels at 1.4× the firer max speed in a straight line', () => {
    const missile = launchMissile('a', { x: 0, y: 0 }, 0, 100, 1.7);
    expect(missile.velocity.x).toBeCloseTo(100 * MISSILE_SPEED_FACTOR, 5);
    expect(missile.velocity.y).toBeCloseTo(0, 5);
    const next = stepMissile(missile, 1)!;
    expect(next.position.x).toBeCloseTo(missile.position.x + 140, 5);
  });

  it('hits a target in its path and not its owner', () => {
    const missile = launchMissile('owner', { x: 0, y: 0 }, 0, 50, 1);
    // Place the missile on top of a target by stepping zero and testing directly.
    const hit = findMissileHit(
      { ...missile, position: { x: 10, y: 0 } },
      [
        { carId: 'owner', position: { x: 10, y: 0 }, radius: 2 },
        { carId: 'victim', position: { x: 10, y: 0 }, radius: 2 },
      ],
    );
    expect(hit?.targetCarId).toBe('victim');
  });
});

describe('WeaponAim', () => {
  // reach for collisionRadius 1.7 ≈ 2.5 * 2.35 * 1.7 ≈ 10 units ahead.
  const COLLISION_RADIUS = 1.7;

  it('prioritises the player when both a player and an NPC sit in the corridor', () => {
    const decision = decideMissileAim(
      { x: 0, y: 0 },
      0,
      COLLISION_RADIUS,
      3.5,
      [
        { carId: 'npc', position: { x: 4, y: 0 }, isPlayer: false },
        { carId: 'player', position: { x: 8, y: 0 }, isPlayer: true },
      ],
    );
    expect(decision.shouldFire).toBe(true);
    expect(decision.targetCarId).toBe('player');
  });

  it('does not fire at a car outside the corridor', () => {
    const decision = decideMissileAim(
      { x: 0, y: 0 },
      0,
      COLLISION_RADIUS,
      3.5,
      [{ carId: 'side', position: { x: 0, y: 30 }, isPlayer: true }],
    );
    expect(decision.shouldFire).toBe(false);
  });

  it('does not fire at a car behind the nose', () => {
    const decision = decideMissileAim(
      { x: 0, y: 0 },
      0,
      COLLISION_RADIUS,
      3.5,
      [{ carId: 'behind', position: { x: -8, y: 0 }, isPlayer: true }],
    );
    expect(decision.shouldFire).toBe(false);
  });

  it('a wider aim circle captures a target a narrow one would miss', () => {
    const offset = { carId: 'offset', position: { x: 8, y: 4 }, isPlayer: true };
    const narrow = decideMissileAim({ x: 0, y: 0 }, 0, COLLISION_RADIUS, 2.5, [offset]);
    const wide = decideMissileAim({ x: 0, y: 0 }, 0, COLLISION_RADIUS, 5.0, [offset]);
    expect(narrow.shouldFire).toBe(false);
    expect(wide.shouldFire).toBe(true);
  });
});

describe('RaceField weapons', () => {
  it('fires a missile on fire=true and spends one round', () => {
    const field = twoCarField();
    const before = field.player.inventory.missiles;
    field.step({ ...IDLE_INPUT, fire: true }, SIMULATION_STEP_SECONDS);
    expect(field.player.inventory.missiles).toBe(before - 1);
    expect(field.activeMissiles.length).toBe(1);
  });

  it('drops oil behind the car and applies yawSpin on contact', () => {
    const field = twoCarField();
    const player = field.player;
    field.step({ ...IDLE_INPUT, dropOil: true }, SIMULATION_STEP_SECONDS);
    expect(player.inventory.oil).toBe(OIL_START_COUNT - 1);
    expect(field.activeHazards.some(h => h.kind === HAZARD_KIND.OIL)).toBe(true);

    // Place the rival on the oil and step so hazard resolution runs.
    const oil = field.activeHazards.find(h => h.kind === HAZARD_KIND.OIL)!;
    const rival = field.racers.find(r => !r.isPlayer)!;
    rival.state = { ...rival.state, position: oil.position };
    const spinBefore = rival.state.yawSpin;
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(rival.state.yawSpin).toBeGreaterThan(spinBefore);
    expect(rival.state.yawSpin).toBeGreaterThanOrEqual(oilYawSpinForArmor(rival.stats.armor) * 0.99);
  });

  it('a landmine destroys a car on contact', () => {
    const field = twoCarField();
    field.step({ ...IDLE_INPUT, dropMine: true }, SIMULATION_STEP_SECONDS);
    const mine = field.activeHazards.find(h => h.kind === HAZARD_KIND.MINE)!;
    const rival = field.racers.find(r => !r.isPlayer)!;
    rival.state = { ...rival.state, position: mine.position };
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(rival.integrity.condition).toBe(CAR_CONDITION.DESTROYED);
    expect(rival.explodedThisStep).toBe(true);
  });

  it('a missile hit removes ~50% integrity (armor-mitigated)', () => {
    const field = twoCarField();
    const rival = field.racers.find(r => !r.isPlayer)!;
    const before = rival.integrity.integrity;

    field.step({ ...IDLE_INPUT, fire: true }, SIMULATION_STEP_SECONDS);
    const missile = field.activeMissiles[0];
    expect(missile).toBeDefined();

    // Missiles advance BEFORE the hit test, so park the target where the nose will be.
    rival.state = {
      ...rival.state,
      position: {
        x: missile!.position.x + missile!.velocity.x * SIMULATION_STEP_SECONDS,
        y: missile!.position.y + missile!.velocity.y * SIMULATION_STEP_SECONDS,
      },
    };
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);

    const lost = before - rival.integrity.integrity;
    const expected = MISSILE_RAW_DAMAGE * (1 - rival.stats.armor);
    expect(lost).toBeCloseTo(expected, 5);
  });

  it('battle-trak on the roster carries the Arsenal perk', () => {
    const battle = manifest.cars.find(car => car.id === 'battle-trak')!;
    expect(battle.perk).toBe(CAR_PERK.ARSENAL);
  });

  it('an NPC drops a hazard when a rival is closing right behind it', () => {
    const field = twoCarField();
    const spline = freshSpline();
    const npc = field.racers.find(r => !r.isPlayer)!;
    const player = field.racers.find(r => r.isPlayer)!;

    // Put the NPC on the track with the player 8 units behind: inside the oil-drop
    // gap (11) but outside the tighter mine gap (6).
    const frame = spline.frameAt(track.startLineDistance + 50);
    npc.state = {
      ...npc.state,
      position: frame.position,
      heading: Math.atan2(frame.tangent.y, frame.tangent.x),
    };
    npc.distance = track.startLineDistance + 50;
    player.state = {
      ...player.state,
      position: {
        x: frame.position.x - frame.tangent.x * 8,
        y: frame.position.y - frame.tangent.y * 8,
      },
    };
    player.distance = track.startLineDistance + 42;

    const before = field.activeHazards.length;
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(field.activeHazards.length).toBeGreaterThan(before);
    expect(field.activeHazards.some(h => h.kind === HAZARD_KIND.OIL)).toBe(true);
  });
});
