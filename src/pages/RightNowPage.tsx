import { useI18n, type Language } from '../lib/i18n';
import { useNowData } from '../hooks/useNowData';
import { useActiveFestival } from '../hooks/useActiveFestival';
import { useDuckEnabled } from '../contexts/DuckEnabledContext';
import { useDuckQuack } from '../hooks/useDuckQuack';
import type { CrewLiveGroup } from '../services/livePreview';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import FestivalSwitcher from '../components/FestivalSwitcher';
import OfflineBanner from '../components/OfflineBanner';
import BadgesDisplay from '../components/BadgesDisplay';
import PresenceToggle from '../components/PresenceToggle';
import LatestAnnouncementBanner from '../components/now/LatestAnnouncementBanner';
import UpcomingBandCard from '../components/now/UpcomingBandCard';
import WrapTeaserBanner from '../components/wrap/WrapTeaserBanner';
import { useWrapTeaserVisible } from '../hooks/useWrapTeaserVisible';
import CrewGroupsSection from '../components/now/CrewGroupsSection';
import LiveCardSheet from '../components/now/LiveCardSheet';
import StageRadarSection from '../components/now/StageRadarSection';
import StageRadarSheet from '../components/now/StageRadarSheet';
import StageScheduleSheet from '../components/StageScheduleSheet';
import {
  canShowCamp,
  canShowMap,
  canShowMetalPlace,
  canShowPresence,
  canShowWrap,
  hasRunningOrder,
} from '../lib/festivalFeatures';
import { buildStageRadarSnapshot, type StageRadarEntry } from '../services/stageRadar';
import styles from './RightNowPage.module.css';
import { timedBands } from '../services/timedBand';
import PlanningNowView from '../components/now/PlanningNowView';

const DATE_LOCALES: Record<Language, string> = {
  br: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
  de: 'de-DE',
};

function nowLabel(date: Date, language: Language, timeZone: string) {
  return new Intl.DateTimeFormat(DATE_LOCALES[language], {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
}

export default function RightNowPage() {
  const { festival } = useActiveFestival();
  return hasRunningOrder(festival) ? <LiveNowView /> : <PlanningNowView />;
}

function LiveNowView() {
  const { language, t } = useI18n('RightNowPage');
  const { festival } = useActiveFestival();
  const duckEnabled = useDuckEnabled();
  const navigate = useNavigate();
  const [activeGroup, setActiveGroup] = useState<CrewLiveGroup | null>(null);
  const [activeRadarEntry, setActiveRadarEntry] = useState<StageRadarEntry | null>(null);
  const [showStageSheet, setShowStageSheet] = useState(false);
  const [dismissedBandIds, setDismissedBandIds] = useState<Set<string>>(new Set());
  const {
    user,
    userId,
    isFriend,
    bands,
    picks,
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
  } = useNowData(festival);
  const { quack: nextDuckQuack, cooldownUntil: nextDuckCooldown } = useDuckQuack(
    userId,
    nextBand?.id ?? null,
  );
  const showWrapTeaser = useWrapTeaserVisible() && canShowWrap(festival);
  const showMap = canShowMap(festival);
  const showPresence = canShowPresence(festival);
  const showCamp = canShowCamp(festival);
  const showMetalPlace = canShowMetalPlace(festival);
  const showStageRadar = !showCamp;
  const liveTestBandId = liveTestBand?.id ?? null;

  const radarEntries = useMemo(() => {
    if (!showStageRadar || loading || bands.length === 0) return [];
    return buildStageRadarSnapshot(bands, picks, crewUsers, now, festival, {
      liveTestBandId,
    });
  }, [showStageRadar, loading, bands, picks, crewUsers, now, festival, liveTestBandId]);

  const visibleCrewGroups = useMemo(
    () =>
      crewGroups.filter((group) => {
        if (group.kind === 'camping') return showCamp;
        if (group.kind === 'metal_place') return showMetalPlace;
        if (group.kind === 'lost') return showCamp;
        return true;
      }),
    [crewGroups, showCamp, showMetalPlace],
  );

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
        <div className={styles.masthead}>
          <span className={styles.title}>{t('title')}</span>
          <time
            className={styles.timestamp}
            dateTime={now.toISOString()}
            aria-label={
              festival
                ? t('festivalTime', { name: festival.name })
                : t('festivalTimeFallback')
            }
          >
            {nowLabel(now, language, festival?.timezone ?? 'Europe/Berlin')}
          </time>
        </div>
        <div className={styles.toolbar}>
          <FestivalSwitcher />
          <div className={styles.actions}>
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
              <span className={styles.chipLabel}>{t('stagesButton')}</span>
            </button>
            {showMap && (
              <Link to="/map" className={styles.mapButton} aria-label={t('mapButton')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z"/>
                  <path d="M12.6 6.2 10 10.4h2.1l-1 3.3 2.9-4.4h-2.1l.8-3.1Z" fill="currentColor" stroke="none"/>
                </svg>
                <span className={styles.chipLabel}>{t('mapButton')}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {liveTestBand && (
        <div className={styles.liveTestBanner} role="status">
          {t('liveTestBanner', { band: liveTestBand.name })}
        </div>
      )}

      {showWrapTeaser && <WrapTeaserBanner />}

      <main className={styles.main}>
        {userId && !isFriend && showPresence && (
          <PresenceToggle
            className={styles.presence}
            value={presenceValue}
            campingAvailable={showCamp}
            metalPlaceAvailable={showMetalPlace && isMetalPlaceWindowActive}
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
              crewGroups={visibleCrewGroups}
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

            {showStageRadar && radarEntries.length > 0 && (
              <StageRadarSection
                entries={radarEntries}
                onSelect={setActiveRadarEntry}
              />
            )}
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

      {activeRadarEntry && (
        <StageRadarSheet
          entry={activeRadarEntry}
          userId={userId}
          onClose={() => setActiveRadarEntry(null)}
        />
      )}

      {showStageSheet && (
        <StageScheduleSheet
          bands={timedBands(bands, festival)}
          now={now}
          festival={festival}
          onClose={() => setShowStageSheet(false)}
          onBandSelect={() => navigate('/schedule')}
        />
      )}
    </div>
  );
}
