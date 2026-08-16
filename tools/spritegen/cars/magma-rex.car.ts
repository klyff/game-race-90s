import { CAR_PERK, PALETTE_ROLE } from '../../../src/domain/constants.ts';
import type { CarModelDef } from '../schema.ts';

/**
 * MAGMA REX — Heat-shielded siege tank.
 *
 * The heaviest, most armoured car of the roster: a slab-sided bruiser with a
 * blunt ram plate and vented flanks, built to keep going where the ground is
 * broken and hot. Slow and clumsy, but almost nothing moves it. ~4.1 long.
 */
export const magmaRex: CarModelDef = {
  id: 'magma-rex',
  displayName: 'Magma Rex',
  archetype: 'Siege tank — unmovable through fire and rubble',

  palette: {
    body: '#7a2410',
    accent: '#ff7a1a',
    glass: '#ffb066',
    tire: '#1a1512',
    light: '#ffd23c',
    outline: '#0a0503',
  },

  parts: [
    {
      name: 'chassis',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [0, 0, 0.4],
        size: [3.9, 2.0, 0.5],
        rear: { width: 0.96 },
        front: { width: 0.92 },
      },
    },
    {
      name: 'ram',
      role: PALETTE_ROLE.ACCENT,
      shape: {
        center: [1.9, 0, 0.34],
        size: [0.7, 2.0, 0.4],
        front: { width: 0.86, height: 0.9, z: -0.02 },
      },
    },
    {
      name: 'cabin',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [-0.3, 0, 0.86],
        size: [1.9, 1.72, 0.46],
        rear: { width: 0.94, height: 0.92 },
        front: { width: 0.84, height: 0.8, z: 0.02 },
      },
    },
    {
      name: 'canopy',
      role: PALETTE_ROLE.GLASS,
      shape: {
        center: [-0.2, 0, 1.12],
        size: [1.4, 1.36, 0.2],
        rear: { width: 0.86, height: 0.72 },
        front: { width: 0.72, height: 0.5, z: 0.01 },
      },
    },
    {
      name: 'vent-left',
      role: PALETTE_ROLE.ACCENT,
      shape: { center: [-1.4, 0.86, 0.66], size: [1.0, 0.2, 0.5] },
    },
    {
      name: 'vent-right',
      role: PALETTE_ROLE.ACCENT,
      shape: { center: [-1.4, -0.86, 0.66], size: [1.0, 0.2, 0.5] },
    },
    {
      name: 'wheel-front-left',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [1.24, 1.04, 0.36], size: [0.96, 0.38, 0.72] },
    },
    {
      name: 'wheel-front-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [1.24, -1.04, 0.36], size: [0.96, 0.38, 0.72] },
    },
    {
      name: 'wheel-rear-left',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.24, 1.06, 0.38], size: [1.0, 0.42, 0.76] },
    },
    {
      name: 'wheel-rear-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.24, -1.06, 0.38], size: [1.0, 0.42, 0.76] },
    },
    {
      name: 'headlight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [2.14, 0.54, 0.5], size: [0.12, 0.34, 0.16] },
    },
    {
      name: 'headlight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [2.14, -0.54, 0.5], size: [0.12, 0.34, 0.16] },
    },
    {
      name: 'taillight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.9, 0.56, 0.68], size: [0.1, 0.32, 0.16] },
    },
    {
      name: 'taillight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.9, -0.56, 0.68], size: [0.1, 0.32, 0.16] },
    },
  ],

  // Mass, power and armour maxed; grip, speed and steering all low. It wins where
  // the track is broad and brutal and grip matters least.
  stats: {
    mass: 1250,
    enginePower: 41,
    brakeForce: 40,
    maxSpeed: 70,
    grip: 20,
    steerRate: 1.9,
    steerSpeedFalloff: 0.6,
    armor: 0.62,
    ammoCapacity: 5,
    collisionRadius: 1.9,
    aimRadius: 2.6,
  },
  // Immovable in contact and shrugs off hits — a rolling roadblock.
  perk: CAR_PERK.ANVIL,
};
