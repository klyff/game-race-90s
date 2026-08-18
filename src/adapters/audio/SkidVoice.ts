import type { NoiseSource } from './NoiseSource.ts';

/** Clamps to 0..1 and folds NaN to 0: a NaN reaching an AudioParam throws and
 * kills the whole audio graph, so every public entry point sanitises first. */
function clampUnit(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Tyre-scrub voice: shared white noise through a bandpass filter whose centre
 * frequency and gain both rise with slide intensity, so a gentle slide reads
 * as a hiss and a full drift reads as a screech.
 */
export class SkidVoice {
  private readonly context: AudioContext;
  private readonly filter: BiquadFilterNode;
  private readonly gain: GainNode;

  private previousIntensity = 0;
  private stopped = false;

  /** Lower end of the scrub band — a gentle slide sits here. */
  private static readonly MIN_FREQUENCY_HZ = 1000;
  /** Upper end of the scrub band — a full drift screech sits here. */
  private static readonly MAX_FREQUENCY_HZ = 1500;
  /** Moderate Q: narrow enough to read as tyre scrub, wide enough not to
   * sound like a pure test tone. */
  private static readonly FILTER_Q = 1.4;
  /** Ceiling so skid noise sits under the engine, not over it. */
  private static readonly MAX_GAIN = 0.25;
  /** Quick attack so a flick of oversteer is audible immediately. */
  private static readonly ATTACK_TIME_CONSTANT = 0.03;
  /** Slower release so the tail fades instead of clicking off, while still
   * short enough that the skid does not linger once grip is regained. */
  private static readonly RELEASE_TIME_CONSTANT = 0.15;
  /** Time constant used when finalising stop(): fast enough to be inaudible
   * before the node is disconnected. */
  private static readonly STOP_TIME_CONSTANT = 0.05;
  /** How long to wait after scheduling the stop ramp before disconnecting,
   * expressed in time constants (setTargetAtTime never truly reaches its
   * target, so we wait a comfortable multiple before tearing the graph down). */
  private static readonly STOP_SETTLE_TIME_CONSTANTS = 5;

  constructor(context: AudioContext, noise: NoiseSource, destination: AudioNode) {
    this.context = context;
    this.filter = context.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = SkidVoice.MIN_FREQUENCY_HZ;
    this.filter.Q.value = SkidVoice.FILTER_Q;

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

  /** @param intensity 0..1, how hard the tyres are sliding. */
  update(intensity: number): void {
    if (!this.isUsable()) return;

    const clamped = clampUnit(intensity);
    const rising = clamped > this.previousIntensity;
    this.previousIntensity = clamped;

    const now = this.context.currentTime;
    const timeConstant = rising ? SkidVoice.ATTACK_TIME_CONSTANT : SkidVoice.RELEASE_TIME_CONSTANT;

    // Gain's target is a pure multiple of intensity with no additive floor,
    // so at intensity 0 the target is exactly zero and the exponential decay
    // settles there rather than leaving a permanent hiss under the game.
    const targetGain = clamped * SkidVoice.MAX_GAIN;
    const targetFrequency =
      SkidVoice.MIN_FREQUENCY_HZ + clamped * (SkidVoice.MAX_FREQUENCY_HZ - SkidVoice.MIN_FREQUENCY_HZ);

    this.gain.gain.setTargetAtTime(targetGain, now, timeConstant);
    this.filter.frequency.setTargetAtTime(targetFrequency, now, timeConstant);
  }

  /** Ramps gain to silence, then disconnects. Safe to call twice. */
  stop(): void {
    if (this.stopped) return;
    if (this.context.state === 'closed') {
      this.stopped = true;
      return;
    }

    const now = this.context.currentTime;
    this.gain.gain.setTargetAtTime(0, now, SkidVoice.STOP_TIME_CONSTANT);
    this.stopped = true;

    const settleSeconds = SkidVoice.STOP_TIME_CONSTANT * SkidVoice.STOP_SETTLE_TIME_CONSTANTS;
    setTimeout(() => {
      this.filter.disconnect();
      this.gain.disconnect();
    }, settleSeconds * 1000);
  }
}
