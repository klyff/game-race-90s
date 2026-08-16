import type { NoiseSource } from './NoiseSource.ts';
import {
  barHasLick,
  barIndexForStep,
  beatsToSeconds,
  eighthInBarForStep,
  STEP_BEATS,
  totalSteps,
  wrapStepIndex,
  noteFrequency,
} from './MusicScore.ts';
import type { ChordStep, DrumStep, MusicScore, StrumStep } from './MusicScore.ts';

/** Clamps to 0..1 and folds NaN to 0, matching the convention used by the
 * other voices in this package. */
function clampUnit(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Plays any `MusicScore` in a loop, synthesised entirely with the Web Audio
 * API — no audio asset files, per this project's locked decision that every
 * sound is procedural (decision 20).
 *
 * This is the one shared node graph behind every world's theme (T-040): a
 * new planet's music is a new `MusicScore` value, never a new subclass or a
 * copy of this file. `TitleMusic` is exactly `MusicPlayer` played with the
 * title screen's score.
 *
 * Voices, all summed into one owned `masterGain`:
 * - Rhythm guitar: two detuned sawtooths through a `WaveShaperNode` (hard-clip
 *   distortion, driven by `score.timbre.rhythmDrive`) and a lowpass at
 *   `score.timbre.rhythmFilterHz`, re-triggered every eighth note by
 *   `score.guitarStrumPattern` for a palm-muted chug with accented stabs.
 * - Bass: one sawtooth an octave below the chord root, through a lowpass at
 *   `score.timbre.bassFilterHz`, pulsed on the quarter notes.
 * - Drums: a pooled sine kick sweep, and a snare/hi-hat pair both filtered
 *   from the single shared `NoiseSource` buffer (never a second noise
 *   buffer) — shared sound design across every score, only the pattern
 *   (`score.drumPattern`) changes.
 * - Lead: one `score.timbre.leadWaveform` voice playing `score.leadLick`
 *   every `score.lickIntervalBars`th bar.
 *
 * Scheduling uses a **look-ahead scheduler driven by `context.currentTime`**:
 * an internal `setInterval` wakes up roughly every `SCHEDULER_INTERVAL_MS`
 * and schedules any eighth-note steps that fall within the next
 * `LOOK_AHEAD_SECONDS`, using precise `AudioParam` times rather than firing
 * nodes at the moment the interval callback runs (which would jitter).
 * `stop()` and `destroy()` clear the interval, so nothing keeps ticking after
 * teardown.
 */
export class MusicPlayer {
  private readonly context: AudioContext;
  private readonly noise: NoiseSource;
  private readonly score: MusicScore;

  private readonly masterGain: GainNode;

  private readonly rhythmOsc1: OscillatorNode;
  private readonly rhythmOsc2: OscillatorNode;
  private readonly rhythmWaveshaper: WaveShaperNode;
  private readonly rhythmFilter: BiquadFilterNode;
  private readonly rhythmGain: GainNode;

  private readonly bassOsc: OscillatorNode;
  private readonly bassFilter: BiquadFilterNode;
  private readonly bassGain: GainNode;

  private readonly snareFilter: BiquadFilterNode;
  private readonly snareGain: GainNode;
  private readonly hatFilter: BiquadFilterNode;
  private readonly hatGain: GainNode;
  private readonly kickPool: readonly { readonly osc: OscillatorNode; readonly gain: GainNode }[];
  private kickPoolCursor = 0;

  private readonly leadOsc: OscillatorNode;
  private readonly leadGain: GainNode;

  private started = false;
  private stopped = false;
  private schedulerId: ReturnType<typeof setInterval> | null = null;

  /** Global eighth-note counter for the next step still to be scheduled. */
  private stepCursor = 0;
  /** `context.currentTime` at which `stepCursor` should sound. */
  private nextStepTime = 0;

  private static readonly SCHEDULER_INTERVAL_MS = 50;
  private static readonly LOOK_AHEAD_SECONDS = 0.2;

  private static readonly RHYTHM_DETUNE_CENTS = 8;
  private static readonly RHYTHM_CHUG_GAIN = 0.22;
  private static readonly RHYTHM_ACCENT_GAIN = 0.38;
  private static readonly RHYTHM_ATTACK_SECONDS = 0.004;
  private static readonly RHYTHM_DECAY_TIME_CONSTANT = 0.05;

  private static readonly BASS_GAIN = 0.32;
  private static readonly BASS_ATTACK_SECONDS = 0.005;
  private static readonly BASS_DECAY_TIME_CONSTANT = 0.09;

  private static readonly SNARE_CENTER_HZ = 1800;
  private static readonly SNARE_Q = 1.6;
  private static readonly SNARE_GAIN = 0.5;
  private static readonly SNARE_DECAY_TIME_CONSTANT = 0.045;
  private static readonly HAT_CUTOFF_HZ = 8000;
  private static readonly HAT_GAIN = 0.22;
  private static readonly HAT_DECAY_TIME_CONSTANT = 0.02;

  private static readonly KICK_START_HZ = 120;
  private static readonly KICK_END_HZ = 45;
  private static readonly KICK_SWEEP_SECONDS = 0.1;
  private static readonly KICK_GAIN = 0.7;
  private static readonly KICK_POOL_SIZE = 3;

  private static readonly LEAD_GAIN = 0.2;
  private static readonly LEAD_ATTACK_SECONDS = 0.003;
  private static readonly LEAD_DECAY_TIME_CONSTANT = 0.08;

  /** Master send level, leaving headroom for every voice sounding at once. */
  private static readonly MASTER_GAIN = 0.55;
  /** Time constant for the fade-out on `stop()`. */
  private static readonly STOP_TIME_CONSTANT = 0.05;
  /** How many time constants to wait before tearing the graph down. */
  private static readonly STOP_SETTLE_TIME_CONSTANTS = 5;

  constructor(context: AudioContext, noise: NoiseSource, destination: AudioNode, score: MusicScore) {
    this.context = context;
    this.noise = noise;
    this.score = score;
    const timbre = score.timbre;

    this.masterGain = context.createGain();
    this.masterGain.gain.value = MusicPlayer.MASTER_GAIN;
    this.masterGain.connect(destination);

    // --- Rhythm guitar: detuned saws -> distortion -> lowpass -> envelope.
    this.rhythmOsc1 = context.createOscillator();
    this.rhythmOsc1.type = 'sawtooth';

    this.rhythmOsc2 = context.createOscillator();
    this.rhythmOsc2.type = 'sawtooth';
    this.rhythmOsc2.detune.value = MusicPlayer.RHYTHM_DETUNE_CENTS;

    this.rhythmWaveshaper = context.createWaveShaper();
    this.rhythmWaveshaper.curve = MusicPlayer.createDistortionCurve(timbre.rhythmDrive) as Float32Array<ArrayBuffer>;

    this.rhythmFilter = context.createBiquadFilter();
    this.rhythmFilter.type = 'lowpass';
    this.rhythmFilter.frequency.value = timbre.rhythmFilterHz;
    this.rhythmFilter.Q.value = timbre.rhythmFilterQ;

    this.rhythmGain = context.createGain();
    this.rhythmGain.gain.value = 0;

    this.rhythmOsc1.connect(this.rhythmWaveshaper);
    this.rhythmOsc2.connect(this.rhythmWaveshaper);
    this.rhythmWaveshaper.connect(this.rhythmFilter);
    this.rhythmFilter.connect(this.rhythmGain);
    this.rhythmGain.connect(this.masterGain);

    // --- Bass: one saw an octave down through a lowpass.
    this.bassOsc = context.createOscillator();
    this.bassOsc.type = 'sawtooth';

    this.bassFilter = context.createBiquadFilter();
    this.bassFilter.type = 'lowpass';
    this.bassFilter.frequency.value = timbre.bassFilterHz;
    this.bassFilter.Q.value = timbre.bassFilterQ;

    this.bassGain = context.createGain();
    this.bassGain.gain.value = 0;

    this.bassOsc.connect(this.bassFilter);
    this.bassFilter.connect(this.bassGain);
    this.bassGain.connect(this.masterGain);

    // --- Drums: snare and hat both tap the one shared noise buffer.
    this.snareFilter = context.createBiquadFilter();
    this.snareFilter.type = 'bandpass';
    this.snareFilter.frequency.value = MusicPlayer.SNARE_CENTER_HZ;
    this.snareFilter.Q.value = MusicPlayer.SNARE_Q;

    this.snareGain = context.createGain();
    this.snareGain.gain.value = 0;

    this.hatFilter = context.createBiquadFilter();
    this.hatFilter.type = 'highpass';
    this.hatFilter.frequency.value = MusicPlayer.HAT_CUTOFF_HZ;
    this.hatFilter.Q.value = 0.5;

    this.hatGain = context.createGain();
    this.hatGain.gain.value = 0;

    this.noise.connect(this.snareFilter);
    this.snareFilter.connect(this.snareGain);
    this.snareGain.connect(this.masterGain);

    this.noise.connect(this.hatFilter);
    this.hatFilter.connect(this.hatGain);
    this.hatGain.connect(this.masterGain);

    this.kickPool = Array.from({ length: MusicPlayer.KICK_POOL_SIZE }, () => {
      const osc = context.createOscillator();
      osc.type = 'sine';
      const gain = context.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.masterGain);
      return { osc, gain };
    });

    // --- Lead: single voice for the flourish, waveform set by the score's timbre.
    this.leadOsc = context.createOscillator();
    this.leadOsc.type = timbre.leadWaveform;

    this.leadGain = context.createGain();
    this.leadGain.gain.value = 0;

    this.leadOsc.connect(this.leadGain);
    this.leadGain.connect(this.masterGain);
  }

  /** Hard-clip/tanh-shaped curve: the classic cheap distortion pedal shape,
   * turning a sawtooth into a buzzy power-chord tone. `drive` sets how hard
   * the signal is clipped — higher is buzzier. */
  private static createDistortionCurve(drive: number): Float32Array {
    const length = 4096;
    const curve = new Float32Array(length);
    for (let i = 0; i < length; i += 1) {
      const x = (i / (length - 1)) * 2 - 1;
      curve[i] = Math.tanh(drive * x);
    }
    return curve;
  }

  private isUsable(): boolean {
    return this.context.state !== 'closed' && !this.stopped;
  }

  /** Starts every oscillator and the look-ahead scheduler. Idempotent: a
   * second call while already playing is a no-op. */
  start(): void {
    if (this.started || !this.isUsable()) return;
    this.started = true;

    this.rhythmOsc1.start();
    this.rhythmOsc2.start();
    this.bassOsc.start();
    this.leadOsc.start();
    for (const { osc } of this.kickPool) osc.start();

    this.noise.start();

    this.stepCursor = 0;
    this.nextStepTime = this.context.currentTime;

    this.scheduleDueSteps();
    this.schedulerId = setInterval(() => this.scheduleDueSteps(), MusicPlayer.SCHEDULER_INTERVAL_MS);
  }

  /** Schedules every eighth-note step whose time falls within the look-ahead
   * window from now. Never schedules the whole song at once — only what is
   * due soon — so the loop can (in principle) be altered while playing. */
  private scheduleDueSteps(): void {
    if (!this.isUsable()) return;

    const scheduleUntil = this.context.currentTime + MusicPlayer.LOOK_AHEAD_SECONDS;
    const stepSeconds = beatsToSeconds(STEP_BEATS, this.score.bpm);
    const steps = totalSteps(this.score);

    while (this.nextStepTime < scheduleUntil) {
      this.scheduleStep(this.stepCursor, this.nextStepTime);
      this.stepCursor = wrapStepIndex(this.stepCursor + 1, steps);
      this.nextStepTime += stepSeconds;
    }
  }

  private scheduleStep(stepIndex: number, time: number): void {
    const bar = barIndexForStep(this.score, stepIndex);
    const eighth = eighthInBarForStep(stepIndex);
    const chord = this.score.riff[bar]!;
    const strum = this.score.guitarStrumPattern[eighth]!;
    const drum = this.score.drumPattern[eighth]!;

    this.scheduleGuitarStep(chord, strum, eighth, time);
    this.scheduleBassStep(chord, eighth, time);
    this.scheduleDrumStep(drum, time);
    this.scheduleLeadStep(bar, eighth, time);
  }

  private scheduleGuitarStep(chord: ChordStep, strum: StrumStep, eighth: number, time: number): void {
    if (eighth === 0) {
      const freq = noteFrequency(chord.note);
      this.rhythmOsc1.frequency.setValueAtTime(freq, time);
      this.rhythmOsc2.frequency.setValueAtTime(freq, time);
    }

    const accented = strum.accent || chord.accent;
    const peak = accented ? MusicPlayer.RHYTHM_ACCENT_GAIN : MusicPlayer.RHYTHM_CHUG_GAIN;

    // Percussive envelope, not a bare `.value =`: a palm-muted chug rings
    // briefly and dies, it does not sustain like an open chord.
    this.rhythmGain.gain.cancelScheduledValues(time);
    this.rhythmGain.gain.setValueAtTime(0.0001, time);
    this.rhythmGain.gain.exponentialRampToValueAtTime(peak, time + MusicPlayer.RHYTHM_ATTACK_SECONDS);
    this.rhythmGain.gain.setTargetAtTime(0.0001, time + MusicPlayer.RHYTHM_ATTACK_SECONDS, MusicPlayer.RHYTHM_DECAY_TIME_CONSTANT);
  }

  private scheduleBassStep(chord: ChordStep, eighth: number, time: number): void {
    // Quarter-note pulse (every other eighth) rather than every eighth note:
    // a bass that chugs as fast as the guitar buries the low end.
    if (eighth % 2 !== 0) return;

    const freq = noteFrequency(chord.note) / 2;
    this.bassOsc.frequency.setValueAtTime(freq, time);

    this.bassGain.gain.cancelScheduledValues(time);
    this.bassGain.gain.setValueAtTime(0.0001, time);
    this.bassGain.gain.exponentialRampToValueAtTime(MusicPlayer.BASS_GAIN, time + MusicPlayer.BASS_ATTACK_SECONDS);
    this.bassGain.gain.setTargetAtTime(0.0001, time + MusicPlayer.BASS_ATTACK_SECONDS, MusicPlayer.BASS_DECAY_TIME_CONSTANT);
  }

  private scheduleDrumStep(step: DrumStep, time: number): void {
    if (step.kick) this.scheduleKick(time);

    if (step.snare) {
      this.snareGain.gain.cancelScheduledValues(time);
      this.snareGain.gain.setValueAtTime(MusicPlayer.SNARE_GAIN, time);
      this.snareGain.gain.setTargetAtTime(0, time, MusicPlayer.SNARE_DECAY_TIME_CONSTANT);
    }

    if (step.hat) {
      this.hatGain.gain.cancelScheduledValues(time);
      this.hatGain.gain.setValueAtTime(MusicPlayer.HAT_GAIN, time);
      this.hatGain.gain.setTargetAtTime(0, time, MusicPlayer.HAT_DECAY_TIME_CONSTANT);
    }
  }

  /** Round-robins the kick pool by a plain counter — never by wall-clock or
   * random sampling, both of which are forbidden in this project. */
  private scheduleKick(time: number): void {
    const { osc, gain } = this.kickPool[this.kickPoolCursor]!;
    this.kickPoolCursor = (this.kickPoolCursor + 1) % this.kickPool.length;

    const endTime = time + MusicPlayer.KICK_SWEEP_SECONDS;
    osc.frequency.cancelScheduledValues(time);
    osc.frequency.setValueAtTime(MusicPlayer.KICK_START_HZ, time);
    osc.frequency.exponentialRampToValueAtTime(MusicPlayer.KICK_END_HZ, endTime);

    gain.gain.cancelScheduledValues(time);
    gain.gain.setValueAtTime(MusicPlayer.KICK_GAIN, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
  }

  private scheduleLeadStep(bar: number, eighth: number, time: number): void {
    if (!barHasLick(this.score, bar)) return;

    const note = this.score.leadLick.find((entry) => entry.eighthInBar === eighth);
    if (!note) return;

    const freq = noteFrequency(note.note);
    this.leadOsc.frequency.setValueAtTime(freq, time);

    this.leadGain.gain.cancelScheduledValues(time);
    this.leadGain.gain.setValueAtTime(0.0001, time);
    this.leadGain.gain.exponentialRampToValueAtTime(MusicPlayer.LEAD_GAIN, time + MusicPlayer.LEAD_ATTACK_SECONDS);
    this.leadGain.gain.setTargetAtTime(0.0001, time + MusicPlayer.LEAD_ATTACK_SECONDS, MusicPlayer.LEAD_DECAY_TIME_CONSTANT);
  }

  /** Ramps the master send to silence, stops the scheduler, then tears the
   * graph down. Safe to call twice. */
  stop(): void {
    if (this.stopped) return;
    this.stopped = true;

    if (this.schedulerId !== null) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }

    if (this.context.state === 'closed') return;

    const now = this.context.currentTime;
    this.masterGain.gain.setTargetAtTime(0, now, MusicPlayer.STOP_TIME_CONSTANT);

    const settleSeconds = MusicPlayer.STOP_TIME_CONSTANT * MusicPlayer.STOP_SETTLE_TIME_CONSTANTS;
    setTimeout(() => {
      try {
        this.rhythmOsc1.stop();
        this.rhythmOsc2.stop();
        this.bassOsc.stop();
        this.leadOsc.stop();
        for (const { osc } of this.kickPool) osc.stop();
      } catch {
        /* Already stopped or the context closed underneath us — nothing to do. */
      }

      this.rhythmWaveshaper.disconnect();
      this.rhythmFilter.disconnect();
      this.rhythmGain.disconnect();
      this.bassFilter.disconnect();
      this.bassGain.disconnect();
      this.snareFilter.disconnect();
      this.snareGain.disconnect();
      this.hatFilter.disconnect();
      this.hatGain.disconnect();
      for (const { gain } of this.kickPool) gain.disconnect();
      this.leadGain.disconnect();
      this.masterGain.disconnect();
    }, settleSeconds * 1000);
  }

  /** Mutes or unmutes without stopping the scheduler — the loop keeps
   * running silently so unmuting resumes in place rather than restarting. */
  setMuted(muted: boolean): void {
    if (!this.isUsable()) return;
    const now = this.context.currentTime;
    const target = muted ? 0 : MusicPlayer.MASTER_GAIN;
    this.masterGain.gain.setTargetAtTime(clampUnit(target), now, MusicPlayer.STOP_TIME_CONSTANT);
  }

  get isPlaying(): boolean {
    return this.started && !this.stopped;
  }

  /** Alias for `stop()`, kept as a distinct name so callers can express
   * "done with this instance forever" versus "pause the music". */
  destroy(): void {
    this.stop();
  }
}
