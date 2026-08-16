import { PALETTE_ROLE } from '../../../src/domain/constants.ts';
import type { CarModelDef } from '../schema.ts';

/**
 * AIR BLADE — Low-slung speedster.
 *
 * The longest and lowest car of the roster: a dart-like profile with a sharp
 * wedge nose that tapers hard to a point, a shallow raked canopy, a tapered
 * tail, and thin wheels tucked close to the hull. Local space is +X forward,
 * +Y left, +Z up, ground at z = 0. Roughly 4.3 long, 1.5 wide, 0.85 tall.
 */
export const airBlade: CarModelDef = {
  id: 'air-blade',
  displayName: 'Air Blade',
  archetype: 'Low-slung speedster — pure acceleration, fragile at the edge',

  palette: {
    body: '#0099ff',
    accent: '#7c4dff',
    glass: '#e8f5ff',
    tire: '#1a1f24',
    light: '#00ffff',
    outline: '#0a0606',
  },

  parts: [
    {
      name: 'chassis',
      role: PALETTE_ROLE.BODY,
      // The main hull: very long and low. Tapers sharply towards the nose,
      // giving the flanks a pronounced inward slope.
      shape: {
        center: [0, 0, 0.23],
        size: [4.2, 1.5, 0.28],
        rear: { width: 0.85 },
        front: { width: 0.42, z: -0.05 },
      },
    },
    {
      name: 'hood',
      role: PALETTE_ROLE.BODY,
      // Long sharp wedge nose that tapers hard towards the tip. Very low profile.
      shape: {
        center: [1.78, 0, 0.29],
        size: [1.65, 1.28, 0.12],
        front: { width: 0.06, height: 0.12, z: -0.10 },
      },
    },
    {
      name: 'cabin',
      role: PALETTE_ROLE.BODY,
      // Narrower than the chassis to keep the blue shoulder visible around the glass.
      shape: {
        center: [-0.35, 0, 0.56],
        size: [1.6, 1.32, 0.22],
        rear: { width: 0.8, height: 0.8 },
        front: { width: 0.55, height: 0.72, z: 0.01 },
      },
    },
    {
      name: 'canopy',
      role: PALETTE_ROLE.GLASS,
      // Shallow raked canopy, very low roof. Sits just proud of the cabin.
      shape: {
        center: [-0.3, 0, 0.7],
        size: [1.3, 1.1, 0.1],
        rear: { width: 0.7, height: 0.6 },
        front: { width: 0.38, height: 0.25, z: -0.01 },
      },
    },
    {
      name: 'tail',
      role: PALETTE_ROLE.BODY,
      // Tapered rear end.
      shape: {
        center: [-1.78, 0, 0.47],
        size: [0.68, 1.48, 0.25],
        rear: { width: 0.35, height: 0.8 },
      },
    },
    {
      name: 'rear-wing',
      role: PALETTE_ROLE.ACCENT,
      // Knife-thin rear wing for downforce character.
      shape: { center: [-1.88, 0, 0.88], size: [0.16, 1.42, 0.1] },
    },
    {
      name: 'wheel-front-left',
      role: PALETTE_ROLE.TIRE,
      // Thin wheels tucked close to the hull.
      shape: { center: [1.32, 0.82, 0.27], size: [0.72, 0.2, 0.52] },
    },
    {
      name: 'wheel-front-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [1.32, -0.82, 0.27], size: [0.72, 0.2, 0.52] },
    },
    {
      name: 'wheel-rear-left',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.32, 0.84, 0.29], size: [0.78, 0.22, 0.56] },
    },
    {
      name: 'wheel-rear-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.32, -0.84, 0.29], size: [0.78, 0.22, 0.56] },
    },
    {
      name: 'headlight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [2.18, 0.38, 0.48], size: [0.1, 0.28, 0.1] },
    },
    {
      name: 'headlight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [2.18, -0.38, 0.48], size: [0.1, 0.28, 0.1] },
    },
    {
      name: 'taillight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.96, 0.42, 0.54], size: [0.1, 0.32, 0.12] },
    },
    {
      name: 'taillight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.96, -0.42, 0.54], size: [0.1, 0.32, 0.12] },
    },
  ],

  // Stats tuned for a light, fast, fragile speedster with twitchy handling.
  stats: {
    mass: 650,
    enginePower: 36,
    brakeForce: 36,
    maxSpeed: 95,
    grip: 18,
    steerRate: 3.1,
    steerSpeedFalloff: 0.68,
    armor: 0.15,
    ammoCapacity: 4,
    collisionRadius: 1.8,
  },
};
