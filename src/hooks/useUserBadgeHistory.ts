import { useCallback, useEffect, useState } from 'react';
import { BADGE_HISTORY_CHANGED_EVENT } from '../lib/db';
import { badgeHistoryRepository } from '../repositories/badgeHistoryRepository';
import type { UserBadgeHistory } from '../types';

export function useUserBadgeHistory(userId: string | undefined) {
  const [rows, setRows] = useState<UserBadgeHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshLocal = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    const local = await badgeHistoryRepository.loadLocal(userId);
    setRows(local);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }

    const uid = userId;
    let active = true;
    setLoading(true);

    async function load() {
      const local = await badgeHistoryRepository.loadLocal(uid);
      if (!active) return;
      setRows(local);
      setLoading(false);

      if (navigator.onLine) {
        await badgeHistoryRepository.syncFromRemote(uid);
        if (!active) return;
        const synced = await badgeHistoryRepository.loadLocal(uid);
        setRows(synced);
      }
    }

    void load();

    function onHistoryChanged() {
      void refreshLocal();
    }

    function onOnline() {
      void badgeHistoryRepository.syncFromRemote(uid).then(() => {
        if (active) void refreshLocal();
      });
    }

    window.addEventListener(BADGE_HISTORY_CHANGED_EVENT, onHistoryChanged);
    window.addEventListener('online', onOnline);

    return () => {
      active = false;
      window.removeEventListener(BADGE_HISTORY_CHANGED_EVENT, onHistoryChanged);
      window.removeEventListener('online', onOnline);
    };
  }, [userId, refreshLocal]);

  return { rows, loading };
}
