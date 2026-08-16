import type { NoiseSource } from './NoiseSource.ts';

/** Clamps to 0..1 and folds NaN to 0: a NaN reaching an AudioParam throws and
 * kills the whole audio graph, so every public entry point sanitises first. */
function clampUnit(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Brake-squeal voice: shared white noise through a narrow, high bandpass
 * filter. Gain scales with `brakeAmount * speedFraction`, so braking from a
 * standstill is silent — there is no speed left to scrub off. While the
 * squeal holds, its centre frequency drifts slowly upward, which is what
 * separates "friction" from "test tone" to the ear.
 */
export class BrakeVoice {
  private readonly context: AudioContext;
  private readonly filter: BiquadFilterNode;
  private readonly gain: GainNode;

  /** Base of the metallic squeal band. */
  private static readonly BASE_FREQUENCY_HZ = 3200;
  /** How far the centre frequency is allowed to drift upward while the
   * squeal holds, on top of the base frequency. */
  private static readonly MAX_DRIFT_HZ = 800;
  /** How fast the drift climbs towards its ceiling, in Hz per second — slow
   * enough that a short tap barely drifts and a held squeal audibly rises. */
  private static readonly DRIFT_RATE_HZ_PER_SECOND = 400;
  /** Narrow and high: this is what makes it read as metal, not scrub. */
  private static readonly FILTER_Q = 9;
  /** Ceiling so the squeal cuts through without dominating the mix. */
  private static readonly MAX_GAIN = 0.4;
  /** Quick attack for a responsive-feeling squeal onset. */
  private static readonly ATTACK_TIME_CONSTANT = 0.02;
  /** Slower release so it fades rather than clicking off. */
  private static readonly RELEASE_TIME_CONSTANT = 0.12;
  /** How often the drift target is re-issued while the squeal holds. Re-run
   * every frame like everything else here — it is just another ramp. */
  private static readonly DRIFT_TIME_CONSTANT = 0.08;
  private static readonly STOP_TIME_CONSTANT = 0.05;
  private static readonly STOP_SETTLE_TIME_CONSTANTS = 5;

  private previousGainFactor = 0;
  private squealStartTime = 0;
  private stopped = false;

  constructor(context: AudioContext, noise: NoiseSource, destination: AudioNode) {
    this.context = context;
    this.filter = context.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = BrakeVoice.BASE_FREQUENCY_HZ;
    this.filter.Q.value = BrakeVoice.FILTER_Q;

    this.gain = context.createGain();
    this.gain.gain.value = 0;

    noise.start();
    noise.connect(this.filter);
    this.filter.connect(this.gain);
    this.gain.connect(destination);
  }

  private isUsable(): boolean {
    return this.context.state !== 'closed' && !this.stopped;
  }

  /** @param brakeAmount 0..1, @param speedFraction 0..1 of the car's max speed. */
  update(brakeAmount: number, speedFraction: number): void {
    if (!this.isUsable()) return;

    const gainFactor = clampUnit(brakeAmount) * clampUnit(speedFraction);
    const wasSilent = this.previousGainFactor <= 0;
    const now = this.context.currentTime;

    if (wasSilent && gainFactor > 0) {
      // The squeal just started (or restarted): drift measures from here.
      this.squealStartTime = now;
    }
    this.previousGainFactor = gainFactor;

    const rising = gainFactor > 0;
    const timeConstant = rising ? BrakeVoice.ATTACK_TIME_CONSTANT : BrakeVoice.RELEASE_TIME_CONSTANT;
    this.gain.gain.setTargetAtTime(gainFactor * BrakeVoice.MAX_GAIN, now, timeConstant);

    if (gainFactor > 0) {
      const heldSeconds = now - this.squealStartTime;
      const drift = Math.min(BrakeVoice.MAX_DRIFT_HZ, heldSeconds * BrakeVoice.DRIFT_RATE_HZ_PER_SECOND);
      this.filter.frequency.setTargetAtTime(
        BrakeVoice.BASE_FREQUENCY_HZ + drift,
        now,
        BrakeVoice.DRIFT_TIME_CONSTANT,
      );
    }
  }

  /** Ramps gain to silence, then disconnects. Safe to call twice. */
  stop(): void {
    if (this.stopped) return;
    if (this.context.state === 'closed') {
      this.stopped = true;
      return;
    }

    const now = this.context.currentTime;
    this.gain.gain.setTargetAtTime(0, now, BrakeVoice.STOP_TIME_CONSTANT);
    this.stopped = true;

    const settleSeconds = BrakeVoice.STOP_TIME_CONSTANT * BrakeVoice.STOP_SETTLE_TIME_CONSTANTS;
    setTimeout(() => {
      this.filter.disconnect();
      this.gain.disconnect();
    }, settleSeconds * 1000);
  }
}
