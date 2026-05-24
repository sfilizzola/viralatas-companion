import { useEffect, useRef, useState } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import {
  BADGES,
  buildBadgeContext,
  evaluateBadge,
  type BadgeBand,
  type BadgeContext,
} from '../services/badges';
import {
  loadUserPicks,
  loadAllUserPicks,
  loadBands,
  loadAllUserPresence,
  loadCrewUsers,
  PICKS_CHANGED_EVENT,
  PRESENCE_CHANGED_EVENT,
  CREW_USERS_CHANGED_EVENT,
} from '../lib/db';
import { useMissedBands } from './useMissedBands';
import { now } from '../services/time';
import { supabase } from '../lib/supabase';

export const EMPTY_BADGE_CONTEXT: BadgeContext = {
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

function badgesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((s) => setB.has(s));
}

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

function buildCtxFromSnapshot(snap: IdbSnapshot, userId: string, authUser: AuthUser): BadgeContext {
  const { userPicks, allPicks, bands, allMissed, assignedBadges, isCurrentUserFriend, presence, crewUsers } = snap;
  const userPickBandIds = userPicks.map((p) => p.band_id);
  const allPickCounts = new Map<string, number>();
  allPicks.forEach((p) =>
    allPickCounts.set(p.band_id, (allPickCounts.get(p.band_id) ?? 0) + 1),
  );
  const bandsById = new Map<string, BadgeBand>(bands.map((b) => [b.id, b]));
  const userMissedIds = new Set(
    allMissed.filter((m) => m.user_id === userId).map((m) => m.band_id),
  );

  const myPresence = presence.find((p) => p.user_id === userId);
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
    (authUser.user_metadata?.achieved_badge_slugs as string[]) ?? [],
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

export function useBadgeContext(user: AuthUser) {
  const { allMissed } = useMissedBands(user.id);
  const [ctx, setCtx] = useState<BadgeContext>(EMPTY_BADGE_CONTEXT);
  const [loading, setLoading] = useState(true);

  const dbAssignedRef = useRef<string[] | null>(null);
  const metadataSyncedRef = useRef(false);

  useEffect(() => {
    let active = true;
    dbAssignedRef.current = null;
    metadataSyncedRef.current = false;

    async function refresh() {
      const { data: { session } } = await supabase.auth.getSession();
      const sessionUser = session?.user;
      if (!sessionUser || sessionUser.id !== user.id) return;

      const [userPicks, allPicks, bands, presence, crewUsers] = await Promise.all([
        loadUserPicks(user.id),
        loadAllUserPicks(),
        loadBands(),
        loadAllUserPresence(),
        loadCrewUsers(),
      ]);
      if (!active) return;

      const assignedBadgesFromMeta: string[] =
        (sessionUser.user_metadata?.special_badges as string[]) ?? [];
      const assignedForPhase1 = dbAssignedRef.current ?? assignedBadgesFromMeta;
      const isCurrentUserFriendFromIdb = crewUsers.find((u) => u.id === user.id)?.is_friend === true;

      const idbCtx = buildCtxFromSnapshot(
        {
          userPicks,
          allPicks,
          bands,
          allMissed,
          assignedBadges: assignedForPhase1,
          isCurrentUserFriend: isCurrentUserFriendFromIdb,
          presence,
          crewUsers,
        },
        user.id,
        sessionUser,
      );
      setCtx(idbCtx);
      setLoading(false);

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

      const fullCtx = buildCtxFromSnapshot(
        {
          userPicks,
          allPicks,
          bands,
          allMissed,
          assignedBadges,
          isCurrentUserFriend,
          presence,
          crewUsers,
        },
        user.id,
        sessionUser,
      );

      const achievedBadgeSlugs = new Set<string>(
        (sessionUser.user_metadata?.achieved_badge_slugs as string[]) ?? [],
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

  return { ctx, loading };
}
