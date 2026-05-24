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
  const [loading, setLoading] = useState(true);
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

    type IdbSnapshot = {
      userPicks: { band_id: string }[];
      allPicks: { band_id: string }[];
      bands: BadgeBand[];
      allMissed: { user_id: string; band_id: string }[];
      presence: { user_id: string; is_camping: boolean; is_at_metal_place?: boolean }[];
      crewUsers: { id: string; is_friend?: boolean | null }[];
      assignedBadges: string[];
      isCurrentUserFriend: boolean;
    };

    function buildCtx(snap: IdbSnapshot) {
      const { userPicks, allPicks, bands, allMissed, assignedBadges, isCurrentUserFriend, presence, crewUsers } = snap;
      const userPickBandIds = userPicks.map((p) => p.band_id);
      const allPickCounts = new Map<string, number>();
      allPicks.forEach((p) =>
        allPickCounts.set(p.band_id, (allPickCounts.get(p.band_id) ?? 0) + 1),
      );
      const bandsById = new Map<string, BadgeBand>(bands.map((b) => [b.id, b]));
      const userMissedIds = new Set(
        allMissed.filter((m) => m.user_id === user.id).map((m) => m.band_id),
      );

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

      return buildBadgeContext(
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
    }

    async function refresh() {
      // Phase 1: IDB-only reads (fast, local) — render badges immediately
      const [userPicks, allPicks, bands, allMissed, presence, crewUsers] = await Promise.all([
        loadUserPicks(user.id),
        loadAllUserPicks(),
        loadBands(),
        missedRepository.loadAll(),
        loadAllUserPresence(),
        loadCrewUsers(),
      ]);
      if (!active) return;

      // Phase 1 reads special_badges from the cached auth session (user_metadata) so
      // assigned badges are visible immediately, even offline. The Edge Function mirrors
      // special_badges into user_metadata on every assign/revoke so the cache stays fresh.
      const assignedBadgesFromMeta: string[] = (user.user_metadata?.special_badges as string[]) ?? [];
      // is_friend is already in the crew_users IDB store — no network call needed for Phase 1.
      const isCurrentUserFriendFromIdb = crewUsers.find((u) => u.id === user.id)?.is_friend === true;

      const idbCtx = buildCtx({ userPicks, allPicks, bands, allMissed, assignedBadges: assignedBadgesFromMeta, isCurrentUserFriend: isCurrentUserFriendFromIdb, presence, crewUsers });
      setCtx(idbCtx);
      setLoading(false);

      // Phase 2: Supabase call for special_badges + is_friend (network) — update in background
      const userRow = await supabase
        .from('users')
        .select('special_badges, is_friend')
        .eq('id', user.id)
        .single();
      if (!active) return;

      const rowData = userRow.data as { special_badges?: string[]; is_friend?: boolean | null } | null;
      const assignedBadges: string[] = rowData?.special_badges ?? [];
      const isCurrentUserFriend = rowData?.is_friend === true;

      // Drift detection: if DB special_badges differ from cached user_metadata, refresh
      // the auth session in the background so the next offline visit reflects the change
      // (covers both new assignments and revocations).
      const metaBadges = (user.user_metadata?.special_badges as string[]) ?? [];
      const dbSet = new Set(assignedBadges);
      const metaSet = new Set(metaBadges);
      const hasDrift =
        assignedBadges.some((s) => !metaSet.has(s)) ||
        metaBadges.some((s) => !dbSet.has(s));
      if (hasDrift) {
        supabase.auth.refreshSession().catch(() => {
          // best-effort; next natural token refresh will sync user_metadata
        });
      }

      const fullCtx = buildCtx({ userPicks, allPicks, bands, allMissed, assignedBadges, isCurrentUserFriend, presence, crewUsers });

      const achievedBadgeSlugs = new Set<string>(
        (user.user_metadata?.achieved_badge_slugs as string[]) ?? []
      );
      const earnedBadges = BADGES.filter((b) => evaluateBadge(b, fullCtx));
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

      setCtx(fullCtx);
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

  const [isFullscreen, setIsFullscreen] = useState(false);

  const earned = BADGES.filter((b) => evaluateBadge(b, ctx));
  const selectedBadge: BadgeConfig | null = selectedSlug
    ? (earned.find((b) => b.slug === selectedSlug) ?? null)
    : null;

  const acknowledgedRef = useRef<Set<string>>(
    new Set(JSON.parse(localStorage.getItem('badgeAcknowledged') ?? '[]') as string[]),
  );
  const [glowingSlugs, setGlowingSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const earnedNow = BADGES.filter((b) => evaluateBadge(b, ctx));
    const ack = acknowledgedRef.current;
    const unacked = earnedNow.filter((b) => !ack.has(b.slug)).map((b) => b.slug);
    setGlowingSlugs(new Set(unacked));
  }, [ctx]);

  function handleBadgeClick(slug: string) {
    acknowledgedRef.current.add(slug);
    localStorage.setItem('badgeAcknowledged', JSON.stringify([...acknowledgedRef.current]));
    setGlowingSlugs((prev) => { const s = new Set(prev); s.delete(slug); return s; });
    setSelectedSlug(slug);
  }

  if (loading) {
    return (
      <>
        {heading && <div className={styles.patchesHeading}>{heading}</div>}
        <div className={`${styles.patchesGrid} ${styles.patchesGridSkeleton}`} data-bg={bg} aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonPatch} />
          ))}
        </div>
      </>
    );
  }

  if (earned.length === 0) return null;

  return (
    <>
      {heading && <div className={styles.patchesHeading}>{heading}</div>}
      <div className={styles.patchesGrid} data-bg={bg}>
        {earned.map((badge) => {
          const isGlowing = glowingSlugs.has(badge.slug);
          const btnClass = isGlowing
            ? `${styles.patchBtn} ${styles.glowing}`
            : styles.patchBtn;
          return (
          <button
            key={badge.slug}
            className={btnClass}
            onClick={() => handleBadgeClick(badge.slug)}
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
        <Modal onClose={() => { setSelectedSlug(null); setIsFullscreen(false); }} contentClassName={styles.modalContent}>
          <div className={styles.modalPatch}>
            <img
              src={selectedBadge.imagePath}
              alt={t(selectedBadge.labelKey)}
              className={styles.modalImg}
            />
            {selectedBadge.year && (
              <span className={styles.modalYearChip}>{yearSuffix(selectedBadge.year)}</span>
            )}
            <button
              type="button"
              className={styles.zoomBtn}
              onClick={() => setIsFullscreen(true)}
              aria-label="View badge fullscreen"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.8"/>
                <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <h3 className={styles.modalName}>{t(selectedBadge.labelKey)}</h3>
          <p className={styles.modalDesc}>{t(selectedBadge.descriptionKey)}</p>
        </Modal>
      )}

      {isFullscreen && selectedBadge && (
        <button
          type="button"
          className={styles.fullscreenOverlay}
          onClick={() => setIsFullscreen(false)}
          aria-label={`Close fullscreen view of ${t(selectedBadge.labelKey)}`}
        >
          <img
            src={selectedBadge.imagePath}
            alt={t(selectedBadge.labelKey)}
            className={styles.fullscreenImg}
          />
          {selectedBadge.year && (
            <span className={styles.fullscreenYearChip}>{yearSuffix(selectedBadge.year)}</span>
          )}
          <span className={styles.fullscreenClose} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <line x1="2" y1="2" x2="16" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="2" x2="2" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
        </button>
      )}
    </>
  );
}
