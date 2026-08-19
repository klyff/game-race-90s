import { afterEach, describe, expect, it } from 'vitest';
import { getNarratorLocale, setAudioMuted, setNarratorLocale } from '../../src/adapters/audio/AudioPrefs.ts';
import {
  NARRATOR_CATEGORY,
  NARRATOR_EN_REGEN_IDS,
  NARRATOR_LINES,
  NARRATOR_LOCKED_IDS,
  NARRATOR_VOICES,
  localeFromMenuValue,
  menuValueFromLocale,
  narratorClipFile,
  narratorClipKey,
  narratorLabDirectory,
  narratorLine,
  narratorLines,
  narratorStashDirectory,
  pickNarratorVoice,
} from '../../src/data/audio/NarratorBank.ts';

afterEach(() => {
  setNarratorLocale('en');
  setAudioMuted(false);
});

describe('NarratorBank locales', () => {
  it('keeps the same ids and categories in EN and PT-BR', () => {
    const en = narratorLines('en');
    const pt = narratorLines('pt-BR');
    expect(en.map(line => line.id)).toEqual(pt.map(line => line.id));
    expect(en.map(line => line.category)).toEqual(pt.map(line => line.category));
    expect(en).toHaveLength(51);
    expect(new Set(en.map(line => line.id)).size).toBe(51);
  });

  it('records every line in both Echo and Verse', () => {
    expect(NARRATOR_VOICES).toEqual(['echo', 'verse']);
    expect(pickNarratorVoice(() => 0)).toBe('echo');
    expect(pickNarratorVoice(() => 0.9)).toBe('verse');
    expect(narratorClipFile('echo', 'engines-hot')).toBe('echo-engines-hot.mp3');
  });

  it('covers start, damage, boost, banter, behind, weapons, final lap and finish', () => {
    const categories = new Set(NARRATOR_LINES.map(line => line.category));
    expect([...categories].sort()).toEqual(Object.values(NARRATOR_CATEGORY).slice().sort());
    expect(NARRATOR_LINES.filter(line => line.category === NARRATOR_CATEGORY.RACE_START)).toHaveLength(6);
  });

  it('renames catchphrases to Thanner and Bruno in both locales', () => {
    expect(narratorLine('lok-thant-enzo', 'en')?.text).toContain('BRUNO');
    expect(narratorLine('holy-chimbeler', 'en')?.text).toContain('THANNER');
    expect(narratorLine('chimbeeler', 'en')?.text).toMatch(/THANN?EERRR/i);
    expect(narratorLine('lok-thant-enzo', 'pt-BR')?.text).toContain('BRUNO');
    expect(narratorLine('holy-chimbeler', 'pt-BR')?.text).toContain('THANNER');
    expect(narratorLine('chimbeeler', 'pt-BR')?.speak).toBe('THANNEERRR!!!');
  });

  it('locks Klyff catchphrases with weight 3', () => {
    for (const id of NARRATOR_LOCKED_IDS) {
      const en = narratorLine(id, 'en');
      const pt = narratorLine(id, 'pt-BR');
      expect(en?.weight).toBe(3);
      expect(pt?.weight).toBe(3);
      expect(en?.id).toBe(id);
    }
    expect(narratorLine('porra-bruno-pronto', 'pt-BR')?.text).toBe('PORRA BRUNO, TEM DE TA PRONTO!');
    expect(narratorLine('thanner-roadmap', 'pt-BR')?.text).toBe('THANNER, ROADMAP! ROADMAP!');
    expect(narratorLine('caraio-thanner-vasco', 'pt-BR')?.text).toContain('VASCO');
    expect(narratorLine('oxente-doido', 'pt-BR')?.text).toContain('OXENTEEE');
    expect(narratorLine('puta-merda-passou', 'pt-BR')?.text).toBe('PUTA MERDA, PASSOU FALANDO');
    expect(narratorLine('cu-travou', 'pt-BR')?.category).toBe(NARRATOR_CATEGORY.DAMAGE);
    expect(narratorLine('eita-porrada', 'pt-BR')?.category).toBe(NARRATOR_CATEGORY.WEAPONS);
    expect(narratorLine('caraio-thanner-vasco', 'en')?.text).not.toMatch(/VASCO/i);
  });

  it('points clip urls at the active locale folders', () => {
    expect(narratorStashDirectory('en')).toBe('assets/audio/narrator/en/stash');
    expect(narratorLabDirectory('pt-BR')).toBe('assets/audio/narrator/pt-BR/lab');
    expect(narratorClipKey({ lineId: 'engines-hot', voice: 'echo' }, 'pt-BR')).toBe(
      'pt-BR-echo-engines-hot',
    );
    expect(menuValueFromLocale('pt-BR')).toBe('PT-BR');
    expect(localeFromMenuValue('PT-BR')).toBe('pt-BR');
    expect(NARRATOR_EN_REGEN_IDS).toContain('lok-thant-enzo');
    expect(NARRATOR_EN_REGEN_IDS).toContain('cu-travou');
  });

  it('defaults narrator locale to English', () => {
    expect(getNarratorLocale()).toBe('en');
    setNarratorLocale('pt-BR');
    expect(getNarratorLocale()).toBe('pt-BR');
    expect(narratorLine('no-brakes')?.text).toContain('PORRA');
  });
});
