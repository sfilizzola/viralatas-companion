import { loadAllUserPicks, PICKS_CHANGED_EVENT } from '../lib/db';
import type { UserPick } from '../types';
import { useIdbSubscription } from './useIdbSubscription';

export const ALL_PICKS_CACHE_KEY = 'all-user-picks';

export function useAllPicks(): UserPick[] | undefined {
  return useIdbSubscription({
    key: ALL_PICKS_CACHE_KEY,
    events: [PICKS_CHANGED_EVENT],
    loader: loadAllUserPicks,
    fallback: [] as UserPick[],
  });
}
