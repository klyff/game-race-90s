import { CAR_PERK, PALETTE_ROLE } from '../../../src/domain/constants.ts';
import type { CarModelDef } from '../schema.ts';

/**
 * Light dirt buggy — short and tall with fat oversized wheels.
 * Local space is +X forward, +Y left, +Z up, ground at z = 0.
 * Roughly 3.1 long, 1.95 wide, 1.4 tall — noticeably shorter than marauder but taller.
 */
export const dirtDevil: CarModelDef = {
  id: 'dirt-devil',
  displayName: 'Dirt Devil',
  archetype: 'Light dirt buggy — grip champion, nimble and fragile',

  palette: {
    body: '#c9995c',
    accent: '#5a6b4a',
    glass: '#a8e2f5',
    tire: '#242b30',
    light: '#ffd97a',
    outline: '#170a0d',
  },

  parts: [
    {
      name: 'chassis',
      role: PALETTE_ROLE.BODY,
      // Short, fat buggy chassis. Tapers slightly at front and rear to catch
      // the mid-tone ramp and avoid reading as a flat slab.
      shape: {
        center: [0, 0, 0.35],
        size: [3.1, 1.95, 0.38],
        rear: { width: 0.95 },
        front: { width: 0.85, z: -0.02 },
      },
    },
    {
      name: 'hood',
      role: PALETTE_ROLE.BODY,
      // Shorter hood than marauder — buggy sits forward.
      shape: {
        center: [1.0, 0, 0.65],
        size: [1.3, 1.6, 0.24],
        front: { width: 0.8, height: 0.5, z: -0.08 },
      },
    },
    {
      name: 'cabin',
      role: PALETTE_ROLE.BODY,
      // Tall, prominent cabin sitting high — the distinctive silhouette.
      // Narrower than chassis so the shoulder stays visible.
      shape: {
        center: [-0.2, 0, 1.0],
        size: [1.8, 1.5, 0.5],
        rear: { width: 0.88, height: 0.9 },
        front: { width: 0.75, height: 0.82 },
      },
    },
    {
      name: 'canopy',
      role: PALETTE_ROLE.GLASS,
      // Glass roof sits proud of the cabin, wins depth test cleanly.
      shape: {
        center: [-0.15, 0, 1.25],
        size: [1.3, 1.25, 0.2],
        rear: { width: 0.8, height: 0.65 },
        front: { width: 0.65, height: 0.4 },
      },
    },
    {
      name: 'tail',
      role: PALETTE_ROLE.BODY,
      // Short tail section — buggy doesn't have much rear overhang.
      shape: {
        center: [-1.55, 0, 0.55],
        size: [0.6, 1.7, 0.3],
        rear: { width: 0.95 },
      },
    },
    {
      name: 'roll-bar-hoop',
      role: PALETTE_ROLE.ACCENT,
      // Distinctive roll cage/hoop behind the cabin, the signature feature.
      // Larger and raised higher to be instantly recognisable as a buggy cage.
      shape: { center: [-0.85, 0, 1.42], size: [0.5, 1.85, 0.6] },
    },
    {
      name: 'roll-bar-strut-left',
      role: PALETTE_ROLE.ACCENT,
      // Support strut from cabin to roll bar, reinforces the cage structure.
      shape: { center: [-0.5, 0.75, 1.15], size: [0.22, 0.14, 0.38] },
    },
    {
      name: 'roll-bar-strut-right',
      role: PALETTE_ROLE.ACCENT,
      // Mirror strut on the right side.
      shape: { center: [-0.5, -0.75, 1.15], size: [0.22, 0.14, 0.38] },
    },
    {
      name: 'wheel-front-left',
      role: PALETTE_ROLE.TIRE,
      // Fat oversized wheels that clearly protrude beyond the hull — signature buggy look.
      shape: { center: [1.35, 1.05, 0.4], size: [0.75, 0.35, 0.8] },
    },
    {
      name: 'wheel-front-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [1.35, -1.05, 0.4], size: [0.75, 0.35, 0.8] },
    },
    {
      name: 'wheel-rear-left',
      role: PALETTE_ROLE.TIRE,
      // Rear wheels also large and dramatically protruding.
      shape: { center: [-1.2, 1.1, 0.42], size: [0.85, 0.38, 0.85] },
    },
    {
      name: 'wheel-rear-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.2, -1.1, 0.42], size: [0.85, 0.38, 0.85] },
    },
    {
      name: 'headlight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [1.8, 0.45, 0.65], size: [0.12, 0.35, 0.12] },
    },
    {
      name: 'headlight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [1.8, -0.45, 0.65], size: [0.12, 0.35, 0.12] },
    },
    {
      name: 'taillight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.8, 0.5, 0.65], size: [0.1, 0.38, 0.14] },
    },
    {
      name: 'taillight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.8, -0.5, 0.65], size: [0.1, 0.38, 0.14] },
    },
  ],

  // Tuned as deltas from marauder baseline: best grip, lowest maxSpeed,
  // quick steerRate with low falloff, low armor and mass.
  stats: {
    mass: 750,
    enginePower: 28,
    brakeForce: 40,
    maxSpeed: 65,
    grip: 35,
    steerRate: 3.2,
    steerSpeedFalloff: 0.35,
    armor: 0.25,
    ammoCapacity: 4,
    collisionRadius: 1.55,
  },
  // Shrugs off the off-road grip and speed penalty that punishes other cars.
  perk: CAR_PERK.OFF_ROAD_ACE,
};
