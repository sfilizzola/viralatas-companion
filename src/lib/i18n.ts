import { createContext, useContext } from 'react';
import appBr from '../i18n/App_br.json';
import appEn from '../i18n/App_en.json';
import authBr from '../i18n/AuthPage_br.json';
import authEn from '../i18n/AuthPage_en.json';
import bottomNavBr from '../i18n/BottomNav_br.json';
import bottomNavEn from '../i18n/BottomNav_en.json';
import scheduleBr from '../i18n/SchedulePage_br.json';
import scheduleEn from '../i18n/SchedulePage_en.json';
import myPicksBr from '../i18n/MyPicksPage_br.json';
import myPicksEn from '../i18n/MyPicksPage_en.json';
import popularBr from '../i18n/PopularPage_br.json';
import popularEn from '../i18n/PopularPage_en.json';
import rightNowBr from '../i18n/RightNowPage_br.json';
import rightNowEn from '../i18n/RightNowPage_en.json';
import profileBr from '../i18n/ProfilePage_br.json';
import profileEn from '../i18n/ProfilePage_en.json';

export type Language = 'br' | 'en';

type TranslationFile =
  | 'App'
  | 'AuthPage'
  | 'BottomNav'
  | 'SchedulePage'
  | 'MyPicksPage'
  | 'PopularPage'
  | 'RightNowPage'
  | 'ProfilePage';

type Translations = Record<Language, Record<TranslationFile, Record<string, string>>>;

export const LANGUAGE_STORAGE_KEY = 'viralatas-language';

const translations: Translations = {
  br: {
    App: appBr,
    AuthPage: authBr,
    BottomNav: bottomNavBr,
    SchedulePage: scheduleBr,
    MyPicksPage: myPicksBr,
    PopularPage: popularBr,
    RightNowPage: rightNowBr,
    ProfilePage: profileBr,
  },
  en: {
    App: appEn,
    AuthPage: authEn,
    BottomNav: bottomNavEn,
    SchedulePage: scheduleEn,
    MyPicksPage: myPicksEn,
    PopularPage: popularEn,
    RightNowPage: rightNowEn,
    ProfilePage: profileEn,
  },
};

export type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

export function isLanguage(value: unknown): value is Language {
  return value === 'br' || value === 'en';
}

export function useI18n(file: TranslationFile) {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');

  return {
    language: context.language,
    setLanguage: context.setLanguage,
    t(key: string, values?: Record<string, string | number>) {
      const template = translations[context.language][file][key] ?? key;
      if (!values) return template;
      return Object.entries(values).reduce(
        (message, [name, value]) => message.split(`{${name}}`).join(String(value)),
        template,
      );
    },
  };
}
