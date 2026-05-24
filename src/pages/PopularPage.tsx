import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UserMissedBand } from '../types';
import { MISSED_CHANGED_EVENT } from '../lib/db';
import { picksRepository, missedRepository } from '../repositories';
import { useBandConflicts } from '../hooks/useBandConflicts';
import { useAuth } from '../hooks/useAuth';
import { useBands } from '../hooks/useBands';
import { useBandAttendees } from '../hooks/useBandAttendees';
import { useMyPicks } from '../hooks/useMyPicks';
import { usePickCounts } from '../hooks/usePickCounts';
import { useNow } from '../hooks/useNow';
import { useI18n } from '../lib/i18n';
import BottomNav from '../components/BottomNav';
import BandCard from '../components/BandCard';
import BandDetailModal from '../components/BandDetailModal';
import Icon from '../components/icons/Icon';
import styles from './SchedulePage.module.css';

export default function PopularPage() {
  const { t } = useI18n('PopularPage');
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [activeBandId, setActiveBandId] = useState<string | null>(null);
  const [allMissed, setAllMissed] = useState<UserMissedBand[]>([]);
  const { bands, loading } = useBands();
  const { pickedIds, refresh: refreshPicks } = useMyPicks(userId);
  const attendeesByBand = useBandAttendees();
  const pickCounts = usePickCounts();
  const currentNow = useNow(60_000);

  useEffect(() => {
    async function refreshMissed() {
      setAllMissed(await missedRepository.loadAll());
    }

    refreshMissed();
    if (userId) missedRepository.sync(userId).catch(() => {});

    const unsubscribeRealtime = missedRepository.subscribeToRealtime();
    window.addEventListener(MISSED_CHANGED_EVENT, refreshMissed);
    return () => {
      window.removeEventListener(MISSED_CHANGED_EVENT, refreshMissed);
      unsubscribeRealtime();
    };
  }, [userId]);

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

  const activeBand = useMemo(
    () => (activeBandId ? bands.find((b) => b.id === activeBandId) ?? null : null),
    [activeBandId, bands],
  );

  const pickedBands = useMemo(
    () => bands.filter((b) => pickedIds.has(b.id)),
    [bands, pickedIds],
  );

  const bandConflicts = useBandConflicts(pickedBands);

  const missedUserIds = useMemo<Set<string>>(() => {
    if (!activeBand) return new Set();
    return new Set(
      allMissed.filter((m) => m.band_id === activeBand.id).map((m) => m.user_id),
    );
  }, [allMissed, activeBand]);

  const isMissed = useMemo(
    () => !!(userId && activeBand && allMissed.some((m) => m.user_id === userId && m.band_id === activeBand.id)),
    [allMissed, userId, activeBand],
  );

  const isBandEnded = useMemo(
    () => !!activeBand && new Date(activeBand.end_time) < currentNow,
    [activeBand, currentNow],
  );

  const missedCountsByBand = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of allMissed) {
      map[m.band_id] = (map[m.band_id] ?? 0) + 1;
    }
    return map;
  }, [allMissed]);

  const handleToggle = useCallback(
    async (bandId: string) => {
      if (!userId) return;
      await picksRepository.toggle(userId, bandId, pickedIds.has(bandId));
      await refreshPicks();
    },
    [userId, pickedIds, refreshPicks],
  );

  const handleToggleMissed = useCallback(async () => {
    if (!userId || !activeBand) return;
    if (isMissed) {
      await missedRepository.unmark(userId, activeBand.id);
    } else {
      await missedRepository.mark(userId, activeBand.id);
    }
  }, [userId, activeBand, isMissed]);

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
              onClick={() => setActiveBandId(band.id)}
              variant="ranked"
              rank={index + 1}
              attendeeCluster={count > 0 ? { attendees, max: 5 } : undefined}
              isBandEnded={ended}
              missedCount={ended ? (missedCountsByBand[band.id] ?? 0) : undefined}
            />
          );
        })}
      </main>

      {activeBand && (
        <BandDetailModal
          band={activeBand}
          attendees={attendeesByBand[activeBand.id] ?? []}
          isPicked={pickedIds.has(activeBand.id)}
          onTogglePick={() => handleToggle(activeBand.id)}
          onClose={() => setActiveBandId(null)}
          isBandEnded={isBandEnded}
          hidePick={isBandEnded}
          missedUserIds={missedUserIds}
          isMissed={isMissed}
          onToggleMissed={handleToggleMissed}
          conflictBands={
            bandConflicts
              .get(activeBand.id)
              ?.filter((e) => e.severity === 'hard')
              .map((e) => e.band) ?? []
          }
          overlapBands={
            bandConflicts
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
