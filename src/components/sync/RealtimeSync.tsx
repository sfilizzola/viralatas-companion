import { useEffect } from 'react';
import { useActiveFestival } from '../../hooks/useActiveFestival';
import {
  announcementsRepository,
  missedRepository,
  picksRepository,
  presenceRepository,
  ratingsRepository,
  reactionsRepository,
  usersRepository,
} from '../../repositories';
import { subscribeToLiveBandTestConfigRealtime } from '../../services/liveBandTest';

/**
 * Mounts all Supabase Realtime → IndexedDB subscriptions once at app level.
 * Hooks react via window events only; they do not own Realtime channels.
 * Re-subscribes when Active Festival changes so festival-scoped filters stay correct.
 */
export function RealtimeSync() {
  const { activeFestivalId, ready } = useActiveFestival();

  useEffect(() => {
    if (!ready) return;

    const festivalId = activeFestivalId ?? undefined;
    const unsubscribers: Array<() => void> = [
      picksRepository.subscribeToRealtime(festivalId),
      announcementsRepository.subscribeToRealtime(festivalId),
      presenceRepository.subscribeToRealtime(),
      presenceRepository.subscribeToMetalPlaceConfigRealtime(),
      subscribeToLiveBandTestConfigRealtime(),
      missedRepository.subscribeToRealtime(),
      ratingsRepository.subscribeToRealtime(),
      reactionsRepository.subscribeToRealtime(),
      usersRepository.subscribeToRealtime(),
    ];

    if (festivalId) {
      unsubscribers.push(usersRepository.subscribeToMembershipRealtime(festivalId));
    }

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }, [activeFestivalId, ready]);

  return null;
}
