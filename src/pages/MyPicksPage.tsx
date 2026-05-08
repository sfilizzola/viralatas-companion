import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Band } from '../types';
import { loadBands } from '../lib/db';
import { togglePick } from '../lib/picks';
import { bandDay } from '../lib/bandTime';
import { useAuth } from '../hooks/useAuth';
import { useMyPicks } from '../hooks/useMyPicks';
import { usePickCounts } from '../hooks/usePickCounts';
import { useBandConflicts } from '../hooks/useBandConflicts';
import { useI18n } from '../lib/i18n';
import BottomNav from '../components/BottomNav';
import BandCard from '../components/BandCard';
import styles from './SchedulePage.module.css';

export default function MyPicksPage() {
  const { t } = useI18n('MyPicksPage');
  const { t: tSchedule } = useI18n('SchedulePage');
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedConflict, setHighlightedConflict] = useState<string | null>(null);
  const { pickedIds, refresh: refreshPicks } = useMyPicks(userId);
  const pickCounts = usePickCounts();

  useEffect(() => {
    loadBands().then((data) => {
      setBands(data.sort((a, b) => a.start_time.localeCompare(b.start_time)));
      setLoading(false);
    });
  }, []);

  const myBands = useMemo(
    () => bands.filter((band) => pickedIds.has(band.id)),
    [bands, pickedIds],
  );

  const conflicts = useBandConflicts(myBands);

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

  function handleConflictClick(bandId: string) {
    const partners = conflicts.get(bandId);
    if (!partners || partners.length === 0) return;
    setHighlightedConflict((current) => (current === partners[0].id ? null : partners[0].id));
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.title}>{t('title')}</span>
        {!loading && myBands.length > 0 && (
          <div className={styles.summary}>
            {t('summary', {
              bands: myBands.length,
              days: grouped.length,
              conflicts: totalConflicts,
            })}
          </div>
        )}
      </header>

      <main className={styles.list}>
        {loading && <p className={styles.empty}>{t('loading')}</p>}
        {!loading && myBands.length === 0 && (
          <p className={styles.empty}>{t('empty')}</p>
        )}
        {grouped.map(([day, dayBands]) => (
          <section key={day}>
            <h2 className={styles.dayHeader}>
              <span>{dayLabel(day)}</span>
              <span className={styles.dayHeaderCount}>{dayBands.length}</span>
            </h2>
            {dayBands.map((band) => {
              const hasConflict = conflicts.has(band.id);
              return (
                <BandCard
                  key={band.id}
                  band={band}
                  isPicked={pickedIds.has(band.id)}
                  count={pickCounts[band.id] ?? 0}
                  onToggle={() => handleToggle(band.id)}
                  dense
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
          </section>
        ))}
      </main>

      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}
