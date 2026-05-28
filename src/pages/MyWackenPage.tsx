import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Band } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useBandDetailModal } from '../hooks/useBandDetailModal';
import { BandDetailModalHost } from '../components/BandDetailModalHost';
import { useBands } from '../hooks/useBands';
import { useBandAttendees } from '../hooks/useBandAttendees';
import { useMissedBands } from '../hooks/useMissedBands';
import { usePickActions } from '../hooks/usePickActions';
import { usePickCounts } from '../hooks/usePickCounts';
import { useBandConflicts } from '../hooks/useBandConflicts';
import { useBandRatings } from '../hooks/useBandRatings';
import { useI18n } from '../lib/i18n';
import { useNow } from '../hooks/useNow';
import { useOfflinePendingBandIds } from '../hooks/useOfflinePendingBandIds';
import { isFestivalActive } from '../services/time';
import {
  computeInitialCollapsedDays,
  countUpcomingLeftToday,
  festivalDayKeyFromNow,
  groupMyWackenByDay,
} from '../services/myWackenGrouping';
import BottomNav from '../components/BottomNav';
import OfflineBanner from '../components/OfflineBanner';
import BandCard from '../components/BandCard';
import Icon from '../components/icons/Icon';
import PlaylistLaunchButton from '../components/PlaylistLaunchButton';
import styles from './SchedulePage.module.css';

export default function MyWackenPage() {
  const { t } = useI18n('MyPicksPage');
  const { t: tSchedule } = useI18n('SchedulePage');
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const displayName =
    (session?.user?.user_metadata?.['display_name'] as string | undefined) ??
    session?.user?.email?.split('@')[0] ??
    '';

  const [highlightedConflict, setHighlightedConflict] = useState<string | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const collapseSeededRef = useRef(false);
  const { bands: rawBands, loading } = useBands();
  const { allMissed, missedBandIds, missedCountsByBand, toggleMissed } = useMissedBands(userId);
  const bands = useMemo(
    () => rawBands.slice().sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [rawBands],
  );
  const { pickedIds, togglePick } = usePickActions(userId);
  const { userRatingByBand, toggleRating, clearRating } = useBandRatings(userId);
  const attendeesByBand = useBandAttendees();
  const pickCounts = usePickCounts();
  const currentNow = useNow(60_000);
  const pendingBandIds = useOfflinePendingBandIds();

  const myBands = useMemo(
    () => bands.filter((band) => pickedIds.has(band.id)),
    [bands, pickedIds],
  );

  const festivalActive = isFestivalActive(currentNow);
  const todayKey = useMemo(() => festivalDayKeyFromNow(currentNow), [currentNow]);

  const dayGroups = useMemo(
    () => groupMyWackenByDay(bands, pickedIds, currentNow),
    [bands, pickedIds, currentNow],
  );

  const upcomingBands = useMemo(
    () => dayGroups.flatMap((group) => group.upcoming),
    [dayGroups],
  );

  const leftToday = useMemo(
    () => countUpcomingLeftToday(dayGroups, todayKey),
    [dayGroups, todayKey],
  );

  useEffect(() => {
    if (loading || collapseSeededRef.current) return;
    setCollapsedDays(
      computeInitialCollapsedDays(dayGroups, {
        festivalActive,
        todayKey,
      }),
    );
    collapseSeededRef.current = true;
  }, [loading, dayGroups, festivalActive, todayKey]);

  const conflicts = useBandConflicts(upcomingBands);
  const { openBand, modalProps } = useBandDetailModal({
    bands,
    pickedIds,
    togglePick,
    allMissed,
    missedBandIds,
    toggleMissed,
    attendeesByBand,
    currentNow,
    conflicts,
    userRatingByBand,
    toggleRating,
    clearRating,
  });

  const hardConflictBands = useMemo(() => {
    const ids = new Set<string>();
    for (const [bandId, entries] of conflicts) {
      if (entries.some((e) => e.severity === 'hard')) {
        ids.add(bandId);
      }
    }
    return ids;
  }, [conflicts]);

  const totalConflicts = useMemo(() => {
    const seen = new Set<string>();
    for (const [bandId, entries] of conflicts)
      for (const e of entries)
        if (e.severity === 'hard')
          seen.add([bandId, e.band.id].sort().join(':'));
    return seen.size;
  }, [conflicts]);

  const totalOverlaps = useMemo(() => {
    const seen = new Set<string>();
    for (const [bandId, entries] of conflicts)
      for (const e of entries)
        if (e.severity === 'soft' && !hardConflictBands.has(bandId) && !hardConflictBands.has(e.band.id))
          seen.add([bandId, e.band.id].sort().join(':'));
    return seen.size;
  }, [conflicts, hardConflictBands]);

  const dayLabel = useCallback(
    (dateStr: string): string => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getUTCDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
      const weekday = tSchedule(dayNames[dayOfWeek]);
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      return `${weekday} ${day}/${month}`;
    },
    [tSchedule],
  );

  function toggleDayCollapse(day: string) {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  }

  function handleConflictClick(bandId: string) {
    const entries = conflicts.get(bandId);
    if (!entries || entries.length === 0) return;
    const firstPartner = entries[0].band;
    setHighlightedConflict((current) => (current === firstPartner.id ? null : firstPartner.id));
  }

  function renderUpcomingBand(band: Band) {
    const entries = conflicts.get(band.id);
    const hasSoftOverlap = entries?.some((e) => e.severity === 'soft');
    const hasHardConflict = entries?.some((e) => e.severity === 'hard');
    const severity = hasHardConflict ? 'hard' : hasSoftOverlap ? 'soft' : undefined;
    return (
      <BandCard
        key={band.id}
        band={band}
        isPicked={pickedIds.has(band.id)}
        count={pickCounts[band.id] ?? 0}
        onToggle={() => togglePick(band.id)}
        onClick={() => openBand(band.id)}
        variant="timeline"
        pending={pendingBandIds.has(band.id)}
        conflict={
          severity
            ? {
                severity,
                active: highlightedConflict === band.id,
                onClick: () => handleConflictClick(band.id),
              }
            : undefined
        }
        missedCount={missedCountsByBand[band.id] ?? 0}
      />
    );
  }

  function renderEndedBand(band: Band) {
    return (
      <BandCard
        key={band.id}
        band={band}
        isPicked={pickedIds.has(band.id)}
        count={pickCounts[band.id] ?? 0}
        onToggle={() => togglePick(band.id)}
        onClick={() => openBand(band.id)}
        variant="timeline"
        pending={pendingBandIds.has(band.id)}
        hidePick
        isBandEnded
        missedCount={missedCountsByBand[band.id] ?? 0}
      />
    );
  }

  return (
    <div className={styles.page}>
      <OfflineBanner />
      <header className={styles.header}>
        <span className={styles.title}>{t('title')}</span>
        <div className={styles.summary}>
          <span className={styles.summaryLine}>
            {t('headerBandsDays', {
              bands: myBands.length,
              days: dayGroups.length,
            })}
          </span>
          {festivalActive && leftToday >= 1 && (
            <span className={`${styles.summaryLine} ${styles.summaryHighlight}`}>
              {t('headerLeftToday', { count: leftToday })}
            </span>
          )}
          <span className={styles.summaryLine}>
            {t('headerConflicts', {
              conflicts: totalConflicts,
            })}
          </span>
          {totalOverlaps > 0 && (
            <span className={styles.summaryLine}>
              {t('headerOverlaps', {
                overlaps: totalOverlaps,
              })}
            </span>
          )}
        </div>
      </header>

      {totalConflicts >= 3 && (
        <a href="/profile" className={styles.conflictBanner}>
          <Icon name="conflict" size={14} />
          {t('conflictWarningBanner', { count: totalConflicts })}
        </a>
      )}

      {!festivalActive && (
        <PlaylistLaunchButton bands={myBands} userName={displayName} />
      )}

      <main className={styles.list}>
        {loading && <p className={styles.empty}>{t('loading')}</p>}
        {!loading && myBands.length === 0 && (
          <div className={styles.emptyState}>
            <Icon name="pick" size={24} aria-hidden />
            {t('empty')}
          </div>
        )}
        {dayGroups.map((group) => {
          const isExpanded = !collapsedDays.has(group.dayKey);
          const dayPickCount = group.upcoming.length + group.ended.length;
          return (
            <section className={styles.daySection} key={group.dayKey}>
              <h2
                className={styles.dayHeader}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={() => toggleDayCollapse(group.dayKey)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleDayCollapse(group.dayKey);
                  }
                }}
              >
                <span>{dayLabel(group.dayKey)}</span>
                <span className={styles.dayHeaderRight}>
                  <small className={styles.dayHeaderCount}>
                    {t('dayPickCount', { count: dayPickCount })}
                  </small>
                  <span className={`${styles.dayCollapseChevron} ${isExpanded ? styles.dayCollapseChevronOpen : ''}`}>
                    <Icon name="chevron" size={12} />
                  </span>
                </span>
              </h2>
              <div className={`${styles.dayBands} ${isExpanded ? styles.dayBandsOpen : ''}`}>
                {group.upcoming.map(renderUpcomingBand)}
                {group.showDivider && (
                  <div className={styles.dayDivider} role="separator">
                    <span>{t('dividerAlreadyPlayedToday')}</span>
                  </div>
                )}
                {group.ended.map(renderEndedBand)}
              </div>
            </section>
          );
        })}
      </main>

      <BandDetailModalHost modalProps={modalProps} />

      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}
