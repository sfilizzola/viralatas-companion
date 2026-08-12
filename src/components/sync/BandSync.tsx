import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getActiveFestivalId } from '../../lib/db';
import { bandsRepository } from '../../repositories';

export function BandSync() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    void (async () => {
      const festivalId = (await getActiveFestivalId()) ?? undefined;
      await bandsRepository.sync(festivalId).catch(() => {}); // swallow offline errors; bands stay in IndexedDB
    })();
  }, [userId]);

  return null;
}
