import { CAR_PERK, PALETTE_ROLE } from '../../../src/domain/constants.ts';
import type { CarModelDef } from '../schema.ts';

/**
 * NEON RONIN — Street-tuned technical racer.
 *
 * A compact, sharp-edged coupe with a big splitter and twin tail fins: quick
 * hands and strong grip at a fair top speed, built for tight, kerb-hopping city
 * circuits. Roughly 3.9 long, 1.7 wide.
 */
export const neonRonin: CarModelDef = {
  id: 'neon-ronin',
  displayName: 'Neon Ronin',
  archetype: 'Street-tuner — razor turn-in on tight circuits',

  palette: {
    body: '#d81b8c',
    accent: '#12e0d8',
    glass: '#1a0a2a',
    tire: '#181820',
    light: '#00e5ff',
    outline: '#0a0510',
  },

  parts: [
    {
      name: 'splitter',
      role: PALETTE_ROLE.ACCENT,
      shape: {
        center: [1.9, 0, 0.16],
        size: [0.7, 1.72, 0.1],
        front: { width: 0.9 },
      },
    },
    {
      name: 'chassis',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [0, 0, 0.28],
        size: [3.8, 1.66, 0.32],
        rear: { width: 0.88 },
        front: { width: 0.62, z: -0.04 },
      },
    },
    {
      name: 'hood',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [1.4, 0, 0.36],
        size: [1.4, 1.44, 0.14],
        front: { width: 0.6, height: 0.4, z: -0.06 },
      },
    },
    {
      name: 'cabin',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [-0.25, 0, 0.6],
        size: [1.6, 1.46, 0.26],
        rear: { width: 0.84, height: 0.82 },
        front: { width: 0.6, height: 0.72, z: 0.02 },
      },
    },
    {
      name: 'canopy',
      role: PALETTE_ROLE.GLASS,
      shape: {
        center: [-0.2, 0, 0.8],
        size: [1.3, 1.2, 0.14],
        rear: { width: 0.76, height: 0.62 },
        front: { width: 0.52, height: 0.36, z: 0.0 },
      },
    },
    {
      name: 'fin-left',
      role: PALETTE_ROLE.ACCENT,
      shape: { center: [-1.7, 0.5, 0.78], size: [0.5, 0.12, 0.4] },
    },
    {
      name: 'fin-right',
      role: PALETTE_ROLE.ACCENT,
      shape: { center: [-1.7, -0.5, 0.78], size: [0.5, 0.12, 0.4] },
    },
    {
      name: 'wheel-front-left',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [1.26, 0.88, 0.28], size: [0.82, 0.26, 0.56] },
    },
    {
      name: 'wheel-front-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [1.26, -0.88, 0.28], size: [0.82, 0.26, 0.56] },
    },
    {
      name: 'wheel-rear-left',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.24, 0.9, 0.3], size: [0.86, 0.28, 0.6] },
    },
    {
      name: 'wheel-rear-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.24, -0.9, 0.3], size: [0.86, 0.28, 0.6] },
    },
    {
      name: 'headlight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [1.96, 0.42, 0.42], size: [0.1, 0.3, 0.12] },
    },
    {
      name: 'headlight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [1.96, -0.42, 0.42], size: [0.1, 0.3, 0.12] },
    },
    {
      name: 'taillight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.86, 0.46, 0.54], size: [0.1, 0.34, 0.12] },
    },
    {
      name: 'taillight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.86, -0.46, 0.54], size: [0.1, 0.34, 0.12] },
    },
  ],

  // The quickest hands on the roster with strong grip and a fair top speed: made
  // for busy, technical layouts where turn-in and rhythm beat raw pace.
  stats: {
    mass: 780,
    enginePower: 35,
    brakeForce: 44,
    maxSpeed: 80,
    grip: 32,
    steerRate: 3.3,
    steerSpeedFalloff: 0.5,
    armor: 0.28,
    ammoCapacity: 5,
    collisionRadius: 1.65,
    aimRadius: 3.4,
  },
  // Leans on rivals through the tight stuff and comes out ahead.
  perk: CAR_PERK.BULLDOZER,
};
