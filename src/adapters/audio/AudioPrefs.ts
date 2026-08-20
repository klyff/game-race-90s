/**
 * Session-wide mute and narrator locale.
 * Splash, results, pause and race all read the same flags.
 * Locale persists in localStorage; mute stays in memory for the tab.
 *
 * Two mute layers: the player's M key / pause menu, and window/tab focus.
 * Effective mute is OR. Restoring focus never clears a user mute.
 */

import {
  DEFAULT_NARRATOR_LOCALE,
  isNarratorLocale,
  type NarratorLocale,
} from '../../data/audio/narrator/shared.ts';

const LOCALE_KEY = 'race90s.narratorLocale';

let userMuted = false;
let focusMuted = false;
const listeners = new Set<(muted: boolean) => void>();

let locale: NarratorLocale = readStoredLocale();

export function isAudioMuted(): boolean {
  return userMuted || focusMuted;
}

export function isUserAudioMuted(): boolean {
  return userMuted;
}

export function isFocusAudioMuted(): boolean {
  return focusMuted;
}

/** Player mute (M key / pause). Does not touch focus mute. */
export function setAudioMuted(next: boolean): void {
  userMuted = next === true;
  notifyMute();
}

/** Tab hidden or window blurred. Does not touch the player's mute. */
export function setFocusMuted(next: boolean): void {
  focusMuted = next === true;
  notifyMute();
}

export function onAudioMuteChange(callback: (muted: boolean) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notifyMute(): void {
  const muted = isAudioMuted();
  for (const listener of listeners) {
    listener(muted);
  }
}

export function getNarratorLocale(): NarratorLocale {
  return locale;
}

export function setNarratorLocale(next: NarratorLocale): void {
  locale = next;
  persistLocale(next);
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readStoredLocale(): NarratorLocale {
  const store = storage();
  if (store === null) {
    return DEFAULT_NARRATOR_LOCALE;
  }
  try {
    const raw = store.getItem(LOCALE_KEY);
    return raw !== null && isNarratorLocale(raw) ? raw : DEFAULT_NARRATOR_LOCALE;
  } catch {
    return DEFAULT_NARRATOR_LOCALE;
  }
}

function persistLocale(next: NarratorLocale): void {
  const store = storage();
  if (store === null) {
    return;
  }
  try {
    store.setItem(LOCALE_KEY, next);
  } catch {
    // best-effort
  }
}
