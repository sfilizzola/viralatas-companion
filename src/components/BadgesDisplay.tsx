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

  if (earned.length === 0) {
    return null;
  }

  return (
    <div className={styles.badgesRow}>
      {earned.map((badge) => (
        <img
          key={badge.slug}
          src={badge.imagePath}
          alt={t(badge.labelKey)}
          title={t(badge.labelKey)}
          className={styles.badge}
        />
      ))}
    </div>
  );
}
