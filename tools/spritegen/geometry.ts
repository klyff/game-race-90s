import type { PaletteRole } from '../../src/domain/constants.ts';
import type { CarModelDef, Prism, SectionMod, Vec3Tuple } from './schema.ts';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** A flat quad ready to be shaded and rasterized. */
export interface Face {
  readonly corners: readonly [Vec3, Vec3, Vec3, Vec3];
  readonly normal: Vec3;
  readonly role: PaletteRole;
}

const EPSILON = 1e-9;

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function length(a: Vec3): number {
  return Math.sqrt(dot(a, a));
}

/** Corner rectangle of one prism end cap, in the (Y, Z) plane at a given X. */
function sectionCorners(
  x: number,
  center: Vec3Tuple,
  size: Vec3Tuple,
  mod: SectionMod | undefined,
): [Vec3, Vec3, Vec3, Vec3] {
  const halfWidth = (size[1] / 2) * (mod?.width ?? 1);
  const halfHeight = (size[2] / 2) * (mod?.height ?? 1);
  const centerZ = center[2] + (mod?.z ?? 0);
  const low = centerZ - halfHeight;
  const high = centerZ + halfHeight;
  const right = center[1] - halfWidth;
  const left = center[1] + halfWidth;
  return [
    { x, y: right, z: low },
    { x, y: left, z: low },
    { x, y: left, z: high },
    { x, y: right, z: high },
  ];
}

/**
 * Builds the six quads of a prism with outward-facing normals.
 *
 * Winding is not trusted: each normal is flipped if it points back towards the
 * solid's centre. That keeps authoring simple — a tapered cap can invert the
 * winding of a side face and shading would silently break otherwise.
 */
function prismFaces(shape: Prism, role: PaletteRole): Face[] {
  const { center, size } = shape;
  const rear = sectionCorners(center[0] - size[0] / 2, center, size, shape.rear);
  const front = sectionCorners(center[0] + size[0] / 2, center, size, shape.front);
  const solidCenter: Vec3 = { x: center[0], y: center[1], z: center[2] };

  const quads: Array<[Vec3, Vec3, Vec3, Vec3]> = [
    [rear[0], rear[3], rear[2], rear[1]], // -X tail cap
    [front[0], front[1], front[2], front[3]], // +X nose cap
    [rear[0], rear[1], front[1], front[0]], // -Z underside
    [rear[3], front[3], front[2], rear[2]], // +Z roof
    [rear[1], rear[2], front[2], front[1]], // +Y left flank
    [rear[0], front[0], front[3], rear[3]], // -Y right flank
  ];

  const faces: Face[] = [];
  for (const corners of quads) {
    let normal = cross(sub(corners[1], corners[0]), sub(corners[2], corners[0]));
    let magnitude = length(normal);
    if (magnitude < EPSILON) {
      // Try the other diagonal before giving up: a pinched cap can make the
      // first triangle degenerate while the quad still has area.
      normal = cross(sub(corners[2], corners[0]), sub(corners[3], corners[0]));
      magnitude = length(normal);
      if (magnitude < EPSILON) continue;
    }
    normal = { x: normal.x / magnitude, y: normal.y / magnitude, z: normal.z / magnitude };

    const faceCenter: Vec3 = {
      x: (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4,
      y: (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4,
      z: (corners[0].z + corners[1].z + corners[2].z + corners[3].z) / 4,
    };
    if (dot(normal, sub(faceCenter, solidCenter)) < 0) {
      normal = { x: -normal.x, y: -normal.y, z: -normal.z };
    }
    faces.push({ corners, normal, role });
  }
  return faces;
}

export function buildFaces(def: CarModelDef): Face[] {
  return def.parts.flatMap((part) => prismFaces(part.shape, part.role));
}

/** Half-extents of the model on the ground plane, used to size the shadow. */
export function groundExtents(faces: readonly Face[]): { halfLength: number; halfWidth: number } {
  let halfLength = 0;
  let halfWidth = 0;
  for (const face of faces) {
    for (const corner of face.corners) {
      halfLength = Math.max(halfLength, Math.abs(corner.x));
      halfWidth = Math.max(halfWidth, Math.abs(corner.y));
    }
  }
  return { halfLength, halfWidth };
}

/** Rotates a point around the Z axis. Used to apply the car's yaw. */
export function rotateZ(p: Vec3, cos: number, sin: number): Vec3 {
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos, z: p.z };
}
