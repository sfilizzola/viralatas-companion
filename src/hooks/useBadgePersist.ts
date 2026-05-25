import { useEffect, useRef, useState } from 'react';
import {
  BADGES,
  buildBadgeContextFromSnapshot,
  EMPTY_BADGE_CONTEXT,
  evaluateBadge,
  persistMetadataPatch,
  mergedPersistedBadgeSlugs,
  type BadgeContext,
} from '../services/badges';
import { supabase } from '../lib/supabase';
import type { BadgeCacheData } from './useBadgeCache';

function badgesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((s) => setB.has(s));
}

export function useBadgePersist(userId: string, cache: BadgeCacheData): BadgeContext {
  const [ctx, setCtx] = useState<BadgeContext>(EMPTY_BADGE_CONTEXT);
  const dbAssignedRef = useRef<string[] | null>(null);
  const metadataSyncedRef = useRef(false);

  useEffect(() => {
    dbAssignedRef.current = null;
    metadataSyncedRef.current = false;
  }, [userId]);

  useEffect(() => {
    const snapshot = cache.snapshot;
    if (cache.cacheLoading || !snapshot) return;

    let active = true;
    const sessionUser = snapshot.sessionUser;

    const assignedForPhase1 = dbAssignedRef.current ?? snapshot.assignedBadgesFromMeta;
    const idbCtx = buildBadgeContextFromSnapshot(
      {
        userPicks: snapshot.userPicks,
        allPicks: snapshot.allPicks,
        bands: snapshot.bands,
        allMissed: snapshot.allMissed,
        assignedBadges: assignedForPhase1,
        isCurrentUserFriend: snapshot.isCurrentUserFriendFromIdb,
        presence: snapshot.presence,
        crewUsers: snapshot.crewUsers,
        metalPlaceWindowActive: snapshot.metalPlaceWindowActive,
        liveTestBandId: snapshot.liveTestBandId,
      },
      userId,
      sessionUser,
    );
    setCtx(idbCtx);

    const snap = snapshot;

    async function enrich() {
      const userRow = await supabase
        .from('users')
        .select('special_badges, is_friend')
        .eq('id', userId)
        .single();
      if (!active) return;

      const rowData = userRow.data as { special_badges?: string[]; is_friend?: boolean | null } | null;
      const assignedBadges: string[] = rowData?.special_badges ?? [];
      dbAssignedRef.current = assignedBadges;
      const isCurrentUserFriend = rowData?.is_friend === true;

      const metaBadges = snap.assignedBadgesFromMeta;
      const hasDrift = !badgesEqual(assignedBadges, metaBadges);
      if (hasDrift && !metadataSyncedRef.current) {
        metadataSyncedRef.current = true;
        supabase.auth
          .updateUser({ data: { special_badges: assignedBadges } })
          .catch(() => {
            metadataSyncedRef.current = false;
          });
      }

      const fullCtx = buildBadgeContextFromSnapshot(
        {
          userPicks: snap.userPicks,
          allPicks: snap.allPicks,
          bands: snap.bands,
          allMissed: snap.allMissed,
          assignedBadges,
          isCurrentUserFriend,
          presence: snap.presence,
          crewUsers: snap.crewUsers,
          metalPlaceWindowActive: snap.metalPlaceWindowActive,
          liveTestBandId: snap.liveTestBandId,
        },
        userId,
        sessionUser,
      );

      const achievedBadgeSlugs = mergedPersistedBadgeSlugs(sessionUser.user_metadata);
      const earnedBadges = BADGES.filter((b) => evaluateBadge(b, fullCtx));
      const newlyAchieved = earnedBadges.filter(
        (b) => b.persist && !achievedBadgeSlugs.has(b.slug),
      );

      const persistPatch = persistMetadataPatch(sessionUser.user_metadata, newlyAchieved);
      if (persistPatch) {
        supabase.auth.updateUser({ data: persistPatch }).catch(() => {
          // badge earning is best-effort
        });
      }

      setCtx(fullCtx);
    }

    void enrich();

    return () => {
      active = false;
    };
  }, [userId, cache]);

  return ctx;
}
