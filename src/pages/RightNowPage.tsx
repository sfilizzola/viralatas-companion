import { useI18n, type Language } from '../lib/i18n';
import { useNowData } from '../hooks/useNowData';
import { useDuckEnabled } from '../contexts/DuckEnabledContext';
import { useDuckQuack } from '../hooks/useDuckQuack';
import type { CrewLiveGroup } from '../services/livePreview';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import OfflineBanner from '../components/OfflineBanner';
import BadgesDisplay from '../components/BadgesDisplay';
import PresenceToggle from '../components/PresenceToggle';
import LatestAnnouncementBanner from '../components/now/LatestAnnouncementBanner';
import UpcomingBandCard from '../components/now/UpcomingBandCard';
import WrapTeaserBanner from '../components/wrap/WrapTeaserBanner';
import { useWrapTeaserVisible } from '../hooks/useWrapTeaserVisible';
import CrewGroupsSection from '../components/now/CrewGroupsSection';
import LiveCardSheet from '../components/now/LiveCardSheet';
import StageScheduleSheet from '../components/StageScheduleSheet';
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
  const duckEnabled = useDuckEnabled();
  const navigate = useNavigate();
  const [activeGroup, setActiveGroup] = useState<CrewLiveGroup | null>(null);
  const [showStageSheet, setShowStageSheet] = useState(false);
  const [dismissedBandIds, setDismissedBandIds] = useState<Set<string>>(new Set());
  const {
    user,
    userId,
    isFriend,
    bands,
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
    nextBand,
    crewPlans,
    crewGroups,
    handleSkip,
    handleUndo,
    handlePresenceChange,
    duckBandId,
    duckQuack,
    duckCooldownUntil,
  } = useNowData();
  const { quack: nextDuckQuack, cooldownUntil: nextDuckCooldown } = useDuckQuack(
    userId,
    nextBand?.id ?? null,
  );
  const showWrapTeaser = useWrapTeaserVisible();

  const timeDelta = nextBand
    ? (new Date(nextBand.start_time).getTime() - now.getTime()) / (1000 * 60)
    : Infinity;

  const nextBandInWindow =
    nextBand &&
    !dismissedBandIds.has(nextBand.id) &&
    myPlan.status !== 'current' &&
    timeDelta >= 0 &&
    timeDelta <= 15;

  const nextBandCrew = nextBand
    ? crewPlans.filter(
        (member) =>
          member.plan.band?.id === nextBand.id ||
          member.plan.nextBand?.id === nextBand.id,
      )
    : [];

  function handleDismissCard(bandId: string) {
    setDismissedBandIds((prev) => new Set(prev).add(bandId));
  }

  return (
    <div className={styles.page}>
      <OfflineBanner />
      <header className={styles.header}>
        <span className={styles.title}>{t('title')}</span>
        <div className={styles.headerRight}>
          <button
            className={styles.chip}
            type="button"
            aria-label={t('stagesButton')}
            onClick={() => setShowStageSheet(true)}
          >
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="1" y="1" width="7" height="7" rx="1" />
              <rect x="10" y="1" width="7" height="7" rx="1" />
              <rect x="1" y="10" width="7" height="7" rx="1" />
              <rect x="10" y="10" width="7" height="7" rx="1" />
            </svg>
            <span>{t('stagesButton')}</span>
          </button>
          <Link to="/map" className={styles.mapButton} aria-label={t('mapButton')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z"/>
              <path d="M12.6 6.2 10 10.4h2.1l-1 3.3 2.9-4.4h-2.1l.8-3.1Z" fill="currentColor" stroke="none"/>
            </svg>
            <span>{t('mapButton')}</span>
          </Link>
          <div className={styles.headerDivider} aria-hidden="true" />
          <span className={styles.timestamp}>
            <span className={styles.timestampValue}>{nowLabel(now, language)}</span>
            <span className={styles.timestampLabel}>{t('wackenTime')}</span>
          </span>
        </div>
      </header>

      {liveTestBand && (
        <div className={styles.liveTestBanner} role="status">
          {t('liveTestBanner', { band: liveTestBand.name })}
        </div>
      )}

      {showWrapTeaser && <WrapTeaserBanner />}

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
            {nextBandInWindow && nextBand ? (
              <UpcomingBandCard
                nextBand={nextBand}
                crewMembers={nextBandCrew}
                userId={userId}
                onDismiss={handleDismissCard}
                onDuck={duckEnabled ? nextDuckQuack : undefined}
                duckCooldownUntil={duckEnabled ? nextDuckCooldown : null}
              />
            ) : latestAnnouncement && myPlan.status !== 'current' ? (
              <LatestAnnouncementBanner
                announcement={latestAnnouncement}
                crewUsers={crewUsers}
                t={t}
              />
            ) : null}

            {user && <BadgesDisplay user={user} />}

            <h2 className={styles.sectionTitle}>{t('crewNow')}</h2>
            <CrewGroupsSection
              crewGroups={crewGroups}
              crewPlans={crewPlans}
              userId={userId}
              myPlan={myPlan}
              metalPlaceConfig={metalPlaceConfig}
              now={now}
              onSkip={handleSkip}
              onDuck={duckEnabled && duckBandId ? duckQuack : undefined}
              duckCooldownUntil={duckCooldownUntil}
              onGroupSelect={setActiveGroup}
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

      {activeGroup && (
        <LiveCardSheet
          group={activeGroup}
          crewPlans={crewPlans}
          userId={userId}
          metalPlaceConfig={metalPlaceConfig}
          now={now}
          onClose={() => setActiveGroup(null)}
          t={t}
        />
      )}

      {showStageSheet && (
        <StageScheduleSheet
          bands={bands}
          now={now}
          onClose={() => setShowStageSheet(false)}
          onBandSelect={() => navigate('/schedule')}
        />
      )}
    </div>
  );
}
