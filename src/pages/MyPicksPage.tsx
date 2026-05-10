import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Band, UserMissedBand } from '../types';
import { loadBands, MISSED_CHANGED_EVENT } from '../lib/db';
import { togglePick } from '../lib/picks';
import { loadAllMissed, markMissed, unmarkMissed, syncMissedBands, subscribeToMissedRealtime } from '../lib/missed';
import { bandDay } from '../lib/bandTime';
import { useAuth } from '../hooks/useAuth';
import { useBandAttendees } from '../hooks/useBandAttendees';
import { useMyPicks } from '../hooks/useMyPicks';
import { usePickCounts } from '../hooks/usePickCounts';
import { useBandConflicts } from '../hooks/useBandConflicts';
import { useI18n } from '../lib/i18n';
import { useNow } from '../hooks/useNow';
import { useOfflinePendingBandIds } from '../hooks/useOfflinePendingBandIds';
import BottomNav from '../components/BottomNav';
import OfflineBanner from '../components/OfflineBanner';
import BandCard from '../components/BandCard';
import BandDetailModal from '../components/BandDetailModal';
import Icon from '../components/icons/Icon';
import styles from './SchedulePage.module.css';

export default function MyPicksPage() {
  const { t } = useI18n('MyPicksPage');
  const { t: tSchedule } = useI18n('SchedulePage');
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedConflict, setHighlightedConflict] = useState<string | null>(null);
  const [activeBandId, setActiveBandId] = useState<string | null>(null);
  const [allMissed, setAllMissed] = useState<UserMissedBand[]>([]);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const { pickedIds, refresh: refreshPicks } = useMyPicks(userId);
  const attendeesByBand = useBandAttendees();
  const pickCounts = usePickCounts();
  const currentNow = useNow(60_000);
  const pendingBandIds = useOfflinePendingBandIds();

  useEffect(() => {
    loadBands().then((data) => {
      setBands(data.sort((a, b) => a.start_time.localeCompare(b.start_time)));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    async function refreshMissed() {
      setAllMissed(await loadAllMissed());
    }

    refreshMissed();
    if (userId) syncMissedBands(userId).catch(() => {});

    const unsubscribeRealtime = subscribeToMissedRealtime();
    window.addEventListener(MISSED_CHANGED_EVENT, refreshMissed);
    return () => {
      window.removeEventListener(MISSED_CHANGED_EVENT, refreshMissed);
      unsubscribeRealtime();
    };
  }, [userId]);

  const myBands = useMemo(
    () => bands.filter((band) => pickedIds.has(band.id)),
    [bands, pickedIds],
  );

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
    () =>
      !!(
        userId &&
        activeBand &&
        allMissed.some((missed) => missed.user_id === userId && missed.band_id === activeBand.id)
      ),
    [allMissed, userId, activeBand],
  );

  const isBandEnded = useMemo(
    () => !!activeBand && new Date(activeBand.end_time) < currentNow,
    [activeBand, currentNow],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Band[]>();
    for (const band of myBands) {
      const day = bandDay(band);
      const list = map.get(day) ?? [];
      list.push(band);
      map.set(day, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [myBands]);

  const totalConflicts = useMemo(() => {
    const ids = new Set<string>();
    for (const id of conflicts.keys()) ids.add(id);
    return ids.size;
  }, [conflicts]);

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

  const handleToggle = useCallback(
    async (bandId: string) => {
      if (!userId) return;
      await togglePick(userId, bandId, pickedIds.has(bandId));
      await refreshPicks();
    },
    [userId, pickedIds, refreshPicks],
  );

  const handleToggleMissed = useCallback(async () => {
    if (!userId || !activeBand) return;
    if (isMissed) {
      await unmarkMissed(userId, activeBand.id);
    } else {
      await markMissed(userId, activeBand.id);
    }
  }, [userId, activeBand, isMissed]);

  function toggleDayCollapse(day: string) {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  }

  function handleConflictClick(bandId: string) {
    const partners = conflicts.get(bandId);
    if (!partners || partners.length === 0) return;
    setHighlightedConflict((current) => (current === partners[0].id ? null : partners[0].id));
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
        </div>
      </header>

      <main className={styles.list}>
        {loading && <p className={styles.empty}>{t('loading')}</p>}
        {!loading && myBands.length === 0 && (
          <p className={styles.empty}>{t('empty')}</p>
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
                  const hasConflict = conflicts.has(band.id);
                  return (
                    <BandCard
                      key={band.id}
                      band={band}
                      isPicked={pickedIds.has(band.id)}
                      count={pickCounts[band.id] ?? 0}
                      onToggle={() => handleToggle(band.id)}
                      onClick={() => setActiveBandId(band.id)}
                      variant="timeline"
                      pending={pendingBandIds.has(band.id)}
                      conflict={
                        hasConflict
                          ? {
                              active: highlightedConflict === band.id,
                              onClick: () => handleConflictClick(band.id),
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            </section>
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
          missedUserIds={missedUserIds}
          isMissed={isMissed}
          onToggleMissed={handleToggleMissed}
          conflictBands={conflicts.get(activeBand.id) ?? []}
        />
      )}

      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}
