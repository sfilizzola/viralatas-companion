import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Band } from '../types';
import { loadBands } from '../lib/db';
import { picksRepository } from '../repositories';
import { bandDay } from '../services/bandTime';
import { filterBands } from '../services/bandFilter';
import { loadStoredFilters, saveStoredFilters } from '../services/scheduleFilterStorage';
import { useAuth } from '../hooks/useAuth';
import { useMyPicks } from '../hooks/useMyPicks';
import { useNow } from '../hooks/useNow';
import { usePickCounts } from '../hooks/usePickCounts';
import { useI18n } from '../lib/i18n';
import { useOfflinePendingBandIds } from '../hooks/useOfflinePendingBandIds';
import BottomNav from '../components/BottomNav';
import OfflineBanner from '../components/OfflineBanner';
import BandCard from '../components/BandCard';
import BandFilters from '../components/BandFilters';
import Icon from '../components/icons/Icon';
import type { BandFilterValue } from '../components/bandFilterValue';
import styles from './SchedulePage.module.css';

export default function SchedulePage() {
  const { t } = useI18n('SchedulePage');
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BandFilterValue>(loadStoredFilters);

  const { pickedIds, refresh: refreshPicks } = useMyPicks(userId);
  const pickCounts = usePickCounts();
  const currentTime = useNow();
  const pendingBandIds = useOfflinePendingBandIds();

  useEffect(() => {
    loadBands().then((data) => {
      setBands(data);
      setLoading(false);

      // Restore day from URL hash (#day-1, #day-2, ...) on initial load
      const hashMatch = /^#day-(\d+)$/.exec(globalThis.location.hash);
      if (hashMatch) {
        const dayIdx = Number.parseInt(hashMatch[1], 10) - 1;
        const uniqueDays = [...new Set(data.map(bandDay))].sort();
        if (uniqueDays[dayIdx]) {
          setFilters((prev) => ({ ...prev, day: uniqueDays[dayIdx] }));
        }
      }
    });
  }, []);

  useEffect(() => {
    saveStoredFilters(filters);
  }, [filters]);

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
    const uniqueDays = [...new Set(bands.map(bandDay))].sort();
    return uniqueDays.map((date) => ({ label: getDayLabel(date), date }));
  }, [bands, getDayLabel]);

  const stages = useMemo(() => [...new Set(bands.map((b) => b.stage))].sort(), [bands]);
  const genres = useMemo(
    () =>
      [...new Set(bands.map((b) => b.genre).filter((g): g is string => Boolean(g)))].sort(),
    [bands],
  );

  const filtered = useMemo(
    () => filterBands(bands, filters, currentTime),
    [bands, filters, currentTime],
  );

  const handleToggle = useCallback(
    async (bandId: string) => {
      if (!userId) return;
      await picksRepository.toggle(userId, bandId, pickedIds.has(bandId));
      await refreshPicks();
    },
    [userId, pickedIds, refreshPicks],
  );

  return (
    <div className={styles.page}>
      <OfflineBanner />
      <header className={styles.header}>
        <span className={styles.title}>{t('title')}</span>
        <div className={styles.summary}>
          <span className={styles.summaryLine}>{t('headerBands', { count: bands.length })}</span>
          <span className={styles.summaryLine}>{t('headerStages', { count: stages.length })}</span>
        </div>
      </header>

      <BandFilters
        value={filters}
        onChange={setFilters}
        days={festivalDays}
        stages={stages}
        genres={genres}
        filteredCount={filtered.length}
      />

      <main className={`${styles.list} ${styles.scheduleList}`}>
        {loading && <p className={styles.empty}>{t('loadingSchedule')}</p>}
        {!loading && filtered.length === 0 && (
          <div className={styles.emptyState}>
            <Icon name="search" size={24} aria-hidden />
            {t('emptySchedule')}
          </div>
        )}
        {filtered.map((band) => (
          <BandCard
            key={band.id}
            band={band}
            isPicked={pickedIds.has(band.id)}
            count={pickCounts[band.id] ?? 0}
            onToggle={() => handleToggle(band.id)}
            onClick={() => handleToggle(band.id)}
            pending={pendingBandIds.has(band.id)}
            isBandEnded={new Date(band.end_time) < currentTime}
          />
        ))}
      </main>

      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}
