/**
 * A single looping white-noise buffer, shared by every noise-based voice
 * (skid, brake). Generating the buffer once and sharing it matters: a fresh
 * `AudioBuffer` per voice wastes memory for identical data, and — worse —
 * restarting a brand-new `AudioBufferSourceNode` on every skid produces an
 * audible click at the seam plus a garbage-collection stutter as the old
 * buffer is dropped. One buffer, one source, started once, connected to as
 * many downstream filter chains as needed.
 */
export class NoiseSource {
  private readonly context: AudioContext;
  private readonly sourceNode: AudioBufferSourceNode;

  /** How long the looping buffer is before it repeats. Long enough that the
   * loop seam is masked once the noise is bandpass-filtered downstream. */
  private static readonly LOOP_DURATION_SECONDS = 2;

  private started = false;
  private stopped = false;

  readonly output: AudioNode;

  constructor(context: AudioContext) {
    this.context = context;
    this.sourceNode = context.createBufferSource();
    this.sourceNode.buffer = NoiseSource.createNoiseBuffer(context);
    this.sourceNode.loop = true;
    this.output = this.sourceNode;
  }

  private static createNoiseBuffer(context: AudioContext): AudioBuffer {
    const frameCount = Math.ceil(context.sampleRate * NoiseSource.LOOP_DURATION_SECONDS);
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i += 1) {
      channel[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /** Starts the loop if it has not started yet. Safe to call repeatedly:
   * several voices share one instance and each may try to start it. */
  start(): void {
    if (this.started || this.stopped) return;
    if (this.context.state === 'closed') return;
    this.sourceNode.start();
    this.started = true;
  }

  connect(destination: AudioNode): void {
    if (this.context.state === 'closed') return;
    this.sourceNode.connect(destination);
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    if (!this.started) return;
    if (this.context.state === 'closed') return;
    this.sourceNode.stop();
  }
}
