import { CAR_PERK, PALETTE_ROLE } from '../../../src/domain/constants.ts';
import type { CarModelDef } from '../schema.ts';

/**
 * SNOW CAR — Heavy ice-crawler.
 *
 * A chunky, high-sided wagon on fat studded tyres. Second-heaviest on the
 * roster after the war tank: planted, armoured, and still the grip king.
 * Roughly 3.9 long, 2.0 wide.
 */
export const snowCar: CarModelDef = {
  id: 'snow-car',
  displayName: 'Snow Car',
  archetype: 'Heavy ice-crawler — planted, armoured, hard to shove',

  palette: {
    body: '#e8eef5',
    accent: '#3d6fa5',
    glass: '#bfe3ff',
    tire: '#2a2f34',
    light: '#ffcf5c',
    outline: '#0b0f14',
  },

  parts: [
    {
      name: 'chassis',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [0, 0, 0.36],
        size: [3.7, 1.94, 0.42],
        rear: { width: 0.94 },
        front: { width: 0.86, z: -0.02 },
      },
    },
    {
      name: 'hood',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [1.1, 0, 0.66],
        size: [1.4, 1.7, 0.24],
        front: { width: 0.9, height: 0.7, z: -0.04 },
      },
    },
    {
      name: 'cabin',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [-0.2, 0, 0.86],
        size: [1.8, 1.66, 0.44],
        rear: { width: 0.92, height: 0.9 },
        front: { width: 0.86, height: 0.84, z: 0.02 },
      },
    },
    {
      name: 'canopy',
      role: PALETTE_ROLE.GLASS,
      shape: {
        center: [-0.15, 0, 1.12],
        size: [1.4, 1.4, 0.2],
        rear: { width: 0.86, height: 0.78 },
        front: { width: 0.78, height: 0.6, z: 0.02 },
      },
    },
    {
      name: 'rack',
      role: PALETTE_ROLE.ACCENT,
      shape: { center: [-1.5, 0, 0.92], size: [0.6, 1.7, 0.16] },
    },
    {
      name: 'wheel-front-left',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [1.2, 1.02, 0.34], size: [0.94, 0.36, 0.66] },
    },
    {
      name: 'wheel-front-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [1.2, -1.02, 0.34], size: [0.94, 0.36, 0.66] },
    },
    {
      name: 'wheel-rear-left',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.2, 1.04, 0.36], size: [0.98, 0.4, 0.7] },
    },
    {
      name: 'wheel-rear-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.2, -1.04, 0.36], size: [0.98, 0.4, 0.7] },
    },
    {
      name: 'headlight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [1.86, 0.5, 0.66], size: [0.12, 0.34, 0.14] },
    },
    {
      name: 'headlight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [1.86, -0.5, 0.66], size: [0.12, 0.34, 0.14] },
    },
    {
      name: 'taillight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.7, 0.52, 0.7], size: [0.1, 0.32, 0.14] },
    },
    {
      name: 'taillight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.7, -0.52, 0.7], size: [0.1, 0.32, 0.14] },
    },
  ],

  // Stronger and heavier than the rest of the mid-table: second mass and
  // second armour, still the grip king.
  stats: {
    mass: 1320,
    enginePower: 36,
    brakeForce: 50,
    maxSpeed: 62,
    grip: 38,
    steerRate: 2.3,
    steerSpeedFalloff: 0.46,
    armor: 0.7,
    ammoCapacity: 5,
    collisionRadius: 1.95,
    aimRadius: 3.0,
  },
  // Extra grip under braking — the perk finally earns a home on the roster.
  perk: CAR_PERK.TRENCH_GRIP,
};
