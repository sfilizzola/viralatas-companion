import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Band } from '../types';
import { bandDay } from '../services/bandTime';
import { filterBands } from '../services/bandFilter';
import { loadStoredFilters, saveStoredFilters } from '../services/scheduleFilterStorage';
import { useAuth } from '../hooks/useAuth';
import { useBands } from '../hooks/useBands';
import { usePickActions } from '../hooks/usePickActions';
import { useNow } from '../hooks/useNow';
import { usePickCounts } from '../hooks/usePickCounts';
import { useDuckQuack } from '../hooks/useDuckQuack';
import { useDuckEnabled } from '../contexts/DuckEnabledContext';
import { useBandAttendees } from '../hooks/useBandAttendees';
import { useI18n } from '../lib/i18n';
import { useOfflinePendingBandIds } from '../hooks/useOfflinePendingBandIds';
import { useMissedBands } from '../hooks/useMissedBands';
import { useBandRatings } from '../hooks/useBandRatings';
import { useBandDetailModal } from '../hooks/useBandDetailModal';
import BottomNav from '../components/BottomNav';
import OfflineBanner from '../components/OfflineBanner';
import BandCard from '../components/BandCard';
import BandFilters from '../components/BandFilters';
import AnnouncementPosterGrid from '../components/AnnouncementPosterGrid';
import { BandDetailModalHost } from '../components/BandDetailModalHost';
import Icon from '../components/icons/Icon';
import { EMPTY_FILTERS, type BandFilterValue } from '../components/bandFilterValue';
import type { BandAttendee } from '../hooks/useBandAttendees';
import { useActiveFestival } from '../hooks/useActiveFestival';
import { isTimedBand, timedBands } from '../services/timedBand';
import { hasRunningOrder } from '../lib/festivalFeatures';
import {
  sortAnnouncementBands,
  splitAnnouncementHero,
} from '../services/announcementLineup';
import styles from './SchedulePage.module.css';

/**
 * Wraps BandCard with per-band duck quack capability.
 * Hook is always called (with null values when duck shouldn't show)
 * so React's rules of hooks are satisfied inside the mapped list.
 */
function DuckableBandCard({
  band,
  isPicked,
  isLive,
  userId,
  sharedPick,
  ...rest
}: {
  band: Band;
  isPicked: boolean;
  isLive: boolean;
  userId: string | null;
  count: number;
  onToggle: () => void;
  onClick: () => void;
  pending: boolean;
  isBandEnded: boolean;
  showScheduleChrome?: boolean;
  showDayLabel?: boolean;
  sharedPick?: boolean;
}) {
  const duckEnabled = useDuckEnabled();
  const canDuck = duckEnabled && isLive && isPicked && band.category !== 'ceremony';
  const { quack, isOnCooldown, cooldownUntil } = useDuckQuack(
    canDuck ? userId : null,
    canDuck ? band.id : null,
  );

  return (
    <BandCard
      band={band}
      isPicked={isPicked}
      onDuck={canDuck ? quack : undefined}
      duckCooldownUntil={isOnCooldown && cooldownUntil ? cooldownUntil : undefined}
      sharedPick={sharedPick}
      {...rest}
    />
  );
}

export default function LineupPage() {
  const { t } = useI18n('SchedulePage');
  const { session } = useAuth();
  const { festival } = useActiveFestival();
  const userId = session?.user?.id ?? null;
  const scheduleEra = hasRunningOrder(festival);

  const [filters, setFilters] = useState<BandFilterValue>(loadStoredFilters);

  const { bands, loading } = useBands();
  const hashRestoredRef = useRef(false);
  const { pickedIds, togglePick } = usePickActions(userId);
  const pickCounts = usePickCounts();
  const currentTime = useNow();
  const pendingBandIds = useOfflinePendingBandIds();
  const attendeeMap = useBandAttendees();
  const { allMissed, missedBandIds, toggleMissed } = useMissedBands(userId);
  const { userRatingByBand, toggleRating, clearRating } = useBandRatings(userId);

  const effectiveFilters = useMemo(
    () =>
      scheduleEra
        ? filters
        : { ...EMPTY_FILTERS, query: filters.query, genre: filters.genre },
    [filters, scheduleEra],
  );

  useEffect(() => {
    if (!scheduleEra || loading || hashRestoredRef.current) return;
    hashRestoredRef.current = true;

    const hashMatch = /^#day-(\d+)$/.exec(globalThis.location.hash);
    if (hashMatch) {
      const dayIdx = Number.parseInt(hashMatch[1], 10) - 1;
      const uniqueDays = [
        ...new Set(timedBands(bands, festival).map((band) => bandDay(band.start_time))),
      ].sort();
      if (uniqueDays[dayIdx]) {
        setFilters((prev) => ({ ...prev, day: uniqueDays[dayIdx] }));
      }
    }
  }, [scheduleEra, loading, bands, festival]);

  useEffect(() => {
    saveStoredFilters(
      scheduleEra
        ? filters
        : { ...EMPTY_FILTERS, query: filters.query, genre: filters.genre },
    );
  }, [filters, scheduleEra]);

  const getDayLabel = useCallback(
    (dateStr: string): string => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getUTCDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
      return t(dayNames[dayOfWeek]);
    },
    [t],
  );

  const festivalDays = useMemo(() => {
    const uniqueDays = [
      ...new Set(timedBands(bands, festival).map((band) => bandDay(band.start_time))),
    ].sort();
    return uniqueDays.map((date) => ({ label: getDayLabel(date), date }));
  }, [bands, festival, getDayLabel]);

  const stages = useMemo(
    () => [...new Set(timedBands(bands, festival).map((b) => b.stage))].sort(),
    [bands, festival],
  );
  const genres = useMemo(
    () =>
      [...new Set(bands.map((b) => b.genre).filter((g): g is string => Boolean(g)))].sort(),
    [bands],
  );

  const picksByUserId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const [bandId, attendees] of Object.entries(attendeeMap)) {
      for (const attendee of attendees as BandAttendee[]) {
        if (!map.has(attendee.id)) map.set(attendee.id, new Set());
        map.get(attendee.id)!.add(bandId);
      }
    }
    return map;
  }, [attendeeMap]);

  const crewWithPicks = useMemo(() => {
    const seen = new Set<string>();
    const result: BandAttendee[] = [];
    for (const attendees of Object.values(attendeeMap)) {
      for (const attendee of attendees as BandAttendee[]) {
        if (attendee.id !== userId && !seen.has(attendee.id)) {
          seen.add(attendee.id);
          result.push(attendee);
        }
      }
    }
    return result.sort((a, b) => a.label.localeCompare(b.label));
  }, [attendeeMap, userId]);

  const crewPickCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [userId, pickIds] of picksByUserId) {
      counts[userId] = pickIds.size;
    }
    return counts;
  }, [picksByUserId]);

  const viewedUserPickIds = effectiveFilters.userId
    ? (picksByUserId.get(effectiveFilters.userId) ?? null)
    : null;

  const viewedUserPickCount = effectiveFilters.userId
    ? (picksByUserId.get(effectiveFilters.userId)?.size ?? 0)
    : 0;

  const announcementFiltered = useMemo(() => {
    const query = effectiveFilters.query.trim().toLowerCase();
    return bands.filter(
      (band) =>
        (!query || band.name.toLowerCase().includes(query)) &&
        (!effectiveFilters.genre || band.genre === effectiveFilters.genre),
    );
  }, [bands, effectiveFilters.query, effectiveFilters.genre]);

  const announcementSorted = useMemo(
    () => sortAnnouncementBands(announcementFiltered, pickCounts),
    [announcementFiltered, pickCounts],
  );
  const announcementSplit = useMemo(
    () => splitAnnouncementHero(announcementSorted, pickCounts),
    [announcementSorted, pickCounts],
  );

  const scheduleFiltered = useMemo(
    () => filterBands(bands, effectiveFilters, currentTime, viewedUserPickIds ?? undefined),
    [bands, effectiveFilters, currentTime, viewedUserPickIds],
  );
  const timedFiltered = useMemo(
    () => scheduleFiltered.filter((band) => isTimedBand(band, festival)),
    [scheduleFiltered, festival],
  );
  const leftoverBands = useMemo(
    () =>
      scheduleFiltered
        .filter((band) => !isTimedBand(band, festival))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [scheduleFiltered, festival],
  );
  const filtered = scheduleEra ? scheduleFiltered : announcementSorted;

  const conflicts = useMemo(() => new Map(), []);
  const { openBand, modalProps } = useBandDetailModal({
    bands,
    pickedIds,
    togglePick,
    allMissed,
    missedBandIds,
    toggleMissed,
    attendeesByBand: attendeeMap,
    currentNow: currentTime,
    conflicts,
    userRatingByBand,
    toggleRating,
    clearRating,
    festival,
  });

  return (
    <div className={styles.page}>
      <OfflineBanner />
      <header className={styles.header}>
        <span className={styles.title}>{t('title')}</span>
        <div className={styles.summary}>
          <span className={styles.summaryLine}>
            {t('headerBands', { count: scheduleEra ? bands.length : filtered.length })}
          </span>
          {scheduleEra ? (
            <span className={styles.summaryLine}>{t('headerStages', { count: stages.length })}</span>
          ) : (
            <span className={styles.summaryHighlight}>{t('eraNoRunningOrder')}</span>
          )}
        </div>
      </header>

      {!scheduleEra && <div className={styles.announcementBanner}>{t('announcementBanner')}</div>}

      <BandFilters
        mode={scheduleEra ? 'schedule' : 'announcement'}
        value={effectiveFilters}
        onChange={setFilters}
        days={festivalDays}
        stages={stages}
        genres={genres}
        filteredCount={filtered.length}
        crewWithPicks={crewWithPicks}
        crewPickCounts={crewPickCounts}
        viewedUserPickCount={viewedUserPickCount}
      />

      <main className={`${styles.list} ${styles.scheduleList} ${!scheduleEra ? styles.announcementList : ''}`}>
        {loading && <p className={styles.empty}>{t('loadingSchedule')}</p>}
        {!loading && filtered.length === 0 && (
          <div className={styles.emptyState}>
            <Icon name="search" size={24} aria-hidden />
            {effectiveFilters.userId ? t('noPicksForUser') : t('emptySchedule')}
          </div>
        )}
        {!loading && !scheduleEra && filtered.length > 0 && (
          <AnnouncementPosterGrid
            hero={announcementSplit.hero}
            rest={announcementSplit.rest}
            pickCounts={pickCounts}
            pickedIds={pickedIds}
            pendingBandIds={pendingBandIds}
            heroBadge={t('heroBadge')}
            onOpenBand={openBand}
            onTogglePick={(bandId) => void togglePick(bandId)}
          />
        )}
        {scheduleEra && [...timedFiltered, ...leftoverBands].map((band) => {
          const showScheduleChrome = isTimedBand(band, festival);
          const isLive =
            showScheduleChrome &&
            new Date(band.start_time) <= currentTime &&
            currentTime < new Date(band.end_time);
          const sharedPick =
            effectiveFilters.userId != null && pickedIds.has(band.id);
          return (
            <DuckableBandCard
              key={band.id}
              band={band}
              isPicked={pickedIds.has(band.id)}
              isLive={isLive}
              userId={userId}
              count={pickCounts[band.id] ?? 0}
              onToggle={() => togglePick(band.id)}
              onClick={() =>
                showScheduleChrome ? void togglePick(band.id) : openBand(band.id)
              }
              pending={pendingBandIds.has(band.id)}
              isBandEnded={showScheduleChrome && new Date(band.end_time) < currentTime}
              showDayLabel={effectiveFilters.day === null}
              showScheduleChrome={showScheduleChrome}
              sharedPick={sharedPick}
            />
          );
        })}
      </main>

      <BandDetailModalHost modalProps={modalProps} />

      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}
