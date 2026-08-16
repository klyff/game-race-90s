import { CAR_PERK, PALETTE_ROLE } from '../../../src/domain/constants.ts';
import type { CarModelDef } from '../schema.ts';

/**
 * AIR BOAT — Skirted marsh-runner.
 *
 * A wide, flat hovercraft-style hull on a rubber skirt: it barely cares what is
 * under it, so it keeps its grip where wheels would wash out. Medium pace, huge
 * cornering composure on the worst surfaces. Roughly 4.0 long, 2.1 wide.
 */
export const airBoat: CarModelDef = {
  id: 'air-boat',
  displayName: 'Air Boat',
  archetype: 'Marsh-runner — glides where others slide',

  palette: {
    body: '#1fb89a',
    accent: '#0d5f52',
    glass: '#d6fff4',
    tire: '#20282a',
    light: '#b6ff00',
    outline: '#06100e',
  },

  parts: [
    {
      name: 'skirt',
      role: PALETTE_ROLE.ACCENT,
      shape: {
        center: [0, 0, 0.12],
        size: [4.0, 2.1, 0.2],
        rear: { width: 0.95 },
        front: { width: 0.9 },
      },
    },
    {
      name: 'chassis',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [0, 0, 0.34],
        size: [3.4, 1.86, 0.32],
        rear: { width: 0.9 },
        front: { width: 0.78, z: -0.02 },
      },
    },
    {
      name: 'cabin',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [0.1, 0, 0.66],
        size: [1.7, 1.5, 0.3],
        rear: { width: 0.88, height: 0.82 },
        front: { width: 0.76, height: 0.74, z: 0.02 },
      },
    },
    {
      name: 'canopy',
      role: PALETTE_ROLE.GLASS,
      shape: {
        center: [0.15, 0, 0.86],
        size: [1.3, 1.24, 0.16],
        rear: { width: 0.8, height: 0.66 },
        front: { width: 0.66, height: 0.42, z: -0.01 },
      },
    },
    {
      name: 'fan',
      role: PALETTE_ROLE.ACCENT,
      shape: { center: [-1.7, 0, 0.7], size: [0.3, 1.5, 0.9] },
    },
    {
      name: 'wheel-front-left',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [1.3, 0.98, 0.26], size: [0.7, 0.24, 0.44] },
    },
    {
      name: 'wheel-front-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [1.3, -0.98, 0.26], size: [0.7, 0.24, 0.44] },
    },
    {
      name: 'wheel-rear-left',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.1, 1.0, 0.26], size: [0.74, 0.26, 0.46] },
    },
    {
      name: 'wheel-rear-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.1, -1.0, 0.26], size: [0.74, 0.26, 0.46] },
    },
    {
      name: 'headlight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [1.72, 0.5, 0.5], size: [0.12, 0.32, 0.12] },
    },
    {
      name: 'headlight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [1.72, -0.5, 0.5], size: [0.12, 0.32, 0.12] },
    },
    {
      name: 'taillight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.5, 0.54, 0.56], size: [0.1, 0.3, 0.12] },
    },
    {
      name: 'taillight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.5, -0.54, 0.56], size: [0.1, 0.3, 0.12] },
    },
  ],

  // High grip and quick steering at a modest top speed: it shines exactly where
  // the surface is worst and every other car is fighting for traction.
  stats: {
    mass: 720,
    enginePower: 30,
    brakeForce: 42,
    maxSpeed: 70,
    grip: 34,
    steerRate: 3.0,
    steerSpeedFalloff: 0.4,
    armor: 0.3,
    ammoCapacity: 4,
    collisionRadius: 1.7,
    aimRadius: 3.0,
  },
  // Treats bad ground like tarmac — its signature on low-grip planets.
  perk: CAR_PERK.OFF_ROAD_ACE,
};
