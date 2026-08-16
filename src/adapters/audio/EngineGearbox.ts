/**
 * Options for {@link EngineGearbox}. All fields are optional; sane arcade-racer
 * defaults are used when omitted.
 */
export interface GearboxOptions {
  readonly gearCount?: number; // default 5
  readonly upshiftRpmFraction?: number; // default 0.92
  readonly downshiftRpmFraction?: number; // default 0.45
  readonly idleRpmFraction?: number; // default 0.15
}

/** One update's worth of gearbox output, fed straight to `EngineVoice.update`. */
export interface GearboxState {
  readonly gear: number; // 1..gearCount, 0 = reverse
  readonly rpmFraction: number; // idleRpmFraction..1
  readonly shifted: boolean; // true only on the update where the gear changed
}

const DEFAULT_GEAR_COUNT = 5;
const DEFAULT_UPSHIFT_RPM_FRACTION = 0.92;
const DEFAULT_DOWNSHIFT_RPM_FRACTION = 0.45;
const DEFAULT_IDLE_RPM_FRACTION = 0.15;

/**
 * Growth factor between one gear's road-speed band and the next. Real gearboxes
 * step their ratio down by roughly a constant multiple gear to gear (not a
 * constant amount), which is why top gear covers far more road speed than first.
 * 1.35 spreads five gears from a short, quick-revving first gear to a long top
 * gear without any band becoming vanishingly narrow or absurdly wide.
 */
const GEAR_WIDTH_GROWTH = 1.35;

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Sound-only gear simulator for the engine note.
 *
 * `ArcadeCarPhysics.stepVehicle` is deliberately GEARLESS: road speed maps to
 * engine power through one continuous curve, with no gear ratios anywhere in the
 * simulation. This class must NEVER be wired into that physics — it exists purely
 * so `EngineVoice` has something to rise, break and rise again on. That rise/break
 * pattern is what reads as "fast" in an arcade racer; a note that just tracks road
 * speed monotonically sounds like a kazoo, not an engine.
 *
 * Each gear covers a band of road speed that widens geometrically with gear
 * number (see `GEAR_WIDTH_GROWTH`); `rpmFraction` is the car's position inside the
 * current gear's band, floored at `idleRpmFraction` so idle is never silent.
 * Shifting is hysteretic by construction: the speed required to upshift out of a
 * gear is always comfortably above the speed that would downshift back into it
 * (proof sketch: both thresholds are computed against the SAME lower gear's band,
 * just at different fractions of it — 0.92 vs 0.45 by default — so the upshift
 * point can never be below the downshift point). A car cruising exactly at a
 * shift point therefore shifts at most once, never chatters every frame.
 */
export class EngineGearbox {
  private readonly gearCount: number;
  private readonly upshiftRpmFraction: number;
  private readonly downshiftRpmFraction: number;
  private readonly idleRpmFraction: number;

  /** 0 = reverse, 1..gearCount = forward gears. */
  private gear = 1;

  constructor(options?: GearboxOptions) {
    this.gearCount = Math.max(1, Math.round(options?.gearCount ?? DEFAULT_GEAR_COUNT));
    this.upshiftRpmFraction = options?.upshiftRpmFraction ?? DEFAULT_UPSHIFT_RPM_FRACTION;
    this.downshiftRpmFraction = options?.downshiftRpmFraction ?? DEFAULT_DOWNSHIFT_RPM_FRACTION;
    this.idleRpmFraction = options?.idleRpmFraction ?? DEFAULT_IDLE_RPM_FRACTION;
  }

  /**
   * @param forwardSpeed Road speed, world units/s, signed (negative = reverse).
   *                      This is telemetry read FROM the simulation, never fed
   *                      back into it.
   * @param maxSpeed Car's authored top speed, world units/s.
   */
  update(forwardSpeed: number, maxSpeed: number): GearboxState {
    if (!Number.isFinite(forwardSpeed) || !Number.isFinite(maxSpeed) || maxSpeed <= 0) {
      this.gear = 1;
      return { gear: 1, rpmFraction: this.idleRpmFraction, shifted: false };
    }

    const previousGear = this.gear;

    if (forwardSpeed < 0) {
      const speedFraction = clampUnit(Math.abs(forwardSpeed) / maxSpeed);
      this.gear = 0;
      return {
        gear: 0,
        rpmFraction: this.idleRpmFraction + (1 - this.idleRpmFraction) * speedFraction,
        shifted: previousGear !== 0,
      };
    }

    const edges = this.bandEdges(maxSpeed);
    const speed = Math.min(Math.max(forwardSpeed, 0), maxSpeed);
    let gear = previousGear >= 1 && previousGear <= this.gearCount ? previousGear : 1;

    // At most gearCount - 1 shifts can ever be needed to settle, so this always
    // terminates. Looping (rather than shifting once) lets a single update cross
    // more than one band boundary — e.g. after a collision-induced speed jump —
    // without skipping gears in between.
    for (let step = 0; step < this.gearCount; step += 1) {
      const lower = edges[gear - 1];
      const upper = edges[gear];
      const width = upper - lower;

      if (gear < this.gearCount) {
        const upshiftAt = lower + this.upshiftRpmFraction * width;
        if (speed > upshiftAt) {
          gear += 1;
          continue;
        }
      }
      if (gear > 1) {
        const belowLower = edges[gear - 2];
        const belowWidth = edges[gear - 1] - belowLower;
        const downshiftAt = belowLower + this.downshiftRpmFraction * belowWidth;
        if (speed < downshiftAt) {
          gear -= 1;
          continue;
        }
      }
      break;
    }

    const lower = edges[gear - 1];
    const width = edges[gear] - lower;
    const position = width > 0 ? clampUnit((speed - lower) / width) : 0;

    this.gear = gear;
    return {
      gear,
      rpmFraction: this.idleRpmFraction + (1 - this.idleRpmFraction) * position,
      shifted: gear !== previousGear,
    };
  }

  reset(): void {
    this.gear = 1;
  }

  /** Cumulative band edges: `[0, edge(1), edge(2), ..., maxSpeed]`, length gearCount + 1. */
  private bandEdges(maxSpeed: number): number[] {
    const widths: number[] = [];
    if (this.gearCount === 1) {
      widths.push(maxSpeed);
    } else {
      const growthSum = (GEAR_WIDTH_GROWTH ** this.gearCount - 1) / (GEAR_WIDTH_GROWTH - 1);
      const firstWidth = maxSpeed / growthSum;
      for (let k = 0; k < this.gearCount; k += 1) {
        widths.push(firstWidth * GEAR_WIDTH_GROWTH ** k);
      }
    }

    const edges = [0];
    for (const width of widths) {
      edges.push(edges[edges.length - 1] + width);
    }
    return edges;
  }
}
