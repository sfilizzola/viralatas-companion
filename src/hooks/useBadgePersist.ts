import { useEffect, useState } from 'react';
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

function buildCtxFromCache(
  snapshot: NonNullable<BadgeCacheData['snapshot']>,
  userId: string,
): BadgeContext {
  const crewRow = snapshot.crewUsers.find((u) => u.id === userId);
  return buildBadgeContextFromSnapshot(
    {
      userPicks: snapshot.userPicks,
      allPicks: snapshot.allPicks,
      bands: snapshot.bands,
      allMissed: snapshot.allMissed,
      assignedBadges: crewRow?.special_badges ?? [],
      isCurrentUserFriend: crewRow?.is_friend === true,
      presence: snapshot.presence,
      crewUsers: snapshot.crewUsers,
      metalPlaceWindowActive: snapshot.metalPlaceWindowActive,
      liveTestBandId: snapshot.liveTestBandId,
    },
    userId,
    snapshot.sessionUser,
  );
}

export function useBadgePersist(userId: string, cache: BadgeCacheData): BadgeContext {
  const [ctx, setCtx] = useState<BadgeContext>(EMPTY_BADGE_CONTEXT);

  useEffect(() => {
    const snapshot = cache.snapshot;
    if (cache.cacheLoading || !snapshot) return;
    setCtx(buildCtxFromCache(snapshot, userId));
  }, [userId, cache]);

  useEffect(() => {
    const snapshot = cache.snapshot;
    if (cache.cacheLoading || !snapshot) return;

    const fullCtx = buildCtxFromCache(snapshot, userId);
    const sessionUser = snapshot.sessionUser;
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
  }, [userId, cache]);

  return ctx;
}
