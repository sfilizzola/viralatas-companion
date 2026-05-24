import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import {
  BADGES,
  buildBadgeContext,
  evaluateBadge,
  type BadgeBand,
  type BadgeConfig,
  type BadgeContext,
} from '../services/badges';
import { loadUserPicks, loadAllUserPicks, loadBands, loadAllUserPresence, loadCrewUsers, PICKS_CHANGED_EVENT, PRESENCE_CHANGED_EVENT, CREW_USERS_CHANGED_EVENT } from '../lib/db';
import { useMissedBands } from '../hooks/useMissedBands';
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

function badgesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((s) => setB.has(s));
}

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
  /** @deprecated Kicker is rendered internally */
  heading?: string;
};

function yearSuffix(year: number): string {
  return String(year).slice(-2);
}

/** Deterministic hash — stable chaos per badge slug */
function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (Math.imul(31, h) + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

type StackPose = {
  left: number;
  top: number;
  rotate: number;
  scale: number;
  zIndex: number;
};

function stackGrid(total: number): { cols: number; rows: number } {
  const cols = Math.max(3, Math.min(6, Math.ceil(Math.sqrt(total * 1.2))));
  const rows = Math.ceil(total / cols);
  return { cols, rows };
}

/** ~480×112 vest — distance in “physical” space for overlap checks */
const VEST_ASPECT = 480 / 112;

function stackCenterDist(
  a: { left: number; top: number },
  b: { left: number; top: number },
): number {
  const dx = (a.left - b.left) / 100;
  const dy = ((a.top - b.top) / 100) * VEST_ASPECT;
  return Math.hypot(dx, dy);
}

function clampStackPoint(left: number, top: number): { left: number; top: number } {
  return {
    left: Math.max(8, Math.min(92, left)),
    top: Math.max(10, Math.min(90, top)),
  };
}

function stackPoseDraft(
  slug: string,
  index: number,
  total: number,
  seed: number,
  attempt: number,
): Omit<StackPose, 'zIndex'> {
  const h = hashSlug(`${seed}:${slug}:${index}:${attempt}`);

  const { cols, rows } = stackGrid(total);
  const row = Math.floor(index / cols);
  const col = index % cols;
  const colsInRow = row === rows - 1 ? total - row * cols : cols;

  const cellW = 100 / cols;
  const cellH = 100 / rows;
  const baseLeft = colsInRow <= 1 ? 50 : (col + 0.5) * (100 / colsInRow);
  const baseTop = rows <= 1 ? 50 : (row + 0.5) * cellH;

  const clutter = Math.min(1.35, 0.55 + total * 0.04);
  let jitterX = ((h % 19) - 9) * (cellW * 0.32 * clutter) + (((h >> 6) % 11) - 5) * 1.6 * clutter;
  let jitterY = (((h >> 4) % 19) - 9) * (cellH * 0.32 * clutter) + (((h >> 10) % 11) - 5) * 1.4 * clutter;

  if (attempt > 0) {
    const angle = ((h >> 3) % 360) * (Math.PI / 180);
    const push = 5 + attempt * 2.2;
    jitterX += Math.cos(angle) * push;
    jitterY += Math.sin(angle) * push * 0.55;
  }

  const { left, top } = clampStackPoint(baseLeft + jitterX, baseTop + jitterY);

  return {
    left,
    top,
    rotate: (h % 111) - 55 + index * 0.2,
    scale: 0.88 + (h % 12) / 100,
  };
}

/** Place all collapsed patches; nudge apart when centers would fully bury a prior one */
function buildStackPoses(
  badges: BadgeConfig[],
  seed: number,
  glowing: Set<string>,
): Map<string, StackPose> {
  const poses = new Map<string, StackPose>();
  const placed: { left: number; top: number }[] = [];
  const total = badges.length;
  const minDist = Math.max(0.038, 0.072 - total * 0.0015);

  badges.forEach((badge, index) => {
    let chosen = stackPoseDraft(badge.slug, index, total, seed, 0);

    for (let attempt = 0; attempt < 12; attempt++) {
      const draft = stackPoseDraft(badge.slug, index, total, seed, attempt);
      chosen = draft;
      const buried = placed.some((p) => stackCenterDist(draft, p) < minDist);
      if (!buried) break;
    }

    placed.push({ left: chosen.left, top: chosen.top });
    poses.set(badge.slug, {
      ...chosen,
      zIndex: index + 1 + (glowing.has(badge.slug) ? 50 : 0),
    });
  });

  return poses;
}

function stackStyle(pose: StackPose): CSSProperties {
  return {
    ['--stack-left' as string]: `${pose.left}%`,
    ['--stack-top' as string]: `${pose.top}%`,
    ['--stack-rot' as string]: `${pose.rotate}deg`,
    ['--stack-scale' as string]: String(pose.scale),
    zIndex: pose.zIndex,
  };
}

export default function BadgesDisplay({ user }: BadgesDisplayProps) {
  const { t } = useI18n('Badges');
  const { allMissed } = useMissedBands(user.id);
  const [ctx, setCtx] = useState<BadgeContext>(EMPTY_CTX);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [spread, setSpread] = useState(false);
  const [scatterSeed, setScatterSeed] = useState(() => Math.random());
  const [bg, setBg] = useState<PatchesBackground>(() => loadPatchesBackground());

  useEffect(() => {
    function onBgChange(event: Event) {
      const next = (event as CustomEvent<PatchesBackground>).detail;
      if (next) setBg(next);
    }
    window.addEventListener(PATCHES_BG_CHANGED_EVENT, onBgChange);
    return () => window.removeEventListener(PATCHES_BG_CHANGED_EVENT, onBgChange);
  }, []);

  const dbAssignedRef = useRef<string[] | null>(null);
  const metadataSyncedRef = useRef(false);

  useEffect(() => {
    let active = true;
    dbAssignedRef.current = null;
    metadataSyncedRef.current = false;

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

    function buildCtx(snap: IdbSnapshot, authUser: AuthUser) {
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

      const locationVisits = (authUser.user_metadata?.location_visits as Record<string, number>) ?? {};
      const achievedBadgeSlugs = new Set<string>(
        (authUser.user_metadata?.achieved_badge_slugs as string[]) ?? []
      );

      return buildBadgeContext(
        authUser,
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
      const { data: { session } } = await supabase.auth.getSession();
      const sessionUser = session?.user;
      if (!sessionUser || sessionUser.id !== user.id) return;

      // Phase 1: IDB-only reads (fast, local) — render badges immediately
      const [userPicks, allPicks, bands, presence, crewUsers] = await Promise.all([
        loadUserPicks(user.id),
        loadAllUserPicks(),
        loadBands(),
        loadAllUserPresence(),
        loadCrewUsers(),
      ]);
      if (!active) return;

      // Phase 1 reads special_badges from the cached auth session (user_metadata) so
      // assigned badges are visible immediately, even offline. After Phase 2 has run once,
      // reuse the DB snapshot so later refreshes (e.g. PICKS_CHANGED) do not flicker.
      const assignedBadgesFromMeta: string[] =
        (sessionUser.user_metadata?.special_badges as string[]) ?? [];
      const assignedForPhase1 = dbAssignedRef.current ?? assignedBadgesFromMeta;
      // is_friend is already in the crew_users IDB store — no network call needed for Phase 1.
      const isCurrentUserFriendFromIdb = crewUsers.find((u) => u.id === user.id)?.is_friend === true;

      const idbCtx = buildCtx({
        userPicks,
        allPicks,
        bands,
        allMissed,
        assignedBadges: assignedForPhase1,
        isCurrentUserFriend: isCurrentUserFriendFromIdb,
        presence,
        crewUsers,
      }, sessionUser);
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
      dbAssignedRef.current = assignedBadges;
      const isCurrentUserFriend = rowData?.is_friend === true;

      // Drift: DB is source of truth. Push DB value into auth user_metadata once so the
      // localStorage session cache matches for offline — refreshSession() only re-fetches
      // stale JWT metadata and caused an infinite loop (blink + logout).
      const metaBadges = assignedBadgesFromMeta;
      const hasDrift = !badgesEqual(assignedBadges, metaBadges);
      if (hasDrift && !metadataSyncedRef.current) {
        metadataSyncedRef.current = true;
        supabase.auth
          .updateUser({ data: { special_badges: assignedBadges } })
          .catch(() => {
            metadataSyncedRef.current = false;
          });
      }

      const fullCtx = buildCtx({
        userPicks,
        allPicks,
        bands,
        allMissed,
        assignedBadges,
        isCurrentUserFriend,
        presence,
        crewUsers,
      }, sessionUser);

      const achievedBadgeSlugs = new Set<string>(
        (sessionUser.user_metadata?.achieved_badge_slugs as string[]) ?? []
      );
      const earnedBadges = BADGES.filter((b) => evaluateBadge(b, fullCtx));
      const newlyAchieved = earnedBadges
        .filter((b) => b.persist && !achievedBadgeSlugs.has(b.slug))
        .map((b) => b.slug);

      if (newlyAchieved.length > 0) {
        supabase.auth.updateUser({
          data: {
            achieved_badge_slugs: [
              ...(sessionUser.user_metadata?.achieved_badge_slugs ?? []),
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
    window.addEventListener(PRESENCE_CHANGED_EVENT, refresh);
    window.addEventListener(CREW_USERS_CHANGED_EVENT, refresh);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'USER_UPDATED') void refresh();
    });

    return () => {
      active = false;
      window.removeEventListener(PICKS_CHANGED_EVENT, refresh);
      window.removeEventListener(PRESENCE_CHANGED_EVENT, refresh);
      window.removeEventListener(CREW_USERS_CHANGED_EVENT, refresh);
      subscription.unsubscribe();
    };
  }, [user.id, allMissed]);

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

  function renderPatchButton(
    badge: BadgeConfig,
    index: number,
    mode: 'stack' | 'grid',
    stackPose?: StackPose,
  ) {
    const isGlowing = glowingSlugs.has(badge.slug);
    const btnClass = [
      styles.patchBtn,
      mode === 'stack' ? styles.patchStackItem : styles.patchGridItem,
      isGlowing ? styles.glowing : '',
    ].filter(Boolean).join(' ');

    const imgClass = mode === 'stack' ? styles.stackPatchImg : styles.patchImg;
    const chipClass = mode === 'stack' ? styles.stackYearChip : styles.yearChip;

    const patchContent = (
      <span className={styles.imgWrapper}>
        <img src={badge.imagePath} alt="" className={imgClass} />
        {badge.year && (
          <span className={chipClass}>{yearSuffix(badge.year)}</span>
        )}
      </span>
    );

    if (mode === 'stack') {
      if (!stackPose) return null;
      return (
        <div
          key={badge.slug}
          className={btnClass}
          style={stackStyle(stackPose)}
          aria-hidden="true"
        >
          {patchContent}
        </div>
      );
    }

    return (
      <button
        key={badge.slug}
        className={btnClass}
        style={{ ['--settle-i' as string]: index }}
        onClick={() => handleBadgeClick(badge.slug)}
        type="button"
        aria-label={t(badge.labelKey)}
      >
        {patchContent}
      </button>
    );
  }

  if (loading) {
    return (
      <>
        <div className={styles.patchesHeader}>
          <div className={styles.patchesHeading}>{t('patchesKicker')}</div>
        </div>
        <div
          className={`${styles.vestStack} ${styles.vestStackSkeleton}`}
          data-bg={bg}
          aria-hidden="true"
        >
          <div className={styles.vestStackMeadow}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={styles.skeletonStackPatch}
                style={{
                  left: `${14 + i * 13}%`,
                  top: `${22 + (i % 2) * 28}%`,
                }}
              />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (earned.length === 0) return null;

  const sortedEarned = earned;
  const collapsedPoses = spread
    ? null
    : buildStackPoses(sortedEarned, scatterSeed, glowingSlugs);

  return (
    <>
      <div className={styles.patchesHeader}>
        <div className={styles.patchesHeading}>
          {t('patchesKicker')}
          <span className={styles.patchesCount}>· {earned.length}</span>
        </div>
        <button
          type="button"
          className={styles.spreadBtn}
          onClick={() => {
            if (spread) setScatterSeed(Math.random());
            setSpread((s) => !s);
          }}
          aria-expanded={spread}
        >
          {spread ? t('patchesCollapse') : t('patchesSpread')}
        </button>
      </div>

      <div
        className={
          spread
            ? `${styles.vestStack} ${styles.vestSpread} ${styles.patchesGrid}`
            : styles.vestStack
        }
        data-bg={bg}
      >
        {spread ? (
          sortedEarned.map((badge, index) =>
            renderPatchButton(badge, index, 'grid'),
          )
        ) : (
          <div className={styles.vestStackMeadow}>
            {sortedEarned.map((badge, index) =>
              renderPatchButton(badge, index, 'stack', collapsedPoses!.get(badge.slug)),
            )}
          </div>
        )}
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
