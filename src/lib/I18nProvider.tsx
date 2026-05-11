import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import {
  I18nContext,
  LANGUAGE_STORAGE_KEY,
  isLanguage,
  type I18nContextValue,
  type Language,
} from './i18n';

function initialLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isLanguage(stored)) return stored;
  const browserLanguage = navigator.language.toLowerCase();
  if (browserLanguage.startsWith('pt')) return 'br';
  if (browserLanguage.startsWith('es')) return 'es';
  if (browserLanguage.startsWith('de')) return 'de';
  return 'en';
}

function applyLanguage(language: Language) {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  document.documentElement.lang = {
    br: 'pt-BR',
    en: 'en',
    es: 'es',
    de: 'de',
  }[language];
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => initialLanguage());

  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const profileLanguage = data.session?.user.user_metadata['preferred_language'];
      if (isLanguage(profileLanguage)) setLanguageState(profileLanguage);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const profileLanguage = session?.user.user_metadata['preferred_language'];
      if (isLanguage(profileLanguage)) setLanguageState(profileLanguage);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
