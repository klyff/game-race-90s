import { CAR_PERK, PALETTE_ROLE } from '../../../src/domain/constants.ts';
import type { CarModelDef } from '../schema.ts';

/**
 * DELOREAN — Brushed-steel time machine.
 *
 * A wedge-bodied coupe with a flat deck and pop-up lights: pure straight-line
 * pace and acceleration, paid for with paper-thin armour (owner's chosen
 * weakness). Local space is +X forward, +Y left, +Z up. Roughly 4.2 long.
 */
export const delorean: CarModelDef = {
  id: 'delorean',
  displayName: 'Delorean',
  archetype: 'Steel wedge — flat-out pace, fragile shell',

  palette: {
    body: '#b8c0c8',
    accent: '#5a6470',
    glass: '#12203a',
    tire: '#181c20',
    light: '#fff2b0',
    outline: '#0a0a0c',
  },

  parts: [
    {
      name: 'chassis',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [0, 0, 0.24],
        size: [4.1, 1.62, 0.3],
        rear: { width: 0.9 },
        front: { width: 0.6, z: -0.04 },
      },
    },
    {
      name: 'hood',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [1.5, 0, 0.32],
        size: [1.5, 1.5, 0.12],
        front: { width: 0.62, height: 0.4, z: -0.08 },
      },
    },
    {
      name: 'cabin',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [-0.2, 0, 0.6],
        size: [1.7, 1.44, 0.24],
        rear: { width: 0.86, height: 0.8 },
        front: { width: 0.6, height: 0.72, z: 0.02 },
      },
    },
    {
      name: 'canopy',
      role: PALETTE_ROLE.GLASS,
      shape: {
        center: [-0.15, 0, 0.76],
        size: [1.35, 1.2, 0.12],
        rear: { width: 0.78, height: 0.62 },
        front: { width: 0.5, height: 0.34, z: -0.01 },
      },
    },
    {
      name: 'tail',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [-1.66, 0, 0.5],
        size: [0.7, 1.6, 0.3],
        rear: { width: 0.72, height: 0.9 },
      },
    },
    {
      name: 'louvres',
      role: PALETTE_ROLE.ACCENT,
      shape: { center: [-1.0, 0, 0.82], size: [0.9, 1.3, 0.08] },
    },
    {
      name: 'wheel-front-left',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [1.24, 0.86, 0.28], size: [0.8, 0.24, 0.54] },
    },
    {
      name: 'wheel-front-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [1.24, -0.86, 0.28], size: [0.8, 0.24, 0.54] },
    },
    {
      name: 'wheel-rear-left',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.2, 0.9, 0.3], size: [0.86, 0.26, 0.58] },
    },
    {
      name: 'wheel-rear-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.2, -0.9, 0.3], size: [0.86, 0.26, 0.58] },
    },
    {
      name: 'headlight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [2.0, 0.42, 0.44], size: [0.12, 0.3, 0.12] },
    },
    {
      name: 'headlight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [2.0, -0.42, 0.44], size: [0.12, 0.3, 0.12] },
    },
    {
      name: 'taillight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.86, 0.46, 0.56], size: [0.1, 0.34, 0.14] },
    },
    {
      name: 'taillight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.86, -0.46, 0.56], size: [0.1, 0.34, 0.14] },
    },
  ],

  // Flat-out pace: highest acceleration on the roster, near-top speed, but the
  // thinnest armour of any car — one clean missile ends its race.
  stats: {
    mass: 900,
    enginePower: 42,
    brakeForce: 44,
    maxSpeed: 92,
    grip: 24,
    steerRate: 2.8,
    steerSpeedFalloff: 0.5,
    armor: 0.18,
    ammoCapacity: 4,
    collisionRadius: 1.75,
    aimRadius: 3.0,
  },
  // Rides the draft for extra straight-line punch — its whole game.
  perk: CAR_PERK.SLIPSTREAM,
};
