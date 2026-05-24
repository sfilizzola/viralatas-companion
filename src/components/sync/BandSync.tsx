import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { syncBands } from '../../lib/sync';

export function BandSync() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      syncBands().catch(() => {}); // swallow offline errors; bands stay in IndexedDB
    }
  }, [userId]);

  return null;
}
