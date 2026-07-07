import { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
import quackStripBr from '../i18n/QuackStrip_br.json';
import quackStripDe from '../i18n/QuackStrip_de.json';
import quackStripEn from '../i18n/QuackStrip_en.json';
import quackStripEs from '../i18n/QuackStrip_es.json';
import quackGhostRowBr from '../i18n/QuackGhostRow_br.json';
import quackGhostRowDe from '../i18n/QuackGhostRow_de.json';
import quackGhostRowEn from '../i18n/QuackGhostRow_en.json';
import quackGhostRowEs from '../i18n/QuackGhostRow_es.json';
import wrapBr from '../i18n/WrapPage_br.json';
import wrapDe from '../i18n/WrapPage_de.json';
import wrapEn from '../i18n/WrapPage_en.json';
import wrapEs from '../i18n/WrapPage_es.json';
import mapBr from '../i18n/MapPage_br.json';
import mapDe from '../i18n/MapPage_de.json';
import mapEn from '../i18n/MapPage_en.json';
import mapEs from '../i18n/MapPage_es.json';
import upcomingBandCardBr from '../i18n/UpcomingBandCard_br.json';
import upcomingBandCardDe from '../i18n/UpcomingBandCard_de.json';
import upcomingBandCardEn from '../i18n/UpcomingBandCard_en.json';
import upcomingBandCardEs from '../i18n/UpcomingBandCard_es.json';
import timelineScrubberBr from '../i18n/TimelineScrubber_br.json';
import timelineScrubberDe from '../i18n/TimelineScrubber_de.json';
import timelineScrubberEn from '../i18n/TimelineScrubber_en.json';
import timelineScrubberEs from '../i18n/TimelineScrubber_es.json';
import stageScheduleSheetBr from '../i18n/StageScheduleSheet_br.json';
import stageScheduleSheetDe from '../i18n/StageScheduleSheet_de.json';
import stageScheduleSheetEn from '../i18n/StageScheduleSheet_en.json';
import stageScheduleSheetEs from '../i18n/StageScheduleSheet_es.json';
import campLocationBr from '../i18n/CampLocation_br.json';
import campLocationDe from '../i18n/CampLocation_de.json';
import campLocationEn from '../i18n/CampLocation_en.json';
import campLocationEs from '../i18n/CampLocation_es.json';
import installAppBr from '../i18n/InstallApp_br.json';
import installAppDe from '../i18n/InstallApp_de.json';
import installAppEn from '../i18n/InstallApp_en.json';
import installAppEs from '../i18n/InstallApp_es.json';

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
  | 'SyncToast'
  | 'QuackStrip'
  | 'QuackGhostRow'
  | 'WrapPage'
  | 'MapPage'
  | 'UpcomingBandCard'
  | 'TimelineScrubber'
  | 'StageScheduleSheet'
  | 'CampLocation'
  | 'InstallApp'
  | 'GodlikeAdmin';

type TranslationStrings = Record<string, string>;
type Translations = Record<Language, Record<TranslationFile, TranslationStrings>>;

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
    QuackStrip: quackStripBr,
    QuackGhostRow: quackGhostRowBr,
    WrapPage: wrapBr,
    MapPage: mapBr,
    UpcomingBandCard: upcomingBandCardBr,
    TimelineScrubber: timelineScrubberBr,
    StageScheduleSheet: stageScheduleSheetBr,
    CampLocation: campLocationBr,
    InstallApp: installAppBr,
    GodlikeAdmin: {},
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
    QuackStrip: quackStripEn,
    QuackGhostRow: quackGhostRowEn,
    WrapPage: wrapEn,
    MapPage: mapEn,
    UpcomingBandCard: upcomingBandCardEn,
    TimelineScrubber: timelineScrubberEn,
    StageScheduleSheet: stageScheduleSheetEn,
    CampLocation: campLocationEn,
    InstallApp: installAppEn,
    GodlikeAdmin: {},
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
    QuackStrip: quackStripEs,
    QuackGhostRow: quackGhostRowEs,
    WrapPage: wrapEs,
    MapPage: mapEs,
    UpcomingBandCard: upcomingBandCardEs,
    TimelineScrubber: timelineScrubberEs,
    StageScheduleSheet: stageScheduleSheetEs,
    CampLocation: campLocationEs,
    InstallApp: installAppEs,
    GodlikeAdmin: {},
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
    QuackStrip: quackStripDe,
    QuackGhostRow: quackGhostRowDe,
    WrapPage: wrapDe,
    MapPage: mapDe,
    UpcomingBandCard: upcomingBandCardDe,
    TimelineScrubber: timelineScrubberDe,
    StageScheduleSheet: stageScheduleSheetDe,
    CampLocation: campLocationDe,
    InstallApp: installAppDe,
    GodlikeAdmin: {},
  },
};

const godlikeAdminLoaders: Record<Language, () => Promise<{ default: TranslationStrings }>> = {
  br: () => import('../i18n/GodlikeAdmin_br.json'),
  en: () => import('../i18n/GodlikeAdmin_en.json'),
  es: () => import('../i18n/GodlikeAdmin_es.json'),
  de: () => import('../i18n/GodlikeAdmin_de.json'),
};

const godlikeAdminLoadPromises = new Map<Language, Promise<void>>();

function isGodlikeAdminLoaded(language: Language): boolean {
  return Object.keys(translations[language].GodlikeAdmin).length > 0;
}

export function loadGodlikeAdminTranslations(language: Language): Promise<void> {
  if (isGodlikeAdminLoaded(language)) return Promise.resolve();

  let promise = godlikeAdminLoadPromises.get(language);
  if (!promise) {
    promise = godlikeAdminLoaders[language]().then((mod) => {
      translations[language].GodlikeAdmin = mod.default;
    });
    godlikeAdminLoadPromises.set(language, promise);
  }
  return promise;
}

function translate(
  strings: TranslationStrings,
  key: string,
  values?: Record<string, string | number>,
): string {
  const template = strings[key] ?? key;
  if (!values) return template;
  return Object.entries(values).reduce(
    (message, [name, value]) => message.split(`{${name}}`).join(String(value)),
    template,
  );
}

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
      return translate(translations[context.language][file], key, values);
    },
  };
}

export function useGodlikeAdminI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useGodlikeAdminI18n must be used inside I18nProvider');

  const [ready, setReady] = useState(() => isGodlikeAdminLoaded(context.language));

  useEffect(() => {
    let cancelled = false;

    if (isGodlikeAdminLoaded(context.language)) {
      setReady(true);
      return;
    }

    setReady(false);
    loadGodlikeAdminTranslations(context.language).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [context.language]);

  const t = useCallback(
    (key: string, values?: Record<string, string | number>) =>
      translate(translations[context.language].GodlikeAdmin, key, values),
    [context.language, ready],
  );

  return {
    language: context.language,
    setLanguage: context.setLanguage,
    ready,
    t,
  };
}
