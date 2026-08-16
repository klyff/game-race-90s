import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CAR_PERK, SIMULATION_STEP_SECONDS } from '../../src/domain/constants.ts';
import {
  CAR_PERKS,
  NEUTRAL_PERK,
  perkProfile,
  contactStats,
  perkSurface,
  perkDamageMultiplier,
  drivingStats,
} from '../../src/domain/vehicle/CarPerk.ts';
import type { CarPerkProfile } from '../../src/domain/vehicle/CarPerk.ts';
import { stepVehicle, TARMAC, OFFROAD, driftThreshold } from '../../src/domain/vehicle/ArcadeCarPhysics.ts';
import { resolveCarContact } from '../../src/domain/vehicle/CarCollision.ts';
import { createVehicleState } from '../../src/domain/vehicle/Vehicle.ts';
import type { VehicleState } from '../../src/domain/vehicle/Vehicle.ts';
import type { VehicleStats } from '../../src/domain/vehicle/VehicleStats.ts';
import {
  applyImpactDamage,
  createCarIntegrity,
  DAMAGE_ROLE,
} from '../../src/domain/vehicle/CarIntegrity.ts';
import { IDLE_INPUT } from '../../src/domain/input/InputCommand.ts';
import type { InputCommand } from '../../src/domain/input/InputCommand.ts';
import { vec2 } from '../../src/domain/math/Vec2.ts';
import { parseCarSetManifest, findCarSheet } from '../../src/data/cars/CarManifest.ts';

/**
 * T-037 gave each car ONE signature advantage because a flat stat spread
 * ("grip: 30" vs "grip: 35") cannot be felt while driving. These tests exist
 * to prove the perks change the OUTCOME of the simulation — distance covered,
 * velocity exchanged in a hit, integrity left after a crash, terminal speed —
 * never merely that a multiplier field holds some value.
 */

const DT = SIMULATION_STEP_SECONDS;

const carManifestJson = readFileSync('public/assets/cars/cars.json', 'utf-8');
const carManifest = parseCarSetManifest(JSON.parse(carManifestJson));

const marauderStats: VehicleStats = findCarSheet(carManifest, 'marauder').stats;
const dirtDevilStats: VehicleStats = findCarSheet(carManifest, 'dirt-devil').stats;
const airBladeStats: VehicleStats = findCarSheet(carManifest, 'air-blade').stats;
const battleTrakStats: VehicleStats = findCarSheet(carManifest, 'battle-trak').stats;

const BULLDOZER_PROFILE = CAR_PERKS[CAR_PERK.BULLDOZER];
const OFF_ROAD_ACE_PROFILE = CAR_PERKS[CAR_PERK.OFF_ROAD_ACE];
const ANVIL_PROFILE = CAR_PERKS[CAR_PERK.ANVIL];
const SLIPSTREAM_PROFILE = CAR_PERKS[CAR_PERK.SLIPSTREAM];
const TRENCH_GRIP_PROFILE = CAR_PERKS[CAR_PERK.TRENCH_GRIP];
const ARSENAL_PROFILE = CAR_PERKS[CAR_PERK.ARSENAL];

function input(overrides: Partial<InputCommand>): InputCommand {
  return { ...IDLE_INPUT, ...overrides };
}

const FULL_THROTTLE = input({ throttle: 1 });

/** Runs `stepVehicle` at full throttle from rest for `steps` ticks. Returns the forward distance covered. */
function integrateForwardDistance(
  stats: VehicleStats,
  surface: ReturnType<typeof perkSurface>,
  steps: number,
): { distance: number; speed: number } {
  let state = createVehicleState(vec2(0, 0), 0);
  for (let i = 0; i < steps; i += 1) {
    state = stepVehicle(state, FULL_THROTTLE, stats, surface, DT).state;
  }
  return { distance: state.position.x, speed: state.velocity.x };
}

/**
 * Integrates at full throttle on tarmac until the per-step speed change falls
 * below `epsilon`, or `maxSeconds` elapses. Returns the speed at which it settled.
 */
function terminalSpeed(stats: VehicleStats, maxSeconds: number, epsilon: number): number {
  let state = createVehicleState(vec2(0, 0), 0);
  let previousSpeed = 0;
  const maxSteps = Math.round(maxSeconds / DT);
  for (let i = 0; i < maxSteps; i += 1) {
    state = stepVehicle(state, FULL_THROTTLE, stats, TARMAC, DT).state;
    const speed = Math.hypot(state.velocity.x, state.velocity.y);
    if (i > 10 && Math.abs(speed - previousSpeed) < epsilon) {
      return speed;
    }
    previousSpeed = speed;
  }
  return previousSpeed;
}

describe('CarPerk — off-road ace changes how far you get on dirt', () => {
  // 2 seconds at 60 Hz, full throttle, from rest, on dirt-devil's real stats.
  const STEPS = Math.round(2 / DT);

  const neutralOffroad = perkSurface(OFFROAD, NEUTRAL_PERK);
  const aceOffroad = perkSurface(OFFROAD, OFF_ROAD_ACE_PROFILE);

  const neutralOnDirt = integrateForwardDistance(dirtDevilStats, neutralOffroad, STEPS);
  const aceOnDirt = integrateForwardDistance(dirtDevilStats, aceOffroad, STEPS);
  const aceOnTarmac = integrateForwardDistance(dirtDevilStats, TARMAC, STEPS);

  console.log(
    `\nOff-road Ace (dirt-devil, 2s @ full throttle): neutral-on-dirt=${neutralOnDirt.distance.toFixed(2)}u, ` +
      `ace-on-dirt=${aceOnDirt.distance.toFixed(2)}u, ace-on-tarmac=${aceOnTarmac.distance.toFixed(2)}u, ` +
      `ace/neutral ratio=${(aceOnDirt.distance / neutralOnDirt.distance).toFixed(3)}`,
  );

  it('covers meaningfully more distance on dirt than the neutral car (measured ratio ~1.73x, asserting >=1.4x)', () => {
    // Measured on 2026-08-16: ace covers ~72.6% further than neutral on dirt.
    // Assert a margin comfortably below that so the test is not brittle to tuning.
    expect(aceOnDirt.distance).toBeGreaterThanOrEqual(neutralOnDirt.distance * 1.4);
  });

  it('is still slower on dirt than on tarmac: the penalty is reduced, never removed', () => {
    // If this ever fails because ace-on-dirt catches up to ace-on-tarmac, the
    // off-road penalty has been accidentally cancelled and cutting corners is free.
    expect(aceOnDirt.distance).toBeLessThan(aceOnTarmac.distance);
  });
});

describe('CarPerk — Bulldozer and Anvil change who gets moved', () => {
  /**
   * Resolves a contact between two cars using `contactStats`, and reports the
   * change in each car's velocity plus the momentum computed from the EFFECTIVE
   * (perk-adjusted) masses — the only way to prove effective mass did not quietly
   * break the impulse.
   */
  function collide(
    aStatsBase: VehicleStats,
    aPerk: CarPerkProfile,
    bStatsBase: VehicleStats,
    bPerk: CarPerkProfile,
  ) {
    const aEffective = contactStats(aStatsBase, aPerk);
    const bEffective = contactStats(bStatsBase, bPerk);
    const touchDistance = aEffective.collisionRadius + bEffective.collisionRadius;

    const a: VehicleState = {
      position: vec2(0, 0),
      velocity: vec2(10, 0),
      heading: 0,
      yawSpin: 0,
      height: 0,
      verticalVelocity: 0,
    };
    const b: VehicleState = {
      position: vec2(touchDistance, 0),
      velocity: vec2(-10, 0),
      heading: 0,
      yawSpin: 0,
      height: 0,
      verticalVelocity: 0,
    };

    const result = resolveCarContact(a, aEffective, b, bEffective);
    expect(result.touched).toBe(true);

    const aDeltaV = Math.hypot(result.a.velocity.x - a.velocity.x, result.a.velocity.y - a.velocity.y);
    const bDeltaV = Math.hypot(result.b.velocity.x - b.velocity.x, result.b.velocity.y - b.velocity.y);
    const initialMomentum = aEffective.mass * a.velocity.x + bEffective.mass * b.velocity.x;
    const finalMomentum = aEffective.mass * result.a.velocity.x + bEffective.mass * result.b.velocity.x;

    return { aDeltaV, bDeltaV, initialMomentum, finalMomentum, aMass: aEffective.mass, bMass: bEffective.mass };
  }

  // Same base cars (real marauder + real dirt-devil stats) in every scenario;
  // only the perk on car A varies, so the change in outcome is attributable to
  // the perk alone, not to picking a different car.
  const neutralVsNeutral = collide(marauderStats, NEUTRAL_PERK, dirtDevilStats, NEUTRAL_PERK);
  const anvilVsNeutral = collide(marauderStats, ANVIL_PROFILE, dirtDevilStats, NEUTRAL_PERK);
  const bulldozerVsNeutral = collide(marauderStats, BULLDOZER_PROFILE, dirtDevilStats, NEUTRAL_PERK);

  console.log(
    `\nCollision deltaV (marauder vs dirt-devil, closing at 20 u/s):\n` +
      `  neutral:   a=${neutralVsNeutral.aDeltaV.toFixed(3)} b=${neutralVsNeutral.bDeltaV.toFixed(3)}\n` +
      `  anvil:     a=${anvilVsNeutral.aDeltaV.toFixed(3)} b=${anvilVsNeutral.bDeltaV.toFixed(3)}\n` +
      `  bulldozer: a=${bulldozerVsNeutral.aDeltaV.toFixed(3)} b=${bulldozerVsNeutral.bDeltaV.toFixed(3)}`,
  );

  it('an Anvil car is displaced less than the same car with NEUTRAL_PERK in the identical collision', () => {
    expect(anvilVsNeutral.aDeltaV).toBeLessThan(neutralVsNeutral.aDeltaV);
  });

  it('the car that collides with an Anvil car is displaced more than one colliding with a neutral car', () => {
    expect(anvilVsNeutral.bDeltaV).toBeGreaterThan(neutralVsNeutral.bDeltaV);
  });

  it('a Bulldozer car is displaced less than neutral, and pushes its opponent more than neutral does', () => {
    expect(bulldozerVsNeutral.aDeltaV).toBeLessThan(neutralVsNeutral.aDeltaV);
    expect(bulldozerVsNeutral.bDeltaV).toBeGreaterThan(neutralVsNeutral.bDeltaV);
  });

  it('Bulldozer is ordered strictly between neutral and Anvil, as their descriptions claim', () => {
    // Anvil ("immovable") must be displaced less than Bulldozer ("wins contact").
    expect(anvilVsNeutral.aDeltaV).toBeLessThan(bulldozerVsNeutral.aDeltaV);
    // Anvil must push its opponent harder than Bulldozer does.
    expect(anvilVsNeutral.bDeltaV).toBeGreaterThan(bulldozerVsNeutral.bDeltaV);
  });

  it('momentum is conserved with respect to the EFFECTIVE masses used by the contact', () => {
    for (const scenario of [neutralVsNeutral, anvilVsNeutral, bulldozerVsNeutral]) {
      expect(Math.abs(scenario.finalMomentum - scenario.initialMomentum)).toBeLessThan(1e-6);
    }
  });
});

describe('CarPerk — the damage perks change how much integrity survives', () => {
  const IMPACT_SPEED = 60;

  function impactResult(perk: CarPerkProfile, role: (typeof DAMAGE_ROLE)[keyof typeof DAMAGE_ROLE]) {
    const scale = perkDamageMultiplier(perk, role);
    return applyImpactDamage(createCarIntegrity(), IMPACT_SPEED, marauderStats, role, scale);
  }

  const neutralVictim = impactResult(NEUTRAL_PERK, DAMAGE_ROLE.VICTIM);
  const anvilVictim = impactResult(ANVIL_PROFILE, DAMAGE_ROLE.VICTIM);
  const neutralAggressor = impactResult(NEUTRAL_PERK, DAMAGE_ROLE.AGGRESSOR);
  const bulldozerAggressor = impactResult(BULLDOZER_PROFILE, DAMAGE_ROLE.AGGRESSOR);
  const offRoadAceVictim = impactResult(OFF_ROAD_ACE_PROFILE, DAMAGE_ROLE.VICTIM);
  const bulldozerVictim = impactResult(BULLDOZER_PROFILE, DAMAGE_ROLE.VICTIM);

  console.log(
    `\nIntegrity left after a 60 u/s hit on marauder stats:\n` +
      `  neutral victim=${neutralVictim.integrity.toFixed(4)} anvil victim=${anvilVictim.integrity.toFixed(4)}\n` +
      `  neutral aggressor=${neutralAggressor.integrity.toFixed(4)} bulldozer aggressor=${bulldozerAggressor.integrity.toFixed(4)}\n` +
      `  off-road-ace victim=${offRoadAceVictim.integrity.toFixed(4)} bulldozer victim=${bulldozerVictim.integrity.toFixed(4)}`,
  );

  it('an Anvil victim keeps more integrity than a neutral car after an identical hit', () => {
    expect(anvilVictim.integrity).toBeGreaterThan(neutralVictim.integrity);
  });

  it('a Bulldozer aggressor keeps more integrity than a neutral aggressor', () => {
    expect(bulldozerAggressor.integrity).toBeGreaterThan(neutralAggressor.integrity);
  });

  it('a perk with no damage component (Off-road Ace) leaves integrity identical to neutral', () => {
    // The perk system must not leak damage effects into unrelated perks.
    expect(offRoadAceVictim.integrity).toBe(neutralVictim.integrity);
  });

  it("the multiplier composes with the existing aggressor share: a Bulldozer AGGRESSOR takes less than a Bulldozer VICTIM", () => {
    expect(bulldozerAggressor.integrity).toBeGreaterThan(bulldozerVictim.integrity);
  });
});

describe('CarPerk — Slipstream raises TOP SPEED', () => {
  const MAX_SECONDS = 40;
  const EPSILON = 1e-6;

  const baseline = terminalSpeed(airBladeStats, MAX_SECONDS, EPSILON);
  const fullDraftStats = drivingStats(airBladeStats, SLIPSTREAM_PROFILE, false, 1);
  const fullDraft = terminalSpeed(fullDraftStats, MAX_SECONDS, EPSILON);
  const zeroDraftStats = drivingStats(airBladeStats, SLIPSTREAM_PROFILE, false, 0);
  const zeroDraft = terminalSpeed(zeroDraftStats, MAX_SECONDS, EPSILON);
  const halfDraftStats = drivingStats(airBladeStats, SLIPSTREAM_PROFILE, false, 0.5);
  const halfDraft = terminalSpeed(halfDraftStats, MAX_SECONDS, EPSILON);

  console.log(
    `\nSlipstream terminal speed (air-blade, authored maxSpeed=${airBladeStats.maxSpeed}):\n` +
      `  baseline (no draft)=${baseline.toFixed(3)}  zero draft=${zeroDraft.toFixed(3)}\n` +
      `  half draft=${halfDraft.toFixed(3)}  full draft=${fullDraft.toFixed(3)} ` +
      `(ratio to baseline=${(fullDraft / baseline).toFixed(4)})`,
  );

  it("undrafted terminal speed matches air-blade's authored maxSpeed", () => {
    expect(baseline).toBeCloseTo(airBladeStats.maxSpeed, 2);
  });

  it('a full draft raises terminal speed by approximately the perk bonus fraction (0.14)', () => {
    // Measured on 2026-08-16: ratio 1.14000 — matches slipstreamBonus exactly,
    // because both enginePower and maxSpeed are scaled by the same (1 + bonus).
    const ratio = fullDraft / baseline;
    expect(ratio).toBeGreaterThan(1.1);
    expect(ratio).toBeLessThan(1.18);
  });

  it('with draftFactor 0, stats and terminal speed are unchanged from the baseline', () => {
    expect(zeroDraftStats).toEqual(airBladeStats);
    expect(zeroDraft).toBeCloseTo(baseline, 3);
  });

  it('a partial draft (0.5) lands strictly between no draft and full draft', () => {
    expect(halfDraft).toBeGreaterThan(baseline);
    expect(halfDraft).toBeLessThan(fullDraft);
  });

  it('REGRESSION GUARD: raising enginePower alone (without maxSpeed) does not move terminal speed', () => {
    // Drag is derived as (enginePower - rollingResistance) / maxSpeed², so raising
    // enginePower alone raises the derived drag by the SAME factor and terminal
    // speed does not move at all — a draft that could never pull you past the car
    // in front. This is exactly why `drivingStats` scales both `enginePower` AND
    // `maxSpeed` together. If this test ever fails, the perk has been "simplified"
    // back into a bug.
    const enginePowerOnlyStats: VehicleStats = {
      ...airBladeStats,
      enginePower: airBladeStats.enginePower * 1.14,
    };
    const enginePowerOnlyTerminal = terminalSpeed(enginePowerOnlyStats, MAX_SECONDS, EPSILON);

    console.log(
      `  engine-power-only x1.14 terminal=${enginePowerOnlyTerminal.toFixed(3)} ` +
        `(baseline=${baseline.toFixed(3)}, full-draft=${fullDraft.toFixed(3)})`,
    );

    expect(enginePowerOnlyTerminal).toBeCloseTo(baseline, 1);

    // Meanwhile drivingStats WITH a full draft does raise it, by a wide margin.
    expect(fullDraft).toBeGreaterThan(enginePowerOnlyTerminal + 5);
  });
});

describe('CarPerk — Trench Grip changes when the car lets go', () => {
  const neutralThreshold = driftThreshold(battleTrakStats, TARMAC);
  const brakingPerkStats = drivingStats(battleTrakStats, TRENCH_GRIP_PROFILE, true, 0);
  const brakingPerkThreshold = driftThreshold(brakingPerkStats, TARMAC);
  const noBrakingPerkStats = drivingStats(battleTrakStats, TRENCH_GRIP_PROFILE, false, 0);
  const noBrakingPerkThreshold = driftThreshold(noBrakingPerkStats, TARMAC);

  console.log(
    `\nTrench Grip drift thresholds (battle-trak, TARMAC): neutral=${neutralThreshold.toFixed(4)} ` +
      `braking-perk=${brakingPerkThreshold.toFixed(4)} no-braking-perk=${noBrakingPerkThreshold.toFixed(4)}`,
  );

  it('raises the drift threshold while braking', () => {
    expect(brakingPerkThreshold).toBeGreaterThan(neutralThreshold);
  });

  it('does nothing when the driver is not braking — this is a braking perk', () => {
    expect(noBrakingPerkThreshold).toBe(neutralThreshold);
  });

  it('the real outcome: a lateral speed between the two thresholds slides the neutral car but not the perked one', () => {
    // Chosen as the midpoint between the neutral threshold (2.4167) and the
    // braking-perk threshold (3.5042): above the neutral car's grip limit, so it
    // must slide, but below the perked car's raised limit, so its tyres hold.
    const midLateralSpeed = (neutralThreshold + brakingPerkThreshold) / 2;
    expect(midLateralSpeed).toBeGreaterThan(neutralThreshold);
    expect(midLateralSpeed).toBeLessThan(brakingPerkThreshold);

    const brakingInput = input({ throttle: 0, brake: 1 });

    const neutralState: VehicleState = {
      position: vec2(0, 0),
      velocity: vec2(0, midLateralSpeed),
      heading: 0,
      yawSpin: 0,
      height: 0,
      verticalVelocity: 0,
    };
    const neutralStep = stepVehicle(neutralState, brakingInput, battleTrakStats, TARMAC, DT);

    const perkState: VehicleState = {
      position: vec2(0, 0),
      velocity: vec2(0, midLateralSpeed),
      heading: 0,
      yawSpin: 0,
      height: 0,
      verticalVelocity: 0,
    };
    const perkStep = stepVehicle(perkState, brakingInput, brakingPerkStats, TARMAC, DT);

    expect(neutralStep.telemetry.isSliding).toBe(true);
    expect(perkStep.telemetry.isSliding).toBe(false);
  });
});

describe('CarPerk — Arsenal is live through the weapon system (T-046)', () => {
  // Until T-046, Arsenal changed nothing and a test pinned that. Now it raises the
  // missile refill ceiling and shortens the NPC fire cooldown via reloadMultiplier.

  it('contactStats / perkSurface / drivingStats stay no-ops (Arsenal is a weapons perk)', () => {
    expect(contactStats(marauderStats, ARSENAL_PROFILE)).toEqual(contactStats(marauderStats, NEUTRAL_PERK));
    expect(perkSurface(OFFROAD, ARSENAL_PROFILE)).toEqual(perkSurface(OFFROAD, NEUTRAL_PERK));
    expect(drivingStats(marauderStats, ARSENAL_PROFILE, true, 0)).toEqual(
      drivingStats(marauderStats, NEUTRAL_PERK, true, 0),
    );
  });

  it('reloadMultiplier is 3, so the ceiling and cooldown consumers can feel it', () => {
    expect(ARSENAL_PROFILE.reloadMultiplier).toBe(3);
    expect(NEUTRAL_PERK.reloadMultiplier).toBe(1);
  });
});

describe('CarPerk — structural: no perk writes velocity', () => {
  it('CarPerk.ts source contains no assignment to velocity, position, heading or yawSpin', () => {
    // Locked decision 12: a driver may only ever express an InputCommand.
    // Perks inherit that rule — a perk that could write velocity could cheat.
    // This check is only worth having if it can actually fail, so the regex is
    // sanity-checked below against strings it MUST and MUST NOT match.
    const testFileDir = dirname(fileURLToPath(import.meta.url));
    const projectRoot = join(testFileDir, '..', '..');
    const sourcePath = join(projectRoot, 'src', 'domain', 'vehicle', 'CarPerk.ts');
    const source = readFileSync(sourcePath, 'utf-8');

    const assignmentPattern = /\b(velocity|position|heading|yawSpin)\s*[+\-*/]?=(?!=)/;

    // Sanity: the pattern must catch a genuine assignment...
    expect(assignmentPattern.test('state.velocity = foo;')).toBe(true);
    expect(assignmentPattern.test('yawSpin += drift;')).toBe(true);
    // ...but not a read, a comparison, or an unrelated identifier.
    expect(assignmentPattern.test('const v = state.velocity.x;')).toBe(false);
    expect(assignmentPattern.test('if (velocity === 0) {}')).toBe(false);
    expect(assignmentPattern.test('contactMassMultiplier = 2;')).toBe(false);

    const violation = assignmentPattern.exec(source);
    expect(violation, `CarPerk.ts must not assign to velocity/position/heading/yawSpin. Found: ${violation?.[0]}`).toBeNull();
  });
});

describe('CarPerk — every roster car resolves its perk', () => {
  it('perkProfile(sheet.perk) returns a profile whose id matches, for every real car', () => {
    expect(carManifest.cars.length).toBeGreaterThan(0);
    for (const sheet of carManifest.cars) {
      const profile = perkProfile(sheet.perk);
      expect(profile.id).toBe(sheet.perk);
    }
  });
});
