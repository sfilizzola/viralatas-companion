import { useCallback, useEffect, useState } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import { buildBadgeContext, getEarnedBadges, type BadgeContext } from '../lib/badges';
import { loadUserPicks, loadAllUserPicks, PICKS_CHANGED_EVENT } from '../lib/db';
import { useI18n } from '../lib/i18n';
import styles from './BadgesDisplay.module.css';

const EMPTY_CTX: BadgeContext = {
  wacken_years: [],
  country: null,
  bandsPicked: 0,
  maxAttendanceInPicks: 0,
};

type BadgesDisplayProps = {
  user: AuthUser;
};

export default function BadgesDisplay({ user }: BadgesDisplayProps) {
  const { t } = useI18n('Badges');
  const [ctx, setCtx] = useState<BadgeContext>(EMPTY_CTX);
  const [selectedBadgeSlug, setSelectedBadgeSlug] = useState<string | null>(null);

  const loadCtx = useCallback(async () => {
    const [userPicks, allPicks] = await Promise.all([
      loadUserPicks(user.id),
      loadAllUserPicks(),
    ]);
    const userPickBandIds = userPicks.map((p) => p.band_id);
    const allPickCounts = new Map<string, number>();
    allPicks.forEach((p) =>
      allPickCounts.set(p.band_id, (allPickCounts.get(p.band_id) ?? 0) + 1),
    );
    setCtx(buildBadgeContext(user, userPickBandIds, allPickCounts));
  }, [user]);

  useEffect(() => {
    loadCtx();
  }, [loadCtx]);

  useEffect(() => {
    window.addEventListener(PICKS_CHANGED_EVENT, loadCtx);
    return () => window.removeEventListener(PICKS_CHANGED_EVENT, loadCtx);
  }, [loadCtx]);

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
            <img
              src={selectedBadge.imagePath}
              alt={t(selectedBadge.labelKey)}
              className={styles.badgePreview}
            />
            <h3 className={styles.badgeTitle}>{t(selectedBadge.labelKey)}</h3>
          </div>
        </div>
      )}
    </>
  );
}
