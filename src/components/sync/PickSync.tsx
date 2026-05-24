import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { picksRepository, usersRepository, presenceRepository } from '../../repositories';
import { emitSyncComplete } from './emitSyncComplete';

export function PickSync() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    async function syncNow() {
      const [picksFlushed, presenceFlushed] = await Promise.all([
        picksRepository.flushOfflineQueue(),
        presenceRepository.flushOfflineQueue(),
      ]);
      if (picksFlushed + presenceFlushed > 0) emitSyncComplete();
      await Promise.all([picksRepository.syncCrewFromRemote(), usersRepository.syncCrew(), presenceRepository.syncCrewFromRemote()]);
    }

    syncNow().catch(() => {});

    function handleOnline() {
      syncNow().catch(() => {});
    }

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [userId]);

  return null;
}
