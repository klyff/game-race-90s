import type { NoiseSource } from './NoiseSource.ts';

/** Clamps to 0..1 and folds NaN to 0: a NaN reaching an AudioParam throws and
 * kills the whole audio graph, so every public entry point sanitises first. */
function clampUnit(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Explosion voice: a synthesised car-explosion burst combining a noise
 * blast through a frequency-sweeping lowpass filter with a sub-frequency
 * sine thump that mimics the low-end rumble. Both components decay
 * exponentially to silence over 0.6–1.2 s depending on intensity.
 *
 * Like ImpactVoice, this is triggered rather than continuously modulated,
 * so each `play()` call spawns a short-lived node chain that tears itself
 * down when the burst ends. A retrigger rate limit prevents machine-gunning
 * when a car explodes mid-collision (multiple wall hits triggering in a frame).
 */
export class ExplosionVoice {
  private readonly context: AudioContext;
  private readonly destination: GainNode;
  private readonly noise: NoiseSource;

  /** Floor on how often a new explosion may start, to prevent overlapping
   * bursts from turning into a wall of noise. Conservative: a car that hits
   * at speed should explode only once, cleanly. */
  private static readonly RETRIGGER_INTERVAL_SECONDS = 0.3;

  /** Peak amplitude of the noise component at full intensity. */
  private static readonly NOISE_PEAK_GAIN = 0.6;
  /** Peak amplitude of the sub-thump sine wave at full intensity. */
  private static readonly THUMP_PEAK_GAIN = 0.4;

  /** Lowpass cutoff sweeps from here (bright crack) to END_CUTOFF_HZ (dull rumble). */
  private static readonly NOISE_START_CUTOFF_HZ = 6000;
  /** Lowpass floor: below this everything reads as mud. */
  private static readonly NOISE_END_CUTOFF_HZ = 150;

  /** Sub-thump (sine) starts at this frequency (upper end of the boom). */
  private static readonly THUMP_START_FREQUENCY_HZ = 90;
  /** Sub-thump sweeps down to this frequency (deep rumble floor). */
  private static readonly THUMP_END_FREQUENCY_HZ = 30;

  /** Fast attack so the transient reads as a crack, not a swell. */
  private static readonly ATTACK_SECONDS = 0.01;

  /** Decay time constant; the exponential ramp settles by ~5τ into inaudibility.
   * Combined with BUFFER_SECONDS, this gives the 0.6–1.2 s window per the brief. */
  private static readonly DECAY_TIME_CONSTANT = 0.35;

  /** How long the burst lasts before it's forcibly stopped (upper bound on the
   * time constant's exponential tail). Longer than ImpactVoice's 0.3 s to allow
   * the rumble to finish naturally. */
  private static readonly BUFFER_SECONDS = 1.2;

  /** Lowpass Q: moderate, not so narrow that it rings. */
  private static readonly FILTER_Q = 0.8;

  private lastPlayTime = -Infinity;
  private stopped = false;

  constructor(context: AudioContext, noise: NoiseSource, destination: GainNode) {
    this.context = context;
    this.noise = noise;
    this.destination = destination;
  }

  private isUsable(): boolean {
    return this.context.state !== 'closed' && !this.stopped;
  }

  /** @param intensity 0..1, scaled from the severity of the collision. */
  play(intensity: number): void {
    if (!this.isUsable()) return;

    const now = this.context.currentTime;
    if (now - this.lastPlayTime < ExplosionVoice.RETRIGGER_INTERVAL_SECONDS) return;
    this.lastPlayTime = now;

    const clamped = clampUnit(intensity);
    if (clamped <= 0) return;

    // Noise burst: shared white-noise source through a sweeping lowpass.
    const noiseGain = this.context.createGain();
    const noiseFilter = this.context.createBiquadFilter();
    const noiseEnvelope = this.context.createGain();

    noiseFilter.type = 'lowpass';
    noiseFilter.Q.value = ExplosionVoice.FILTER_Q;
    noiseFilter.frequency.setValueAtTime(
      ExplosionVoice.NOISE_START_CUTOFF_HZ * clamped,
      now
    );
    noiseFilter.frequency.setTargetAtTime(
      ExplosionVoice.NOISE_END_CUTOFF_HZ,
      now,
      ExplosionVoice.DECAY_TIME_CONSTANT
    );

    noiseEnvelope.gain.setValueAtTime(0, now);
    noiseEnvelope.gain.linearRampToValueAtTime(
      ExplosionVoice.NOISE_PEAK_GAIN * clamped,
      now + ExplosionVoice.ATTACK_SECONDS
    );
    noiseEnvelope.gain.setTargetAtTime(
      0,
      now + ExplosionVoice.ATTACK_SECONDS,
      ExplosionVoice.DECAY_TIME_CONSTANT
    );

    // Sub-thump: sine oscillator sweeping downward (the deep rumble).
    const thumpOsc = this.context.createOscillator();
    const thumpGain = this.context.createGain();

    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(ExplosionVoice.THUMP_START_FREQUENCY_HZ, now);
    thumpOsc.frequency.setTargetAtTime(
      ExplosionVoice.THUMP_END_FREQUENCY_HZ,
      now,
      ExplosionVoice.DECAY_TIME_CONSTANT
    );

    thumpGain.gain.setValueAtTime(0, now);
    thumpGain.gain.linearRampToValueAtTime(
      ExplosionVoice.THUMP_PEAK_GAIN * clamped,
      now + ExplosionVoice.ATTACK_SECONDS
    );
    thumpGain.gain.setTargetAtTime(
      0,
      now + ExplosionVoice.ATTACK_SECONDS,
      ExplosionVoice.DECAY_TIME_CONSTANT
    );

    // Wire up the noise chain: shared noise → filter → envelope → destination.
    this.noise.connect(noiseGain);
    noiseGain.connect(noiseFilter);
    noiseFilter.connect(noiseEnvelope);
    noiseEnvelope.connect(this.destination);

    // Wire up the sub-thump: oscillator → gain → destination.
    thumpOsc.connect(thumpGain);
    thumpGain.connect(this.destination);

    // Schedule cleanup when the oscillator (the shorter-lived component) ends.
    const cleanup = (): void => {
      noiseGain.disconnect();
      noiseFilter.disconnect();
      noiseEnvelope.disconnect();
      thumpGain.disconnect();
    };
    thumpOsc.onended = cleanup;

    // Start both and stop them after the buffer duration.
    thumpOsc.start(now);
    thumpOsc.stop(now + ExplosionVoice.BUFFER_SECONDS);
  }

  /** Marks the voice unusable; short-lived per-shot nodes clean themselves up
   * via `onended`. Safe to call twice. */
  destroy(): void {
    this.stopped = true;
  }
}
