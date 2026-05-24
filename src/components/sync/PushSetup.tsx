import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { subscribeToPush } from '../../lib/pushSubscription';

export function PushSetup() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    subscribeToPush(userId).catch(() => {});
  }, [userId]);

  return null;
}
