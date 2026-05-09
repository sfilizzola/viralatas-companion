import { useEffect, useState } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import {
  buildBadgeContext,
  getEarnedBadges,
  type BadgeBand,
  type BadgeContext,
} from '../lib/badges';
import { loadUserPicks, loadAllUserPicks, loadBands, PICKS_CHANGED_EVENT, MISSED_CHANGED_EVENT } from '../lib/db';
import { loadAllMissed } from '../lib/missed';
import { now } from '../lib/time';
import { useI18n } from '../lib/i18n';
import styles from './BadgesDisplay.module.css';

const EMPTY_CTX: BadgeContext = {
  wacken_years: [],
  country: null,
  bandsPicked: 0,
  maxAttendanceInPicks: 0,
  pickedBands: [],
  seenBands: [],
  missedBandIds: new Set(),
};

type BadgesDisplayProps = {
  user: AuthUser;
};

export default function BadgesDisplay({ user }: BadgesDisplayProps) {
  const { t } = useI18n('Badges');
  const [ctx, setCtx] = useState<BadgeContext>(EMPTY_CTX);
  const [selectedBadgeSlug, setSelectedBadgeSlug] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function refresh() {
      const [userPicks, allPicks, bands, allMissed] = await Promise.all([
        loadUserPicks(user.id),
        loadAllUserPicks(),
        loadBands(),
        loadAllMissed(),
      ]);
      if (!active) return;
      const userPickBandIds = userPicks.map((p) => p.band_id);
      const allPickCounts = new Map<string, number>();
      allPicks.forEach((p) =>
        allPickCounts.set(p.band_id, (allPickCounts.get(p.band_id) ?? 0) + 1),
      );
      const bandsById = new Map<string, BadgeBand>(bands.map((b) => [b.id, b]));
      const userMissedIds = new Set(
        allMissed.filter((m) => m.user_id === user.id).map((m) => m.band_id),
      );
      setCtx(buildBadgeContext(user, userPickBandIds, allPickCounts, bandsById, userMissedIds, now()));
    }

    refresh();
    window.addEventListener(PICKS_CHANGED_EVENT, refresh);
    window.addEventListener(MISSED_CHANGED_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(PICKS_CHANGED_EVENT, refresh);
      window.removeEventListener(MISSED_CHANGED_EVENT, refresh);
    };
  }, [user]);

  const earned = getEarnedBadges(ctx);
  const selectedBadge = earned.find((b) => b.slug === selectedBadgeSlug);

  if (earned.length === 0) {
    return null;
  }

  return (
    <>
      <div className={styles.badgesRow}>
        {earned.map((badge) => (
          <button
            key={badge.slug}
            className={styles.badgeButton}
            onClick={() => setSelectedBadgeSlug(badge.slug)}
            type="button"
          >
            <img
              src={badge.imagePath}
              alt={t(badge.labelKey)}
              title={t(badge.labelKey)}
              className={styles.badge}
            />
          </button>
        ))}
      </div>

      {selectedBadge && (
        <div
          className={styles.modal}
          onClick={() => setSelectedBadgeSlug(null)}
          role="presentation"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.closeButton}
              onClick={() => setSelectedBadgeSlug(null)}
              type="button"
              aria-label="Close"
            >
              ✕
            </button>
            <h3 className={styles.badgeTitle}>{t(selectedBadge.labelKey)}</h3>
            <div className={styles.modalCardLayout}>
              <img
                src={selectedBadge.imagePath}
                alt={t(selectedBadge.labelKey)}
                className={styles.modalImageLarge}
              />
              <p className={styles.modalDescription}>{t(selectedBadge.descriptionKey)}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
