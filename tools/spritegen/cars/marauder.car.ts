import { PALETTE_ROLE } from '../../../src/domain/constants.ts';
import type { CarModelDef } from '../schema.ts';

/**
 * REFERENCE IMPLEMENTATION — read this before authoring another car.
 *
 * A wide, low muscle car with a big rear wing: the balanced baseline every other
 * model is tuned against. Local space is +X forward, +Y left, +Z up, ground at
 * z = 0. Roughly 4.0 long, 1.9 wide, 1.2 tall.
 */
export const marauder: CarModelDef = {
  id: 'marauder',
  displayName: 'Marauder',
  archetype: 'Balanced muscle — forgiving all-rounder',

  palette: {
    body: '#c62f2f',
    accent: '#3b474f',
    glass: '#a8e2f5',
    tire: '#242b30',
    light: '#ffd97a',
    outline: '#170a0d',
  },

  parts: [
    {
      name: 'chassis',
      role: PALETTE_ROLE.BODY,
      // Tapers towards the nose, giving the flanks a slight inward slope that
      // catches the mid-tone ramp step instead of reading as a flat slab.
      shape: {
        center: [0, 0, 0.34],
        size: [3.8, 1.86, 0.38],
        rear: { width: 0.93 },
        front: { width: 0.82, z: -0.02 },
      },
    },
    {
      name: 'hood',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [1.15, 0, 0.6],
        size: [1.5, 1.62, 0.22],
        front: { width: 0.84, height: 0.55, z: -0.06 },
      },
    },
    {
      name: 'cabin',
      role: PALETTE_ROLE.BODY,
      // Narrower than the chassis, so a red shoulder stays visible around the
      // glass instead of the roof reading as one solid pane.
      shape: {
        center: [-0.25, 0, 0.79],
        size: [1.7, 1.56, 0.36],
        rear: { width: 0.9, height: 0.85 },
        front: { width: 0.82, height: 0.78, z: 0.02 },
      },
    },
    {
      name: 'canopy',
      role: PALETTE_ROLE.GLASS,
      // Sits just proud of the cabin so the glass wins the depth test cleanly.
      shape: {
        center: [-0.18, 0, 0.99],
        size: [1.28, 1.3, 0.18],
        rear: { width: 0.84, height: 0.7 },
        front: { width: 0.7, height: 0.44, z: -0.02 },
      },
    },
    {
      name: 'tail',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [-1.58, 0, 0.58],
        size: [0.72, 1.7, 0.32],
        rear: { width: 0.9, height: 0.9 },
      },
    },
    {
      name: 'spoiler-blade',
      role: PALETTE_ROLE.ACCENT,
      shape: { center: [-1.78, 0, 1.08], size: [0.36, 1.74, 0.11] },
    },
    {
      name: 'spoiler-strut-left',
      role: PALETTE_ROLE.ACCENT,
      shape: { center: [-1.72, 0.62, 0.88], size: [0.16, 0.14, 0.34] },
    },
    {
      name: 'spoiler-strut-right',
      role: PALETTE_ROLE.ACCENT,
      shape: { center: [-1.72, -0.62, 0.88], size: [0.16, 0.14, 0.34] },
    },
    {
      name: 'wheel-front-left',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [1.28, 0.9, 0.3], size: [0.86, 0.26, 0.58] },
    },
    {
      name: 'wheel-front-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [1.28, -0.9, 0.3], size: [0.86, 0.26, 0.58] },
    },
    {
      name: 'wheel-rear-left',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.18, 0.94, 0.32], size: [0.94, 0.3, 0.62] },
    },
    {
      name: 'wheel-rear-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.18, -0.94, 0.32], size: [0.94, 0.3, 0.62] },
    },
    {
      name: 'headlight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [1.84, 0.46, 0.56], size: [0.14, 0.36, 0.14] },
    },
    {
      name: 'headlight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [1.84, -0.46, 0.56], size: [0.14, 0.36, 0.14] },
    },
    {
      name: 'taillight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.92, 0.5, 0.62], size: [0.12, 0.4, 0.16] },
    },
    {
      name: 'taillight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.92, -0.5, 0.62], size: [0.12, 0.4, 0.16] },
    },
  ],

  // The balanced baseline. Other cars are authored as deltas from these numbers.
  stats: {
    mass: 1000,
    enginePower: 34,
    brakeForce: 46,
    maxSpeed: 78,
    grip: 30,
    steerRate: 2.5,
    steerSpeedFalloff: 0.45,
    armor: 0.4,
    ammoCapacity: 5,
    collisionRadius: 1.7,
  },
};
