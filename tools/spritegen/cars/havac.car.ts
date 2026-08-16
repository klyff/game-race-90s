import { CAR_PERK, PALETTE_ROLE } from '../../../src/domain/constants.ts';
import type { CarModelDef } from '../schema.ts';

/**
 * Heavy armoured bruiser — a boxy slab tank built to absorb punishment.
 * Nearly square-section hull with minimal taper, raised armour plating visible
 * on flanks and nose, tiny slit windscreen, wide planted stance.
 * Local space: +X forward, +Y left, +Z up, ground at z = 0.
 * Roughly 3.95 long, 2.0 wide, 1.3 tall.
 */
export const havac: CarModelDef = {
  id: 'havac',
  displayName: 'Havac',
  archetype: 'Heavy armoured bruiser — relentless tank',

  palette: {
    body: '#4a5568',      // Gunmetal grey
    accent: '#da7d3a',    // Saturated rust-orange for armour plating (high contrast)
    glass: '#a8e2f5',     // Cyan-tinted glass (matches roster)
    tire: '#242b30',      // Dark (same as marauder)
    light: '#ffd97a',     // Yellow warning lights
    outline: '#170a0d',   // Very dark (same as marauder)
  },

  parts: [
    {
      name: 'chassis',
      role: PALETTE_ROLE.BODY,
      // Minimal taper: stays nearly square-section front to back, no sloped flanks.
      // Almost full width at both ends for boxy look.
      shape: {
        center: [0, 0, 0.40],
        size: [3.95, 2.0, 0.42],
        rear: { width: 0.98 },
        front: { width: 0.96, z: -0.01 },
      },
    },
    {
      name: 'armour-plating-left',
      role: PALETTE_ROLE.ACCENT,
      // Raised slab on left flank: shorter in X so hull is visible above and between,
      // taller in Z so it clearly sits proud of the chassis as bolted-on armour.
      shape: {
        center: [0.1, 1.0, 0.88],
        size: [2.6, 0.32, 0.38],
      },
    },
    {
      name: 'armour-plating-right',
      role: PALETTE_ROLE.ACCENT,
      // Matching slab on right flank.
      shape: {
        center: [0.1, -1.0, 0.88],
        size: [2.6, 0.32, 0.38],
      },
    },
    {
      name: 'ram-plough',
      role: PALETTE_ROLE.ACCENT,
      // Blunt ram at nose, sitting proud of chassis; extended forward for emphasis.
      shape: {
        center: [2.05, 0, 0.52],
        size: [0.65, 2.0, 0.32],
        front: { width: 0.72, z: 0.12 },
      },
    },
    {
      name: 'hood',
      role: PALETTE_ROLE.BODY,
      // Short, flat hood with minimal slope; heavily armoured look.
      shape: {
        center: [1.2, 0, 0.75],
        size: [1.3, 1.85, 0.28],
        front: { width: 0.88, height: 0.7, z: -0.05 },
      },
    },
    {
      name: 'cabin',
      role: PALETTE_ROLE.BODY,
      // Raised cabin block: creates a distinct stepped silhouette above chassis.
      // Narrower than the chassis so gunmetal shoulders stay visible around the glass.
      shape: {
        center: [-0.3, 0, 0.88],
        size: [1.4, 1.6, 0.45],
        rear: { width: 0.88, height: 0.8 },
        front: { width: 0.84, height: 0.72, z: 0.02 },
      },
    },
    {
      name: 'viewport',
      role: PALETTE_ROLE.GLASS,
      // Slit windscreen but enlarged and clearly readable as glass at 64x64.
      // Narrower than marauder's canopy but much larger than before.
      // Sits just proud of cabin; cyan-tinted to match roster.
      shape: {
        center: [-0.2, 0, 1.08],
        size: [1.2, 1.3, 0.22],
        rear: { width: 0.75, height: 0.55 },
        front: { width: 0.7, height: 0.42, z: -0.01 },
      },
    },
    {
      name: 'tail',
      role: PALETTE_ROLE.BODY,
      // Solid, boxy tail section; no taper.
      shape: {
        center: [-1.6, 0, 0.60],
        size: [0.8, 1.95, 0.34],
        rear: { width: 0.95, height: 0.92 },
      },
    },
    {
      name: 'armour-nose',
      role: PALETTE_ROLE.ACCENT,
      // Extra armour plating at the extreme nose, accent color for emphasis.
      shape: {
        center: [2.25, 0, 0.52],
        size: [0.3, 1.95, 0.28],
      },
    },
    {
      name: 'wheel-front-left',
      role: PALETTE_ROLE.TIRE,
      // Wide, planted wheels for stability; pushed further out and taller so they're visible.
      shape: { center: [1.3, 1.2, 0.35], size: [0.8, 0.32, 0.68] },
    },
    {
      name: 'wheel-front-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [1.3, -1.2, 0.35], size: [0.8, 0.32, 0.68] },
    },
    {
      name: 'wheel-rear-left',
      role: PALETTE_ROLE.TIRE,
      // Rear wheels slightly larger and further out for brute-force look.
      shape: { center: [-1.25, 1.15, 0.37], size: [0.9, 0.34, 0.72] },
    },
    {
      name: 'wheel-rear-right',
      role: PALETTE_ROLE.TIRE,
      shape: { center: [-1.25, -1.15, 0.37], size: [0.9, 0.34, 0.72] },
    },
    {
      name: 'headlight-left',
      role: PALETTE_ROLE.LIGHT,
      // Amber warning lights, small and recessed in armour.
      shape: { center: [2.05, 0.52, 0.58], size: [0.12, 0.32, 0.12] },
    },
    {
      name: 'headlight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [2.05, -0.52, 0.58], size: [0.12, 0.32, 0.12] },
    },
    {
      name: 'taillight-left',
      role: PALETTE_ROLE.LIGHT,
      // Red warning lights at tail.
      shape: { center: [-1.95, 0.55, 0.64], size: [0.1, 0.38, 0.14] },
    },
    {
      name: 'taillight-right',
      role: PALETTE_ROLE.LIGHT,
      shape: { center: [-1.95, -0.55, 0.64], size: [0.1, 0.38, 0.14] },
    },
  ],

  stats: {
    mass: 1200,           // Highest — heavy bruiser
    enginePower: 40,      // Strong, to justify shoving
    brakeForce: 42,       // Slightly less than balanced
    maxSpeed: 65,         // Mid/low — lumbering
    grip: 18,             // Low — ploughs through rather than grips
    steerRate: 1.8,       // Slow turning
    steerSpeedFalloff: 0.65,  // Loses control badly at speed
    armor: 0.6,           // Highest — well-armoured
    ammoCapacity: 5,      // Mid
    collisionRadius: 1.85, // Matches ~half-length
    aimRadius: 2.5,       // Worst aim: a brawler that would rather ram than shoot.
  },
  // Barely flinches from collisions and weapon hits that would stagger others.
  perk: CAR_PERK.ANVIL,
};
