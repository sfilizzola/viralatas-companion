import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Band } from '../types';
import { loadBands } from '../lib/db';
import { togglePick } from '../lib/picks';
import { bandDay } from '../lib/bandTime';
import { useAuth } from '../hooks/useAuth';
import { useMyPicks } from '../hooks/useMyPicks';
import { useNow } from '../hooks/useNow';
import { usePickCounts } from '../hooks/usePickCounts';
import { useI18n } from '../lib/i18n';
import BottomNav from '../components/BottomNav';
import BandCard from '../components/BandCard';
import BandFilters from '../components/BandFilters';
import { EMPTY_FILTERS, type BandFilterValue } from '../components/bandFilterValue';
import styles from './SchedulePage.module.css';

export default function SchedulePage() {
  const { t } = useI18n('SchedulePage');
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BandFilterValue>(EMPTY_FILTERS);

  const { pickedIds, refresh: refreshPicks } = useMyPicks(userId);
  const pickCounts = usePickCounts();
  const currentTime = useNow();

  useEffect(() => {
    loadBands().then((data) => {
      setBands(data.sort((a, b) => a.start_time.localeCompare(b.start_time)));
      setLoading(false);
    });
  }, []);

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

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return bands.filter((b) => {
      if (filters.day && bandDay(b) !== filters.day) return false;
      if (filters.stage && b.stage !== filters.stage) return false;
      if (filters.genre && b.genre !== filters.genre) return false;
      if (filters.upcoming && new Date(b.end_time) <= currentTime) return false;
      if (q && !b.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [bands, filters, currentTime]);

  const handleToggle = useCallback(
    async (bandId: string) => {
      if (!userId) return;
      await togglePick(userId, bandId, pickedIds.has(bandId));
      await refreshPicks();
    },
    [userId, pickedIds, refreshPicks],
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.title}>{t('title')}</span>
      </header>

      <BandFilters
        value={filters}
        onChange={setFilters}
        days={festivalDays}
        stages={stages}
        genres={genres}
      />

      <main className={styles.list}>
        {loading && <p className={styles.empty}>{t('loadingSchedule')}</p>}
        {!loading && filtered.length === 0 && (
          <p className={styles.empty}>{t('emptySchedule')}</p>
        )}
        {filtered.map((band) => (
          <BandCard
            key={band.id}
            band={band}
            isPicked={pickedIds.has(band.id)}
            count={pickCounts[band.id] ?? 0}
            onToggle={() => handleToggle(band.id)}
            onClick={() => handleToggle(band.id)}
          />
        ))}
      </main>

      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}
