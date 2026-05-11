import { createContext, useContext } from 'react';
import appBr from '../i18n/App_br.json';
import appDe from '../i18n/App_de.json';
import appEn from '../i18n/App_en.json';
import appEs from '../i18n/App_es.json';
import authBr from '../i18n/AuthPage_br.json';
import authDe from '../i18n/AuthPage_de.json';
import authEn from '../i18n/AuthPage_en.json';
import authEs from '../i18n/AuthPage_es.json';
import bottomNavBr from '../i18n/BottomNav_br.json';
import bottomNavDe from '../i18n/BottomNav_de.json';
import bottomNavEn from '../i18n/BottomNav_en.json';
import bottomNavEs from '../i18n/BottomNav_es.json';
import scheduleBr from '../i18n/SchedulePage_br.json';
import scheduleDe from '../i18n/SchedulePage_de.json';
import scheduleEn from '../i18n/SchedulePage_en.json';
import scheduleEs from '../i18n/SchedulePage_es.json';
import myPicksBr from '../i18n/MyPicksPage_br.json';
import myPicksDe from '../i18n/MyPicksPage_de.json';
import myPicksEn from '../i18n/MyPicksPage_en.json';
import myPicksEs from '../i18n/MyPicksPage_es.json';
import popularBr from '../i18n/PopularPage_br.json';
import popularDe from '../i18n/PopularPage_de.json';
import popularEn from '../i18n/PopularPage_en.json';
import popularEs from '../i18n/PopularPage_es.json';
import rightNowBr from '../i18n/RightNowPage_br.json';
import rightNowDe from '../i18n/RightNowPage_de.json';
import rightNowEn from '../i18n/RightNowPage_en.json';
import rightNowEs from '../i18n/RightNowPage_es.json';
import profileBr from '../i18n/ProfilePage_br.json';
import profileDe from '../i18n/ProfilePage_de.json';
import profileEn from '../i18n/ProfilePage_en.json';
import profileEs from '../i18n/ProfilePage_es.json';
import announcementsBr from '../i18n/AnnouncementsPage_br.json';
import announcementsDe from '../i18n/AnnouncementsPage_de.json';
import announcementsEn from '../i18n/AnnouncementsPage_en.json';
import announcementsEs from '../i18n/AnnouncementsPage_es.json';
import badgesBr from '../i18n/Badges_br.json';
import badgesDe from '../i18n/Badges_de.json';
import badgesEn from '../i18n/Badges_en.json';
import badgesEs from '../i18n/Badges_es.json';
import offlineBannerBr from '../i18n/OfflineBanner_br.json';
import offlineBannerDe from '../i18n/OfflineBanner_de.json';
import offlineBannerEn from '../i18n/OfflineBanner_en.json';
import offlineBannerEs from '../i18n/OfflineBanner_es.json';
import syncToastBr from '../i18n/SyncToast_br.json';
import syncToastDe from '../i18n/SyncToast_de.json';
import syncToastEn from '../i18n/SyncToast_en.json';
import syncToastEs from '../i18n/SyncToast_es.json';

export type Language = 'br' | 'en' | 'es' | 'de';

type TranslationFile =
  | 'App'
  | 'AuthPage'
  | 'BottomNav'
  | 'SchedulePage'
  | 'MyPicksPage'
  | 'PopularPage'
  | 'RightNowPage'
  | 'ProfilePage'
  | 'AnnouncementsPage'
  | 'Badges'
  | 'OfflineBanner'
  | 'SyncToast';

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
    AnnouncementsPage: announcementsBr,
    Badges: badgesBr,
    OfflineBanner: offlineBannerBr,
    SyncToast: syncToastBr,
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
    AnnouncementsPage: announcementsEn,
    Badges: badgesEn,
    OfflineBanner: offlineBannerEn,
    SyncToast: syncToastEn,
  },
  es: {
    App: appEs,
    AuthPage: authEs,
    BottomNav: bottomNavEs,
    SchedulePage: scheduleEs,
    MyPicksPage: myPicksEs,
    PopularPage: popularEs,
    RightNowPage: rightNowEs,
    ProfilePage: profileEs,
    AnnouncementsPage: announcementsEs,
    Badges: badgesEs,
    OfflineBanner: offlineBannerEs,
    SyncToast: syncToastEs,
  },
  de: {
    App: appDe,
    AuthPage: authDe,
    BottomNav: bottomNavDe,
    SchedulePage: scheduleDe,
    MyPicksPage: myPicksDe,
    PopularPage: popularDe,
    RightNowPage: rightNowDe,
    ProfilePage: profileDe,
    AnnouncementsPage: announcementsDe,
    Badges: badgesDe,
    OfflineBanner: offlineBannerDe,
    SyncToast: syncToastDe,
  },
};

export type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

export function isLanguage(value: unknown): value is Language {
  return value === 'br' || value === 'en' || value === 'es' || value === 'de';
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
