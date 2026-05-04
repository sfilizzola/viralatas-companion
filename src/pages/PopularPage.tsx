import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Band } from '../types';
import { loadBands } from '../lib/db';
import { togglePick } from '../lib/picks';
import { useAuth } from '../hooks/useAuth';
import { useBandAttendees } from '../hooks/useBandAttendees';
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
  const [expandedBandIds, setExpandedBandIds] = useState<Set<string>>(new Set());
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

  const handleToggle = useCallback(
    async (bandId: string) => {
      if (!userId) return;
      await togglePick(userId, bandId, pickedIds.has(bandId));
      await refreshPicks();
    },
    [userId, pickedIds, refreshPicks],
  );

  function toggleAttendees(bandId: string) {
    setExpandedBandIds((current) => {
      const next = new Set(current);
      if (next.has(bandId)) {
        next.delete(bandId);
      } else {
        next.add(bandId);
      }
      return next;
    });
  }

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
        {popularBands.map((band) => {
          const attendees = attendeesByBand[band.id] ?? [];
          const count = pickCounts[band.id] ?? 0;
          const isExpanded = expandedBandIds.has(band.id);

          return (
            <BandCard
              key={band.id}
              band={band}
              isPicked={pickedIds.has(band.id)}
              count={count}
              onToggle={() => handleToggle(band.id)}
            >
              <div className={styles.attendeeTools}>
                <button
                  className={styles.attendeeToggle}
                  type="button"
                  disabled={count === 0}
                  aria-expanded={isExpanded}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleAttendees(band.id);
                  }}
                >
                  {count === 0 ? 'Ninguém da crew ainda' : isExpanded ? 'Ocultar crew' : 'Ver crew'}
                </button>
              </div>

              {isExpanded && (
                <div className={styles.attendeePanel}>
                  {attendees.length > 0 ? (
                    <ul className={styles.attendeeList}>
                      {attendees.map((attendee) => (
                        <li className={styles.attendee} key={attendee.id}>
                          {attendee.avatar_url ? (
                            <img
                              className={styles.attendeeAvatar}
                              src={attendee.avatar_url}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span className={styles.attendeeAvatar} aria-hidden>
                              {attendee.label.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className={styles.attendeeName}>{attendee.label}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.attendeeEmpty}>Sincronizando nomes da crew...</p>
                  )}
                </div>
              )}
            </BandCard>
          );
        })}
      </main>

      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}
