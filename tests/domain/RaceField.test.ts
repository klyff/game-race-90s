import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

import { RaceField } from '../../src/domain/race/RaceField.ts';
import type { RacerEntry } from '../../src/domain/race/RaceField.ts';
import { findTrack } from '../../src/data/tracks/registry.ts';
import type { TrackTrapCatalog } from '../../src/domain/traps/TrapCatalog.ts';
import { findCarSheet, parseCarSetManifest } from '../../src/data/cars/CarManifest.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import { trackFullHalfWidth } from '../../src/domain/track/TrackDefinition.ts';
import { CAR_PERK, RACE_PHASE, SIMULATION_STEP_SECONDS } from '../../src/domain/constants.ts';
import { IDLE_INPUT } from '../../src/domain/input/InputCommand.ts';
import type { InputCommand } from '../../src/domain/input/InputCommand.ts';
import { CAR_CONDITION, createCarIntegrity } from '../../src/domain/vehicle/CarIntegrity.ts';
import { isAirborne } from '../../src/domain/vehicle/Vehicle.ts';
import { add, distance as vecDistance, length as vecLength, scale, subtract } from '../../src/domain/math/Vec2.ts';
import { RAMP_LANDING_DAMAGE, RAMP_LANDING_STUN_SECONDS } from '../../src/domain/track/RampLaunch.ts';

const testFileDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(testFileDir, '..', '..');
const carsJsonPath = join(projectRoot, 'public', 'assets', 'cars', 'cars.json');

const manifest = parseCarSetManifest(JSON.parse(readFileSync(carsJsonPath, 'utf-8')));
const track = findTrack('thunder-basin');

function freshSpline(): TrackSpline {
  return new TrackSpline(track.controlPoints);
}

/**
 * Live spinner field: every roster car on the grid, player last.
 */
const RACE_SIZE = 4;
function fullFieldEntries(): readonly RacerEntry[] {
  const cars = manifest.cars.slice(0, RACE_SIZE);
  const npcs = cars.slice(1).map(car => ({ carId: car.id, stats: car.stats, isPlayer: false }));
  const player = cars[0];
  if (player === undefined) {
    throw new Error('manifest has no cars');
  }
  return [...npcs, { carId: player.id, stats: player.stats, isPlayer: true }];
}

function emptyTraps(): TrackTrapCatalog {
  return { trackId: track.id, worldIndex: 1, crates: [], drums: [] };
}

function makeField(entries: readonly RacerEntry[] = fullFieldEntries()): RaceField {
  return new RaceField(entries, track, freshSpline(), { trapCatalog: emptyTraps() });
}

const FULL_THROTTLE: InputCommand = { ...IDLE_INPUT, throttle: 1 };

/** Runs the field for `seconds` of simulated time at the real fixed step. */
function run(field: RaceField, seconds: number, command: InputCommand = FULL_THROTTLE): void {
  const steps = Math.round(seconds / SIMULATION_STEP_SECONDS);
  for (let i = 0; i < steps; i += 1) {
    field.step(command, SIMULATION_STEP_SECONDS);
  }
}

describe('RaceField — spinner career pair', () => {
  it('runs player Sportivo plus Muscle NPCs on Thunder Basin with AI', () => {
    const player = findCarSheet(manifest, '2-sportivo-blue-combat');
    const npc = findCarSheet(manifest, '1-muscle-car-gray-number9');
    const field = new RaceField(
      [
        {
          carId: '1-muscle-car-gray-number9#0',
          name: 'KIRA',
          stats: npc.stats,
          perk: npc.perk,
          isPlayer: false,
        },
        {
          carId: player.id,
          name: 'YOU',
          stats: player.stats,
          perk: player.perk,
          isPlayer: true,
        },
      ],
      track,
      freshSpline(),
      { countdownSeconds: 0, npcWeapons: false },
    );
    expect(field.player.carId).toBe('2-sportivo-blue-combat');
    expect(field.npcNames()).toEqual([
      { carId: '1-muscle-car-gray-number9#0', name: 'KIRA', gridIndex: 0 },
    ]);
    const npcStart = field.racers[0]!.distance;
    run(field, 1.0, FULL_THROTTLE);
    expect(field.racers[0]!.distance).toBeGreaterThan(npcStart);
  });
});

describe('RaceField — the grid', () => {
  it('places every car on its own grid slot with no two cars overlapping', () => {
    const field = makeField();
    expect(field.racers).toHaveLength(RACE_SIZE);

    for (let i = 0; i < field.racers.length; i += 1) {
      for (let j = i + 1; j < field.racers.length; j += 1) {
        const a = field.racers[i]!;
        const b = field.racers[j]!;
        const gap = vecDistance(a.state.position, b.state.position);
        const touching = a.stats.collisionRadius + b.stats.collisionRadius;
        expect(gap).toBeGreaterThan(touching);
      }
    }
  });

  it('starts every car inside the walls and at rest', () => {
    const field = makeField();
    const wallLimit = trackFullHalfWidth(track);
    for (const racer of field.racers) {
      expect(Math.abs(racer.lateralOffset)).toBeLessThan(wallLimit);
      expect(vecLength(racer.state.velocity)).toBe(0);
      expect(racer.integrity.integrity).toBe(1);
    }
  });

  it('exposes the player as the single entry flagged isPlayer', () => {
    const field = makeField();
    expect(field.player.isPlayer).toBe(true);
    expect(field.racers.filter(racer => racer.isPlayer)).toHaveLength(1);
  });

  it('rejects an empty field rather than racing nobody', () => {
    expect(() => new RaceField([], track, freshSpline())).toThrow();
  });
});

describe('RaceField — the countdown', () => {
  it('holds every car still while the lights are on, even at full throttle', () => {
    const field = makeField();
    const before = field.racers.map(racer => racer.state.position);

    run(field, 1.0, FULL_THROTTLE);

    expect(field.race.phase).toBe(RACE_PHASE.COUNTDOWN);
    field.racers.forEach((racer, index) => {
      expect(vecDistance(racer.state.position, before[index]!)).toBeLessThan(1e-9);
    });
  });

  it('scores nothing during the countdown and keeps the clock at zero', () => {
    const field = makeField();
    run(field, 1.0, FULL_THROTTLE);

    expect(field.race.elapsedSeconds).toBe(0);
    for (const racer of field.race.racers) {
      expect(racer.progress.lapsCompleted).toBe(0);
      expect(racer.progress.gatesClaimed).toBe(0);
    }
  });

  it('goes green after the countdown and then starts the clock', () => {
    const field = makeField();
    run(field, 3.5, FULL_THROTTLE);

    expect(field.race.phase).toBe(RACE_PHASE.RACING);
    expect(field.race.elapsedSeconds).toBeGreaterThan(0.4);
  });
});

describe('RaceField — racing', () => {
  it('moves the player under its own command and the NPCs under the pace driver', () => {
    const spline = freshSpline();
    const field = new RaceField(fullFieldEntries(), track, spline);
    run(field, 3.5, IDLE_INPUT); // burn the countdown with nobody asking for throttle
    const before = field.racers.map(racer => racer.distance);

    run(field, 2.0, IDLE_INPUT); // player still idle, NPCs should drive off regardless

    const npcTravel = field.racers
      .map((racer, index) => ({
        racer,
        travelled: spline.signedDelta(before[index]!, racer.distance),
      }))
      .filter(row => !row.racer.isPlayer);
    // Agents contest the whole field, so one car can get shoved. The pack still leaves.
    expect(npcTravel.filter(row => row.travelled > 5).length).toBeGreaterThanOrEqual(3);
    const player = field.racers.find(racer => racer.isPlayer);
    const playerIndex = field.racers.findIndex(racer => racer.isPlayer);
    expect(player).toBeDefined();
    expect(Math.abs(spline.signedDelta(before[playerIndex]!, player!.distance))).toBeLessThan(25);
  });

  it('keeps every car inside the walls across twenty seconds of five-car racing', () => {
    const field = makeField();
    const wallLimit = trackFullHalfWidth(track);
    const steps = Math.round(23 / SIMULATION_STEP_SECONDS);

    for (let i = 0; i < steps; i += 1) {
      field.step(FULL_THROTTLE, SIMULATION_STEP_SECONDS);
      for (const racer of field.racers) {
        expect(Number.isFinite(racer.state.position.x)).toBe(true);
        expect(Number.isFinite(racer.state.position.y)).toBe(true);
        if (isAirborne(racer.state) || racer.integrity.condition === CAR_CONDITION.DESTROYED) {
          continue;
        }
        // The wall clamp is at wallLimit - collisionRadius; allow the radius back plus
        // a hair, because a car-to-car shove is resolved against that same limit.
        expect(Math.abs(racer.lateralOffset)).toBeLessThanOrEqual(wallLimit + 1);
      }
    }
  });

  it('has the NPCs complete laps and produces a ranked standing per car', () => {
    const field = makeField();
    run(field, 55, IDLE_INPUT);

    const standings = field.standings;
    expect(standings).toHaveLength(RACE_SIZE);
    expect(standings.map(standing => standing.position)).toEqual([1, 2, 3, 4]);

    // The idle player must be last, and at least one pace car must have banked a lap.
    expect(standings[standings.length - 1]!.carId).toBe(field.player.carId);
    expect(Math.max(...standings.map(standing => standing.lapsCompleted))).toBeGreaterThanOrEqual(1);
  });

  it('reports a standing for the player by car id', () => {
    const field = makeField();
    run(field, 5, FULL_THROTTLE);
    const standing = field.standingOf(field.player.carId);
    expect(standing).toBeDefined();
    expect(standing!.position).toBeGreaterThanOrEqual(1);
  });
});

describe('RaceField — car-to-car contact', () => {
  /** Two cars nose to tail on the centreline, the rear one closing fast. */
  function rearEndSetup(): RaceField {
    const spline = freshSpline();
    const entries = fullFieldEntries().slice(0, 2);
    // These tests isolate car-to-car collision physics; NPC weapons would let the
    // front car mine its tailgater and destroy it, which is a weapons test, not this.
    const field = new RaceField(entries, track, spline, {
      countdownSeconds: 0,
      npcWeapons: false,
    });

    const front = field.racers[0]!;
    const rear = field.racers[1]!;
    const frame = spline.frameAt(track.startLineDistance);
    const tangent = frame.tangent;

    front.state = { ...front.state, position: frame.position, velocity: scale(tangent, 10) };
    front.distance = track.startLineDistance;
    front.lateralOffset = 0;

    const behind = subtract(frame.position, scale(tangent, front.stats.collisionRadius + rear.stats.collisionRadius - 0.4));
    rear.state = { ...rear.state, position: behind, velocity: scale(tangent, 60) };
    rear.distance = track.startLineDistance - 3;
    rear.lateralOffset = 0;

    return field;
  }

  it('conserves momentum along the contact normal when one car rear-ends another', () => {
    const field = rearEndSetup();
    const front = field.racers[0]!;
    const rear = field.racers[1]!;

    const momentumBefore =
      front.stats.mass * front.state.velocity.x + rear.stats.mass * rear.state.velocity.x;

    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);

    const momentumAfter =
      front.stats.mass * front.state.velocity.x + rear.stats.mass * rear.state.velocity.x;

    // One physics step of drag and rolling resistance also acts, so this is a band,
    // not an equality: what must not happen is momentum appearing out of nowhere.
    expect(Math.abs(momentumAfter - momentumBefore)).toBeLessThan(Math.abs(momentumBefore) * 0.05);
  });

  it('separates two overlapping cars instead of letting them sit inside each other', () => {
    const field = rearEndSetup();
    const front = field.racers[0]!;
    const rear = field.racers[1]!;

    const touching = front.stats.collisionRadius + rear.stats.collisionRadius;
    expect(vecDistance(front.state.position, rear.state.position)).toBeLessThan(touching);

    for (let i = 0; i < 30; i += 1) {
      field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    }

    expect(vecDistance(front.state.position, rear.state.position)).toBeGreaterThan(touching * 0.95);
  });

  it('records the contact for the presentation layer exactly once', () => {
    const field = rearEndSetup();
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);

    const rear = field.racers[1]!;
    expect(field.drainImpact(rear)).toBeGreaterThan(0);
    expect(field.drainImpact(rear)).toBe(0);
  });

  it('a war-tank ram costs the other car more integrity than a neutral ram', () => {
    const marauder = manifest.cars.find(car => car.id === '2-sportivo-blue-combat')!;
    const spline = freshSpline();
    const frame = spline.frameAt(track.startLineDistance);
    const tangent = frame.tangent;

    function collideWithRearPerk(perk: typeof CAR_PERK.WAR_TANK | undefined): number {
      const field = new RaceField(
        [
          { carId: 'front', stats: marauder.stats, isPlayer: true },
          { carId: 'rear', stats: marauder.stats, isPlayer: false, perk },
        ],
        track,
        spline,
        { countdownSeconds: 0, npcWeapons: false },
      );
      const front = field.racers[0]!;
      const rear = field.racers[1]!;
      front.integrity = createCarIntegrity();
      rear.integrity = createCarIntegrity();
      front.state = { ...front.state, position: frame.position, velocity: scale(tangent, 10) };
      front.distance = track.startLineDistance;
      const behind = subtract(
        frame.position,
        scale(tangent, front.stats.collisionRadius + rear.stats.collisionRadius - 0.4),
      );
      rear.state = { ...rear.state, position: behind, velocity: scale(tangent, 70) };
      rear.distance = track.startLineDistance - 3;
      field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
      return front.integrity.integrity;
    }

    const afterNeutral = collideWithRearPerk(undefined);
    const afterTank = collideWithRearPerk(CAR_PERK.WAR_TANK);
    expect(afterTank).toBeLessThan(afterNeutral);
  });
});

describe('RaceField — damage, wrecks and respawn', () => {
  /** Drives a car straight into the outside wall of the tightest corner. */
  function wreckPlayer(field: RaceField): void {
    const player = field.player;
    // Skip the damage model's speed threshold argument entirely: the wreck path is
    // what is under test here, not the damage curve, which CarIntegrity covers.
    player.integrity = { integrity: 0, condition: CAR_CONDITION.DESTROYED, respawnRemaining: 2 };
  }

  it('freezes a wrecked car, stops its lap progress and respawns it on the centreline', () => {
    const spline = freshSpline();
    const field = new RaceField(fullFieldEntries(), track, spline);
    run(field, 3.5, FULL_THROTTLE);

    const player = field.player;
    const wreckDistance = player.distance;
    wreckPlayer(field);

    const lapsAtWreck = field.standingOf(player.carId)!.lapsCompleted;
    run(field, 1.0, FULL_THROTTLE);

    expect(player.integrity.condition).toBe(CAR_CONDITION.DESTROYED);
    expect(vecLength(player.state.velocity)).toBe(0);
    expect(field.standingOf(player.carId)!.lapsCompleted).toBe(lapsAtWreck);

    // Read the moment it comes back, not later: once driveable it starts covering
    // ground again, and that distance is not what this asserts.
    let respawnDistance: number | null = null;
    let respawnLateralOffset: number | null = null;
    const steps = Math.round(1.5 / SIMULATION_STEP_SECONDS);
    for (let i = 0; i < steps; i += 1) {
      field.step(FULL_THROTTLE, SIMULATION_STEP_SECONDS);
      if (player.respawnedThisStep) {
        respawnDistance = player.distance;
        respawnLateralOffset = player.lateralOffset;
      }
    }

    expect(respawnDistance).not.toBeNull();
    expect(respawnLateralOffset).toBe(0);
    expect(Math.abs(spline.signedDelta(wreckDistance, respawnDistance!))).toBeLessThan(1e-6);
    expect(player.integrity.condition).toBe(CAR_CONDITION.HEALTHY);
    expect(player.integrity.integrity).toBe(1);
  });

  it('raises explodedThisStep for exactly one step when a car is destroyed', () => {
    const spline = freshSpline();
    const entries = fullFieldEntries().slice(0, 1);
    const field = new RaceField(
      [{ ...entries[0]!, isPlayer: true }],
      track,
      spline,
      { countdownSeconds: 0 },
    );

    const player = field.player;
    // One hit away from destruction, then a hard wall impact finishes it.
    player.integrity = { integrity: 0.01, condition: CAR_CONDITION.CRITICAL, respawnRemaining: 0 };
    const frame = spline.frameAt(track.startLineDistance);
    const wallLimit = trackFullHalfWidth(track);
    player.state = {
      ...player.state,
      position: frame.position,
      velocity: scale(frame.normal, 70),
    };
    player.lateralOffset = 0;
    player.distance = track.startLineDistance;

    let explodedSteps = 0;
    for (let i = 0; i < 60; i += 1) {
      field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
      if (player.explodedThisStep) {
        explodedSteps += 1;
      }
    }

    expect(explodedSteps).toBe(1);
    expect(Math.abs(player.lateralOffset)).toBeLessThanOrEqual(wallLimit);
  });

  it('does not raise explodedThisStep on a clean lap', () => {
    // NPC weapons off: on a packed grid every car has another in its aim cone, and
    // missile kills would make this assertion about contact/wall damage meaningless.
    const field = new RaceField(fullFieldEntries(), track, freshSpline(), { npcWeapons: false });
    let exploded = false;
    const steps = Math.round(10 / SIMULATION_STEP_SECONDS);
    for (let i = 0; i < steps; i += 1) {
      field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
      if (field.racers.some(racer => racer.explodedThisStep)) {
        exploded = true;
      }
    }
    expect(exploded).toBe(false);
  });
});

describe('RaceField — reset', () => {
  it('puts every car back on the grid and restarts the countdown', () => {
    const field = makeField();
    const gridPositions = field.racers.map(racer => racer.state.position);

    run(field, 10, FULL_THROTTLE);
    expect(field.race.phase).toBe(RACE_PHASE.RACING);

    field.reset();

    expect(field.race.phase).toBe(RACE_PHASE.COUNTDOWN);
    expect(field.race.elapsedSeconds).toBe(0);
    field.racers.forEach((racer, index) => {
      expect(vecDistance(racer.state.position, gridPositions[index]!)).toBeLessThan(1e-9);
      expect(vecLength(racer.state.velocity)).toBe(0);
      expect(racer.integrity.integrity).toBe(1);
      expect(racer.telemetry).toBeNull();
    });
  });
});

describe('RaceField — racing AI', () => {
  it('exposes distinct named profiles after a step', () => {
    const cars = manifest.cars.slice(0, 3);
    const [a, b, player] = cars;
    if (a === undefined || b === undefined || player === undefined) {
      throw new Error('need three cars');
    }
    const field = new RaceField(
      [
        { carId: a.id, name: 'ALINE', stats: a.stats, isPlayer: false },
        { carId: b.id, name: 'NEGAO', stats: b.stats, isPlayer: false },
        { carId: player.id, stats: player.stats, isPlayer: true },
      ],
      track,
      freshSpline(),
      { countdownSeconds: 0, npcWeapons: false },
    );
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    const aline = field.aiDebug(a.id);
    const negao = field.aiDebug(b.id);
    expect(aline?.profile.displayName).toBe('ALINE');
    expect(negao?.profile.displayName).toBe('NEGAO');
    expect(aline?.profile.ram).toBeLessThan(negao?.profile.ram ?? 0);
    expect(aline?.scores.length).toBeGreaterThan(0);
  });
});

describe('RaceField — quit park', () => {
  it('slides the retired player onto the inner wall and ignores throttle', () => {
    const field = new RaceField(fullFieldEntries(), track, freshSpline(), {
      countdownSeconds: 0,
      npcWeapons: false,
    });
    run(field, 1, FULL_THROTTLE);
    field.retirePlayer();
    expect(field.isPlayerRetired).toBe(true);
    run(field, 1.4, FULL_THROTTLE);
    const wallLimit = trackFullHalfWidth(track) - field.player.stats.collisionRadius;
    expect(Math.abs(field.player.lateralOffset)).toBeCloseTo(wallLimit, 1);
    expect(field.player.lateralOffset).toBeGreaterThan(0);
    expect(vecLength(field.player.state.velocity)).toBe(0);
  });
});

describe('RaceField — ramp landings (T-050)', () => {
  function rampField(): RaceField {
    const player = manifest.cars[0]!;
    return new RaceField(
      [{ carId: player.id, stats: player.stats, isPlayer: true, perk: player.perk }],
      track,
      freshSpline(),
      { countdownSeconds: 0, npcWeapons: false },
    );
  }

  function placeAirborne(
    field: RaceField,
    distance: number,
    lateral: number,
    height: number,
  ): void {
    const spline = freshSpline();
    const frame = spline.frameAt(distance);
    const player = field.player;
    player.state = {
      ...player.state,
      position: add(frame.position, scale(frame.normal, lateral)),
      heading: Math.atan2(frame.tangent.y, frame.tangent.x),
      height,
      verticalVelocity: -80,
      velocity: { x: frame.tangent.x * 40, y: frame.tangent.y * 40 },
    };
    player.distance = distance;
    player.lateralOffset = lateral;
  }

  it('a 20° hot landing costs 4% before armor and stuns for 1s', () => {
    const field = rampField();
    const player = field.player;
    const zone = track.rampZones![0]!;
    placeAirborne(field, zone.triggerDistance + zone.triggerLength + 2, 0, 0.12);
    player.pendingRampFlight = true;
    player.pendingHardLanding = true;
    const before = player.integrity.integrity;
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(isAirborne(player.state)).toBe(false);
    const lost = before - player.integrity.integrity;
    expect(lost).toBeCloseTo(RAMP_LANDING_DAMAGE * (1 - player.stats.armor), 5);
    expect(player.landingStunRemaining).toBe(RAMP_LANDING_STUN_SECONDS);
    const turbos = player.turbos;
    field.step({ ...IDLE_INPUT, boost: true, throttle: 1 }, SIMULATION_STEP_SECONDS);
    expect(player.turbos).toBe(turbos);
  });

  it('10° ramp landings do not pay the landing tax', () => {
    const field = rampField();
    const player = field.player;
    const mid = track.rampZones![1]!;
    placeAirborne(field, mid.triggerDistance + mid.triggerLength + 2, 0, 0.12);
    player.pendingRampFlight = true;
    player.pendingHardLanding = false;
    const before = player.integrity.integrity;
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(player.integrity.integrity).toBe(before);
    expect(player.landingStunRemaining).toBe(0);
  });

  it('a ramp landing past the wall explodes and respawns on the line after the ramp', () => {
    const field = rampField();
    const player = field.player;
    const zone = track.rampZones![0]!;
    const exit = zone.triggerDistance + zone.triggerLength;
    const wall = trackFullHalfWidth(track);
    placeAirborne(field, exit - 1, wall + 6, 0.12);
    player.pendingRampFlight = true;
    player.offTrackRespawnDistance = exit;
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(player.integrity.condition).toBe(CAR_CONDITION.DESTROYED);
    expect(player.explodedThisStep).toBe(true);
    run(field, 2.05, IDLE_INPUT);
    expect(player.integrity.condition).not.toBe(CAR_CONDITION.DESTROYED);
    expect(Math.abs(player.distance - exit)).toBeLessThan(1);
    expect(Math.abs(player.lateralOffset)).toBeLessThan(1);
  });

  it('a hop landing past the wall does not explode', () => {
    const field = rampField();
    const wall = trackFullHalfWidth(track);
    placeAirborne(field, 50, wall + 6, 0.12);
    field.player.pendingRampFlight = false;
    field.step(IDLE_INPUT, SIMULATION_STEP_SECONDS);
    expect(field.player.integrity.integrity).toBeGreaterThan(0.99);
    expect(field.player.integrity.condition).not.toBe(CAR_CONDITION.DESTROYED);
  });

  it('a mine wreck still respawns where it died, not at a ramp exit', () => {
    const field = rampField();
    const player = field.player;
    player.integrity = {
      ...createCarIntegrity(),
      integrity: 0,
      condition: CAR_CONDITION.DESTROYED,
      respawnRemaining: 2,
    };
    const deathDistance = player.distance;
    player.offTrackRespawnDistance = undefined;
    run(field, 2.05, IDLE_INPUT);
    expect(player.integrity.condition).not.toBe(CAR_CONDITION.DESTROYED);
    expect(player.distance).toBeCloseTo(deathDistance, 0);
  });
});
