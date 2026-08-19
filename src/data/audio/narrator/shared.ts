/**
 * Shared narrator types. Line catalogs import this so EN / PT-BR stay aligned.
 */

export const NARRATOR_VOICES = ['echo', 'verse'] as const;
export type NarratorVoice = (typeof NARRATOR_VOICES)[number];

export const NARRATOR_LOCALES = ['en', 'pt-BR'] as const;
export type NarratorLocale = (typeof NARRATOR_LOCALES)[number];

export const DEFAULT_NARRATOR_LOCALE: NarratorLocale = 'en';

export const NARRATOR_LOCALE_VALUES = ['EN', 'PT-BR'] as const;
export type NarratorLocaleValue = (typeof NARRATOR_LOCALE_VALUES)[number];

export const NARRATOR_CATEGORY = {
  RACE_START: 'race-start',
  DAMAGE: 'damage',
  BOOST: 'boost',
  BANTER: 'banter',
  BEHIND: 'behind',
  WEAPONS: 'weapons',
  FINAL_LAP: 'final-lap',
  VICTORY: 'victory',
  SECOND: 'second',
  LAST: 'last',
} as const;
export type NarratorCategory = (typeof NARRATOR_CATEGORY)[keyof typeof NARRATOR_CATEGORY];

export interface NarratorLine {
  readonly id: string;
  readonly text: string;
  /** Orthography the TTS model reads — punctuation is performance, not grammar. */
  readonly speak: string;
  readonly category: NarratorCategory;
  /** Banter weight. Higher = scheduled more often. Default 1. */
  readonly weight: number;
}

/** Catchphrases Klyff locked — same ids in both locales. */
export const NARRATOR_LOCKED_IDS = [
  'porra-bruno-pronto',
  'thanner-roadmap',
  'caraio-thanner-vasco',
  'oxente-doido',
  'puta-merda-passou',
  'cu-travou',
  'eita-porrada',
] as const;

/** EN clips whose spoken text changed (rename + new lines). Regen with --force. */
export const NARRATOR_EN_REGEN_IDS = [
  'lok-thant-enzo',
  'holy-chimbeler',
  'chimbeeler',
  ...NARRATOR_LOCKED_IDS,
] as const;

export function isNarratorLocale(value: string): value is NarratorLocale {
  return (NARRATOR_LOCALES as readonly string[]).includes(value);
}

export function localeFromMenuValue(value: string): NarratorLocale {
  return value === 'PT-BR' ? 'pt-BR' : 'en';
}

export function menuValueFromLocale(locale: NarratorLocale): NarratorLocaleValue {
  return locale === 'pt-BR' ? 'PT-BR' : 'EN';
}

export function line(
  id: string,
  text: string,
  speak: string,
  category: NarratorCategory,
  weight = 1,
): NarratorLine {
  return { id, text, speak, category, weight };
}
