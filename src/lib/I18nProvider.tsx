import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
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

function languageFromSession(user: { user_metadata?: Record<string, unknown> } | null): Language | null {
  const profileLanguage = user?.user_metadata?.['preferred_language'];
  return isLanguage(profileLanguage) ? profileLanguage : null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => initialLanguage());
  const { user, loading } = useAuth();

  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  useEffect(() => {
    if (loading) return;
    const fromSession = languageFromSession(user);
    if (fromSession) setLanguageState(fromSession);
  }, [loading, user]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
