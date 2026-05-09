import { useEffect, useState } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import {
  BADGES,
  buildBadgeContext,
  evaluateBadge,
  type BadgeBand,
  type BadgeConfig,
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
  heading?: string;
};

function yearSuffix(year: number): string {
  return `'${String(year).slice(-2)}`;
}

export default function BadgesDisplay({ user, heading }: BadgesDisplayProps) {
  const { t } = useI18n('Badges');
  const [ctx, setCtx] = useState<BadgeContext>(EMPTY_CTX);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

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

  const earned = BADGES.filter((b) => evaluateBadge(b, ctx));
  const selectedBadge: BadgeConfig | null = selectedSlug
    ? (earned.find((b) => b.slug === selectedSlug) ?? null)
    : null;

  if (earned.length === 0) return null;

  return (
    <>
      {heading && <div className={styles.patchesHeading}>{heading}</div>}
      <div className={styles.patchesGrid}>
        {earned.map((badge) => (
          <button
            key={badge.slug}
            className={styles.patchBtn}
            onClick={() => setSelectedSlug(badge.slug)}
            type="button"
            aria-label={t(badge.labelKey)}
          >
            <img src={badge.imagePath} alt="" className={styles.patchImg} />
            {badge.year && (
              <span className={styles.yearChip}>{yearSuffix(badge.year)}</span>
            )}
          </button>
        ))}
      </div>

      {selectedBadge && (
        <div
          className={styles.modal}
          onClick={() => setSelectedSlug(null)}
          role="presentation"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalPatch}>
              <img
                src={selectedBadge.imagePath}
                alt={t(selectedBadge.labelKey)}
                className={styles.modalImg}
              />
              {selectedBadge.year && (
                <span className={styles.modalYearChip}>{yearSuffix(selectedBadge.year)}</span>
              )}
            </div>
            <h3 className={styles.modalName}>{t(selectedBadge.labelKey)}</h3>
            <p className={styles.modalDesc}>{t(selectedBadge.descriptionKey)}</p>
          </div>
        </div>
      )}
    </>
  );
}
