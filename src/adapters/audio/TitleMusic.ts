import type { NoiseSource } from './NoiseSource.ts';

/** One step of the title screen riff progression. */
export interface RiffStep {
  note: string;
  beats: number;
  accent: boolean;
}

/** One step of the drum pattern within a single bar. */
export interface DrumStep {
  kick: boolean;
  snare: boolean;
  hat: boolean;
}

/** 16-bar 80s punk/metal progression in E minor. Each step is 4 beats (one bar);
 * total 16 bars × 4 beats = 64 beats. Hook-driven: Em Em G D repeats twice with
 * variation on the third iteration, then resolves to B Em. */
export const RIFF: readonly RiffStep[] = [
  { note: 'E3', beats: 4, accent: false },
  { note: 'E3', beats: 4, accent: true },
  { note: 'G3', beats: 4, accent: false },
  { note: 'D3', beats: 4, accent: false },
  { note: 'E3', beats: 4, accent: true },
  { note: 'C3', beats: 4, accent: false },
  { note: 'D3', beats: 4, accent: false },
  { note: 'D3', beats: 4, accent: false },
  { note: 'E3', beats: 4, accent: true },
  { note: 'E3', beats: 4, accent: false },
  { note: 'G3', beats: 4, accent: false },
  { note: 'D3', beats: 4, accent: true },
  { note: 'E3', beats: 4, accent: false },
  { note: 'C3', beats: 4, accent: false },
  { note: 'B2', beats: 4, accent: true },
  { note: 'E3', beats: 4, accent: false },
];

/** One bar of 4/4 in eight eighth-note steps. Snare on 2 and 4, hats throughout,
 * syncopated kick for energy. */
export const DRUM_PATTERN: readonly DrumStep[] = [
  { kick: true, snare: false, hat: true },
  { kick: false, snare: false, hat: true },
  { kick: false, snare: true, hat: true },
  { kick: false, snare: false, hat: true },
  { kick: true, snare: false, hat: true },
  { kick: true, snare: false, hat: true },
  { kick: false, snare: true, hat: true },
  { kick: false, snare: false, hat: true },
];

/** Convert a note name (e.g. 'E3', 'A#4', 'Bb2') to frequency in Hz using equal
 * temperament with A4 = 440 Hz as reference. Throws on invalid input. */
export function noteFrequency(name: string): number {
  const match = name.match(/^([A-G])([#b]?)(-?\d+)$/);
  if (!match) throw new Error(`Invalid note: ${name}`);

  const [, noteLetter, accidental, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);

  const noteValues: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };

  let value = noteValues[noteLetter];
  if (accidental === '#') value += 1;
  else if (accidental === 'b') value -= 1;

  const midi = octave * 12 + 12 + value;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Convert a number of beats to seconds at the given tempo in BPM. */
export function beatsToSeconds(beats: number, bpm: number): number {
  return (beats * 60) / bpm;
}

/** Sum all beats in a riff. */
export function totalBeats(steps: readonly RiffStep[]): number {
  return steps.reduce((sum, step) => sum + step.beats, 0);
}

/**
 * Looping 80s punk/metal title screen instrumental synthesised with Web Audio API.
 * Rhythm guitar (detuned saws + waveshaper + lowpass), bass (saw + lowpass),
 * and drums (sine kick sweep, noise snare/hat). All voices loop the 16-bar RIFF
 * in E minor at 172 BPM. Look-ahead scheduler ensures tight scheduling.
 */
export class TitleMusic {
  private readonly context: AudioContext;
  private readonly noise: NoiseSource;

  // Master and submix gains
  private readonly masterGain: GainNode;
  private readonly rhythmGain: GainNode;
  private readonly bassGain: GainNode;
  private readonly drumsGain: GainNode;

  // Rhythm guitar: two detuned saws through waveshaper and lowpass
  private readonly rhythmOsc1: OscillatorNode;
  private readonly rhythmOsc2: OscillatorNode;
  private readonly rhythmWaveshaper: WaveShaperNode;
  private readonly rhythmFilter: BiquadFilterNode;

  // Bass: saw one octave below root through lowpass
  private readonly bassOsc: OscillatorNode;
  private readonly bassFilter: BiquadFilterNode;

  // Drum voices: shared noise split to snare (bandpass) and hat (highpass),
  // plus pool of sine oscillators for kick sweeps
  private readonly snareFilter: BiquadFilterNode;
  private readonly snareGain: GainNode;
  private readonly hatFilter: BiquadFilterNode;
  private readonly hatGain: GainNode;
  private readonly kickOscPool: { osc: OscillatorNode; gain: GainNode }[] = [];

  private started = false;
  private stopped = false;
  private schedulerId: NodeJS.Timeout | null = null;

  // Playback state: which beat we just scheduled, used to avoid re-scheduling
  private lastScheduledBeat = -Infinity;

  private static readonly BPM = 172;
  private static readonly RHYTHM_DETUNE_CENTS = 8;
  private static readonly RHYTHM_FILTER_HZ = 3000;
  private static readonly BASS_FILTER_HZ = 400;
  private static readonly SNARE_CENTER_HZ = 1800;
  private static readonly SNARE_Q = 2;
  private static readonly HAT_CUTOFF_HZ = 8000;
  private static readonly KICK_START_HZ = 120;
  private static readonly KICK_END_HZ = 45;
  private static readonly KICK_SWEEP_DURATION_S = 0.1;
  private static readonly SCHEDULER_INTERVAL_MS = 25;
  private static readonly LOOK_AHEAD_MS = 200;
  private static readonly KICK_POOL_SIZE = 3;
  private static readonly MASTER_GAIN_SCALE = 0.5;
  private static readonly RHYTHM_VOICE_GAIN = 0.3;
  private static readonly BASS_VOICE_GAIN = 0.25;
  private static readonly DRUMS_VOICE_GAIN = 0.2;

  constructor(context: AudioContext, noise: NoiseSource, destination: AudioNode) {
    this.context = context;
    this.noise = noise;

    // Master gain chain
    this.masterGain = context.createGain();
    this.masterGain.gain.value = TitleMusic.MASTER_GAIN_SCALE;
    this.masterGain.connect(destination);

    // Rhythm guitar setup
    this.rhythmOsc1 = context.createOscillator();
    this.rhythmOsc1.type = 'sawtooth';

    this.rhythmOsc2 = context.createOscillator();
    this.rhythmOsc2.type = 'sawtooth';
    this.rhythmOsc2.detune.value = TitleMusic.RHYTHM_DETUNE_CENTS;

    this.rhythmWaveshaper = context.createWaveShaper();
    this.rhythmWaveshaper.curve = this.createTanhCurve(4096) as Float32Array<ArrayBuffer>;

    this.rhythmFilter = context.createBiquadFilter();
    this.rhythmFilter.type = 'lowpass';
    this.rhythmFilter.frequency.value = TitleMusic.RHYTHM_FILTER_HZ;
    this.rhythmFilter.Q.value = 1;

    this.rhythmGain = context.createGain();
    this.rhythmGain.gain.value = TitleMusic.RHYTHM_VOICE_GAIN;

    this.rhythmOsc1.connect(this.rhythmWaveshaper);
    this.rhythmOsc2.connect(this.rhythmWaveshaper);
    this.rhythmWaveshaper.connect(this.rhythmFilter);
    this.rhythmFilter.connect(this.rhythmGain);
    this.rhythmGain.connect(this.masterGain);

    // Bass setup
    this.bassOsc = context.createOscillator();
    this.bassOsc.type = 'sawtooth';

    this.bassFilter = context.createBiquadFilter();
    this.bassFilter.type = 'lowpass';
    this.bassFilter.frequency.value = TitleMusic.BASS_FILTER_HZ;
    this.bassFilter.Q.value = 1;

    this.bassGain = context.createGain();
    this.bassGain.gain.value = TitleMusic.BASS_VOICE_GAIN;

    this.bassOsc.connect(this.bassFilter);
    this.bassFilter.connect(this.bassGain);
    this.bassGain.connect(this.masterGain);

    // Drums setup
    this.snareFilter = context.createBiquadFilter();
    this.snareFilter.type = 'bandpass';
    this.snareFilter.frequency.value = TitleMusic.SNARE_CENTER_HZ;
    this.snareFilter.Q.value = TitleMusic.SNARE_Q;

    this.snareGain = context.createGain();
    this.snareGain.gain.value = 0;

    this.hatFilter = context.createBiquadFilter();
    this.hatFilter.type = 'highpass';
    this.hatFilter.frequency.value = TitleMusic.HAT_CUTOFF_HZ;
    this.hatFilter.Q.value = 0.5;

    this.hatGain = context.createGain();
    this.hatGain.gain.value = 0;

    this.drumsGain = context.createGain();
    this.drumsGain.gain.value = TitleMusic.DRUMS_VOICE_GAIN;

    this.noise.start();
    this.noise.connect(this.snareFilter);
    this.snareFilter.connect(this.snareGain);
    this.snareGain.connect(this.drumsGain);

    this.noise.connect(this.hatFilter);
    this.hatFilter.connect(this.hatGain);
    this.hatGain.connect(this.drumsGain);

    this.drumsGain.connect(this.masterGain);

    // Kick oscillator pool
    for (let i = 0; i < TitleMusic.KICK_POOL_SIZE; i++) {
      const osc = context.createOscillator();
      osc.type = 'sine';
      const gain = context.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.drumsGain);
      this.kickOscPool.push({ osc, gain });
    }
  }

  private createTanhCurve(length: number): Float32Array {
    const curve = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      const x = (i / length) * 2 - 1;
      curve[i] = x * (1 + 0.5 * x * x) / (1 + 1.5 * x * x);
    }
    return curve;
  }

  private isUsable(): boolean {
    return this.context.state !== 'closed' && !this.stopped;
  }

  /** Start playback. Idempotent. */
  start(): void {
    if (this.started || !this.isUsable()) return;
    this.started = true;

    this.rhythmOsc1.start();
    this.rhythmOsc2.start();
    this.bassOsc.start();
    this.kickOscPool.forEach(({ osc }) => osc.start());

    this.schedulerId = setInterval(() => {
      this.scheduleNotes();
    }, TitleMusic.SCHEDULER_INTERVAL_MS);

    this.scheduleNotes();
  }

  /** Schedule riff and drum notes within the look-ahead window. */
  private scheduleNotes(): void {
    if (!this.isUsable()) return;

    const now = this.context.currentTime;
    const lookAheadSeconds = TitleMusic.LOOK_AHEAD_MS / 1000;
    const scheduleUntil = now + lookAheadSeconds;

    const loopBeatCount = totalBeats(RIFF);
    const beatDuration = beatsToSeconds(1, TitleMusic.BPM);

    let currentBeat = this.lastScheduledBeat + beatDuration;

    for (let i = 0; i < RIFF.length + DRUM_PATTERN.length; i++) {
      const riffIndex = i % RIFF.length;
      const riffStep = RIFF[riffIndex];
      const riffStartBeat = riffIndex * 4;
      const beatInLoop = (currentBeat % loopBeatCount + riffStartBeat) % loopBeatCount;

      if (beatInLoop + beatDuration > loopBeatCount) break;

      const scheduleTime = now + (beatDuration * 0.5);
      if (scheduleTime > scheduleUntil) break;

      this.scheduleRiffNote(riffStep, scheduleTime);

      const drumIndex = Math.floor(beatInLoop / (loopBeatCount / DRUM_PATTERN.length)) % DRUM_PATTERN.length;
      this.scheduleDrumNote(DRUM_PATTERN[drumIndex], scheduleTime);

      currentBeat += beatDuration;
    }

    this.lastScheduledBeat = currentBeat;
  }

  /** Schedule a single riff step starting at the given time. */
  private scheduleRiffNote(step: RiffStep, time: number): void {
    try {
      const freq = noteFrequency(step.note);
      const freqLower = freq / 2;

      const now = this.context.currentTime;
      const scheduleTime = Math.max(now, time);

      this.rhythmOsc1.frequency.setValueAtTime(freq, scheduleTime);
      this.rhythmOsc2.frequency.setValueAtTime(freq, scheduleTime);
      this.bassOsc.frequency.setValueAtTime(freqLower, scheduleTime);
    } catch {
      // Invalid note name; skip
    }
  }

  /** Schedule drum events at the given time. */
  private scheduleDrumNote(step: DrumStep, time: number): void {
    const now = this.context.currentTime;
    const scheduleTime = Math.max(now, time);

    if (step.kick) {
      this.scheduleKickSweep(scheduleTime);
    }

    if (step.snare) {
      this.snareGain.gain.setValueAtTime(0.4, scheduleTime);
      this.snareGain.gain.setTargetAtTime(0, scheduleTime + 0.05, 0.05);
    }

    if (step.hat) {
      this.hatGain.gain.setValueAtTime(0.2, scheduleTime);
      this.hatGain.gain.setTargetAtTime(0, scheduleTime + 0.03, 0.03);
    }
  }

  /** Schedule a kick sweep on the next available oscillator from the pool. */
  private scheduleKickSweep(time: number): void {
    const now = this.context.currentTime;
    const scheduleTime = Math.max(now, time);
    const endTime = scheduleTime + TitleMusic.KICK_SWEEP_DURATION_S;

    const poolEntry = this.kickOscPool[Math.floor(time * 1000) % this.kickOscPool.length];
    const osc = poolEntry.osc;
    const gainNode = poolEntry.gain;

    osc.frequency.setValueAtTime(TitleMusic.KICK_START_HZ, scheduleTime);
    osc.frequency.exponentialRampToValueAtTime(TitleMusic.KICK_END_HZ, endTime);

    gainNode.gain.setValueAtTime(0.6, scheduleTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);
  }

  /** Stop playback, ramp down, and clean up. */
  stop(): void {
    if (this.stopped) return;
    this.stopped = true;

    if (this.schedulerId !== null) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }

    if (!this.isUsable()) return;

    const now = this.context.currentTime;
    this.masterGain.gain.setTargetAtTime(0, now, 0.05);

    setTimeout(() => {
      if (this.context.state !== 'closed') {
        this.rhythmFilter.disconnect();
        this.rhythmGain.disconnect();
        this.bassFilter.disconnect();
        this.bassGain.disconnect();
        this.snareGain.disconnect();
        this.hatGain.disconnect();
        this.drumsGain.disconnect();
        this.masterGain.disconnect();
      }
    }, 250);
  }

  /** Mute or unmute without stopping. */
  setMuted(muted: boolean): void {
    if (!this.isUsable()) return;
    this.masterGain.gain.setValueAtTime(muted ? 0 : TitleMusic.MASTER_GAIN_SCALE, this.context.currentTime);
  }

  /** Check if playback is active. */
  get isPlaying(): boolean {
    return this.started && !this.stopped;
  }

  /** Destroy the player and clean up resources. */
  destroy(): void {
    this.stop();
  }
}
