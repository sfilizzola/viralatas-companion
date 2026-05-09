import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Band } from '../types';
import { loadBands } from '../lib/db';
import { togglePick } from '../lib/picks';
import { useAuth } from '../hooks/useAuth';
import { useBandAttendees } from '../hooks/useBandAttendees';
import { useMyPicks } from '../hooks/useMyPicks';
import { usePickCounts } from '../hooks/usePickCounts';
import { useI18n } from '../lib/i18n';
import BottomNav from '../components/BottomNav';
import BandCard from '../components/BandCard';
import BandDetailModal from '../components/BandDetailModal';
import styles from './SchedulePage.module.css';

export default function PopularPage() {
  const { t } = useI18n('PopularPage');
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBandId, setActiveBandId] = useState<string | null>(null);
  const { pickedIds, refresh: refreshPicks } = useMyPicks(userId);
  const attendeesByBand = useBandAttendees();
  const pickCounts = usePickCounts();

  useEffect(() => {
    loadBands().then((data) => {
      setBands(data);
      setLoading(false);
    });
  }, []);

  const popularBands = useMemo(
    () =>
      [...bands].sort((a, b) => {
        const countDelta = (pickCounts[b.id] ?? 0) - (pickCounts[a.id] ?? 0);
        if (countDelta !== 0) return countDelta;
        return a.start_time.localeCompare(b.start_time);
      }),
    [bands, pickCounts],
  );

  const activeBand = useMemo(
    () => (activeBandId ? bands.find((b) => b.id === activeBandId) ?? null : null),
    [activeBandId, bands],
  );

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

      <main className={styles.list}>
        {loading && <p className={styles.empty}>{t('loading')}</p>}
        {!loading && popularBands.length === 0 && (
          <p className={styles.empty}>{t('empty')}</p>
        )}
        {popularBands.map((band, index) => {
          const attendees = attendeesByBand[band.id] ?? [];
          const count = pickCounts[band.id] ?? 0;

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
        />
      )}

      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}
