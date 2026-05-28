import {
  CREW_USERS_CHANGED_EVENT,
  loadAllUserPresence,
  loadCrewUsers,
  PRESENCE_CHANGED_EVENT,
} from '../lib/db';
import { useIdbSubscription } from './useIdbSubscription';

export const CREW_CACHE_KEY = 'crew-users';
export const PRESENCE_CACHE_KEY = 'all-user-presence';

export function useCrewUsersCache() {
  return useIdbSubscription({
    key: CREW_CACHE_KEY,
    events: [CREW_USERS_CHANGED_EVENT],
    loader: loadCrewUsers,
  });
}

export function usePresenceCache() {
  return useIdbSubscription({
    key: PRESENCE_CACHE_KEY,
    events: [PRESENCE_CHANGED_EVENT],
    loader: loadAllUserPresence,
  });
}
