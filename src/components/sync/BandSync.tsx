import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { bandsRepository } from '../../repositories';

export function BandSync() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      bandsRepository.sync().catch(() => {}); // swallow offline errors; bands stay in IndexedDB
    }
  }, [userId]);

  return null;
}
