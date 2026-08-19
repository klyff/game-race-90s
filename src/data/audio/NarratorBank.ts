/**
 * Arcade narrator lines, two voices, two locales, and the folders the clips live in.
 *
 * Echo and Verse both record every line. A race plan picks a voice per cue
 * so the same phrase does not always arrive in the same throat.
 *
 * `lab/` is where `npm run gen:voice-lab` writes. Keepers are copied to
 * `stash/` and that is what the race loads. The player looks in stash first
 * and falls back to lab so a fresh generate can be heard before the copy.
 *
 * Record later (needs OPENAI_API_KEY), do not run TTS at race time:
 *   npm run gen:voice-lab:pt
 *   npm run gen:voice-lab:en-new
 */

import { getNarratorLocale } from '../../adapters/audio/AudioPrefs.ts';
import { EN_NARRATOR_LINES } from './narrator/lines.en.ts';
import { PT_BR_NARRATOR_LINES } from './narrator/lines.pt-BR.ts';
import {
  DEFAULT_NARRATOR_LOCALE,
  NARRATOR_CATEGORY,
  NARRATOR_EN_REGEN_IDS,
  NARRATOR_LOCALES,
  NARRATOR_LOCALE_VALUES,
  NARRATOR_LOCKED_IDS,
  NARRATOR_VOICES,
  localeFromMenuValue,
  menuValueFromLocale,
  isNarratorLocale,
  type NarratorCategory,
  type NarratorLine,
  type NarratorLocale,
  type NarratorLocaleValue,
  type NarratorVoice,
} from './narrator/shared.ts';

export {
  DEFAULT_NARRATOR_LOCALE,
  NARRATOR_CATEGORY,
  NARRATOR_EN_REGEN_IDS,
  NARRATOR_LOCALES,
  NARRATOR_LOCALE_VALUES,
  NARRATOR_LOCKED_IDS,
  NARRATOR_VOICES,
  isNarratorLocale,
  localeFromMenuValue,
  menuValueFromLocale,
};
export type { NarratorCategory, NarratorLine, NarratorLocale, NarratorLocaleValue, NarratorVoice };

export interface NarratorClip {
  readonly lineId: string;
  readonly voice: NarratorVoice;
  readonly file: string;
  readonly text: string;
  readonly category: NarratorCategory;
}

export interface PlannedClip {
  readonly lineId: string;
  readonly voice: NarratorVoice;
}

const BANKS: Record<NarratorLocale, readonly NarratorLine[]> = {
  en: EN_NARRATOR_LINES,
  'pt-BR': PT_BR_NARRATOR_LINES,
};

/** English catalog — ids and categories match PT-BR. Prefer `narratorLines()`. */
export const NARRATOR_LINES: readonly NarratorLine[] = EN_NARRATOR_LINES;

export function narratorLines(locale: NarratorLocale = getNarratorLocale()): readonly NarratorLine[] {
  return BANKS[locale] ?? BANKS[DEFAULT_NARRATOR_LOCALE];
}

export function narratorStashDirectory(locale: NarratorLocale = getNarratorLocale()): string {
  return `assets/audio/narrator/${locale}/stash`;
}

export function narratorLabDirectory(locale: NarratorLocale = getNarratorLocale()): string {
  return `assets/audio/narrator/${locale}/lab`;
}

/** @deprecated Use narratorStashDirectory() — kept for existing imports. */
export const NARRATOR_STASH_DIRECTORY = narratorStashDirectory(DEFAULT_NARRATOR_LOCALE);
/** @deprecated Use narratorLabDirectory() — kept for existing imports. */
export const NARRATOR_LAB_DIRECTORY = narratorLabDirectory(DEFAULT_NARRATOR_LOCALE);

export function narratorLine(
  id: string,
  locale: NarratorLocale = getNarratorLocale(),
): NarratorLine | undefined {
  return narratorLines(locale).find(entry => entry.id === id);
}

export function linesInCategory(
  category: NarratorCategory,
  locale: NarratorLocale = getNarratorLocale(),
): readonly NarratorLine[] {
  return narratorLines(locale).filter(entry => entry.category === category);
}

export function narratorClipFile(voice: NarratorVoice, lineId: string): string {
  return `${voice}-${lineId}.mp3`;
}

export function resolveNarratorClip(
  planned: PlannedClip,
  locale: NarratorLocale = getNarratorLocale(),
): NarratorClip | undefined {
  const found = narratorLine(planned.lineId, locale);
  if (found === undefined) {
    return undefined;
  }
  return {
    lineId: found.id,
    voice: planned.voice,
    file: narratorClipFile(planned.voice, found.id),
    text: found.text,
    category: found.category,
  };
}

export function narratorClipUrl(clip: NarratorClip, directory: string = narratorStashDirectory()): string {
  return `${directory}/${clip.file}`;
}

export function narratorClipKey(
  planned: PlannedClip,
  locale: NarratorLocale = getNarratorLocale(),
): string {
  return `${locale}-${planned.voice}-${planned.lineId}`;
}

/** Banter also reuses the damage toast line — same recording, two triggers. */
export const BANTER_EXTRA_IDS = ['one-more-hit'] as const;

export function banterLines(locale: NarratorLocale = getNarratorLocale()): readonly NarratorLine[] {
  const extras = BANTER_EXTRA_IDS.map(id => narratorLine(id, locale)).filter(
    (entry): entry is NarratorLine => entry !== undefined,
  );
  return [...linesInCategory(NARRATOR_CATEGORY.BANTER, locale), ...extras];
}

export function pickNarratorVoice(random: () => number = Math.random): NarratorVoice {
  return NARRATOR_VOICES[Math.floor(random() * NARRATOR_VOICES.length)] ?? 'echo';
}

export function pickLineId(
  lines: readonly NarratorLine[],
  random: () => number = Math.random,
): string | undefined {
  if (lines.length === 0) {
    return undefined;
  }
  return lines[Math.floor(random() * lines.length)]?.id;
}
