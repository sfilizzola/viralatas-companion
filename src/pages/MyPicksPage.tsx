import { useCallback, useMemo, useState } from 'react';
import type { Band } from '../types';
import { bandDay } from '../services/bandTime';
import { useAuth } from '../hooks/useAuth';
import { useBands } from '../hooks/useBands';
import { useBandAttendees } from '../hooks/useBandAttendees';
import { useMissedBands } from '../hooks/useMissedBands';
import { usePickActions } from '../hooks/usePickActions';
import { usePickCounts } from '../hooks/usePickCounts';
import { useBandConflicts } from '../hooks/useBandConflicts';
import { useI18n } from '../lib/i18n';
import { useNow } from '../hooks/useNow';
import { useOfflinePendingBandIds } from '../hooks/useOfflinePendingBandIds';
import { isFestivalActive } from '../services/time';
import BottomNav from '../components/BottomNav';
import OfflineBanner from '../components/OfflineBanner';
import BandCard from '../components/BandCard';
import BandDetailModal from '../components/BandDetailModal';
import Icon from '../components/icons/Icon';
import PlaylistLaunchButton from '../components/PlaylistLaunchButton';
import styles from './SchedulePage.module.css';

export default function MyPicksPage() {
  const { t } = useI18n('MyPicksPage');
  const { t: tSchedule } = useI18n('SchedulePage');
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const displayName =
    (session?.user?.user_metadata?.['display_name'] as string | undefined) ??
    session?.user?.email?.split('@')[0] ??
    '';

  const [highlightedConflict, setHighlightedConflict] = useState<string | null>(null);
  const [activeBandId, setActiveBandId] = useState<string | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const { bands: rawBands, loading } = useBands();
  const { allMissed, missedBandIds, missedCountsByBand, toggleMissed } = useMissedBands(userId);
  const bands = useMemo(
    () => rawBands.slice().sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [rawBands],
  );
  const { pickedIds, togglePick } = usePickActions(userId);
  const attendeesByBand = useBandAttendees();
  const pickCounts = usePickCounts();
  const currentNow = useNow(60_000);
  const pendingBandIds = useOfflinePendingBandIds();

  const myBands = useMemo(
    () => bands.filter((band) => pickedIds.has(band.id)),
    [bands, pickedIds],
  );

  const upcomingBands = useMemo(
    () => myBands.filter((band) => new Date(band.end_time) >= currentNow),
    [myBands, currentNow],
  );

  const endedBands = useMemo(
    () => myBands.filter((band) => new Date(band.end_time) < currentNow),
    [myBands, currentNow],
  );

  const sawBands = useMemo(
    () => endedBands.filter((band) => !missedBandIds.has(band.id)),
    [endedBands, missedBandIds],
  );

  const didntSeeBands = useMemo(
    () => endedBands.filter((band) => missedBandIds.has(band.id)),
    [endedBands, missedBandIds],
  );

  const festivalActive = isFestivalActive(currentNow);
  const conflicts = useBandConflicts(myBands);

  const activeBand = useMemo(
    () => (activeBandId ? bands.find((band) => band.id === activeBandId) ?? null : null),
    [activeBandId, bands],
  );

  const missedUserIds = useMemo<Set<string>>(() => {
    if (!activeBand) return new Set();
    return new Set(
      allMissed.filter((missed) => missed.band_id === activeBand.id).map((missed) => missed.user_id),
    );
  }, [allMissed, activeBand]);

  const isMissed = useMemo(
    () => !!(activeBand && missedBandIds.has(activeBand.id)),
    [missedBandIds, activeBand],
  );

  const isBandEnded = useMemo(
    () => !!activeBand && new Date(activeBand.end_time) < currentNow,
    [activeBand, currentNow],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Band[]>();
    for (const band of upcomingBands) {
      const day = bandDay(band);
      const list = map.get(day) ?? [];
      list.push(band);
      map.set(day, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [upcomingBands]);

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

  const handleToggleMissed = useCallback(async () => {
    if (!activeBand) return;
    await toggleMissed(activeBand.id);
  }, [activeBand, toggleMissed]);

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

  return (
    <div className={styles.page}>
      <OfflineBanner />
      <header className={styles.header}>
        <span className={styles.title}>{t('title')}</span>
        <div className={styles.summary}>
          <span className={styles.summaryLine}>
            {t('headerBandsDays', {
              bands: myBands.length,
              days: grouped.length,
            })}
          </span>
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
        {grouped.map(([day, dayBands]) => {
          const isExpanded = !collapsedDays.has(day);
          return (
            <section className={styles.daySection} key={day}>
              <h2
                className={styles.dayHeader}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={() => toggleDayCollapse(day)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleDayCollapse(day);
                  }
                }}
              >
                <span>{dayLabel(day)}</span>
                <span className={styles.dayHeaderRight}>
                  <small className={styles.dayHeaderCount}>
                    {t('dayPickCount', { count: dayBands.length })}
                  </small>
                  <span className={`${styles.dayCollapseChevron} ${isExpanded ? styles.dayCollapseChevronOpen : ''}`}>
                    <Icon name="chevron" size={12} />
                  </span>
                </span>
              </h2>
              <div className={`${styles.dayBands} ${isExpanded ? styles.dayBandsOpen : ''}`}>
                {dayBands.map((band) => {
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
                      onClick={() => setActiveBandId(band.id)}
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
                      isBandEnded={new Date(band.end_time) < currentNow}
                      missedCount={missedCountsByBand[band.id] ?? 0}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}

        {sawBands.length > 0 && (() => {
          const key = '__saw__';
          const isExpanded = !collapsedDays.has(key);
          return (
            <section className={styles.daySection} key={key}>
              <h2
                className={`${styles.dayHeader} ${styles.dayHeaderSaw}`}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={() => toggleDayCollapse(key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleDayCollapse(key);
                  }
                }}
              >
                <span>{t('sectionSaw', { count: sawBands.length })}</span>
                <span className={styles.dayHeaderRight}>
                  <span className={`${styles.dayCollapseChevron} ${isExpanded ? styles.dayCollapseChevronOpen : ''}`}>
                    <Icon name="chevron" size={12} />
                  </span>
                </span>
              </h2>
              <div className={`${styles.dayBands} ${isExpanded ? styles.dayBandsOpen : ''}`}>
                {sawBands.map((band) => (
                  <BandCard
                    key={band.id}
                    band={band}
                    isPicked={pickedIds.has(band.id)}
                    count={pickCounts[band.id] ?? 0}
                    onToggle={() => togglePick(band.id)}
                    onClick={() => setActiveBandId(band.id)}
                    variant="timeline"
                    pending={pendingBandIds.has(band.id)}
                    hidePick
                    isBandEnded
                    missedCount={missedCountsByBand[band.id] ?? 0}
                  />
                ))}
              </div>
            </section>
          );
        })()}

        {didntSeeBands.length > 0 && (() => {
          const key = '__didntSee__';
          const isExpanded = !collapsedDays.has(key);
          return (
            <section className={styles.daySection} key={key}>
              <h2
                className={`${styles.dayHeader} ${styles.dayHeaderDidntSee}`}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={() => toggleDayCollapse(key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleDayCollapse(key);
                  }
                }}
              >
                <span>{t('sectionDidntSee', { count: didntSeeBands.length })}</span>
                <span className={styles.dayHeaderRight}>
                  <span className={`${styles.dayCollapseChevron} ${isExpanded ? styles.dayCollapseChevronOpen : ''}`}>
                    <Icon name="chevron" size={12} />
                  </span>
                </span>
              </h2>
              <div className={`${styles.dayBands} ${isExpanded ? styles.dayBandsOpen : ''}`}>
                {didntSeeBands.map((band) => (
                  <BandCard
                    key={band.id}
                    band={band}
                    isPicked={pickedIds.has(band.id)}
                    count={pickCounts[band.id] ?? 0}
                    onToggle={() => togglePick(band.id)}
                    onClick={() => setActiveBandId(band.id)}
                    variant="timeline"
                    pending={pendingBandIds.has(band.id)}
                    hidePick
                    isBandEnded
                    missedCount={missedCountsByBand[band.id] ?? 0}
                  />
                ))}
              </div>
            </section>
          );
        })()}
      </main>

      {activeBand && (
        <BandDetailModal
          band={activeBand}
          attendees={attendeesByBand[activeBand.id] ?? []}
          isPicked={pickedIds.has(activeBand.id)}
          onTogglePick={() => togglePick(activeBand.id)}
          onClose={() => setActiveBandId(null)}
          isBandEnded={isBandEnded}
          hidePick={isBandEnded}
          missedUserIds={missedUserIds}
          isMissed={isMissed}
          onToggleMissed={handleToggleMissed}
          conflictBands={
            conflicts
              .get(activeBand.id)
              ?.filter((e) => e.severity === 'hard')
              .map((e) => e.band) ?? []
          }
          overlapBands={
            conflicts
              .get(activeBand.id)
              ?.filter((e) => e.severity === 'soft')
              .map((e) => e.band) ?? []
          }
        />
      )}

      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}
