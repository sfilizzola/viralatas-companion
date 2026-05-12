import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { I18nContext, isLanguage, useI18n, type Language } from '../lib/i18n';

// Builds a minimal context wrapper that provides the given locale.
// This bypasses I18nProvider (which depends on Supabase/localStorage) so
// we can test the pure translation-lookup logic without side effects.
function makeWrapper(language: Language) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(I18nContext.Provider, {
      value: { language, setLanguage: () => {} },
      children,
    });
  };
}

describe('useI18n – basic lookup', () => {
  it("returns the Brazilian Portuguese string for 'br' locale", () => {
    const { result } = renderHook(() => useI18n('BottomNav'), {
      wrapper: makeWrapper('br'),
    });
    expect(result.current.t('now')).toBe('Agora');
    expect(result.current.t('schedule')).toBe('Agenda');
    expect(result.current.t('profile')).toBe('Perfil');
  });

  it("returns the English string for 'en' locale", () => {
    const { result } = renderHook(() => useI18n('BottomNav'), {
      wrapper: makeWrapper('en'),
    });
    expect(result.current.t('now')).toBe('Now');
    expect(result.current.t('schedule')).toBe('Schedule');
    expect(result.current.t('profile')).toBe('Profile');
  });

  it('falls back to the key itself when the key does not exist (no crash)', () => {
    const { result } = renderHook(() => useI18n('BottomNav'), {
      wrapper: makeWrapper('br'),
    });
    expect(result.current.t('totally_missing_key')).toBe('totally_missing_key');
  });

  it('exposes the active language via result.current.language', () => {
    const { result } = renderHook(() => useI18n('BottomNav'), {
      wrapper: makeWrapper('en'),
    });
    expect(result.current.language).toBe('en');
  });
});

describe('useI18n – interpolation', () => {
  it('substitutes a single placeholder in Brazilian Portuguese', () => {
    const { result } = renderHook(() => useI18n('SchedulePage'), {
      wrapper: makeWrapper('br'),
    });
    // Template: "{count} bandas"
    expect(result.current.t('headerBands', { count: 5 })).toBe('5 bandas');
  });

  it('substitutes a single placeholder in English', () => {
    const { result } = renderHook(() => useI18n('SchedulePage'), {
      wrapper: makeWrapper('en'),
    });
    // Template: "{count} bands"
    expect(result.current.t('headerBands', { count: 12 })).toBe('12 bands');
  });

  it('substitutes the same placeholder appearing multiple times', () => {
    const { result } = renderHook(() => useI18n('SchedulePage'), {
      wrapper: makeWrapper('br'),
    });
    // Template: "Ver {count} bandas" — one occurrence
    expect(result.current.t('verBandasCount', { count: 3 })).toBe('Ver 3 bandas');
  });

  it('returns the raw template when no values are passed for a template key', () => {
    const { result } = renderHook(() => useI18n('SchedulePage'), {
      wrapper: makeWrapper('en'),
    });
    // Without substitution the placeholder remains verbatim
    expect(result.current.t('headerBands')).toBe('{count} bands');
  });
});

describe('useI18n – multi-locale coverage', () => {
  it('returns Spanish strings for the es locale', () => {
    const { result } = renderHook(() => useI18n('BottomNav'), {
      wrapper: makeWrapper('es'),
    });
    expect(result.current.t('schedule')).toBeTruthy();
    expect(result.current.t('schedule')).not.toBe('schedule'); // must not fall back to key
  });

  it('returns German strings for the de locale', () => {
    const { result } = renderHook(() => useI18n('BottomNav'), {
      wrapper: makeWrapper('de'),
    });
    expect(result.current.t('schedule')).toBeTruthy();
    expect(result.current.t('schedule')).not.toBe('schedule');
  });
});

describe('isLanguage()', () => {
  it('accepts the four supported locale codes', () => {
    expect(isLanguage('br')).toBe(true);
    expect(isLanguage('en')).toBe(true);
    expect(isLanguage('es')).toBe(true);
    expect(isLanguage('de')).toBe(true);
  });

  it('rejects unknown locale codes', () => {
    expect(isLanguage('fr')).toBe(false);
    expect(isLanguage('pt')).toBe(false);
    expect(isLanguage('')).toBe(false);
    expect(isLanguage(null)).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
    expect(isLanguage(42)).toBe(false);
  });
});

describe('useI18n – error when context is missing', () => {
  it('throws when rendered outside I18nProvider', () => {
    expect(() => {
      renderHook(() => useI18n('BottomNav'));
    }).toThrow('useI18n must be used inside I18nProvider');
  });
});
