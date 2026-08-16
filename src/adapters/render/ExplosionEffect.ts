import Phaser from 'phaser';
import type { Vec2 } from '../../domain/math/Vec2.ts';
import { add, fromAngle, scale } from '../../domain/math/Vec2.ts';
import { IsoProjection } from './IsoProjection.ts';
import { ROAD_DEPTH } from './TrackRenderer.ts';

/**
 * Short-lived visual explosion bursts drawn at a car's world position when
 * destroyed. Each burst is a three-layer effect:
 *   1. Ground shockwave: expanding ellipse (2:1 isometric ratio)
 *   2. Rising fireball: 5–8 lumpy overlapping circles drifting upward
 *   3. Debris/sparks: 12–18 particles thrown outward with arcing trajectories
 *
 * Like `TyreMarks`, this owns a `Phaser.GameObjects.Graphics` object and
 * redraws it every frame. All geometry is kept in world units and projected to
 * screen space via `IsoProjection`.
 */

/** Depth at which to draw explosions, above tyre marks. */
const EXPLOSION_DEPTH = ROAD_DEPTH + 2;

/** Cap on simultaneous live bursts to prevent unbounded memory growth. */
const MAX_BURSTS = 32;

/** Ground shockwave: expands from this radius in world units. */
const SHOCKWAVE_MIN_RADIUS_UNITS = 0.5;

/** Ground shockwave: maximum radius in world units. Peak ~10 units. */
const SHOCKWAVE_MAX_RADIUS_UNITS = 10;

/** Ground shockwave: lifetime in seconds. */
const SHOCKWAVE_LIFETIME_SECONDS = 0.35;

/** Fireball: starting peak radius in world units. Grows to ~8–14 units. */
const FIREBALL_START_RADIUS_UNITS = 2.0;

/** Fireball: maximum peak radius in world units at intensity 1. */
const FIREBALL_MAX_RADIUS_UNITS = 7.0;

/** Fireball: base lifetime in seconds. */
const FIREBALL_LIFETIME_SECONDS = 0.8;

/** Fireball: how fast it drifts upward on screen, in world Y units per second. */
const FIREBALL_DRIFT_SPEED_UNITS_PER_SEC = 4.0;

/** Fireball: count of overlapping lumpy circles per burst. */
const FIREBALL_LUMP_COUNT = 6;

/** Debris/sparks: starting size in world units. */
const DEBRIS_MIN_SIZE_UNITS = 0.25;

/** Debris/sparks: maximum size in world units. */
const DEBRIS_MAX_SIZE_UNITS = 0.6;

/** Debris/sparks: outward speed in world units per second at intensity 1. */
const MAX_DEBRIS_SPEED_UNITS_PER_SEC = 14;

/** Debris/sparks: count per burst at intensity 1. Scaled by intensity. */
const MAX_DEBRIS_PER_BURST = 18;

/** Debris/sparks: downward screen acceleration to make them arc. */
const DEBRIS_GRAVITY_UNITS_PER_SEC_SQ = 3.0;

/** Debris/sparks: starting upward velocity in world units per second. */
const DEBRIS_UPWARD_VELOCITY_UNITS_PER_SEC = 6.0;

/**
 * Base debris lifetime in seconds. Varies by particle with deterministic hash.
 */
const DEBRIS_LIFETIME_BASE_SECONDS = 0.7;

/** Fireball colour gradient: hot white → orange → dark red → smoke grey. */
const FIREBALL_COLORS: readonly number[] = [
  0xfff3c4, // White-hot
  0xffb028, // Bright orange
  0xff6a1a, // Warm orange-red
  0xb03a10, // Dark red-brown
  0x4a4a52, // Smoke grey
];

/** One debris particle: position, velocity, lifetime tracking, and lift acceleration. */
interface Particle {
  positionWorld: Vec2;
  velocityWorldPerSec: Vec2;
  lifetimeSeconds: number;
  ageSeconds: number;
  size: number;
  startColor: number;
  endColor: number;
}

/** One instantaneous burst: ground shockwave, fireball, and particles. */
interface Burst {
  positionWorld: Vec2;
  intensity: number;
  particles: Particle[];
  ageSeconds: number;
  burstId: number;
}

/**
 * Deterministic seeded pseudo-random generator. Uses a simple sine-based hash
 * to produce values in [0, 1) from an integer seed. This replaces Math.random()
 * to preserve determinism during resume/playback.
 *
 * @param seed Integer seed value derived from burst and particle indices
 * @returns Pseudo-random value in [0, 1)
 */
function seededRandom(seed: number): number {
  // Sine-based hash: produces a repeatable float from an integer seed.
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
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
 * Samples the fireball colour gradient at a given progress through life (0 to 1).
 * Returns the colour and alpha at that point, interpolating between colours.
 */
function sampleFireballColor(progress: number): { color: number; alpha: number } {
  // Progress goes from 0 (hot white) to 1 (smoke grey).
  const clamped = Math.max(0, Math.min(1, progress));
  let before = FIREBALL_COLORS[0]!;
  let after = FIREBALL_COLORS[FIREBALL_COLORS.length - 1]!;

  // Find the bracketing pair of colours.
  const segmentSize = 1 / (FIREBALL_COLORS.length - 1);
  const segment = Math.floor(clamped / segmentSize);
  if (segment < FIREBALL_COLORS.length - 1) {
    before = FIREBALL_COLORS[segment]!;
    after = FIREBALL_COLORS[segment + 1]!;
  }

  // Interpolate within this colour segment.
  const t = segment >= 0 ? (clamped - segment * segmentSize) / segmentSize : 0;
  const color = lerpColor(before, after, t);

  // Alpha: starts opaque, fades to transparent.
  const alpha = 1 - clamped * clamped;

  return { color, alpha };
}

export class ExplosionEffect {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly projection: IsoProjection;
  private readonly bursts: Burst[] = [];
  private nextBurstId: number = 0;

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
    const burstIdSeed = this.nextBurstId;
    this.nextBurstId += 1;

    for (let i = 0; i < particleCount; i += 1) {
      // Deterministic randomness seeded from burst ID and particle index.
      const baseSeed = burstIdSeed * 73856093 ^ (i * 19349663);
      const angleRand = seededRandom(baseSeed);
      const speedRand = seededRandom(baseSeed + 1);
      const lifeRand = seededRandom(baseSeed + 2);
      const sizeRand = seededRandom(baseSeed + 3);

      // Spread particles outward with deterministic jitter.
      const angle = (i / Math.max(1, particleCount)) * 2 * Math.PI + angleRand * 0.4;
      const speedVariance = 0.9 + speedRand * 0.2; // 0.9 to 1.1
      const speed = clampedIntensity * MAX_DEBRIS_SPEED_UNITS_PER_SEC * speedVariance;

      // Velocity is outward in world space.
      const direction = fromAngle(angle);
      const velocityWorld = scale(direction, speed);

      // Lifetime varies deterministically.
      const lifetimeVariance = 0.8 + lifeRand * 0.4; // 0.8 to 1.2
      const lifetime = DEBRIS_LIFETIME_BASE_SECONDS * lifetimeVariance;

      // Size and colour vary deterministically.
      const size = DEBRIS_MIN_SIZE_UNITS + sizeRand * (DEBRIS_MAX_SIZE_UNITS - DEBRIS_MIN_SIZE_UNITS);

      particles.push({
        positionWorld: position,
        velocityWorldPerSec: velocityWorld,
        lifetimeSeconds: lifetime,
        ageSeconds: 0,
        size,
        startColor: 0xffffcc, // Bright yellow-white
        endColor: 0x8b2a00,   // Dark ember red
      });
    }

    this.bursts.push({
      positionWorld: position,
      intensity: clampedIntensity,
      particles,
      ageSeconds: 0,
      burstId: burstIdSeed,
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
          // Particle still alive: update position.
          // Add upward velocity and apply downward acceleration.
          const yVelocity = DEBRIS_UPWARD_VELOCITY_UNITS_PER_SEC - DEBRIS_GRAVITY_UNITS_PER_SEC_SQ * particle.ageSeconds;
          const upwardDisplacement = { x: 0, y: yVelocity * deltaSeconds };

          particle.positionWorld = add(
            particle.positionWorld,
            scale(particle.velocityWorldPerSec, deltaSeconds),
          );
          particle.positionWorld = add(particle.positionWorld, upwardDisplacement);

          burst.particles[particleWriteIndex] = particle;
          particleWriteIndex += 1;
        }
      }
      burst.particles.length = particleWriteIndex;

      // Burst is alive while shockwave or fireball is alive, or if particles remain.
      const maxAge = Math.max(SHOCKWAVE_LIFETIME_SECONDS, FIREBALL_LIFETIME_SECONDS);
      const hasLiveParticles = burst.particles.length > 0;
      if (burst.ageSeconds < maxAge || hasLiveParticles) {
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
   * Redraws every live burst in three layers:
   *   1. Ground shockwave (expanding ellipse, drawn first, under everything)
   *   2. Rising fireball (5–8 lumpy overlapping circles)
   *   3. Debris/sparks (12–18 particles, drawn last, on top)
   */
  private redraw(): void {
    this.graphics.clear();
    if (this.bursts.length === 0) return;

    // Layer 1: Draw ground shockwaves first (under everything).
    for (const burst of this.bursts) {
      this.drawShockwave(burst);
    }

    // Layer 2: Draw fireballs.
    for (const burst of this.bursts) {
      this.drawFireball(burst);
    }

    // Layer 3: Draw debris/sparks last (on top).
    for (const burst of this.bursts) {
      this.drawDebris(burst);
    }
  }

  /**
   * Draws the ground shockwave: a filled ellipse (2:1 wide-to-tall ratio for
   * isometric view) that expands from ~1 to ~10 world units and fades over 0.35s.
   */
  private drawShockwave(burst: Burst): void {
    const progress = burst.ageSeconds / SHOCKWAVE_LIFETIME_SECONDS;
    if (progress > 1) return; // Shockwave is dead.

    // Expand from min to max radius.
    const radius = SHOCKWAVE_MIN_RADIUS_UNITS
      + (SHOCKWAVE_MAX_RADIUS_UNITS - SHOCKWAVE_MIN_RADIUS_UNITS) * progress;

    // Fade out as it expands.
    const fade = 1 - progress * progress;

    // In isometric projection, a circle on the ground becomes an ellipse.
    // For a 2:1 aspect ratio (wide-to-tall), width = 2 * height in screen pixels.
    const screenCenter = this.projection.toScreen(burst.positionWorld);
    const screenWidth = radius * 2 * this.projection.pixelsPerUnit; // 2x for 2:1 ratio
    const screenHeight = radius * this.projection.pixelsPerUnit;

    const shockColor = 0x4a4a52; // Smoke grey
    const shockAlpha = 0.5 * fade;
    this.graphics.fillStyle(shockColor, shockAlpha);
    this.graphics.fillEllipseShape(
      new Phaser.Geom.Ellipse(screenCenter.x, screenCenter.y, screenWidth, screenHeight),
    );
  }

  /**
   * Draws the rising fireball: 5–8 overlapping circles with offset centres
   * that are lumpy/organic, growing and drifting upward on screen.
   */
  private drawFireball(burst: Burst): void {
    const progress = burst.ageSeconds / FIREBALL_LIFETIME_SECONDS;
    if (progress > 1) return; // Fireball is dead.

    // Radius grows from start to max then shrinks.
    const radiusAtProgress = FIREBALL_START_RADIUS_UNITS
      + (burst.intensity * FIREBALL_MAX_RADIUS_UNITS - FIREBALL_START_RADIUS_UNITS) * progress;

    // Drift upward on screen: increase height as time progresses.
    const driftHeight = FIREBALL_DRIFT_SPEED_UNITS_PER_SEC * burst.ageSeconds;

    // Colour gradient from hot white to smoke.
    const { color, alpha } = sampleFireballColor(progress);

    // Draw 5–8 lumpy overlapping circles with offset centres.
    const lumpCount = FIREBALL_LUMP_COUNT;
    for (let i = 0; i < lumpCount; i += 1) {
      // Deterministic jitter for each lump using burst ID and lump index.
      const seed = burst.burstId * 92837 ^ (i * 31337);
      const offsetXRand = seededRandom(seed);
      const offsetYRand = seededRandom(seed + 1);
      const sizeRand = seededRandom(seed + 2);

      // Offset each lump from the centre to create a lumpy silhouette.
      const offsetX = (offsetXRand - 0.5) * 0.6 * radiusAtProgress;
      const offsetY = (offsetYRand - 0.5) * 0.6 * radiusAtProgress;

      // Size varies per lump.
      const lumpRadius = radiusAtProgress * (0.6 + sizeRand * 0.5);

      // Project this lump's position to screen space (including the drifting height).
      const lumpWorldPos = add(burst.positionWorld, { x: offsetX, y: offsetY });
      const screenPos = this.projection.toScreen(lumpWorldPos, driftHeight);

      const screenRadius = lumpRadius * this.projection.pixelsPerUnit;
      this.graphics.fillStyle(color, alpha);
      this.graphics.fillCircleShape(
        new Phaser.Geom.Circle(screenPos.x, screenPos.y, screenRadius),
      );
    }
  }

  /**
   * Draws debris/sparks as small filled circles with deterministic colour
   * gradient from bright yellow-white to dark ember red. Drawn last, on top.
   */
  private drawDebris(burst: Burst): void {
    for (const particle of burst.particles) {
      const particleProgress = particle.ageSeconds / particle.lifetimeSeconds;
      const particleAlpha = (1 - particleProgress) * 0.85;

      // Colour fades from bright yellow-white to dark ember red.
      const particleColor = lerpColor(particle.startColor, particle.endColor, particleProgress);

      const screenPos = this.projection.toScreen(particle.positionWorld);
      const screenRadius = particle.size * this.projection.pixelsPerUnit;

      this.graphics.fillStyle(particleColor, particleAlpha);
      this.graphics.fillCircleShape(
        new Phaser.Geom.Circle(screenPos.x, screenPos.y, screenRadius),
      );
    }
  }
}
