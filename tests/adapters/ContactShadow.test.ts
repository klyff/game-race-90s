import {
  CONTACT_HEIGHT_SQUASH,
  CONTACT_PATCH_SCALE,
  contactShadowPose,
} from '../../src/adapters/render/ContactShadow.ts';
import { IsoProjection } from '../../src/adapters/render/IsoProjection.ts';
import { ISO_X, ISO_Y } from '../../src/domain/constants.ts';

const ORIGIN_PIN = { x: 0.5, y: 0.55 };
const CELL = 64;
const SCALE = 1;
const RADIUS = 1.6;
const ALONG = 1.76;
const ACROSS = 1.2672;

function pose(
  extras: Partial<Parameters<typeof contactShadowPose>[0]> = {},
): ReturnType<typeof contactShadowPose> {
  return contactShadowPose({
    projection: extras.projection ?? new IsoProjection(8),
    position: extras.position ?? { x: 10, y: 4 },
    heading: extras.heading ?? 0,
    collisionAlong: 'collisionAlong' in extras ? extras.collisionAlong : ALONG,
    collisionAcross: 'collisionAcross' in extras ? extras.collisionAcross : ACROSS,
    collisionRadius: extras.collisionRadius ?? RADIUS,
    origin: extras.origin ?? ORIGIN_PIN,
    cellWidth: extras.cellWidth ?? CELL,
    cellHeight: extras.cellHeight ?? CELL,
    displayScale: extras.displayScale ?? SCALE,
    height: extras.height,
  });
}

describe('contactShadowPose origin offset', () => {
  it('stays on the ground pin even when origin.y is not 0.5', () => {
    const pin = pose({ origin: ORIGIN_PIN, position: { x: 0, y: 0 } });
    const centred = pose({ origin: { x: 0.5, y: 0.5 }, position: { x: 0, y: 0 } });

    expect(pin.x).toBe(centred.x);
    expect(pin.y).toBe(centred.y);
    expect(pin.x).toBe(0);
    expect(pin.y).toBe(0);
  });

  it('leaves x unchanged when origin.x is 0.5', () => {
    const result = pose({ origin: ORIGIN_PIN, position: { x: 0, y: 0 } });
    expect(result.x).toBe(0);
  });
});

describe('contactShadowPose heading', () => {
  it('heading 0 (+X) rotation equals atan2(ISO_Y, ISO_X)', () => {
    const result = pose({ heading: 0, position: { x: 0, y: 0 } });
    expect(result.rotation).toBeCloseTo(Math.atan2(ISO_Y, ISO_X), 10);
  });
});

describe('contactShadowPose stays on the ground', () => {
  it('ignores airborne height for the blob centre', () => {
    const grounded = pose({ height: 0, position: { x: 3, y: 1 } });
    const airborne = pose({ height: 4, position: { x: 3, y: 1 } });

    expect(airborne.x).toBe(grounded.x);
    expect(airborne.y).toBe(grounded.y);
    expect(airborne.width).toBe(grounded.width);
    expect(airborne.height).toBe(grounded.height);
    expect(airborne.rotation).toBe(grounded.rotation);
  });

  it('centre equals the ground projection', () => {
    const projection = new IsoProjection(8);
    const position = { x: 3, y: 1 };
    const result = pose({ projection, position, origin: ORIGIN_PIN });
    const ground = projection.toScreen(position, 0);

    expect(result.x).toBeCloseTo(ground.x, 10);
    expect(result.y).toBeCloseTo(ground.y, 10);
  });
});

describe('contactShadowPose radius fallback', () => {
  it('uses collisionRadius when along and across are missing', () => {
    const boxed = pose({
      heading: 0,
      position: { x: 0, y: 0 },
      collisionAlong: ALONG,
      collisionAcross: ACROSS,
    });
    const fallback = pose({
      heading: 0,
      position: { x: 0, y: 0 },
      collisionAlong: undefined,
      collisionAcross: undefined,
      collisionRadius: RADIUS,
    });

    expect(fallback.width).not.toBe(boxed.width);
    expect(fallback.height).not.toBe(boxed.height);

    expect(fallback.width).toBeCloseTo(2 * RADIUS * 8 * CONTACT_PATCH_SCALE, 10);
    expect(fallback.height).toBeCloseTo(2 * RADIUS * 8 * CONTACT_PATCH_SCALE * CONTACT_HEIGHT_SQUASH, 10);
    expect(fallback.rotation).toBeCloseTo(Math.atan2(ISO_Y, ISO_X), 10);
  });

  it('keeps the oval flatter than it is long at heading 0', () => {
    const result = pose({ heading: 0, position: { x: 0, y: 0 } });
    expect(result.width).toBeCloseTo(2 * ALONG * 8 * CONTACT_PATCH_SCALE, 10);
    expect(result.height).toBeCloseTo(2 * ACROSS * 8 * CONTACT_PATCH_SCALE * CONTACT_HEIGHT_SQUASH, 10);
    expect(result.height).toBeLessThan(result.width * 0.6);
  });
});
