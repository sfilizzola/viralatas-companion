import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Band, UserPick } from '../../types';
import { loadBands, loadUserPicks, PICKS_CHANGED_EVENT } from '../../lib/db';
import { picksRepository } from '../../repositories';
import { computeBandOverlaps } from '../../hooks/useBandConflicts';
import { getFestivalDay } from '../../services/time';
import { Button, Collapsible, Modal } from '../../ui';
import Icon from '../icons/Icon';
import styles from '../../pages/ProfilePage.module.css';

type ConflictPair = {
  bandA: Band;
  bandB: Band;
  day: number;
};

function detectConflicts(bands: Band[]): ConflictPair[] {
  const overlaps = computeBandOverlaps(bands);
  const seenPairs = new Set<string>();
  const conflicts: ConflictPair[] = [];

  for (const band of bands) {
    for (const overlap of overlaps.get(band.id) ?? []) {
      if (overlap.severity !== 'hard') continue;

      const pairKey = [band.id, overlap.band.id].sort().join(':');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const [bandA, bandB] = [band, overlap.band].sort((a, b) =>
        a.start_time.localeCompare(b.start_time),
      );
      conflicts.push({
        bandA,
        bandB,
        day: getFestivalDay(new Date(bandA.start_time)),
      });
    }
  }

  return conflicts.sort(
    (a, b) =>
      a.day - b.day ||
      a.bandA.start_time.localeCompare(b.bandA.start_time) ||
      a.bandB.start_time.localeCompare(b.bandB.start_time),
  );
}

function formatTime(isoTime: string): string {
  const date = new Date(isoTime);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

type ConflictSectionProps = {
  userId: string;
  t: (key: string, values?: Record<string, string | number>) => string;
};

export default function ConflictSection({ userId, t }: ConflictSectionProps) {
  const [bands, setBands] = useState<Band[]>([]);
  const [picks, setPicks] = useState<UserPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConflict, setSelectedConflict] = useState<ConflictPair | null>(null);

  useEffect(() => {
    async function load() {
      const [loadedBands, loadedPicks] = await Promise.all([loadBands(), loadUserPicks(userId)]);
      setBands(loadedBands);
      setPicks(loadedPicks);
      setLoading(false);
    }
    load();

    function handlePicksChange() {
      loadUserPicks(userId).then(setPicks);
    }
    window.addEventListener(PICKS_CHANGED_EVENT, handlePicksChange);
    return () => window.removeEventListener(PICKS_CHANGED_EVENT, handlePicksChange);
  }, [userId]);

  const pickedBands = useMemo(() => {
    const pickedIds = new Set(picks.map((p) => p.band_id));
    return bands.filter((b) => pickedIds.has(b.id));
  }, [bands, picks]);

  const conflicts = useMemo(() => detectConflicts(pickedBands), [pickedBands]);

  const conflictsByDay = useMemo(() => {
    const grouped = new Map<number, ConflictPair[]>();
    for (const conflict of conflicts) {
      if (!grouped.has(conflict.day)) grouped.set(conflict.day, []);
      grouped.get(conflict.day)!.push(conflict);
    }
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, pairs]) => ({ day, pairs }));
  }, [conflicts]);

  const handleKeepBand = useCallback(
    async (_bandToKeep: Band, bandToRemove: Band) => {
      await picksRepository.toggle(userId, bandToRemove.id, true);
      setSelectedConflict(null);
    },
    [userId],
  );

  if (loading || conflicts.length === 0) return null;

  const trigger = (
    <div className={styles.conflictsTitle}>
      <Icon name="conflict" size={14} className={styles.conflictsIcon} />
      <span>{t('conflicts')}</span>
      <div className={styles.conflictBadge}>{conflicts.length}</div>
    </div>
  );

  return (
    <>
      <Collapsible trigger={trigger} className={styles.conflictsSection}>
        <div className={styles.conflictsInner}>
          {conflictsByDay.map(({ day, pairs }) => (
            <div key={day} className={styles.dayGroup}>
              <div className={styles.dayGroupTitle}>{t('day', { day })}</div>
              {pairs.map((conflict, idx) => (
                <button
                  key={idx}
                  className={styles.conflictCard}
                  onClick={() => setSelectedConflict(conflict)}
                  type="button"
                >
                  <div className={styles.conflictCardBands}>
                    <span className={styles.bandName}>{conflict.bandA.name}</span>
                    <Icon name="conflict" size={14} className={styles.conflictIndicator} />
                    <span className={styles.bandName}>{conflict.bandB.name}</span>
                  </div>
                  <div className={styles.conflictCardTimes}>
                    <span className={styles.bandTime}>
                      {formatTime(conflict.bandA.start_time)} -{' '}
                      {formatTime(conflict.bandA.end_time)}
                    </span>
                    <span className={styles.bandTime}>
                      {formatTime(conflict.bandB.start_time)} -{' '}
                      {formatTime(conflict.bandB.end_time)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </Collapsible>

      {selectedConflict && (
        <Modal onClose={() => setSelectedConflict(null)} position="bottom">
          <h3 className={styles.conflictModalTitle}>{t('conflictModalTitle')}</h3>

          {[selectedConflict.bandA, selectedConflict.bandB].map((band) => (
            <div key={band.id}>
              <div className={styles.conflictBandOption}>
                <div className={styles.conflictBandName}>{band.name}</div>
                <div className={styles.conflictBandInfo}>
                  <div>{band.stage}</div>
                  <div>
                    {formatTime(band.start_time)} - {formatTime(band.end_time)}
                  </div>
                </div>
              </div>
              <Button
                fullWidth
                onClick={() =>
                  handleKeepBand(
                    band,
                    band.id === selectedConflict.bandA.id
                      ? selectedConflict.bandB
                      : selectedConflict.bandA,
                  )
                }
                className={styles.conflictButton}
              >
                {t('keepBand', { band: band.name })}
              </Button>
            </div>
          ))}

          <Button
            fullWidth
            variant="ghost"
            onClick={() => setSelectedConflict(null)}
            className={styles.conflictCloseButton}
          >
            {t('close') ?? 'Close'}
          </Button>
        </Modal>
      )}
    </>
  );
}
