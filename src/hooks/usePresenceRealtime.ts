import { useEffect } from 'react';
import type { UserPresence } from '../types';
import { saveUserPresence } from '../lib/db';
import { presenceRepository } from '../repositories';
import { subscribePostgresChanges } from '../lib/realtimeSync';

export function usePresenceRealtime(): void {
  useEffect(() => {
    presenceRepository.syncCrewFromRemote().catch(() => {});
    return subscribePostgresChanges('user_presence_live', {
      filter: { event: '*', table: 'user_presence' },
      handler: async (payload) => {
        const nextPresence = (payload.new ?? payload.old) as UserPresence | undefined;
        if (nextPresence) await saveUserPresence(nextPresence);
      },
    });
  }, []);
}
