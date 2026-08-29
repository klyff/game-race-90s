import { isAudioMuted } from './AudioPrefs.ts';
import {
  GUITAR_SOLO_STING,
  ROCK_SCREAM_STING,
  screenStingUrl,
  type ScreenSting,
} from '../../data/audio/ScreenStings.ts';

/** How long the transition solo rings, seconds. Matches the recorded MP3. */
export const GUITAR_SOLO_DURATION_SECONDS = GUITAR_SOLO_STING.durationSeconds;

/** Rock scream length — slot / face confirm and world-pass open. */
export const ROCK_SCREAM_DURATION_SECONDS = ROCK_SCREAM_STING.durationSeconds;

/**
 * Wait before leaving splash after the guitar solo.
 * Solo is longer than the scream.
 */
export const TRANSITION_STING_DURATION_SECONDS = GUITAR_SOLO_DURATION_SECONDS;

const STING_VOLUME = 0.62;
const SCREAM_VOLUME = 0.7;

/**
 * Bridge stings are NOT tied to {@link stopAllScreenAudio}: they must finish
 * across Splash → comic, Face → garage, Slot pick, and World Pass open.
 */
let activeElements: HTMLAudioElement[] = [];

function stopElements(): void {
  for (const element of activeElements) {
    element.pause();
    element.src = '';
  }
  activeElements = [];
}

export function stopGuitarSolo(): void {
  stopElements();
}

function playSting(sting: ScreenSting, volume: number): HTMLAudioElement | null {
  if (isAudioMuted()) {
    return null;
  }
  const element = new Audio(screenStingUrl(sting));
  element.preload = 'auto';
  element.volume = volume;
  activeElements.push(element);
  element.addEventListener(
    'ended',
    () => {
      activeElements = activeElements.filter(entry => entry !== element);
      element.src = '';
    },
    { once: true },
  );
  void element.play().catch(() => {
    /* Missing file or autoplay block: stay silent rather than break the transition. */
  });
  return element;
}

/**
 * ~3s recorded lead-guitar solo. Call from the splash enter gesture
 * (Space → origin comic).
 */
export function playGuitarSolo(): number {
  stopGuitarSolo();
  if (isAudioMuted()) {
    return 0;
  }
  playSting(GUITAR_SOLO_STING, STING_VOLUME);
  return GUITAR_SOLO_DURATION_SECONDS;
}

/**
 * AC/DC-style rock scream — face confirm, save-slot pick, world-pass open.
 * Does not stop a bed already playing under the UI.
 */
export function playRockScream(): number {
  if (isAudioMuted()) {
    return 0;
  }
  playSting(ROCK_SCREAM_STING, SCREAM_VOLUME);
  return ROCK_SCREAM_DURATION_SECONDS;
}

/**
 * World-pass hit: scream over the random rock bed already started by
 * {@link attachMenuAudio}. Returns scream length (bed keeps looping).
 */
export function playWorldPassFanfare(): number {
  return playRockScream();
}
