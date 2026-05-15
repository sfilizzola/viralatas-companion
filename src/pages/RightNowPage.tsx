import { useI18n, type Language } from '../lib/i18n';
import { useNowData } from '../hooks/useNowData';
import BottomNav from '../components/BottomNav';
import OfflineBanner from '../components/OfflineBanner';
import BadgesDisplay from '../components/BadgesDisplay';
import PresenceToggle from '../components/PresenceToggle';
import LatestAnnouncementBanner from '../components/now/LatestAnnouncementBanner';
import CrewGroupsSection from '../components/now/CrewGroupsSection';
import styles from './RightNowPage.module.css';

const DATE_LOCALES: Record<Language, string> = {
  br: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
  de: 'de-DE',
};

function nowLabel(date: Date, language: Language) {
  return new Intl.DateTimeFormat(DATE_LOCALES[language], {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  }).format(date);
}

export default function RightNowPage() {
  const { language, t } = useI18n('RightNowPage');
  const {
    user,
    userId,
    isFriend,
    crewUsers,
    latestAnnouncement,
    now,
    loading,
    undoState,
    metalPlaceConfig,
    liveTestBand,
    isMetalPlaceWindowActive,
    presenceValue,
    myPlan,
    crewPlans,
    crewGroups,
    handleSkip,
    handleUndo,
    handlePresenceChange,
  } = useNowData();

  return (
    <div className={styles.page}>
      <OfflineBanner />
      <header className={styles.header}>
        <span className={styles.title}>{t('title')}</span>
        <span className={styles.timestamp}>
          <span>{nowLabel(now, language)}</span>
          <span>{t('wackenTime')}</span>
        </span>
      </header>

      {liveTestBand && (
        <div className={styles.liveTestBanner} role="status">
          {t('liveTestBanner', { band: liveTestBand.name })}
        </div>
      )}

      <main className={styles.main}>
        {userId && !isFriend && (
          <PresenceToggle
            className={styles.presence}
            value={presenceValue}
            metalPlaceAvailable={isMetalPlaceWindowActive}
            labels={{
              title: t('presenceTitle'),
              camping: t('presenceCamping'),
              metalPlace: t('presenceMetalPlace'),
            }}
            onChange={handlePresenceChange}
          />
        )}
        {loading ? (
          <p className={styles.empty}>{t('loading')}</p>
        ) : (
          <>
            {latestAnnouncement && myPlan.status !== 'current' && (
              <LatestAnnouncementBanner
                announcement={latestAnnouncement}
                crewUsers={crewUsers}
                t={t}
              />
            )}

            {user && <BadgesDisplay user={user} heading={t('patches')} />}

            <h2 className={styles.sectionTitle}>{t('crewNow')}</h2>
            <CrewGroupsSection
              crewGroups={crewGroups}
              crewPlans={crewPlans}
              userId={userId}
              myPlan={myPlan}
              metalPlaceConfig={metalPlaceConfig}
              onSkip={handleSkip}
              t={t}
            />
          </>
        )}
      </main>

      {undoState && (
        <div className={styles.undoToast}>
          <span className={styles.undoToastText}>
            {t('saiuDe', { band: undoState.bandName })}
          </span>
          <button className={styles.undoToastButton} onClick={handleUndo}>
            {t('desfazer')}
          </button>
        </div>
      )}

      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}
