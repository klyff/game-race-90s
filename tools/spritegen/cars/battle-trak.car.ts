import { PALETTE_ROLE } from '../../../src/domain/constants.ts';
import type { CarModelDef } from '../schema.ts';

/**
 * WEAPONS PLATFORM — mid-length ordnance carrier with twin side pods
 * (launcher tubes running down the flanks) and a raised rear ammunition rack.
 * Built for firepower; handles like a truck. Local space: +X forward, +Y left,
 * +Z up, z=0 ground. Approximately 3.7 long, 2.5 wide (incl. pods), 1.3 tall.
 */
export const battleTrak: CarModelDef = {
  id: 'battle-trak',
  displayName: 'Battle Trak',
  archetype: 'Weapons platform — high firepower, steady all-rounder',

  palette: {
    body: '#6b7d5c',      // Military olive
    accent: '#ff8c00',    // Hazard orange
    glass: '#b8f2f8',     // Light blue tint
    tire: '#242b30',      // Dark gray
    light: '#ffd97a',     // Warm yellow
    outline: '#170a0d',   // Very dark
  },

  parts: [
    // HULL AND CHASSIS
    {
      name: 'chassis',
      role: PALETTE_ROLE.BODY,
      // Tapers slightly towards nose, compact mid-length hull.
      shape: {
        center: [0, 0, 0.34],
        size: [3.6, 1.5, 0.38],
        rear: { width: 0.95 },
        front: { width: 0.85, z: -0.02 },
      },
    },
    {
      name: 'hood',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [1.1, 0, 0.6],
        size: [1.4, 1.4, 0.22],
        front: { width: 0.8, height: 0.55, z: -0.06 },
      },
    },
    {
      name: 'cabin',
      role: PALETTE_ROLE.BODY,
      // Narrower than chassis; olive shoulders frame the glass.
      shape: {
        center: [-0.28, 0, 0.79],
        size: [1.6, 1.4, 0.36],
        rear: { width: 0.92, height: 0.85 },
        front: { width: 0.84, height: 0.78, z: 0.02 },
      },
    },
    {
      name: 'canopy',
      role: PALETTE_ROLE.GLASS,
      // Glass sits just proud of cabin.
      shape: {
        center: [-0.2, 0, 0.99],
        size: [1.2, 1.18, 0.18],
        rear: { width: 0.86, height: 0.7 },
        front: { width: 0.72, height: 0.44, z: -0.02 },
      },
    },
    {
      name: 'tail',
      role: PALETTE_ROLE.BODY,
      shape: {
        center: [-1.5, 0, 0.58],
        size: [0.68, 1.4, 0.32],
        rear: { width: 0.9, height: 0.9 },
      },
    },

    // SIDE PODS (LAUNCHER TUBES) — THE KEY SILHOUETTE
    // Long, low boxes running the full length of each flank. These read as
    // obvious weapons cargo at small scale. Tapered ends reduce mass perception.
    {
      name: 'side-pod-left',
      role: PALETTE_ROLE.ACCENT,
      shape: {
        center: [-0.1, 1.08, 0.46],
        size: [3.5, 0.54, 0.38],
        rear: { width: 0.65, height: 1.0 },
        front: { width: 0.8, height: 1.0, z: 0.04 },
      },
    },
    {
      name: 'side-pod-right',
      role: PALETTE_ROLE.ACCENT,
      shape: {
        center: [-0.1, -1.08, 0.46],
        size: [3.5, 0.54, 0.38],
        rear: { width: 0.65, height: 1.0 },
        front: { width: 0.8, height: 1.0, z: 0.04 },
      },
    },

    // REAR AMMO RACK — RAISED PLATFORM
    // Sits proud behind the cabin, reads as an open-bed cargo platform for ammunition.
    {
      name: 'rear-rack',
      role: PALETTE_ROLE.ACCENT,
      shape: {
        center: [-1.12, 0, 1.0],
        size: [0.88, 1.42, 0.34],
        rear: { width: 0.85, height: 0.9 },
        front: { width: 0.88, height: 0.85 },
      },
    },

    // FORWARD LAUNCH TUBES — OPTIONAL NOSE ACCENT
    // Twin small tubes flanking the nose; they confirm "weapons" at a glance.
    {
      name: 'front-tube-left',
      role: PALETTE_ROLE.ACCENT,
      shape: {
        center: [1.55, 0.64, 0.74],
        size: [0.52, 0.24, 0.3],
      },
    },
    {
      name: 'front-tube-right',
      role: PALETTE_ROLE.ACCENT,
      shape: {
        center: [1.55, -0.64, 0.74],
        size: [0.52, 0.24, 0.3],
      },
    },

    // WHEELS
    {
      name: 'wheel-front-left',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [1.2, 0.88, 0.3], size: [0.84, 0.26, 0.58] },
    },
    {
      name: 'wheel-front-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [1.2, -0.88, 0.3], size: [0.84, 0.26, 0.58] },
    },
    {
      name: 'wheel-rear-left',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.1, 0.92, 0.32], size: [0.92, 0.3, 0.62] },
    },
    {
      name: 'wheel-rear-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.1, -0.92, 0.32], size: [0.92, 0.3, 0.62] },
    },

    // LIGHTS
    {
      name: 'headlight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [1.76, 0.44, 0.56], size: [0.14, 0.34, 0.14] },
    },
    {
      name: 'headlight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [1.76, -0.44, 0.56], size: [0.14, 0.34, 0.14] },
    },
    {
      name: 'taillight-left',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.84, 0.48, 0.62], size: [0.12, 0.38, 0.16] },
    },
    {
      name: 'taillight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.84, -0.48, 0.62], size: [0.12, 0.38, 0.16] },
    },
  ],

  // Stats: ammoCapacity is the defining characteristic. Everything else
  // sits mid-table close to marauder, reflecting a steady all-rounder that
  // trades some speed for carrying capacity.
  stats: {
    mass: 1080,           // Slightly heavier; comparable to marauder
    enginePower: 32,      // Mid-table; enough to move the mass
    brakeForce: 44,       // Mid-table; steady stops
    maxSpeed: 74,         // Mid-table; not a sprinter
    grip: 29,             // Mid-table; stable handling with the load
    steerRate: 2.4,       // Mid-table; truck-like response
    steerSpeedFalloff: 0.45,
    armor: 0.42,          // Mid-table; comparable to marauder
    ammoCapacity: 15,     // DEFINING STAT: 3× marauder's 5
    collisionRadius: 1.85, // Sized to match actual footprint with side pods
  },
};
