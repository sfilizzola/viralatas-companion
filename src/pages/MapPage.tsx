import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useNow } from '../hooks/useNow';
import { useAuth } from '../hooks/useAuth';
import { useSocialSnapshot } from '../hooks/useSocialSnapshot';
import { useTimelineGate } from '../hooks/useTimelineGate';
import { useBands } from '../hooks/useBands';
import { buildPlacements } from '../services/minimapPlacement';
import { MINIMAP_ZONES } from '../components/map/minimapZones';
import MinimapOverlay from '../components/map/MinimapOverlay';
import TimelineScrubber from '../components/map/TimelineScrubber';
import OfflineBanner from '../components/OfflineBanner';
import StageScheduleSheet from '../components/StageScheduleSheet';
import styles from './MapPage.module.css';

function useOffline(): boolean {
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return offline;
}

function BackArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MapPage() {
  const { t } = useI18n('MapPage');
  const now = useNow(30_000);
  const { user } = useAuth();
  const selfUserId = user?.id ?? null;
  const offline = useOffline();
  const navigate = useNavigate();
  const [showStageSheet, setShowStageSheet] = useState(false);
  const { bands } = useBands();

  // Timeline preview state — ephemeral, never persisted
  const [previewTime, setPreviewTime] = useState<Date | null>(null);
  const gate = useTimelineGate(now);

  // effectiveTime: use previewTime when scrubbing, otherwise live now
  const effectiveTime = previewTime ?? now;
  const { snapshot, loading } = useSocialSnapshot(effectiveTime);

  const placements = useMemo(
    () => (snapshot ? buildPlacements(snapshot.crewGroups, MINIMAP_ZONES, selfUserId) : []),
    [snapshot, selfUserId],
  );

  return (
    <div className={styles.page}>
      <OfflineBanner />

      <header className={styles.header}>
        <Link to="/now" className={styles.back} aria-label={t('back')}>
          <BackArrow />
        </Link>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{t('title')}</h1>
          <span className={styles.subtitle}>{t('subtitle')}</span>
        </div>
        <button
          className={styles.stagesBtn}
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
      </header>

      {offline && (
        <p className={styles.offlineNote} role="status">
          {t('offlineNote')}
        </p>
      )}

      <main className={styles.main}>
        {loading ? (
          <p className={styles.empty}>{t('loading')}</p>
        ) : (
          <>
            <MinimapOverlay placements={placements} mapAlt={t('mapAlt')} />
            {placements.length === 0 && <p className={styles.empty}>{t('empty')}</p>}
          </>
        )}
      </main>

      <TimelineScrubber
        now={now}
        previewTime={previewTime}
        windowStart={gate.windowStart ?? new Date('2026-07-29T10:00:00+02:00')}
        windowEnd={gate.windowEnd ?? new Date('2026-07-30T03:00:00+02:00')}
        isActive={gate.isActive}
        onPreview={setPreviewTime}
        onClear={() => setPreviewTime(null)}
      />

      {showStageSheet && (
        <StageScheduleSheet
          bands={bands}
          now={effectiveTime}
          onClose={() => setShowStageSheet(false)}
          onBandSelect={() => navigate('/schedule')}
        />
      )}
    </div>
  );
}
