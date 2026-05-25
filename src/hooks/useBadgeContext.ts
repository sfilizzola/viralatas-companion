import type { User as AuthUser } from '@supabase/supabase-js';
import { useBadgeCache } from './useBadgeCache';
import { useBadgePersist } from './useBadgePersist';

export { EMPTY_BADGE_CONTEXT } from '../services/badges';

export function useBadgeContext(user: AuthUser) {
  const cache = useBadgeCache(user.id);
  const ctx = useBadgePersist(user.id, cache);

  return { ctx, loading: cache.cacheLoading };
}
