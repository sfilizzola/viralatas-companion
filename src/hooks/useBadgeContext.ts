import { useMemo } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import { useMissedBands } from './useMissedBands';
import { useNow } from './useNow';
import { useSocialSnapshot } from './useSocialSnapshot';
import { useBadgePersist } from './useBadgePersist';

export { EMPTY_BADGE_CONTEXT } from '../services/badges';

export function useBadgeContext(user: AuthUser) {
  const nowDate = useNow(30_000);
  const { snapshot: social, crewUsers, presence, picks, bands, loading: socialLoading } =
    useSocialSnapshot(nowDate);
  const { allMissed } = useMissedBands(user.id);

  const persistInput = useMemo(
    () => ({
      social,
      bands,
      crewUsers,
      presence,
      picks,
      allMissed,
      user,
      loading: socialLoading,
    }),
    [social, bands, crewUsers, presence, picks, allMissed, user, socialLoading],
  );

  const ctx = useBadgePersist(user.id, persistInput);

  return { ctx, loading: socialLoading };
}
