/** Clamps to 0..1 and folds NaN to 0: a NaN reaching an AudioParam throws and
 * kills the whole audio graph, so every public entry point sanitises first. */
function clampUnit(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Impact voice: a short burst of noise through a lowpass filter that sweeps
 * downward, reading as a body-panel scrape or thump. Unlike the other voices
 * this one is triggered rather than continuously modulated, so each `play()`
 * spawns a short-lived node chain that tears itself down when the burst
 * ends. The one thing that keeps that safe is the retrigger rate limit
 * below: scraping along a wall for a second fires `play()` every rendered
 * frame, and without a floor on the gap between hits that would spawn
 * hundreds of overlapping bursts and turn into a buzzsaw of noise.
 */
export class ImpactVoice {
  private readonly context: AudioContext;
  private readonly destination: AudioNode;
  private readonly burstBuffer: AudioBuffer;

  /** Floor on how often a new burst may start. A few tens of milliseconds,
   * per the brief: long enough that a continuous wall-scrape reads as a
   * rhythm of distinct hits rather than a solid noise wall, short enough
   * that it still feels responsive to a single sharp impact. */
  private static readonly RETRIGGER_INTERVAL_SECONDS = 0.05;
  /** Burst length: buffer only needs to outlast the longest decay below. */
  private static readonly BURST_BUFFER_SECONDS = 0.3;
  /** Fast attack so the transient reads as a hit, not a swell. */
  private static readonly ATTACK_SECONDS = 0.005;
  /** Decay window from the brief (~150-250 ms); mid-point picked as the
   * single default for both a scrape and a thump. */
  private static readonly DECAY_SECONDS = 0.2;
  /** Lowpass starts open (full noise brightness) on the transient... */
  private static readonly START_CUTOFF_HZ = 4000;
  /** ...and sweeps down to this floor as it decays, which is the sweep that
   * makes it read as a body panel rather than a snare hit. */
  private static readonly END_CUTOFF_HZ = 200;
  /** Time constant for both the cutoff sweep and the final gain fade,
   * derived from the decay window so the sweep and the silence land together. */
  private static readonly SWEEP_TIME_CONSTANT = ImpactVoice.DECAY_SECONDS / 3;
  /** Peak gain of a full-intensity impact. */
  private static readonly MAX_GAIN = 0.8;

  private lastPlayTime = -Infinity;
  private stopped = false;

  constructor(context: AudioContext, destination: AudioNode) {
    this.context = context;
    this.destination = destination;
    this.burstBuffer = ImpactVoice.createBurstBuffer(context);
  }

  private static createBurstBuffer(context: AudioContext): AudioBuffer {
    const frameCount = Math.ceil(context.sampleRate * ImpactVoice.BURST_BUFFER_SECONDS);
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i += 1) {
      channel[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private isUsable(): boolean {
    return this.context.state !== 'closed' && !this.stopped;
  }

  /** @param intensity 0..1, scaled from the speed the car hit the wall with. */
  play(intensity: number): void {
    if (!this.isUsable()) return;

    const now = this.context.currentTime;
    if (now - this.lastPlayTime < ImpactVoice.RETRIGGER_INTERVAL_SECONDS) return;
    this.lastPlayTime = now;

    const clamped = clampUnit(intensity);
    if (clamped <= 0) return;

    const source = this.context.createBufferSource();
    source.buffer = this.burstBuffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1;
    filter.frequency.setValueAtTime(ImpactVoice.START_CUTOFF_HZ * clamped, now);
    filter.frequency.setTargetAtTime(ImpactVoice.END_CUTOFF_HZ, now, ImpactVoice.SWEEP_TIME_CONSTANT);

    const gain = this.context.createGain();
    const peakGain = ImpactVoice.MAX_GAIN * clamped;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + ImpactVoice.ATTACK_SECONDS);
    gain.gain.setTargetAtTime(0, now + ImpactVoice.ATTACK_SECONDS, ImpactVoice.SWEEP_TIME_CONSTANT);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.destination);

    const cleanup = (): void => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    source.onended = cleanup;

    source.start(now);
    source.stop(now + ImpactVoice.BURST_BUFFER_SECONDS);
  }

  /** No-op beyond marking the voice unusable: bursts are short-lived and
   * clean themselves up via `onended`. Safe to call twice. */
  stop(): void {
    this.stopped = true;
  }
}
