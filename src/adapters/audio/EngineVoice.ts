/** Clamps to 0..1 and folds NaN to 0: a NaN reaching an AudioParam throws and
 * kills the whole audio graph, so every public entry point sanitises first. */
function clampUnit(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Combustion-engine voice, built from three oscillators through one lowpass
 * filter: this is what `RaceAudio` feeds with `EngineGearbox` output every
 * rendered frame.
 *
 * Graph, built once and never rebuilt: a fundamental sawtooth and an octave-up
 * sawtooth (detuned apart from each other for a chorus-like rasp) plus a
 * sub-octave square oscillator for low-end body, all summed into one
 * `BiquadFilterNode` lowpass, into one master `GainNode`, into `destination`.
 *
 * `rpmFraction` (0..1, as reported by `EngineGearbox`) maps linearly to
 * 55–220 Hz: `freq = 55 + rpmFraction * (220 - 55)`. That keeps the note a low
 * rumble at idle and a rasp at redline rather than a mosquito whine. The
 * detune spread between the two saws grows with the same fraction, so the
 * engine sounds "tighter" at idle and "angrier" high in the band, matching the
 * pitch it is riding.
 *
 * Every parameter after construction is moved with `setTargetAtTime` (or, in
 * `shift()`, a pair of them), never a bare `.value =` — assigning a raw number
 * at frame rate is the classic zipper-noise bug in procedural engine audio.
 */
export class EngineVoice {
  private readonly context: AudioContext;
  private readonly oscFundamental: OscillatorNode;
  private readonly oscOctave: OscillatorNode;
  private readonly oscSub: OscillatorNode;
  private readonly subGain: GainNode;
  private readonly filter: BiquadFilterNode;
  private readonly masterGain: GainNode;

  private targetGain: number;
  private targetCutoffHz: number;
  private stopped = false;

  /** Bottom of the pitch range: idle, gear 1 barely turning over. */
  private static readonly IDLE_FREQUENCY_HZ = 55;
  /** Top of the pitch range: redline in the highest gear. */
  private static readonly MAX_FREQUENCY_HZ = 220;
  /** Detune spread (cents) between the two saws at idle — near-unison. */
  private static readonly DETUNE_CENTS_MIN = 4;
  /** Detune spread (cents) between the two saws at redline — a wider rasp. */
  private static readonly DETUNE_CENTS_MAX = 22;
  /** Sub-oscillator level relative to the saws, fixed at construction. */
  private static readonly SUB_GAIN_LEVEL = 0.6;

  /** Lowpass cutoff at idle: muffled, barely-there rumble. */
  private static readonly FILTER_BASE_HZ = 300;
  /** How far the cutoff rises from idle to redline. */
  private static readonly FILTER_RANGE_HZ = 4200;
  private static readonly FILTER_Q = 0.7;

  /** Quiet but present at idle — a silent idle reads as broken audio. */
  private static readonly IDLE_GAIN = 0.04;
  /** Full send at wide-open throttle under load. */
  private static readonly PEAK_GAIN = 0.32;

  /** Time constant for pitch and filter moves: fast enough to track a foot on
   * the throttle, slow enough not to zipper. */
  private static readonly GLIDE_TIME_CONSTANT = 0.05;
  /** Time constant for gain moves: slightly slower, so throttle blips do not
   * pump the volume abruptly. */
  private static readonly GAIN_TIME_CONSTANT = 0.08;

  /** Fraction of the current gain/cutoff the shift dip falls to. */
  private static readonly SHIFT_DIP_FRACTION = 0.35;
  /** How quickly the dip is reached. */
  private static readonly SHIFT_DIP_TIME_CONSTANT = 0.02;
  /** How long after the dip the recovery ramp starts. */
  private static readonly SHIFT_DIP_HOLD_SECONDS = 0.05;
  /** How quickly the recovery ramp settles back to the running target. */
  private static readonly SHIFT_RECOVER_TIME_CONSTANT = 0.12;

  /** Time constant used when finalising stop(): fast enough to be inaudible
   * before the oscillators are stopped and the graph torn down. */
  private static readonly STOP_TIME_CONSTANT = 0.05;
  /** How many time constants to wait before actually stopping the oscillators
   * (setTargetAtTime never truly reaches zero). */
  private static readonly STOP_SETTLE_TIME_CONSTANTS = 5;

  constructor(context: AudioContext, destination: AudioNode) {
    this.context = context;

    this.oscFundamental = context.createOscillator();
    this.oscFundamental.type = 'sawtooth';
    this.oscFundamental.frequency.value = EngineVoice.IDLE_FREQUENCY_HZ;
    this.oscFundamental.detune.value = -EngineVoice.DETUNE_CENTS_MIN / 2;

    this.oscOctave = context.createOscillator();
    this.oscOctave.type = 'sawtooth';
    this.oscOctave.frequency.value = EngineVoice.IDLE_FREQUENCY_HZ * 2;
    this.oscOctave.detune.value = EngineVoice.DETUNE_CENTS_MIN / 2;

    this.oscSub = context.createOscillator();
    this.oscSub.type = 'square';
    this.oscSub.frequency.value = EngineVoice.IDLE_FREQUENCY_HZ / 2;

    this.subGain = context.createGain();
    this.subGain.gain.value = EngineVoice.SUB_GAIN_LEVEL;

    this.filter = context.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = EngineVoice.FILTER_BASE_HZ;
    this.filter.Q.value = EngineVoice.FILTER_Q;

    this.masterGain = context.createGain();
    this.masterGain.gain.value = EngineVoice.IDLE_GAIN;

    this.oscFundamental.connect(this.filter);
    this.oscOctave.connect(this.filter);
    this.oscSub.connect(this.subGain);
    this.subGain.connect(this.filter);
    this.filter.connect(this.masterGain);
    this.masterGain.connect(destination);

    this.targetGain = EngineVoice.IDLE_GAIN;
    this.targetCutoffHz = EngineVoice.FILTER_BASE_HZ;

    // Oscillators run continuously for the lifetime of the voice; only their
    // parameters change afterwards. Starting them while the context is still
    // suspended (pre user-gesture) is harmless — they simply render no output
    // until `context.resume()` is called elsewhere.
    this.oscFundamental.start();
    this.oscOctave.start();
    this.oscSub.start();
  }

  private isUsable(): boolean {
    return this.context.state !== 'closed' && !this.stopped;
  }

  /**
   * Ramps gain to true silence without tearing the oscillators down.
   * Used when the car has idled long enough that the motor should cut.
   */
  silence(): void {
    if (!this.isUsable()) return;
    const now = this.context.currentTime;
    this.masterGain.gain.setTargetAtTime(0, now, EngineVoice.GAIN_TIME_CONSTANT);
    this.targetGain = 0;
  }

  /**
   * @param rpmFraction 0..1, from `EngineGearbox`. Mapped linearly to 55–220 Hz.
   * @param throttle 0..1, how hard the driver is pressing the accelerator.
   * @param load 0..1, how hard the engine is working (e.g. reverse power too).
   */
  update(rpmFraction: number, throttle: number, load: number): void {
    if (!this.isUsable()) return;

    const rpm = clampUnit(rpmFraction);
    const drive = clampUnit(Math.max(clampUnit(throttle), clampUnit(load)));

    const frequencyHz = EngineVoice.IDLE_FREQUENCY_HZ + rpm * (EngineVoice.MAX_FREQUENCY_HZ - EngineVoice.IDLE_FREQUENCY_HZ);
    const detuneCents = EngineVoice.DETUNE_CENTS_MIN + rpm * (EngineVoice.DETUNE_CENTS_MAX - EngineVoice.DETUNE_CENTS_MIN);
    const cutoffHz = EngineVoice.FILTER_BASE_HZ + rpm * EngineVoice.FILTER_RANGE_HZ;
    const gain = EngineVoice.IDLE_GAIN + drive * (EngineVoice.PEAK_GAIN - EngineVoice.IDLE_GAIN);

    const now = this.context.currentTime;

    this.oscFundamental.frequency.setTargetAtTime(frequencyHz, now, EngineVoice.GLIDE_TIME_CONSTANT);
    this.oscOctave.frequency.setTargetAtTime(frequencyHz * 2, now, EngineVoice.GLIDE_TIME_CONSTANT);
    this.oscSub.frequency.setTargetAtTime(frequencyHz / 2, now, EngineVoice.GLIDE_TIME_CONSTANT);
    this.oscFundamental.detune.setTargetAtTime(-detuneCents / 2, now, EngineVoice.GLIDE_TIME_CONSTANT);
    this.oscOctave.detune.setTargetAtTime(detuneCents / 2, now, EngineVoice.GLIDE_TIME_CONSTANT);
    this.filter.frequency.setTargetAtTime(cutoffHz, now, EngineVoice.GLIDE_TIME_CONSTANT);
    this.masterGain.gain.setTargetAtTime(gain, now, EngineVoice.GAIN_TIME_CONSTANT);

    this.targetGain = gain;
    this.targetCutoffHz = cutoffHz;
  }

  /**
   * The chuff of a gear change: a brief dip of gain and cutoff below whatever
   * `update` last set, then a recovery back to it. No nodes are created; this
   * is two pairs of scheduled ramps on the nodes already in the graph.
   */
  shift(): void {
    if (!this.isUsable()) return;

    const now = this.context.currentTime;
    const dipGain = this.targetGain * EngineVoice.SHIFT_DIP_FRACTION;
    const dipCutoffHz = this.targetCutoffHz * EngineVoice.SHIFT_DIP_FRACTION;
    const recoverAt = now + EngineVoice.SHIFT_DIP_HOLD_SECONDS;

    this.masterGain.gain.setTargetAtTime(dipGain, now, EngineVoice.SHIFT_DIP_TIME_CONSTANT);
    this.filter.frequency.setTargetAtTime(dipCutoffHz, now, EngineVoice.SHIFT_DIP_TIME_CONSTANT);
    this.masterGain.gain.setTargetAtTime(this.targetGain, recoverAt, EngineVoice.SHIFT_RECOVER_TIME_CONSTANT);
    this.filter.frequency.setTargetAtTime(this.targetCutoffHz, recoverAt, EngineVoice.SHIFT_RECOVER_TIME_CONSTANT);
  }

  /** Ramps gain to silence, then stops the oscillators and disconnects. Safe
   * to call twice, and a no-op once the context is closed. */
  stop(): void {
    if (this.stopped) return;
    if (this.context.state === 'closed') {
      this.stopped = true;
      return;
    }

    const now = this.context.currentTime;
    this.masterGain.gain.setTargetAtTime(0, now, EngineVoice.STOP_TIME_CONSTANT);
    this.stopped = true;

    const settleSeconds = EngineVoice.STOP_TIME_CONSTANT * EngineVoice.STOP_SETTLE_TIME_CONSTANTS;
    setTimeout(() => {
      try {
        this.oscFundamental.stop();
        this.oscOctave.stop();
        this.oscSub.stop();
      } catch {
        /* Already stopped or the context closed underneath us — nothing to do. */
      }
      this.oscFundamental.disconnect();
      this.oscOctave.disconnect();
      this.oscSub.disconnect();
      this.subGain.disconnect();
      this.filter.disconnect();
      this.masterGain.disconnect();
    }, settleSeconds * 1000);
  }
}
