import Phaser from 'phaser';
import type { Vec2 } from '../../domain/math/Vec2.ts';
import { add, fromAngle, scale } from '../../domain/math/Vec2.ts';
import { IsoProjection } from './IsoProjection.ts';
import { ROAD_DEPTH } from './TrackRenderer.ts';

/**
 * Short-lived visual explosion bursts drawn at a car's world position when
 * destroyed. Each burst is an expanding fireball ring plus a handful of radial
 * debris particles, all fading over 0.5–0.9 seconds.
 *
 * Like `TyreMarks`, this owns a `Phaser.GameObjects.Graphics` object and
 * redraws it every frame to animate the particles and fireballs. All geometry
 * is kept in world units and projected to screen space via `IsoProjection`.
 */

/** Depth at which to draw explosions, above tyre marks. */
const EXPLOSION_DEPTH = ROAD_DEPTH + 2;

/** Cap on simultaneous live bursts to prevent unbounded memory growth. */
const MAX_BURSTS = 32;

/**
 * Minimum fireball radius, world units. A burst with zero intensity still draws
 * a small core so it is not invisible.
 */
const MIN_FIREBALL_RADIUS_UNITS = 1.5;

/**
 * Maximum fireball radius, world units, at intensity 1. Scaled to read at
 * roughly 4–9 world units across depending on intensity (car collision radius
 * is ~2.7 units, road half-width is ~20 units).
 */
const MAX_FIREBALL_RADIUS_UNITS = 4.5;

/**
 * How many distinct rings make up one fireball. More rings give a smoother
 * colour gradient from white-hot to dark smoke.
 */
const FIREBALL_RING_COUNT = 6;

/**
 * Outward velocity of debris particles, world units per second, at intensity 1.
 * Scaled linearly by intensity so low explosions have slower debris.
 */
const MAX_DEBRIS_SPEED_UNITS_PER_SEC = 12;

/**
 * Number of debris particles spawned per burst at intensity 1. Scaled linearly
 * so low explosions have fewer pieces.
 */
const MAX_DEBRIS_PER_BURST = 8;

/**
 * Base lifetime of particles, seconds. The actual lifetime is randomized
 * within ±20% of this to add visual variety.
 */
const PARTICLE_LIFETIME_SECONDS = 0.7;

/** Hue shift range for particle lifetime randomization, seconds. */
const PARTICLE_LIFETIME_VARIANCE_SECONDS = PARTICLE_LIFETIME_SECONDS * 0.2;

/** One frame of a fireball gradient: a colour and how far from the centre it sits. */
interface FireballRing {
  readonly colorHex: number;
  readonly radiusFraction: number;
}

/**
 * Fireball colour gradient: hot white → orange → dark red → smoke grey.
 * Each entry sits at a certain fraction of the maximum radius, so the whole
 * gradient expands and fades together.
 */
const FIREBALL_GRADIENT: readonly FireballRing[] = [
  { colorHex: 0xfff3c4, radiusFraction: 0.2 },  // White-hot centre
  { colorHex: 0xffe8a5, radiusFraction: 0.4 },  // Pale yellow
  { colorHex: 0xff8c1a, radiusFraction: 0.6 },  // Orange
  { colorHex: 0xc94600, radiusFraction: 0.75 }, // Dark orange-red
  { colorHex: 0x7a2a10, radiusFraction: 0.9 },  // Deep red-brown
  { colorHex: 0x333333, radiusFraction: 1.0 },  // Smoke grey
];

/** One debris particle: position, velocity, and lifetime tracking. */
interface Particle {
  positionWorld: Vec2;
  velocityWorldPerSec: Vec2;
  lifetimeSeconds: number;
  ageSeconds: number;
}

/** One instantaneous burst: fireball + particles that all die together. */
interface Burst {
  positionWorld: Vec2;
  intensity: number;
  particles: Particle[];
  ageSeconds: number;
}

/**
 * Linearly interpolates between two colours in RGB space, returning a hex value.
 * Both inputs and output are 24-bit hex colours (no alpha channel).
 */
function lerpColor(fromHex: number, toHex: number, t: number): number {
  const fromR = (fromHex >> 16) & 0xff;
  const fromG = (fromHex >> 8) & 0xff;
  const fromB = fromHex & 0xff;

  const toR = (toHex >> 16) & 0xff;
  const toG = (toHex >> 8) & 0xff;
  const toB = toHex & 0xff;

  const r = Math.round(fromR + (toR - fromR) * t);
  const g = Math.round(fromG + (toG - fromG) * t);
  const b = Math.round(fromB + (toB - fromB) * t);

  return (r << 16) | (g << 8) | b;
}

/**
 * Samples the fireball gradient at a given radius fraction (0 to 1, where 1 is
 * the outer edge) and returns the colour and alpha at that point.
 */
function sampleFireballGradient(
  radiusFraction: number,
): { color: number; alpha: number } {
  // Find the two gradient stops that bracket this radius.
  let before = FIREBALL_GRADIENT[0]!;
  let after = FIREBALL_GRADIENT[0]!;

  for (let i = 0; i < FIREBALL_GRADIENT.length - 1; i += 1) {
    const stop = FIREBALL_GRADIENT[i]!;
    const nextStop = FIREBALL_GRADIENT[i + 1]!;
    if (radiusFraction >= stop.radiusFraction && radiusFraction <= nextStop.radiusFraction) {
      before = stop;
      after = nextStop;
      break;
    }
  }

  // Interpolate between the two stops.
  const stopRange = after.radiusFraction - before.radiusFraction;
  const t = stopRange > 0 ? (radiusFraction - before.radiusFraction) / stopRange : 0;
  const color = lerpColor(before.colorHex, after.colorHex, t);

  // Alpha: centre is more opaque, edges fade to near-transparent.
  const alpha = 1 - radiusFraction * radiusFraction;

  return { color, alpha };
}

export class ExplosionEffect {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly projection: IsoProjection;
  private readonly bursts: Burst[] = [];

  constructor(scene: Phaser.Scene, projection: IsoProjection) {
    this.projection = projection;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(EXPLOSION_DEPTH);
  }

  /**
   * Spawns one explosion at the given world position, scaled by intensity.
   * Clamps non-finite intensity to [0, 1].
   */
  burst(position: Vec2, intensity: number): void {
    // Clamp intensity to [0, 1], treating non-finite as 0.
    let clampedIntensity = intensity;
    if (!Number.isFinite(clampedIntensity)) {
      clampedIntensity = 0;
    } else {
      clampedIntensity = Math.max(0, Math.min(1, clampedIntensity));
    }

    // Evict the oldest burst if already at capacity.
    if (this.bursts.length >= MAX_BURSTS) {
      this.bursts.shift();
    }

    // Spawn particles: count and speed scale with intensity.
    const particleCount = Math.round(clampedIntensity * MAX_DEBRIS_PER_BURST);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i += 1) {
      // Spread particles evenly around a circle, but jitter the angle and speed.
      const angle = (i / particleCount) * 2 * Math.PI + (Math.random() - 0.5) * 0.6;
      const speedVariance = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
      const speed = clampedIntensity * MAX_DEBRIS_SPEED_UNITS_PER_SEC * speedVariance;
      const direction = fromAngle(angle);
      const velocity = scale(direction, speed);

      const lifetimeVariance = 1 - PARTICLE_LIFETIME_VARIANCE_SECONDS / 2
        + Math.random() * PARTICLE_LIFETIME_VARIANCE_SECONDS;
      const lifetime = PARTICLE_LIFETIME_SECONDS * lifetimeVariance;

      particles.push({
        positionWorld: position,
        velocityWorldPerSec: velocity,
        lifetimeSeconds: lifetime,
        ageSeconds: 0,
      });
    }

    this.bursts.push({
      positionWorld: position,
      intensity: clampedIntensity,
      particles,
      ageSeconds: 0,
    });
  }

  /** Ages all bursts and particles, removing dead ones; redraws all live effects. */
  update(deltaSeconds: number): void {
    // Age bursts and evict dead ones.
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < this.bursts.length; readIndex += 1) {
      const burst = this.bursts[readIndex]!;
      burst.ageSeconds += deltaSeconds;

      // Age particles within this burst and remove dead ones.
      let particleWriteIndex = 0;
      for (let pReadIndex = 0; pReadIndex < burst.particles.length; pReadIndex += 1) {
        const particle = burst.particles[pReadIndex]!;
        particle.ageSeconds += deltaSeconds;

        if (particle.ageSeconds < particle.lifetimeSeconds) {
          // Particle still alive: update position and copy to output.
          particle.positionWorld = add(
            particle.positionWorld,
            scale(particle.velocityWorldPerSec, deltaSeconds),
          );
          burst.particles[particleWriteIndex] = particle;
          particleWriteIndex += 1;
        }
      }
      burst.particles.length = particleWriteIndex;

      // Burst is alive as long as any of its particles are alive.
      const burstLifetime = Math.max(...burst.particles.map((p) => p.lifetimeSeconds));
      if (burst.ageSeconds < burstLifetime || burst.particles.length > 0) {
        this.bursts[writeIndex] = burst;
        writeIndex += 1;
      }
    }
    this.bursts.length = writeIndex;

    this.redraw();
  }

  /** Clears all live bursts and their particles. */
  clear(): void {
    this.bursts.length = 0;
    this.graphics.clear();
  }

  /** Destroys the graphics object and all internal state. */
  destroy(): void {
    this.graphics.destroy();
  }

  /**
   * Redraws every live burst and its particles. Fireballs are drawn as
   * concentric rings with a colour gradient; particles are small circles.
   */
  private redraw(): void {
    this.graphics.clear();
    if (this.bursts.length === 0) return;

    for (const burst of this.bursts) {
      const fadeProgress = burst.ageSeconds / PARTICLE_LIFETIME_SECONDS;
      const fadeFraction = Math.max(0, 1 - fadeProgress);

      // Draw fireball rings: centre is hot, outer is cool/smoke.
      const maxRadius = burst.intensity * MAX_FIREBALL_RADIUS_UNITS
        + (1 - burst.intensity) * MIN_FIREBALL_RADIUS_UNITS;
      const screenCenter = this.projection.toScreen(burst.positionWorld);

      for (let i = FIREBALL_RING_COUNT; i >= 1; i -= 1) {
        const radiusFraction = i / FIREBALL_RING_COUNT;
        const { color, alpha } = sampleFireballGradient(radiusFraction);
        const worldRadius = maxRadius * radiusFraction;
        const screenRadius = worldRadius * this.projection.pixelsPerUnit;

        // Fade out over time.
        const drawAlpha = alpha * fadeFraction;
        this.graphics.fillStyle(color, drawAlpha);
        this.graphics.fillCircleShape(
          new Phaser.Geom.Circle(screenCenter.x, screenCenter.y, screenRadius),
        );
      }

      // Draw debris particles as small circles.
      for (const particle of burst.particles) {
        const particleFade = 1 - particle.ageSeconds / particle.lifetimeSeconds;
        const particleAlpha = 0.7 * particleFade;
        this.graphics.fillStyle(0xff8c1a, particleAlpha);

        const screenPos = this.projection.toScreen(particle.positionWorld);
        const screenRadius = 0.3 * this.projection.pixelsPerUnit; // Small debris dots
        this.graphics.fillCircleShape(
          new Phaser.Geom.Circle(screenPos.x, screenPos.y, screenRadius),
        );
      }
    }
  }
}
