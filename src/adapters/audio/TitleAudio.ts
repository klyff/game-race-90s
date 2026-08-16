import { NoiseSource } from './NoiseSource.ts';
import { TitleMusic } from './TitleMusic.ts';

/**
 * How long to wait after `stop()` before closing the context, milliseconds.
 *
 * `TitleMusic.stop()` ramps its master send to silence and then tears its node graph
 * down from a timer, so closing the context immediately would pull the graph out from
 * under that pending teardown. This is comfortably longer than the ramp it schedules.
 */
const CLOSE_DELAY_MILLISECONDS = 600;

/**
 * The splash screen's audio, and the reason `TitleMusic` can finally be heard.
 *
 * `TitleMusic` takes an `AudioContext` rather than creating one, so somebody has to own
 * the context, the shared noise source and the lifetime of all three. `RaceAudio` does
 * exactly that job for the race; this is the same shape for the title, deliberately kept
 * as a separate small class instead of a flag on `RaceAudio` — the two play at different
 * times and share nothing but the convention.
 *
 * Two things here are not stylistic:
 *
 * **`start()` must be called from a real user gesture.** Browsers create every
 * `AudioContext` suspended and silently ignore a `resume()` that does not originate in
 * one, so a `start()` from `create()` produces no sound and no error. The splash calls
 * this on the first key press, which is the earliest honest opportunity.
 *
 * **The music connects straight to `context.destination`, with no attenuating gain of
 * its own.** `TitleMusic` already holds its own master gain, and the owner signed the
 * composition off at that loudness on the listening bench; inserting another gain here
 * would quietly change the thing that was approved.
 */
export class TitleAudio {
  private readonly context: AudioContext | null;
  private readonly noise: NoiseSource | null = null;
  private readonly music: TitleMusic | null = null;
  private muted = false;

  constructor() {
    this.context = createAudioContext();
    if (this.context === null) {
      return;
    }
    this.noise = new NoiseSource(this.context);
    this.music = new TitleMusic(this.context, this.noise, this.context.destination);
  }

  /** True when the browser gave us a working audio graph. */
  get available(): boolean {
    return this.context !== null;
  }

  get isPlaying(): boolean {
    return this.music?.isPlaying ?? false;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /**
   * Resumes the context and starts the loop. Safe to call on every key press: both the
   * resume and `TitleMusic.start()` are idempotent, which is what lets the caller wire
   * this to a bare `keydown` and stop worrying about which press was the first.
   */
  start(): void {
    if (this.context === null || this.music === null) {
      return;
    }
    if (this.context.state === 'suspended') {
      void this.context.resume().catch(() => {
        /* Autoplay policy or no device: stay silent rather than break the splash. */
      });
    }
    this.music.start();
  }

  /** Silences the loop without stopping it, so unmuting resumes in place. */
  setMuted(muted: boolean): void {
    this.muted = muted;
    this.music?.setMuted(muted);
  }

  toggleMute(): void {
    this.setMuted(!this.muted);
  }

  /**
   * Stops the music and releases the device.
   *
   * The splash MUST call this on scene shutdown. Nothing stops a Web Audio graph when a
   * Phaser scene ends, so without it the title riff plays straight over the race.
   */
  destroy(): void {
    this.music?.stop();
    this.noise?.stop();

    const context = this.context;
    if (context === null) {
      return;
    }
    setTimeout(() => {
      void context.close().catch(() => {
        /* Already closed. Nothing to do and nothing worth reporting. */
      });
    }, CLOSE_DELAY_MILLISECONDS);
  }
}

/**
 * Returns null instead of throwing when the environment has no Web Audio at all.
 * A missing audio device must cost the player their music, never their game.
 */
function createAudioContext(): AudioContext | null {
  try {
    if (typeof AudioContext === 'undefined') return null;
    return new AudioContext();
  } catch {
    return null;
  }
}
