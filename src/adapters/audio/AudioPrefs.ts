/**
 * Session-wide mute and narrator locale.
 * Splash, results, pause and race all read the same flags.
 * Locale persists in localStorage; mute stays in memory for the tab.
 */

import {
  DEFAULT_NARRATOR_LOCALE,
  isNarratorLocale,
  type NarratorLocale,
} from '../../data/audio/narrator/shared.ts';

const LOCALE_KEY = 'race90s.narratorLocale';

let muted = false;
let locale: NarratorLocale = readStoredLocale();

export function isAudioMuted(): boolean {
  return muted;
}

export function setAudioMuted(next: boolean): void {
  muted = next;
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
