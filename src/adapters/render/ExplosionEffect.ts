import Phaser from 'phaser';
import type { Vec2 } from '../../domain/math/Vec2.ts';
import { add, fromAngle, scale } from '../../domain/math/Vec2.ts';
import { resolveBurstScale } from '../../domain/weapons/WeaponConstants.ts';
import { IsoProjection } from './IsoProjection.ts';
import { ROAD_DEPTH } from './TrackRenderer.ts';

/**
 * Short-lived visual explosion bursts drawn at a car's world position when
 * destroyed. Each burst is a four-layer effect:
 *   1. Ground shockwave: expanding ellipse (2:1 isometric ratio)
 *   2. Rising fireball: lumpy overlapping circles drifting upward
 *   3. Sparks: small embers thrown outward with arcing trajectories
 *   4. Metal debris: rotating steel shards that fly, bounce, and settle
 *
 * Car wrecks also stamp a dark asphalt burn mark that lives for ~1.5 laps.
 * Burn marks sit on their own graphics object under the burst so cars drive
 * over the scorch rather than through it.
 *
 * Like `TyreMarks`, this owns `Phaser.GameObjects.Graphics` objects and
 * redraws them every frame. All geometry is kept in world units and projected
 * to screen space via `IsoProjection`.
 */

/** Depth at which to draw explosions, above tyre marks and burn marks. */
const EXPLOSION_DEPTH = ROAD_DEPTH + 2;

/** Depth for asphalt scorch — above tyre marks, under cars and bursts. */
const BURN_MARK_DEPTH = ROAD_DEPTH + 1.5;

/** Cap on simultaneous live bursts to prevent unbounded memory growth. */
const MAX_BURSTS = 32;

/** Cap on live burn marks. A busy wreck-fest should not grow forever. */
const MAX_BURN_MARKS = 40;

/** Fallback burn-mark life when the caller does not pass a lap-derived time. */
const DEFAULT_BURN_MARK_LIFETIME_SECONDS = 50;

/** Ground shockwave: expands from this radius in world units. */
const SHOCKWAVE_MIN_RADIUS_UNITS = 0.6;

/** Ground shockwave: maximum radius in world units. */
const SHOCKWAVE_MAX_RADIUS_UNITS = 12;

/** Ground shockwave: lifetime in seconds. */
const SHOCKWAVE_LIFETIME_SECONDS = 0.4;

/** Fireball: starting peak radius in world units. */
const FIREBALL_START_RADIUS_UNITS = 2.2;

/** Fireball: maximum peak radius in world units at intensity 1. */
const FIREBALL_MAX_RADIUS_UNITS = 8.5;

/** Fireball: base lifetime in seconds. */
const FIREBALL_LIFETIME_SECONDS = 0.95;

/** Fireball: how fast it drifts upward on screen, in world Y units per second. */
const FIREBALL_DRIFT_SPEED_UNITS_PER_SEC = 4.4;

/** Fireball: count of overlapping lumpy circles per burst. */
const FIREBALL_LUMP_COUNT = 8;

/** Sparks: starting size in world units. */
const SPARK_MIN_SIZE_UNITS = 0.18;

/** Sparks: maximum size in world units. */
const SPARK_MAX_SIZE_UNITS = 0.45;

/** Sparks: outward speed in world units per second at intensity 1. */
const MAX_SPARK_SPEED_UNITS_PER_SEC = 16;

/** Sparks: count per burst at intensity 1. */
const MAX_SPARKS_PER_BURST = 16;

/** Sparks: downward acceleration to make them arc. */
const SPARK_GRAVITY_UNITS_PER_SEC_SQ = 18;

/** Sparks: starting upward velocity in world units per second. */
const SPARK_UPWARD_VELOCITY_UNITS_PER_SEC = 10;

/** Sparks: base lifetime in seconds. */
const SPARK_LIFETIME_BASE_SECONDS = 0.65;

/** Metal shards: count per burst at intensity 1. */
const MAX_SHARDS_PER_BURST = 12;

/** Metal shards: outward speed in world units per second at intensity 1. */
const MAX_SHARD_SPEED_UNITS_PER_SEC = 11;

/** Metal shards: starting upward velocity in world units per second. */
const SHARD_UPWARD_VELOCITY_UNITS_PER_SEC = 9;

/** Metal shards: gravity pulling shards back to the asphalt. */
const SHARD_GRAVITY_UNITS_PER_SEC_SQ = 22;

/** Metal shards: bounce restitution when they hit the ground. */
const SHARD_BOUNCE = 0.32;

/** Metal shards: base lifetime in seconds. */
const SHARD_LIFETIME_BASE_SECONDS = 1.35;

/** How many irregular blotches make up one asphalt scorch. */
const BURN_BLOTCH_COUNT = 7;

/** Fireball colour gradient: hot white → orange → dark red → smoke grey. */
const FIREBALL_COLORS: readonly number[] = [
  0xfff3c4,
  0xffb028,
  0xff6a1a,
  0xb03a10,
  0x4a4a52,
];

/** Steel / gunmetal palette for flying wreckage. */
const METAL_COLORS: readonly number[] = [
  0xd0d4dc,
  0x9aa0aa,
  0x6e7380,
  0x4a4e58,
  0x8a7060,
];

/** Near-black asphalt scorch colours. */
const BURN_COLORS: readonly number[] = [
  0x0a0a0c,
  0x161618,
  0x1e1c1a,
  0x2a2622,
  0x121214,
];

export interface ExplosionEffectOptions {
  /** How long a car-wreck burn mark stays on the road, seconds. */
  readonly burnMarkLifetimeSeconds?: number;
}

export interface BurstOptions {
  /** Stamp a dark asphalt scorch that outlives the fireball. Car wrecks only. */
  readonly leaveBurnMark?: boolean;
  /** Skip geometric shards when the scrap roster is handling debris. */
  readonly skipShards?: boolean;
  /** Visual size multiplier. Gasoline barrels pass 1.3; mines and missiles omit it. */
  readonly scale?: number;
}

/** One spark: world position, planar velocity, height arc, and colour fade. */
interface Spark {
  positionWorld: Vec2;
  velocityWorldPerSec: Vec2;
  height: number;
  verticalVelocity: number;
  lifetimeSeconds: number;
  ageSeconds: number;
  size: number;
  startColor: number;
  endColor: number;
}

/** One metallic shard: rotates, arcs, and bounces on the asphalt. */
interface MetalShard {
  positionWorld: Vec2;
  velocityWorldPerSec: Vec2;
  height: number;
  verticalVelocity: number;
  rotationRadians: number;
  spinRadiansPerSec: number;
  length: number;
  width: number;
  color: number;
  lifetimeSeconds: number;
  ageSeconds: number;
  kind: 'rect' | 'triangle';
}

/** One irregular blotch inside a burn mark. */
interface BurnBlotch {
  offsetWorld: Vec2;
  radiusUnits: number;
  color: number;
  alpha: number;
}

/** Persistent asphalt scorch left by a car wreck. */
interface BurnMark {
  positionWorld: Vec2;
  intensity: number;
  blotches: BurnBlotch[];
  ageSeconds: number;
  lifetimeSeconds: number;
}

/** One instantaneous burst: shockwave, fireball, sparks, and metal. */
interface Burst {
  positionWorld: Vec2;
  intensity: number;
  scale: number;
  sparks: Spark[];
  shards: MetalShard[];
  ageSeconds: number;
  burstId: number;
}

/**
 * Deterministic seeded pseudo-random generator. Uses a simple sine-based hash
 * to produce values in [0, 1) from an integer seed. This replaces Math.random()
 * to preserve determinism during resume/playback.
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Linearly interpolates between two 24-bit hex colours. */
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

/** Samples the fireball colour gradient at a given progress through life (0 to 1). */
function sampleFireballColor(progress: number): { color: number; alpha: number } {
  const clamped = Math.max(0, Math.min(1, progress));
  let before = FIREBALL_COLORS[0]!;
  let after = FIREBALL_COLORS[FIREBALL_COLORS.length - 1]!;

  const segmentSize = 1 / (FIREBALL_COLORS.length - 1);
  const segment = Math.floor(clamped / segmentSize);
  if (segment < FIREBALL_COLORS.length - 1) {
    before = FIREBALL_COLORS[segment]!;
    after = FIREBALL_COLORS[segment + 1]!;
  }

  const t = segment >= 0 ? (clamped - segment * segmentSize) / segmentSize : 0;
  const color = lerpColor(before, after, t);
  const alpha = 1 - clamped * clamped;

  return { color, alpha };
}

export class ExplosionEffect {
  private readonly burstGraphics: Phaser.GameObjects.Graphics;
  private readonly burnGraphics: Phaser.GameObjects.Graphics;
  private readonly projection: IsoProjection;
  private readonly burnMarkLifetimeSeconds: number;
  private readonly bursts: Burst[] = [];
  private readonly burnMarks: BurnMark[] = [];
  private nextBurstId: number = 0;

  constructor(scene: Phaser.Scene, projection: IsoProjection, options: ExplosionEffectOptions = {}) {
    this.projection = projection;
    this.burnMarkLifetimeSeconds = Number.isFinite(options.burnMarkLifetimeSeconds)
      ? Math.max(1, options.burnMarkLifetimeSeconds!)
      : DEFAULT_BURN_MARK_LIFETIME_SECONDS;

    this.burnGraphics = scene.add.graphics();
    this.burnGraphics.setDepth(BURN_MARK_DEPTH);

    this.burstGraphics = scene.add.graphics();
    this.burstGraphics.setDepth(EXPLOSION_DEPTH);
  }

  /**
   * Spawns one explosion at the given world position, scaled by intensity.
   * Clamps non-finite intensity to [0, 1]. Car wrecks pass `leaveBurnMark`.
   */
  burst(position: Vec2, intensity: number, options: BurstOptions = {}): void {
    let clampedIntensity = intensity;
    if (!Number.isFinite(clampedIntensity)) {
      clampedIntensity = 0;
    } else {
      clampedIntensity = Math.max(0, Math.min(1, clampedIntensity));
    }

    if (this.bursts.length >= MAX_BURSTS) {
      this.bursts.shift();
    }

    const burstIdSeed = this.nextBurstId;
    this.nextBurstId += 1;
    const visualScale = resolveBurstScale(options.scale);

    const sparks = this.spawnSparks(position, clampedIntensity, burstIdSeed, visualScale);
    const shards = options.skipShards
      ? []
      : this.spawnShards(position, clampedIntensity, burstIdSeed, visualScale);

    this.bursts.push({
      positionWorld: position,
      intensity: clampedIntensity,
      scale: visualScale,
      sparks,
      shards,
      ageSeconds: 0,
      burstId: burstIdSeed,
    });

    if (options.leaveBurnMark) {
      this.stampBurnMark(position, clampedIntensity, burstIdSeed);
    }
  }

  /** Ages all bursts, shards, and burn marks; redraws everything still alive. */
  update(deltaSeconds: number): void {
    this.ageBursts(deltaSeconds);
    this.ageBurnMarks(deltaSeconds);
    this.redrawBurns();
    this.redrawBursts();
  }

  /** Clears all live bursts, shards, and burn marks. */
  clear(): void {
    this.bursts.length = 0;
    this.burnMarks.length = 0;
    this.burstGraphics.clear();
    this.burnGraphics.clear();
  }

  /** Destroys the graphics objects and all internal state. */
  destroy(): void {
    this.burstGraphics.destroy();
    this.burnGraphics.destroy();
  }

  private spawnSparks(position: Vec2, intensity: number, burstIdSeed: number, visualScale: number): Spark[] {
    const count = Math.round(intensity * MAX_SPARKS_PER_BURST);
    const sparks: Spark[] = [];

    for (let i = 0; i < count; i += 1) {
      const baseSeed = burstIdSeed * 73856093 ^ (i * 19349663);
      const angleRand = seededRandom(baseSeed);
      const speedRand = seededRandom(baseSeed + 1);
      const lifeRand = seededRandom(baseSeed + 2);
      const sizeRand = seededRandom(baseSeed + 3);
      const upRand = seededRandom(baseSeed + 4);

      const angle = (i / Math.max(1, count)) * 2 * Math.PI + angleRand * 0.45;
      const speed = intensity * MAX_SPARK_SPEED_UNITS_PER_SEC * (0.85 + speedRand * 0.3) * visualScale;
      const direction = fromAngle(angle);

      sparks.push({
        positionWorld: position,
        velocityWorldPerSec: scale(direction, speed),
        height: 0.2,
        verticalVelocity: SPARK_UPWARD_VELOCITY_UNITS_PER_SEC * (0.7 + upRand * 0.6),
        lifetimeSeconds: SPARK_LIFETIME_BASE_SECONDS * (0.75 + lifeRand * 0.5),
        ageSeconds: 0,
        size: (SPARK_MIN_SIZE_UNITS + sizeRand * (SPARK_MAX_SIZE_UNITS - SPARK_MIN_SIZE_UNITS)) * visualScale,
        startColor: 0xffffcc,
        endColor: 0x8b2a00,
      });
    }

    return sparks;
  }

  private spawnShards(position: Vec2, intensity: number, burstIdSeed: number, visualScale: number): MetalShard[] {
    const count = Math.round(intensity * MAX_SHARDS_PER_BURST);
    const shards: MetalShard[] = [];

    for (let i = 0; i < count; i += 1) {
      const baseSeed = burstIdSeed * 83492791 ^ (i * 29765779);
      const angleRand = seededRandom(baseSeed);
      const speedRand = seededRandom(baseSeed + 1);
      const lifeRand = seededRandom(baseSeed + 2);
      const lengthRand = seededRandom(baseSeed + 3);
      const widthRand = seededRandom(baseSeed + 4);
      const spinRand = seededRandom(baseSeed + 5);
      const upRand = seededRandom(baseSeed + 6);
      const colorRand = seededRandom(baseSeed + 7);
      const kindRand = seededRandom(baseSeed + 8);

      const angle = (i / Math.max(1, count)) * 2 * Math.PI + angleRand * 0.55;
      const speed = intensity * MAX_SHARD_SPEED_UNITS_PER_SEC * (0.7 + speedRand * 0.5) * visualScale;
      const direction = fromAngle(angle);
      const colorIndex = Math.min(METAL_COLORS.length - 1, Math.floor(colorRand * METAL_COLORS.length));

      shards.push({
        positionWorld: position,
        velocityWorldPerSec: scale(direction, speed),
        height: 0.35,
        verticalVelocity: SHARD_UPWARD_VELOCITY_UNITS_PER_SEC * (0.65 + upRand * 0.7),
        rotationRadians: angleRand * Math.PI * 2,
        spinRadiansPerSec: (spinRand - 0.5) * 14,
        length: (0.45 + lengthRand * 0.85) * visualScale,
        width: (0.12 + widthRand * 0.28) * visualScale,
        color: METAL_COLORS[colorIndex]!,
        lifetimeSeconds: SHARD_LIFETIME_BASE_SECONDS * (0.85 + lifeRand * 0.4),
        ageSeconds: 0,
        kind: kindRand < 0.45 ? 'triangle' : 'rect',
      });
    }

    return shards;
  }

  private stampBurnMark(position: Vec2, intensity: number, burstIdSeed: number): void {
    if (this.burnMarks.length >= MAX_BURN_MARKS) {
      this.burnMarks.shift();
    }

    const blotches: BurnBlotch[] = [];
    const size = 1.6 + intensity * 2.4;

    for (let i = 0; i < BURN_BLOTCH_COUNT; i += 1) {
      const seed = burstIdSeed * 6271 ^ (i * 1543);
      const ox = (seededRandom(seed) - 0.5) * size * 1.4;
      const oy = (seededRandom(seed + 1) - 0.5) * size * 1.4;
      const radius = size * (0.35 + seededRandom(seed + 2) * 0.7);
      const colorIndex = Math.min(BURN_COLORS.length - 1, Math.floor(seededRandom(seed + 3) * BURN_COLORS.length));

      blotches.push({
        offsetWorld: { x: ox, y: oy },
        radiusUnits: radius,
        color: BURN_COLORS[colorIndex]!,
        alpha: 0.42 + seededRandom(seed + 4) * 0.38,
      });
    }

    this.burnMarks.push({
      positionWorld: position,
      intensity,
      blotches,
      ageSeconds: 0,
      lifetimeSeconds: this.burnMarkLifetimeSeconds,
    });
  }

  private ageBursts(deltaSeconds: number): void {
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < this.bursts.length; readIndex += 1) {
      const burst = this.bursts[readIndex]!;
      burst.ageSeconds += deltaSeconds;

      let sparkWrite = 0;
      for (let i = 0; i < burst.sparks.length; i += 1) {
        const spark = burst.sparks[i]!;
        spark.ageSeconds += deltaSeconds;
        if (spark.ageSeconds >= spark.lifetimeSeconds) {
          continue;
        }
        spark.positionWorld = add(spark.positionWorld, scale(spark.velocityWorldPerSec, deltaSeconds));
        spark.verticalVelocity -= SPARK_GRAVITY_UNITS_PER_SEC_SQ * deltaSeconds;
        spark.height = Math.max(0, spark.height + spark.verticalVelocity * deltaSeconds);
        burst.sparks[sparkWrite] = spark;
        sparkWrite += 1;
      }
      burst.sparks.length = sparkWrite;

      let shardWrite = 0;
      for (let i = 0; i < burst.shards.length; i += 1) {
        const shard = burst.shards[i]!;
        shard.ageSeconds += deltaSeconds;
        if (shard.ageSeconds >= shard.lifetimeSeconds) {
          continue;
        }
        shard.positionWorld = add(shard.positionWorld, scale(shard.velocityWorldPerSec, deltaSeconds));
        shard.verticalVelocity -= SHARD_GRAVITY_UNITS_PER_SEC_SQ * deltaSeconds;
        shard.height += shard.verticalVelocity * deltaSeconds;
        shard.rotationRadians += shard.spinRadiansPerSec * deltaSeconds;
        if (shard.height <= 0) {
          shard.height = 0;
          if (Math.abs(shard.verticalVelocity) > 1.2) {
            shard.verticalVelocity *= -SHARD_BOUNCE;
            shard.velocityWorldPerSec = scale(shard.velocityWorldPerSec, 0.55);
            shard.spinRadiansPerSec *= 0.6;
          } else {
            shard.verticalVelocity = 0;
            shard.velocityWorldPerSec = scale(shard.velocityWorldPerSec, 0.2);
            shard.spinRadiansPerSec *= 0.35;
          }
        }
        burst.shards[shardWrite] = shard;
        shardWrite += 1;
      }
      burst.shards.length = shardWrite;

      const maxAge = Math.max(SHOCKWAVE_LIFETIME_SECONDS, FIREBALL_LIFETIME_SECONDS);
      const hasLivePieces = burst.sparks.length > 0 || burst.shards.length > 0;
      if (burst.ageSeconds < maxAge || hasLivePieces) {
        this.bursts[writeIndex] = burst;
        writeIndex += 1;
      }
    }
    this.bursts.length = writeIndex;
  }

  private ageBurnMarks(deltaSeconds: number): void {
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < this.burnMarks.length; readIndex += 1) {
      const mark = this.burnMarks[readIndex]!;
      mark.ageSeconds += deltaSeconds;
      if (mark.ageSeconds < mark.lifetimeSeconds) {
        this.burnMarks[writeIndex] = mark;
        writeIndex += 1;
      }
    }
    this.burnMarks.length = writeIndex;
  }

  private redrawBurns(): void {
    this.burnGraphics.clear();
    if (this.burnMarks.length === 0) return;

    for (const mark of this.burnMarks) {
      const life = mark.ageSeconds / mark.lifetimeSeconds;
      // Hold full darkness for most of the 1.5 laps, then fade the last third.
      const fade = life < 0.66 ? 1 : 1 - (life - 0.66) / 0.34;

      for (const blotch of mark.blotches) {
        const world = add(mark.positionWorld, blotch.offsetWorld);
        const screen = this.projection.toScreen(world);
        const width = blotch.radiusUnits * 2 * this.projection.pixelsPerUnit;
        const height = blotch.radiusUnits * this.projection.pixelsPerUnit;
        this.burnGraphics.fillStyle(blotch.color, blotch.alpha * fade);
        this.burnGraphics.fillEllipseShape(
          new Phaser.Geom.Ellipse(screen.x, screen.y, width, height),
        );
      }
    }
  }

  private redrawBursts(): void {
    this.burstGraphics.clear();
    if (this.bursts.length === 0) return;

    for (const burst of this.bursts) {
      this.drawShockwave(burst);
    }
    for (const burst of this.bursts) {
      this.drawFireball(burst);
    }
    for (const burst of this.bursts) {
      this.drawSparks(burst);
    }
    for (const burst of this.bursts) {
      this.drawShards(burst);
    }
  }

  /** Expanding isometric ellipse that fades as it grows. */
  private drawShockwave(burst: Burst): void {
    const progress = burst.ageSeconds / SHOCKWAVE_LIFETIME_SECONDS;
    if (progress > 1) return;

    const radius = (SHOCKWAVE_MIN_RADIUS_UNITS
      + (SHOCKWAVE_MAX_RADIUS_UNITS - SHOCKWAVE_MIN_RADIUS_UNITS) * progress) * burst.scale;
    const fade = 1 - progress * progress;
    const screenCenter = this.projection.toScreen(burst.positionWorld);
    const screenWidth = radius * 2 * this.projection.pixelsPerUnit;
    const screenHeight = radius * this.projection.pixelsPerUnit;

    this.burstGraphics.fillStyle(0x3a3a42, 0.45 * fade);
    this.burstGraphics.fillEllipseShape(
      new Phaser.Geom.Ellipse(screenCenter.x, screenCenter.y, screenWidth, screenHeight),
    );

    // Brief white flash at the blast centre so the wreck reads as a hit, not a puff.
    if (progress < 0.18) {
      const flash = 1 - progress / 0.18;
      const flashRadius = (1.2 + burst.intensity * 2.2) * burst.scale * this.projection.pixelsPerUnit;
      this.burstGraphics.fillStyle(0xfff6d8, 0.7 * flash);
      this.burstGraphics.fillCircleShape(
        new Phaser.Geom.Circle(screenCenter.x, screenCenter.y, flashRadius),
      );
    }
  }

  /** Rising lumpy fireball that cools from white-hot to smoke. */
  private drawFireball(burst: Burst): void {
    const progress = burst.ageSeconds / FIREBALL_LIFETIME_SECONDS;
    if (progress > 1) return;

    const grow = progress < 0.35 ? progress / 0.35 : 1 - (progress - 0.35) / 0.65 * 0.45;
    const radiusAtProgress = (FIREBALL_START_RADIUS_UNITS
      + (burst.intensity * FIREBALL_MAX_RADIUS_UNITS - FIREBALL_START_RADIUS_UNITS) * grow) * burst.scale;
    const driftHeight = FIREBALL_DRIFT_SPEED_UNITS_PER_SEC * burst.ageSeconds;
    const { color, alpha } = sampleFireballColor(progress);

    for (let i = 0; i < FIREBALL_LUMP_COUNT; i += 1) {
      const seed = burst.burstId * 92837 ^ (i * 31337);
      const offsetX = (seededRandom(seed) - 0.5) * 0.65 * radiusAtProgress;
      const offsetY = (seededRandom(seed + 1) - 0.5) * 0.65 * radiusAtProgress;
      const lumpRadius = radiusAtProgress * (0.55 + seededRandom(seed + 2) * 0.55);
      const lumpWorldPos = add(burst.positionWorld, { x: offsetX, y: offsetY });
      const screenPos = this.projection.toScreen(lumpWorldPos, driftHeight);
      const screenRadius = lumpRadius * this.projection.pixelsPerUnit;
      this.burstGraphics.fillStyle(color, alpha);
      this.burstGraphics.fillCircleShape(
        new Phaser.Geom.Circle(screenPos.x, screenPos.y, screenRadius),
      );
    }
  }

  /** Small ember sparks with a real height arc. */
  private drawSparks(burst: Burst): void {
    for (const spark of burst.sparks) {
      const progress = spark.ageSeconds / spark.lifetimeSeconds;
      const alpha = (1 - progress) * 0.9;
      const color = lerpColor(spark.startColor, spark.endColor, progress);
      const screenPos = this.projection.toScreen(spark.positionWorld, spark.height);
      const screenRadius = spark.size * this.projection.pixelsPerUnit;
      this.burstGraphics.fillStyle(color, alpha);
      this.burstGraphics.fillCircleShape(
        new Phaser.Geom.Circle(screenPos.x, screenPos.y, screenRadius),
      );
    }
  }

  /** Rotating steel shards that fly out and bounce on the road. */
  private drawShards(burst: Burst): void {
    for (const shard of burst.shards) {
      const progress = shard.ageSeconds / shard.lifetimeSeconds;
      const alpha = progress < 0.7 ? 0.95 : 0.95 * (1 - (progress - 0.7) / 0.3);
      const screen = this.projection.toScreen(shard.positionWorld, shard.height);
      const lengthPx = shard.length * this.projection.pixelsPerUnit;
      const widthPx = shard.width * this.projection.pixelsPerUnit;

      this.burstGraphics.save();
      this.burstGraphics.translateCanvas(screen.x, screen.y);
      this.burstGraphics.rotateCanvas(shard.rotationRadians);
      this.burstGraphics.fillStyle(shard.color, alpha);
      if (shard.kind === 'triangle') {
        this.burstGraphics.fillTriangle(
          -lengthPx * 0.5, widthPx * 0.5,
          lengthPx * 0.5, 0,
          -lengthPx * 0.35, -widthPx * 0.5,
        );
      } else {
        this.burstGraphics.fillRect(-lengthPx * 0.5, -widthPx * 0.5, lengthPx, widthPx);
      }
      this.burstGraphics.restore();
    }
  }
}
