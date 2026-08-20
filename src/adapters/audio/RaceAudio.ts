import { isAudioMuted, onAudioMuteChange, setAudioMuted } from './AudioPrefs.ts';
import { BedPlayer } from './BedPlayer.ts';
import { pickLoadedMusicBed } from './BedRegistry.ts';
import { musicBedUrl } from '../../data/audio/MusicBeds.ts';
import type { PlannedClip } from '../../data/audio/NarratorBank.ts';
import type { NarratorPriority } from '../../domain/audio/NarratorQueue.ts';
import { BrakeVoice } from './BrakeVoice.ts';
import { EngineGearbox } from './EngineGearbox.ts';
import {
  ENGINE_IDLE_SHUTOFF_INITIAL,
  ENGINE_IDLE_SHUTOFF_PARKED,
  tickEngineIdleShutoff,
  type EngineIdleShutoffState,
} from './EngineIdleShutoff.ts';
import { EngineVoice } from './EngineVoice.ts';
import { ExplosionVoice } from './ExplosionVoice.ts';
import { ImpactVoice } from './ImpactVoice.ts';
import { MusicPlayer } from './MusicPlayer.ts';
import type { MusicScore } from './MusicScore.ts';
import { NarratorPlayer } from './NarratorPlayer.ts';
import { NoiseSource } from './NoiseSource.ts';
import { SkidVoice } from './SkidVoice.ts';
import type { InputCommand } from '../../domain/input/InputCommand.ts';
import { TARMAC, driftThreshold } from '../../domain/vehicle/ArcadeCarPhysics.ts';
import type { VehicleTelemetry } from '../../domain/vehicle/Vehicle.ts';
import type { VehicleStats } from '../../domain/vehicle/VehicleStats.ts';

/** Master volume. Conservative: this is a game people play with headphones on. */
const DEFAULT_MASTER_VOLUME = 0.35;

/** Music send level, quieter than the title screen's since it now shares the
 * mix with engine, tyres and impacts. */
const MUSIC_VOLUME = 0.4;

/**
 * Lateral speed, as a multiple of the car's drift threshold, at which the skid is
 * silent and at which it is at full volume. The tyres start complaining slightly
 * before they let go, which is why the low end is below 1.
 */
const SKID_SILENT_AT = 0.5;
const SKID_FULL_AT = 2;

/**
 * The single voice of the car, driven entirely by simulation telemetry.
 *
 * Engine, tyres and impacts are synthesised. Music beds and the narrator are
 * recorded files. The facade exists so the race scene never touches an
 * `AudioNode`: it hands over telemetry and planned voice cues, and this class
 * decides what that should sound like.
 *
 * All of it is a no-op when the browser refuses to give us audio. `AudioContext`
 * starts suspended until a user gesture, and some environments have no audio device
 * at all (the headless browser used to screenshot this game, for one), so nothing
 * here may ever throw into the game loop.
 */
export class RaceAudio {
  private readonly context: AudioContext | null;
  private readonly master: GainNode | null = null;
  private readonly gearbox = new EngineGearbox();
  private readonly engine: EngineVoice | null = null;
  private readonly skid: SkidVoice | null = null;
  private readonly brake: BrakeVoice | null = null;
  private readonly impact: ImpactVoice | null = null;
  private readonly explosion: ExplosionVoice | null = null;
  private readonly noise: NoiseSource | null = null;
  private readonly musicGain: GainNode | null = null;
  private readonly music: MusicPlayer | null = null;
  private readonly bed: BedPlayer | null = null;
  private readonly narrator = new NarratorPlayer();
  private readonly driftLimit: number;
  private readonly baseMasterVolume: number;
  private engineSilenced = false;
  private idleShutoff: EngineIdleShutoffState = ENGINE_IDLE_SHUTOFF_INITIAL;
  private muted = isAudioMuted();
  private lastRpmFraction = 0.15;
  private readonly unmuteFocus: () => void;

  /**
   * `score` is the current world's theme (T-040) — optional so tests and any
   * caller that has not resolved a planet yet still get a working SFX rig.
   * It plays through its own gain, not `master`, so it can be muted/mixed
   * independently of the car's engine/tyre/impact voices.
   */
  constructor(stats: VehicleStats, score?: MusicScore, masterVolume: number = DEFAULT_MASTER_VOLUME) {
    // Reference the TARMAC threshold rather than the current surface: this only
    // scales how loud a slide is, and a scale that changed as the car crossed onto
    // dirt would make the skid jump in volume for no audible reason.
    this.driftLimit = driftThreshold(stats, TARMAC);
    this.baseMasterVolume = masterVolume;

    this.context = createAudioContext();
    this.unmuteFocus = onAudioMuteChange(muted => {
      this.applyMute(muted);
    });
    if (this.context === null) return;

    this.master = this.context.createGain();
    this.master.gain.value = masterVolume;
    this.master.connect(this.context.destination);

    this.noise = new NoiseSource(this.context);
    this.engine = new EngineVoice(this.context, this.master);
    this.skid = new SkidVoice(this.context, this.noise, this.master);
    this.brake = new BrakeVoice(this.context, this.noise, this.master);
    this.impact = new ImpactVoice(this.context, this.master);
    this.explosion = new ExplosionVoice(this.context, this.noise, this.master);

    const bed = pickLoadedMusicBed();
    if (bed !== undefined) {
      this.bed = new BedPlayer(musicBedUrl(bed));
      this.bed.setMuted(this.muted);
    } else if (score !== undefined) {
      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = MUSIC_VOLUME;
      this.musicGain.connect(this.context.destination);
      this.music = new MusicPlayer(this.context, this.noise, this.musicGain, score);
      this.music.setMuted(this.muted);
    }
    this.narrator.setMuted(this.muted);
  }

  /** Preload the clips this race already rolled so GO does not hitch. */
  armNarrator(clips: readonly PlannedClip[]): void {
    this.narrator.preload(clips);
  }

  enqueueNarrator(clip: PlannedClip, priority: NarratorPriority): void {
    this.narrator.enqueue(clip, priority);
  }

  /** True when the browser gave us a working audio graph. */
  get available(): boolean {
    return this.context !== null;
  }

  /**
   * Must be called from a real user gesture (a key press), because browsers start
   * every `AudioContext` suspended and silently ignore anything played until then.
   * Safe to call repeatedly — the scene calls it on every key press until it takes.
   */
  resume(): void {
    this.bed?.start();
    if (this.context === null || this.context.state !== 'suspended') return;
    void this.context.resume().catch(() => {
      /* Autoplay policy or no device: stay silent rather than break the game. */
    });
    this.noise?.start();
    this.music?.start();
  }

  /** Cuts the engine/tyre voices without tearing the graph down (quit race). */
  silenceEngine(): void {
    this.engineSilenced = true;
    this.lastRpmFraction = 0.15;
    this.engine?.silence();
    this.skid?.update(0);
    this.brake?.update(0, 0);
  }

  /** Scales the SFX master; 0.7 is the quit-race duck. */
  setMasterScale(scale: number): void {
    const next = Number.isFinite(scale) && scale > 0 ? scale : 1;
    if (this.master === null || this.context === null) return;
    this.master.gain.setTargetAtTime(
      this.baseMasterVolume * next,
      this.context.currentTime,
      0.08,
    );
  }

  /**
   * Live gearbox reading for the analog tach. Ticks even when muted or when the
   * browser gave us no AudioContext — the needle is presentation, not a voice.
   */
  get rpmFraction(): number {
    return this.lastRpmFraction;
  }

  /** Feeds one rendered frame of simulation state to every voice. */
  update(
    telemetry: VehicleTelemetry,
    input: InputCommand,
    maxSpeed: number,
    deltaSeconds: number = 0,
  ): void {
    // Reverse drives the engine exactly like throttle does: the driver is asking
    // for power either way, and the gearbox already reports reverse as gear 0.
    const drive = Math.max(input.throttle, input.reverse);
    this.idleShutoff = tickEngineIdleShutoff(
      this.idleShutoff,
      telemetry.speed,
      drive,
      deltaSeconds,
    );

    const gear = this.gearbox.update(telemetry.forwardSpeed, maxSpeed);
    this.lastRpmFraction =
      this.engineSilenced || this.idleShutoff.shutOff ? 0.15 : gear.rpmFraction;

    if (this.context === null || this.muted) return;

    if (this.engineSilenced || this.idleShutoff.shutOff) {
      this.engine?.silence();
    } else {
      this.engine?.update(gear.rpmFraction, drive, drive);
      if (gear.shifted) this.engine?.shift();
    }

    this.skid?.update(this.skidIntensity(telemetry));

    const pace = maxSpeed > 0 ? Math.min(1, Math.abs(telemetry.forwardSpeed) / maxSpeed) : 0;
    this.brake?.update(input.brake, pace);
  }

  /** A wall scrape or hit. `impactSpeed` comes straight from `resolveWallContact`. */
  playImpact(impactSpeed: number, maxSpeed: number): void {
    if (this.context === null || this.muted || maxSpeed <= 0) return;
    this.impact?.play(Math.min(1, impactSpeed / (maxSpeed * 0.5)));
  }

  /** Wooden crate smash — brighter, shorter thump than a body panel. */
  playCrateHit(): void {
    if (this.context === null || this.muted) return;
    this.impact?.play(0.7, 'wood');
  }

  /** Gasoline drum body hit, before the explosion voice. */
  playDrumHit(): void {
    if (this.context === null || this.muted) return;
    this.impact?.play(0.9, 'metal');
  }

  /**
   * A car has been destroyed. `intensity` 0..1 carries how close it was: the player's
   * own wreck is full volume, an NPC blowing up across the circuit is quieter, so the
   * mix says whose race just ended.
   */
  playExplosion(intensity: number): void {
    if (this.context === null || this.muted) return;
    this.explosion?.play(intensity);
  }

  /** Player mute (M / pause). Focus mute is applied separately. */
  setMuted(muted: boolean): void {
    setAudioMuted(muted);
    this.applyMute(isAudioMuted());
  }

  private applyMute(muted: boolean): void {
    this.muted = muted;
    this.bed?.setMuted(muted);
    this.music?.setMuted(muted);
    this.narrator.setMuted(muted);
    if (!muted) return;
    this.engine?.silence();
    this.skid?.update(0);
    this.brake?.update(0, 0);
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** True once the idle timer has cut the motor; clears on throttle or {@link clearIdleShutoff}. */
  get isEngineIdleShutOff(): boolean {
    return this.idleShutoff.shutOff;
  }

  /** Reset the idle clock without touching mute/quit state (camera hopped to another car). */
  clearIdleShutoff(): void {
    this.idleShutoff = ENGINE_IDLE_SHUTOFF_INITIAL;
  }

  /**
   * Kill the rumble without the quit-race latch. Wrecks, parked finishers and
   * a camera on nobody still hop back to a live motor when focus changes.
   */
  parkEngine(): void {
    this.idleShutoff = ENGINE_IDLE_SHUTOFF_PARKED;
    this.lastRpmFraction = 0.15;
    this.engine?.silence();
  }

  /** Silences the car without stopping the context, e.g. on respawn. */
  reset(): void {
    this.gearbox.reset();
    this.lastRpmFraction = 0.15;
    this.idleShutoff = ENGINE_IDLE_SHUTOFF_INITIAL;
    this.engineSilenced = false;
    this.skid?.update(0);
    this.brake?.update(0, 0);
    this.narrator.reset();
  }

  destroy(): void {
    this.unmuteFocus();
    this.engine?.stop();
    this.skid?.stop();
    this.brake?.stop();
    this.impact?.stop();
    this.explosion?.destroy();
    this.bed?.stop();
    this.music?.destroy();
    this.narrator.destroy();
    this.noise?.stop();
    void this.context?.close().catch(() => {
      /* Already closed. Nothing to do and nothing worth reporting. */
    });
  }

  /**
   * How loudly the tyres should complain, 0..1.
   *
   * Scaled by the car's own drift threshold rather than by an absolute speed, so a
   * low-grip car screeches where a high-grip car is still quiet — the sound then
   * carries the same information the handling model does.
   */
  private skidIntensity(telemetry: VehicleTelemetry): number {
    if (this.driftLimit <= 0) return 0;
    const slipRatio = Math.abs(telemetry.lateralSpeed) / this.driftLimit;
    const normalized = (slipRatio - SKID_SILENT_AT) / (SKID_FULL_AT - SKID_SILENT_AT);
    return Math.max(0, Math.min(1, normalized));
  }
}

/**
 * Returns null instead of throwing when the environment has no Web Audio at all.
 * A missing audio device must cost the player their sound, never their game.
 */
function createAudioContext(): AudioContext | null {
  try {
    if (typeof AudioContext === 'undefined') return null;
    return new AudioContext();
  } catch {
    return null;
  }
}
