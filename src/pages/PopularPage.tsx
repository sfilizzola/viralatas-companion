import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Band } from '../types';
import { loadBands } from '../lib/db';
import { togglePick } from '../lib/picks';
import { useAuth } from '../hooks/useAuth';
import { useMyPicks } from '../hooks/useMyPicks';
import { usePickCounts } from '../hooks/usePickCounts';
import BottomNav from '../components/BottomNav';
import { BandCard } from './SchedulePage';
import styles from './SchedulePage.module.css';

export default function PopularPage() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const { pickedIds, refresh: refreshPicks } = useMyPicks(userId);
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
        <span className={styles.title}>Popular</span>
      </header>

      <main className={styles.list}>
        {loading && <p className={styles.empty}>Carregando popularidade...</p>}
        {!loading && popularBands.length === 0 && (
          <p className={styles.empty}>Agenda vazia por enquanto.</p>
        )}
        {popularBands.map((band) => (
          <BandCard
            key={band.id}
            band={band}
            isPicked={pickedIds.has(band.id)}
            count={pickCounts[band.id] ?? 0}
            onToggle={() => handleToggle(band.id)}
          />
        ))}
      </main>

      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}
