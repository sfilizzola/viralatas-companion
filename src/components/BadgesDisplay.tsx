import { useEffect, useRef, useState } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import {
  BADGES,
  buildBadgeContext,
  evaluateBadge,
  type BadgeBand,
  type BadgeConfig,
  type BadgeContext,
} from '../services/badges';
import { loadUserPicks, loadAllUserPicks, loadBands, loadAllUserPresence, loadCrewUsers, PICKS_CHANGED_EVENT, MISSED_CHANGED_EVENT } from '../lib/db';
import { missedRepository } from '../repositories';
import { now } from '../services/time';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import {
  loadPatchesBackground,
  PATCHES_BG_CHANGED_EVENT,
  type PatchesBackground,
} from '../lib/patchesBackground';
import { Modal } from '../ui';
import styles from './BadgesDisplay.module.css';

const EMPTY_CTX: BadgeContext = {
  wacken_years: [],
  country: null,
  wacken_arrival_day: null,
  assignedBadges: [],
  bandsPicked: 0,
  maxAttendanceInPicks: 0,
  pickedBands: [],
  seenBands: [],
  missedBandIds: new Set(),
  locationVisits: {},
  currentLocation: null,
  crewLocationCounts: {},
  achievedBadgeSlugs: new Set(),
};

type BadgesDisplayProps = {
  user: AuthUser;
  heading?: string;
};

function yearSuffix(year: number): string {
  return String(year).slice(-2);
}

export default function BadgesDisplay({ user, heading }: BadgesDisplayProps) {
  const { t } = useI18n('Badges');
  const [ctx, setCtx] = useState<BadgeContext>(EMPTY_CTX);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [bg, setBg] = useState<PatchesBackground>(() => loadPatchesBackground());

  useEffect(() => {
    function onBgChange(event: Event) {
      const next = (event as CustomEvent<PatchesBackground>).detail;
      if (next) setBg(next);
    }
    window.addEventListener(PATCHES_BG_CHANGED_EVENT, onBgChange);
    return () => window.removeEventListener(PATCHES_BG_CHANGED_EVENT, onBgChange);
  }, []);

  useEffect(() => {
    let active = true;

    async function refresh() {
      const [userPicks, allPicks, bands, allMissed, userRow, presence, crewUsers] = await Promise.all([
        loadUserPicks(user.id),
        loadAllUserPicks(),
        loadBands(),
        missedRepository.loadAll(),
        supabase.from('users').select('special_badges, is_friend').eq('id', user.id).single(),
        loadAllUserPresence(),
        loadCrewUsers(),
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
      const rowData = userRow.data as { special_badges?: string[]; is_friend?: boolean | null } | null;
      const assignedBadges: string[] = rowData?.special_badges ?? [];
      const isCurrentUserFriend = rowData?.is_friend === true;

      const myPresence = presence.find((p) => p.user_id === user.id);
      const isAtCamping = myPresence?.is_camping ?? false;
      const isAtMetalPlace = myPresence?.is_at_metal_place ?? false;
      let currentLocation: string | null;
      if (isCurrentUserFriend) {
        currentLocation = null;
      } else if (isAtMetalPlace) {
        currentLocation = 'metal_place';
      } else if (isAtCamping) {
        currentLocation = 'camping';
      } else {
        currentLocation = 'lost';
      }

      const friendUserIds = new Set(
        crewUsers.filter((u) => u.is_friend === true).map((u) => u.id),
      );
      const nonFriendPresence = presence.filter((p) => !friendUserIds.has(p.user_id));
      const crewLocationCounts: Record<string, number> = {
        camping: nonFriendPresence.filter((p) => p.is_camping).length,
        metal_place: nonFriendPresence.filter((p) => p.is_at_metal_place).length,
        lost: nonFriendPresence.filter((p) => !p.is_camping && !p.is_at_metal_place).length,
      };

      const locationVisits = (user.user_metadata?.location_visits as Record<string, number>) ?? {};
      const achievedBadgeSlugs = new Set<string>(
        (user.user_metadata?.achieved_badge_slugs as string[]) ?? []
      );

      const newCtx = buildBadgeContext(
        user,
        userPickBandIds,
        allPickCounts,
        bandsById,
        userMissedIds,
        now(),
        assignedBadges,
        locationVisits,
        currentLocation,
        crewLocationCounts,
        achievedBadgeSlugs,
      );

      const earnedBadges = BADGES.filter((b) => evaluateBadge(b, newCtx));
      const newlyAchieved = earnedBadges
        .filter((b) => b.persist && !achievedBadgeSlugs.has(b.slug))
        .map((b) => b.slug);

      if (newlyAchieved.length > 0) {
        supabase.auth.updateUser({
          data: {
            achieved_badge_slugs: [
              ...(user.user_metadata?.achieved_badge_slugs ?? []),
              ...newlyAchieved,
            ],
          },
        }).catch(() => {
          // badge earning is best-effort
        });
      }

      setCtx(newCtx);
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

  // Track which badges have been animated this session to fire only once per badge
  const animatedRef = useRef<Set<string>>(
    new Set(JSON.parse(sessionStorage.getItem('badgeAnimated') ?? '[]') as string[]),
  );
  const [unlockingSlug, setUnlockingSlug] = useState<string | null>(null);

  useEffect(() => {
    const alreadyAnimated = animatedRef.current;
    const newSlug = earned.find((b) => !alreadyAnimated.has(b.slug))?.slug ?? null;
    if (!newSlug) return;
    alreadyAnimated.add(newSlug);
    sessionStorage.setItem('badgeAnimated', JSON.stringify([...alreadyAnimated]));
    setUnlockingSlug(newSlug);
    const t = setTimeout(() => setUnlockingSlug(null), 400);
    return () => clearTimeout(t);
  }, [earned]);

  if (earned.length === 0) return null;

  return (
    <>
      {heading && <div className={styles.patchesHeading}>{heading}</div>}
      <div className={styles.patchesGrid} data-bg={bg}>
        {earned.map((badge) => {
          const isUnlocking = unlockingSlug === badge.slug;
          const btnClass = isUnlocking
            ? `${styles.patchBtn} ${styles.unlocking}`
            : styles.patchBtn;
          return (
          <button
            key={badge.slug}
            className={btnClass}
            onClick={() => setSelectedSlug(badge.slug)}
            type="button"
            aria-label={t(badge.labelKey)}
          >
            <span className={styles.imgWrapper}>
              <img src={badge.imagePath} alt="" className={styles.patchImg} />
              {badge.year && (
                <span className={styles.yearChip}>{yearSuffix(badge.year)}</span>
              )}
            </span>
          </button>
          );
        })}
      </div>

      {selectedBadge && (
        <Modal onClose={() => setSelectedSlug(null)} contentClassName={styles.modalContent}>
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
        </Modal>
      )}
    </>
  );
}
