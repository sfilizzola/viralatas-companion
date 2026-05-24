import { useMemo } from 'react';
import { useBandConflicts } from '../hooks/useBandConflicts';
import { useAuth } from '../hooks/useAuth';
import { useBandDetailModal } from '../hooks/useBandDetailModal';
import { BandDetailModalHost } from '../components/BandDetailModalHost';
import { useBands } from '../hooks/useBands';
import { useBandAttendees } from '../hooks/useBandAttendees';
import { useMissedBands } from '../hooks/useMissedBands';
import { usePickActions } from '../hooks/usePickActions';
import { usePickCounts } from '../hooks/usePickCounts';
import { useNow } from '../hooks/useNow';
import { useI18n } from '../lib/i18n';
import BottomNav from '../components/BottomNav';
import BandCard from '../components/BandCard';
import Icon from '../components/icons/Icon';
import styles from './SchedulePage.module.css';

export default function PopularPage() {
  const { t } = useI18n('PopularPage');
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const { bands, loading } = useBands();
  const { allMissed, missedBandIds, missedCountsByBand, toggleMissed } = useMissedBands(userId);
  const { pickedIds, togglePick } = usePickActions(userId);
  const attendeesByBand = useBandAttendees();
  const pickCounts = usePickCounts();
  const currentNow = useNow(60_000);

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
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.title}>{t('title')}</span>
        <div className={styles.summary}>
          <span className={styles.summaryLine}>{t('headerViraLatas', { count: totalViraLatas })}</span>
          <span className={styles.summaryLine}>{t('headerSorted')}</span>
        </div>
      </header>

      <main className={`${styles.list} ${styles.scheduleList}`}>
        {loading && <p className={styles.empty}>{t('loading')}</p>}
        {!loading && popularBands.length === 0 && (
          <div className={styles.emptyState}>
            <Icon name="popular" size={24} aria-hidden />
            {t('empty')}
          </div>
        )}
        {popularBands.map((band, index) => {
          const attendees = attendeesByBand[band.id] ?? [];
          const count = pickCounts[band.id] ?? 0;

          const ended = new Date(band.end_time) < currentNow;
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
              attendeeCluster={count > 0 ? { attendees, max: 5 } : undefined}
              isBandEnded={ended}
              missedCount={ended ? (missedCountsByBand[band.id] ?? 0) : undefined}
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
