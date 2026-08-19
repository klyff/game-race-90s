import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findTrack } from '../../src/data/tracks/registry.ts';
import { parseCarSetManifest } from '../../src/data/cars/CarManifest.ts';
import { CAR_PERK, SIMULATION_STEP_SECONDS } from '../../src/domain/constants.ts';
import { IDLE_INPUT } from '../../src/domain/input/InputCommand.ts';
import { distance } from '../../src/domain/math/Vec2.ts';
import { RaceField } from '../../src/domain/race/RaceField.ts';
import type { RacerEntry } from '../../src/domain/race/RaceField.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import { CAR_CONDITION } from '../../src/domain/vehicle/CarIntegrity.ts';
import { isAirborne } from '../../src/domain/vehicle/Vehicle.ts';
import { JUMP_START_COUNT } from '../../src/domain/vehicle/JumpCharges.ts';
import { CAR_PERKS, NEUTRAL_PERK } from '../../src/domain/vehicle/CarPerk.ts';
import { decideMissileAim } from '../../src/domain/weapons/WeaponAim.ts';
import {
  CAR_LENGTH_PER_COLLISION_RADIUS,
  DROP_BEHIND_CAR_LENGTHS,
  GASOLINE_BURST_SCALE,
  MINE_RAW_DAMAGE,
  MISSILE_RAW_DAMAGE,
  MISSILE_START_COUNT,
  resolveBurstScale,
  scaledWeaponDamage,
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
import {
  ageHazards,
  HAZARD_KIND,
  oilYawSpinForArmor,
  placeGasoline,
  resetHazardIds,
} from '../../src/domain/weapons/Hazard.ts';

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

describe('scaledWeaponDamage', () => {
  it('cuts catalog damage to 30% for everyone except the war tank cannon (70%)', () => {
    expect(scaledWeaponDamage(0.5, undefined)).toBeCloseTo(0.15, 5);
    expect(scaledWeaponDamage(0.5, 'arsenal')).toBeCloseTo(0.15, 5);
    expect(scaledWeaponDamage(0.5, 'war-tank')).toBeCloseTo(0.35, 5);
    expect(scaledWeaponDamage(1, 'war-tank')).toBeCloseTo(0.7, 5);
    expect(scaledWeaponDamage(MINE_RAW_DAMAGE, 'war-tank')).toBeGreaterThan(
      scaledWeaponDamage(MINE_RAW_DAMAGE, 'arsenal'),
    );
  });
});

describe('WeaponInventory', () => {
  it('starts every car with 3 missiles and 2 oil', () => {
    const inv = createWeaponInventory();
    expect(inv.missiles).toBe(MISSILE_START_COUNT);
    expect(inv.oil).toBe(OIL_START_COUNT);
  });

  it('Arsenal raises the missile refill ceiling by reloadMultiplier', () => {
    const battle = manifest.cars.find(car => car.id === 'car-10')!;
    const arsenal = CAR_PERKS[CAR_PERK.ARSENAL];
    expect(missileCapacity(battle.stats, NEUTRAL_PERK)).toBe(battle.stats.ammoCapacity);
    expect(missileCapacity(battle.stats, arsenal)).toBe(battle.stats.ammoCapacity * 3);
    const refilled = refillWeaponInventory(createWeaponInventory(), battle.stats, arsenal);
    expect(refilled.missiles).toBe(battle.stats.ammoCapacity * 3);
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

  it('locks the nearest car in the corridor, not the human', () => {
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
    expect(decision.targetCarId).toBe('npc');
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

  it('counts a player oil hit on a rival toward the purse bounty', () => {
    const field = twoCarField();
    field.step({ ...IDLE_INPUT, dropOil: true }, SIMULATION_STEP_SECONDS);
    const oil = field.activeHazards.find(h => h.kind === HAZARD_KIND.OIL)!;
    const rival = field.racers.find(r => !r.isPlayer)!;
    rival.state = { ...rival.state, position: oil.position };
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(field.playerWeaponHits.oil).toBe(1);
    expect(field.playerWeaponHits.missiles).toBe(0);
    expect(field.playerWeaponHits.mines).toBe(0);
  });

  it('does not count an NPC hazard that hits the player', () => {
    const field = twoCarField();
    const npc = field.racers.find(r => !r.isPlayer)!;
    // Force the NPC to drop by issuing its own drop through a step after we
    // park the player on the resulting slick — drop via the player command
    // would be the player's oil. Instead, drop as the NPC by putting the
    // player right behind it (existing NPC drop rule).
    const spline = freshSpline();
    const frame = spline.frameAt(track.startLineDistance + 50);
    npc.state = {
      ...npc.state,
      position: frame.position,
      heading: Math.atan2(frame.tangent.y, frame.tangent.x),
    };
    npc.distance = track.startLineDistance + 50;
    const player = field.player;
    player.state = {
      ...player.state,
      position: {
        x: frame.position.x - frame.tangent.x * 15,
        y: frame.position.y - frame.tangent.y * 15,
      },
    };
    player.distance = track.startLineDistance + 35;
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    const oil = field.activeHazards.find(h => h.kind === HAZARD_KIND.OIL && h.ownerCarId === npc.carId);
    expect(oil).toBeDefined();
    player.state = { ...player.state, position: oil!.position };
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(field.playerWeaponHits.oil).toBe(0);
    expect(field.playerWeaponHits.mines).toBe(0);
  });

  it('a landmine deals scaled weapon damage on contact, not an instant wreck', () => {
    const field = twoCarField();
    field.step({ ...IDLE_INPUT, dropMine: true }, SIMULATION_STEP_SECONDS);
    const mine = field.activeHazards.find(h => h.kind === HAZARD_KIND.MINE)!;
    const rival = field.racers.find(r => !r.isPlayer)!;
    const before = rival.integrity.integrity;
    rival.state = { ...rival.state, position: mine.position };
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    const lost = before - rival.integrity.integrity;
    const expected = scaledWeaponDamage(MINE_RAW_DAMAGE, field.player.perk.id) * (1 - rival.stats.armor);
    expect(lost).toBeCloseTo(expected, 5);
    expect(rival.integrity.condition).not.toBe(CAR_CONDITION.DESTROYED);
  });

  it('does not count a mine collision on the drop step', () => {
    const field = twoCarField();
    const player = field.player;
    const rival = field.racers.find(r => !r.isPlayer)!;
    const beforePlayer = player.integrity.integrity;
    const beforeRival = rival.integrity.integrity;
    rival.state = { ...rival.state, position: player.state.position };
    field.step({ ...IDLE_INPUT, dropMine: true }, SIMULATION_STEP_SECONDS);
    expect(player.integrity.integrity).toBe(beforePlayer);
    expect(rival.integrity.integrity).toBe(beforeRival);
    expect(field.playerWeaponHits.mines).toBe(0);
    expect(field.activeHazards.some(h => h.kind === HAZARD_KIND.MINE)).toBe(true);
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
    const expected = scaledWeaponDamage(MISSILE_RAW_DAMAGE, field.player.perk.id) * (1 - rival.stats.armor);
    expect(lost).toBeCloseTo(expected, 5);
    expect(field.playerWeaponHits.missiles).toBe(1);
  });

  it('clears player weapon hits on reset', () => {
    const field = twoCarField();
    field.step({ ...IDLE_INPUT, dropMine: true }, SIMULATION_STEP_SECONDS);
    const mine = field.activeHazards.find(h => h.kind === HAZARD_KIND.MINE)!;
    const rival = field.racers.find(r => !r.isPlayer)!;
    rival.state = { ...rival.state, position: mine.position };
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(field.playerWeaponHits.mines).toBe(1);
    field.reset();
    expect(field.playerWeaponHits).toEqual({ missiles: 0, oil: 0, mines: 0, contacts: 0 });
  });

  it('car-10 on the roster carries the Arsenal perk', () => {
    const battle = manifest.cars.find(car => car.id === 'car-10')!;
    expect(battle.perk).toBe(CAR_PERK.ARSENAL);
  });

  it('an NPC drops a hazard when a rival is closing right behind it', () => {
    const field = twoCarField();
    const spline = freshSpline();
    const npc = field.racers.find(r => !r.isPlayer)!;
    const player = field.racers.find(r => r.isPlayer)!;

    // Player 15 units behind: inside the oil-drop gap (16), outside the mine
    // gap (10), and clear of the slick that now lands a full car length back.
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
        x: frame.position.x - frame.tangent.x * 15,
        y: frame.position.y - frame.tangent.y * 15,
      },
    };
    player.distance = track.startLineDistance + 35;

    const before = field.activeHazards.length;
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(field.activeHazards.length).toBeGreaterThan(before);
    expect(field.activeHazards.some(h => h.kind === HAZARD_KIND.OIL)).toBe(true);
  });
});

describe('RaceField hop', () => {
  it('starts every car with 4 jumps and a hop spends one', () => {
    const field = twoCarField();
    expect(field.player.jumps).toBe(JUMP_START_COUNT);
    field.step({ ...IDLE_INPUT, jump: true }, SIMULATION_STEP_SECONDS);
    expect(field.player.jumps).toBe(JUMP_START_COUNT - 1);
    expect(isAirborne(field.player.state)).toBe(true);
  });

  it('refuses a hop while airborne or when the stock is empty', () => {
    const field = twoCarField();
    field.step({ ...IDLE_INPUT, jump: true }, SIMULATION_STEP_SECONDS);
    expect(field.player.jumps).toBe(3);
    field.step({ ...IDLE_INPUT, jump: true }, SIMULATION_STEP_SECONDS);
    expect(field.player.jumps).toBe(3);

    field.player.jumps = 0;
    field.player.state = { ...field.player.state, height: 0, verticalVelocity: 0 };
    field.step({ ...IDLE_INPUT, jump: true }, SIMULATION_STEP_SECONDS);
    expect(field.player.jumps).toBe(0);
    expect(isAirborne(field.player.state)).toBe(false);
  });

  it('restores 4 jumps on reset', () => {
    const field = twoCarField();
    field.step({ ...IDLE_INPUT, jump: true }, SIMULATION_STEP_SECONDS);
    expect(field.player.jumps).toBe(3);
    field.reset();
    expect(field.player.jumps).toBe(JUMP_START_COUNT);
  });

  it('refills jumps to 4 when the car completes a lap', () => {
    const a = manifest.cars[0]!;
    const b = manifest.cars[1]!;
    const entries: RacerEntry[] = [
      { carId: a.id, stats: a.stats, isPlayer: false, perk: a.perk },
      { carId: b.id, stats: b.stats, isPlayer: true, perk: b.perk },
    ];
    // One checkpoint means the start line itself completes a lap, so a short
    // drive off the grid is enough to exercise the finish-line refill.
    const field = new RaceField(
      entries,
      { ...track, checkpointCount: 1 },
      freshSpline(),
      { countdownSeconds: 0, npcWeapons: false },
    );
    field.player.jumps = 0;
    const beforeLaps = field.standingOf(field.player.carId)?.lapsCompleted ?? 0;
    let laps = beforeLaps;
    for (let i = 0; i < 240 && laps === beforeLaps; i += 1) {
      field.step({ ...IDLE_INPUT, throttle: 1 }, SIMULATION_STEP_SECONDS);
      laps = field.standingOf(field.player.carId)?.lapsCompleted ?? 0;
    }
    expect(laps).toBeGreaterThan(beforeLaps);
    expect(field.player.jumps).toBe(JUMP_START_COUNT);
  });

  it('an airborne car does not take oil; the slick stays on the track', () => {
    const field = twoCarField();
    field.step({ ...IDLE_INPUT, dropOil: true }, SIMULATION_STEP_SECONDS);
    const oil = field.activeHazards.find(h => h.kind === HAZARD_KIND.OIL)!;
    const rival = field.racers.find(r => !r.isPlayer)!;
    rival.state = { ...rival.state, position: oil.position, height: 2, verticalVelocity: 0 };
    const spinBefore = rival.state.yawSpin;
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(rival.state.yawSpin).toBe(spinBefore);
    expect(field.activeHazards.some(h => h.id === oil.id)).toBe(true);
  });

  it('an airborne car does not take a mine', () => {
    const field = twoCarField();
    field.step({ ...IDLE_INPUT, dropMine: true }, SIMULATION_STEP_SECONDS);
    const mine = field.activeHazards.find(h => h.kind === HAZARD_KIND.MINE)!;
    const rival = field.racers.find(r => !r.isPlayer)!;
    rival.state = { ...rival.state, position: mine.position, height: 2, verticalVelocity: 0 };
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(rival.integrity.condition).not.toBe(CAR_CONDITION.DESTROYED);
    expect(field.activeHazards.some(h => h.id === mine.id)).toBe(true);
  });

  it('an airborne car does not take a missile; the missile keeps flying', () => {
    const field = twoCarField();
    const rival = field.racers.find(r => !r.isPlayer)!;
    const before = rival.integrity.integrity;

    field.step({ ...IDLE_INPUT, fire: true }, SIMULATION_STEP_SECONDS);
    const missile = field.activeMissiles[0];
    expect(missile).toBeDefined();

    rival.state = {
      ...rival.state,
      height: 2,
      verticalVelocity: 0,
      position: {
        x: missile!.position.x + missile!.velocity.x * SIMULATION_STEP_SECONDS,
        y: missile!.position.y + missile!.velocity.y * SIMULATION_STEP_SECONDS,
      },
    };
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);

    expect(rival.integrity.integrity).toBe(before);
    expect(field.activeMissiles.length).toBe(1);
    expect(field.playerWeaponHits.missiles).toBe(0);
  });

  it('throws a mine at least one car length behind the bumper', () => {
    const field = twoCarField();
    const player = field.player;
    field.step({ ...IDLE_INPUT, dropMine: true }, SIMULATION_STEP_SECONDS);
    const mine = field.activeHazards.find(h => h.kind === HAZARD_KIND.MINE)!;
    const carLength = CAR_LENGTH_PER_COLLISION_RADIUS * player.stats.collisionRadius;
    const gap = distance(player.state.position, mine.position) - player.stats.collisionRadius - mine.radius;
    expect(gap).toBeGreaterThanOrEqual(carLength * DROP_BEHIND_CAR_LENGTHS - 0.05);
    expect(mine.ownerCarId).toBe(player.carId);
    expect(mine.ownerArmed).toBe(true);
    expect(player.integrity.condition).not.toBe(CAR_CONDITION.DESTROYED);
  });
});

describe('resolveBurstScale', () => {
  it('keeps 1.8 and treats missing or junk as 1', () => {
    expect(resolveBurstScale(GASOLINE_BURST_SCALE)).toBe(1.8);
    expect(resolveBurstScale(undefined)).toBe(1);
    expect(resolveBurstScale(Number.NaN)).toBe(1);
    expect(resolveBurstScale(0)).toBe(1);
    expect(resolveBurstScale(-2)).toBe(1);
  });
});

describe('gasoline barrels', () => {
  it('does not evaporate the way oil does', () => {
    const hazard = placeGasoline({ x: 0, y: 0 }, 1.7, 10);
    const aged = ageHazards([hazard], 100);
    expect(aged).toHaveLength(1);
    expect(aged[0]?.kind).toBe(HAZARD_KIND.GASOLINE);
  });

  it('Thunder Basin starts with three armed gasoline seats', () => {
    const field = twoCarField();
    const barrels = field.activeHazards.filter(
      hazard => hazard.kind === HAZARD_KIND.GASOLINE && hazard.stackIndex === 0,
    );
    expect(barrels).toHaveLength(3);
    expect(barrels.every(barrel => barrel.ownerArmed)).toBe(true);
    expect(
      field.activeHazards.filter(hazard => hazard.kind === HAZARD_KIND.CRATE && hazard.stackIndex === 0),
    ).toHaveLength(6);
  });

  it('a gasoline hit wrecks the contact car and queues a 1.8× burn burst', () => {
    const field = twoCarField();
    const barrel = field.activeHazards.find(hazard => hazard.kind === HAZARD_KIND.GASOLINE)!;
    const rival = field.racers.find(racer => !racer.isPlayer)!;
    const yawBefore = rival.state.yawSpin;
    rival.state = { ...rival.state, position: barrel.position };
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(rival.integrity.condition).toBe(CAR_CONDITION.DESTROYED);
    expect(rival.state.yawSpin).toBe(yawBefore);
    expect(field.activeHazards.some(hazard => hazard.id === barrel.id)).toBe(false);
    expect(
      field.hazardBurstsThisStep.some(
        burst => burst.scale === GASOLINE_BURST_SCALE && burst.leaveBurnMark === true,
      ),
    ).toBe(true);
  });

  it('a mine hit queues a 1× burst at the hazard', () => {
    const field = twoCarField();
    field.step({ ...IDLE_INPUT, dropMine: true }, SIMULATION_STEP_SECONDS);
    const mine = field.activeHazards.find(hazard => hazard.kind === HAZARD_KIND.MINE)!;
    const rival = field.racers.find(racer => !racer.isPlayer)!;
    rival.state = { ...rival.state, position: mine.position };
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(field.hazardBurstsThisStep).toEqual([{ position: mine.position, scale: 1 }]);
  });

  it('restores gasoline barrels on reset', () => {
    const field = twoCarField();
    const barrel = field.activeHazards.find(hazard => hazard.kind === HAZARD_KIND.GASOLINE)!;
    const rival = field.racers.find(racer => !racer.isPlayer)!;
    rival.state = { ...rival.state, position: barrel.position };
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    field.reset();
    expect(
      field.activeHazards.filter(
        hazard => hazard.kind === HAZARD_KIND.GASOLINE && hazard.stackIndex === 0,
      ),
    ).toHaveLength(3);
  });
});

describe('wooden crates', () => {
  it('costs energy and leaves wood chips', () => {
    const field = twoCarField();
    const crate = field.activeHazards.find(hazard => hazard.kind === HAZARD_KIND.CRATE)!;
    const rival = field.racers.find(racer => !racer.isPlayer)!;
    rival.state = {
      ...rival.state,
      position: crate.position,
      velocity: { x: 40, y: 0 },
    };
    const before = rival.integrity.integrity;
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(before - rival.integrity.integrity).toBeCloseTo(0.07, 5);
    expect(field.activeHazards.some(hazard => hazard.id === crate.id)).toBe(false);
    expect(field.woodBurstsThisStep.length).toBeGreaterThan(0);
    expect(field.trapSmashesThisStep.some(smash => smash.kind === 'crate')).toBe(true);
  });
});
