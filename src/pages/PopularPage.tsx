import { useEffect, useMemo, useState } from 'react';
import { useBandConflicts } from '../hooks/useBandConflicts';
import { useAuth } from '../hooks/useAuth';
import { useBandDetailModal } from '../hooks/useBandDetailModal';
import { BandDetailModalHost } from '../components/BandDetailModalHost';
import { useBands } from '../hooks/useBands';
import { useBandAttendees } from '../hooks/useBandAttendees';
import { useBandRatings } from '../hooks/useBandRatings';
import { useMissedBands } from '../hooks/useMissedBands';
import { usePickActions } from '../hooks/usePickActions';
import { usePickCounts } from '../hooks/usePickCounts';
import { useNow } from '../hooks/useNow';
import { useI18n } from '../lib/i18n';
import { formatRatingAvg, sortBandsByRating } from '../services/bandRatings';
import BottomNav from '../components/BottomNav';
import BandCard from '../components/BandCard';
import Icon from '../components/icons/Icon';
import styles from './SchedulePage.module.css';

type SortMode = 'picks' | 'rating';

const STORAGE_KEY = 'popularSortMode';

export default function PopularPage() {
  const { t } = useI18n('PopularPage');
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const { bands, loading } = useBands();
  const { allMissed, missedBandIds, missedCountsByBand, toggleMissed } = useMissedBands(userId);
  const { pickedIds, togglePick } = usePickActions(userId);
  const { userRatingByBand, aggregates, toggleRating, clearRating } = useBandRatings(userId);
  const attendeesByBand = useBandAttendees();
  const pickCounts = usePickCounts();
  const currentNow = useNow(60_000);

  const hasRatedBands = useMemo(
    () => Object.values(aggregates).some((aggregate) => (aggregate?.count ?? 0) > 0),
    [aggregates],
  );

  const [sortMode, setSortMode] = useState<SortMode>(() => {
    if (typeof sessionStorage === 'undefined') return 'picks';
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored === 'rating' ? 'rating' : 'picks';
  });

  useEffect(() => {
    if (!hasRatedBands) {
      setSortMode('picks');
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, sortMode);
  }, [hasRatedBands, sortMode]);

  const popularBands = useMemo(
    () =>
      [...bands]
        .filter((b) => b.category !== 'ceremony' && (pickCounts[b.id] ?? 0) > 0)
        .sort((a, b) => {
          const countDelta = (pickCounts[b.id] ?? 0) - (pickCounts[a.id] ?? 0);
          if (countDelta !== 0) return countDelta;
          return a.start_time.localeCompare(b.start_time);
        }),
    [bands, pickCounts],
  );

  const ratedBands = useMemo(() => {
    const withRatings = bands.filter(
      (band) => band.category !== 'ceremony' && (aggregates[band.id]?.count ?? 0) > 0,
    );
    return sortBandsByRating(withRatings, aggregates);
  }, [bands, aggregates]);

  const displayBands = sortMode === 'rating' ? ratedBands : popularBands;

  // Magnitude-bar scale: top band's pick count (list is sorted desc).
  const maxPickCount =
    popularBands.length > 0 ? (pickCounts[popularBands[0].id] ?? 0) : 0;

  const totalViraLatas = useMemo(() => {
    const userIds = new Set<string>();
    for (const attendees of Object.values(attendeesByBand)) {
      for (const attendee of attendees) userIds.add(attendee.id);
    }
    return userIds.size;
  }, [attendeesByBand]);

  const pickedBands = useMemo(
    () => bands.filter((b) => pickedIds.has(b.id)),
    [bands, pickedIds],
  );

  const bandConflicts = useBandConflicts(pickedBands);
  const { openBand, modalProps } = useBandDetailModal({
    bands,
    pickedIds,
    togglePick,
    allMissed,
    missedBandIds,
    toggleMissed,
    attendeesByBand,
    currentNow,
    conflicts: bandConflicts,
    userRatingByBand,
    toggleRating,
    clearRating,
  });

  const headerSortedKey = sortMode === 'rating' ? 'headerSortedRating' : 'headerSortedPicks';

  return (
    <div className={styles.page}>
      <header className={`${styles.header} ${styles.popularHeader}`}>
        <div className={styles.popularHeaderTop}>
          <span className={styles.title}>{t('title')}</span>
          {hasRatedBands && (
            <div className={styles.sortPill} role="group" aria-label={t('sortModeLabel')}>
              <button
                type="button"
                className={`${styles.sortPillBtn} ${sortMode === 'picks' ? styles.sortPillActive : ''}`}
                onClick={() => setSortMode('picks')}
                aria-pressed={sortMode === 'picks'}
              >
                {t('popularModePicks')}
              </button>
              <button
                type="button"
                className={`${styles.sortPillBtn} ${sortMode === 'rating' ? styles.sortPillActive : ''}`}
                onClick={() => setSortMode('rating')}
                aria-pressed={sortMode === 'rating'}
              >
                {t('popularModeRating')}
              </button>
            </div>
          )}
        </div>
        <p className={styles.popularHeaderMeta}>
          <span>{t('headerViraLatas', { count: totalViraLatas })}</span>
          <span className={styles.popularHeaderSep} aria-hidden>
            ·
          </span>
          <span>{t(headerSortedKey)}</span>
        </p>
      </header>

      <main className={`${styles.list} ${styles.scheduleList}`}>
        {loading && <p className={styles.empty}>{t('loading')}</p>}
        {!loading && displayBands.length === 0 && (
          <div className={styles.emptyState}>
            <Icon name="popular" size={24} aria-hidden />
            {t(sortMode === 'rating' ? 'emptyRated' : 'empty')}
          </div>
        )}
        {displayBands.map((band, index) => {
          const attendees = attendeesByBand[band.id] ?? [];
          const count = pickCounts[band.id] ?? 0;
          const ended = new Date(band.end_time) < currentNow;
          const aggregate = aggregates[band.id];
          const userScore = userRatingByBand[band.id];

          return (
            <BandCard
              key={band.id}
              band={band}
              isPicked={pickedIds.has(band.id)}
              count={count}
              onToggle={() => {}}
              onClick={() => openBand(band.id)}
              variant="ranked"
              rank={index + 1}
              attendeeCluster={
                sortMode === 'picks' && count > 0 ? { attendees, max: 5 } : undefined
              }
              isBandEnded={ended}
              missedCount={ended ? (missedCountsByBand[band.id] ?? 0) : undefined}
              showDayLabel
              ratingStats={
                sortMode === 'rating' && aggregate
                  ? {
                      avgFormatted: formatRatingAvg(aggregate.avg),
                      count: aggregate.count,
                      userScore,
                    }
                  : undefined
              }
              magnitude={
                sortMode === 'rating'
                  ? aggregate
                    ? { value: aggregate.avg, max: 5, tone: 'accent' }
                    : undefined
                  : { value: count, max: maxPickCount, tone: 'stage' }
              }
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
