import { useEffect, useMemo } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import {
  BADGES,
  buildBadgeContextFromSocialSnapshot,
  EMPTY_BADGE_CONTEXT,
  evaluateBadge,
  persistMetadataPatch,
  mergedPersistedBadgeSlugs,
  type BadgeContext,
} from '../services/badges';
import type { BadgeIdbSnapshot } from '../services/badges/badgeContextBuilder';
import type { SocialSnapshot } from '../services/socialSnapshot';
import { supabase } from '../lib/supabase';
import type { Band, CrewUser, UserPick, UserPresence } from '../types';

export type BadgePersistInput = {
  social: SocialSnapshot | null;
  bands: Band[];
  crewUsers: CrewUser[];
  presence: UserPresence[];
  picks: UserPick[];
  allMissed: { user_id: string; band_id: string }[];
  user: AuthUser;
  loading: boolean;
};

function buildIdbSnap(input: BadgePersistInput, userId: string): BadgeIdbSnapshot {
  const crewRow = input.crewUsers.find((u) => u.id === userId);
  return {
    userPicks: input.picks.filter((p) => p.user_id === userId),
    allPicks: input.picks,
    bands: input.bands,
    allMissed: input.allMissed,
    assignedBadges: crewRow?.special_badges ?? [],
    isCurrentUserFriend: crewRow?.is_friend === true,
    presence: input.presence,
    crewUsers: input.crewUsers,
    metalPlaceWindowActive: input.social!.metalPlaceWindowActive,
    liveTestBandId: input.social!.liveTestBandId,
  };
}

function buildCtxFromInput(input: BadgePersistInput, userId: string): BadgeContext {
  return buildBadgeContextFromSocialSnapshot(
    buildIdbSnap(input, userId),
    input.social!,
    userId,
    input.user,
  );
}

export function useBadgePersist(userId: string, input: BadgePersistInput): BadgeContext {
  const { social, bands, crewUsers, presence, picks, allMissed, user, loading } = input;

  const ctx = useMemo(() => {
    if (loading || !social) return EMPTY_BADGE_CONTEXT;
    return buildCtxFromInput(input, userId);
  }, [userId, loading, social, bands, crewUsers, presence, picks, allMissed, user]);

  useEffect(() => {
    if (loading || !social) return;

    const fullCtx = buildCtxFromInput(input, userId);
    const achievedBadgeSlugs = mergedPersistedBadgeSlugs(user.user_metadata);
    const earnedBadges = BADGES.filter((b) => evaluateBadge(b, fullCtx));
    const newlyAchieved = earnedBadges.filter(
      (b) => b.persist && !achievedBadgeSlugs.has(b.slug),
    );

    const persistPatch = persistMetadataPatch(user.user_metadata, newlyAchieved);
    if (persistPatch) {
      supabase.auth.updateUser({ data: persistPatch }).catch(() => {
        // badge earning is best-effort
      });
    }
  }, [userId, loading, social, bands, crewUsers, presence, picks, allMissed, user]);

  return ctx;
}
