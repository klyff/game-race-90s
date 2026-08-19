import {
  narratorClipUrl,
  narratorLabDirectory,
  narratorStashDirectory,
  resolveNarratorClip,
  type NarratorVoice,
} from '../../data/audio/NarratorBank.ts';
import { isAudioMuted } from './AudioPrefs.ts';
import { ExplosionVoice } from './ExplosionVoice.ts';
import { NoiseSource } from './NoiseSource.ts';

/** Long enough for the crack and the shout to land on the splash void. */
export const SPLASH_KICK_DURATION_SECONDS = 1.15;

/** Metal shout over the boom — same take the race uses. */
export const SPLASH_KICK_LINE = 'boooom';
export const SPLASH_KICK_VOICE: NarratorVoice = 'echo';

const SHOUT_VOLUME = 0.86;

/**
 * Space on the splash: car explosion plus the narrator yelling BOOOOM.
 * Own graph and HTMLAudio so the title bed can die without killing the kick.
 */
export function playSplashKick(): number {
  if (isAudioMuted()) {
    return 0;
  }
  playExplosion();
  playShout();
  return SPLASH_KICK_DURATION_SECONDS;
}

function playExplosion(): void {
  const context = createContext();
  if (context === null) {
    return;
  }
  if (context.state === 'suspended') {
    void context.resume().catch(() => {
      /* Gesture already happened; stay silent if the device refuses. */
    });
  }
  const master = context.createGain();
  master.gain.value = 0.88;
  master.connect(context.destination);
  const noise = new NoiseSource(context);
  noise.start();
  const voice = new ExplosionVoice(context, noise, master);
  voice.play(1);
  window.setTimeout(() => {
    voice.destroy();
    noise.stop();
    void context.close().catch(() => {
      /* Already closed. */
    });
  }, 1600);
}

function playShout(): void {
  const planned = { lineId: SPLASH_KICK_LINE, voice: SPLASH_KICK_VOICE };
  const clip = resolveNarratorClip(planned);
  if (clip === undefined) {
    return;
  }
  const element = new Audio();
  element.preload = 'auto';
  element.volume = SHOUT_VOLUME;
  element.src = narratorClipUrl(clip, narratorStashDirectory());
  const tryLab = (): void => {
    element.removeEventListener('error', tryLab);
    if (element.src.includes(narratorLabDirectory())) {
      return;
    }
    element.src = narratorClipUrl(clip, narratorLabDirectory());
    void element.play().catch(() => {
      /* Missing take: boom still plays. */
    });
  };
  element.addEventListener('error', tryLab);
  void element.play().catch(tryLab);
}

function createContext(): AudioContext | null {
  try {
    if (typeof AudioContext === 'undefined') {
      return null;
    }
    return new AudioContext();
  } catch {
    return null;
  }
}
