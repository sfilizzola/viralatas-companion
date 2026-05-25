import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Announcement, CrewUser, UserRole } from '../types';
import {
  ANNOUNCEMENTS_CHANGED_EVENT,
  loadAnnouncementsFromCache,
  loadCrewUsers,
  loadOfflineAnnouncementsQueue,
  removeAnnouncementFromCache,
  saveAnnouncement,
} from '../lib/db';
import { announcementsRepository, usersRepository } from '../repositories';
import { subscribePostgresChanges } from '../lib/realtimeSync';
import { applyPinSort } from '../services/announcementsDisplay';

const PAGE_SIZE = 10;
const LOAD_MORE_SIZE = 5;

export function useAnnouncements(userId: string | null) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [crewUsers, setCrewUsers] = useState<CrewUser[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, UserRole>>({});
  const [role, setRole] = useState<UserRole>('normal');
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blocking, setBlocking] = useState<string | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [pendingAnnouncementIds, setPendingAnnouncementIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pinning, setPinning] = useState<string | null>(null);

  const refreshFromCache = useCallback(async () => {
    const [cached, users, pendingQueue] = await Promise.all([
      loadAnnouncementsFromCache(),
      loadCrewUsers(),
      loadOfflineAnnouncementsQueue(),
    ]);
    setAnnouncements(cached);
    setCrewUsers(users);
    setPendingAnnouncementIds(new Set(pendingQueue.map((a) => a.id)));
    setUserRoles(await usersRepository.fetchUserRolesMap());
    setLoading(false);
  }, []);

  const sortedAnnouncements = useMemo(() => applyPinSort(announcements), [announcements]);
  const visibleAnnouncements = useMemo(
    () => sortedAnnouncements.slice(0, visibleCount),
    [sortedAnnouncements, visibleCount],
  );

  const canModerate = role === 'manager' || role === 'godlike';

  const loadMore = useCallback(async () => {
    if (loadingMore) return;

    if (announcements.length > visibleCount) {
      setVisibleCount((v) => v + LOAD_MORE_SIZE);
      return;
    }

    if (!navigator.onLine) {
      return 'offline' as const;
    }

    setLoadingMore(true);
    const oldest = announcements[announcements.length - 1]?.created_at;
    if (!oldest) {
      setHasMore(false);
      setLoadingMore(false);
      return;
    }

    const fetched = await announcementsRepository.fetchMore(oldest, LOAD_MORE_SIZE);
    setLoadingMore(false);

    if (fetched.length < LOAD_MORE_SIZE) setHasMore(false);
    if (fetched.length > 0) {
      await refreshFromCache();
      setVisibleCount((v) => v + LOAD_MORE_SIZE);
    }
  }, [announcements, loadingMore, refreshFromCache, visibleCount]);

  const post = useCallback(
    async (content: string) => {
      if (!userId || !content.trim()) return;
      await announcementsRepository.post(userId, content.trim());
    },
    [userId],
  );

  const deleteAnnouncement = useCallback(async (id: string) => {
    await announcementsRepository.delete(id);
  }, []);

  const blockUser = useCallback(
    async (authorId: string) => {
      if (!userId) return;
      setBlocking(authorId);
      try {
        await usersRepository.blockUser(authorId, userId);
        await announcementsRepository.sync();
      } finally {
        setBlocking(null);
      }
    },
    [userId],
  );

  const pin = useCallback(
    async (announcement: Announcement) => {
      if (!navigator.onLine) return;
      setPinning(announcement.id);
      try {
        if (announcement.is_pinned) {
          await announcementsRepository.unpinAnnouncement(announcement.id);
        } else {
          await announcementsRepository.pinAnnouncement(announcement.id);
        }
        await announcementsRepository.sync();
        await refreshFromCache();
      } finally {
        setPinning(null);
      }
    },
    [refreshFromCache],
  );

  useEffect(() => {
    refreshFromCache();
    window.addEventListener(ANNOUNCEMENTS_CHANGED_EVENT, refreshFromCache);
    return () => window.removeEventListener(ANNOUNCEMENTS_CHANGED_EVENT, refreshFromCache);
  }, [refreshFromCache]);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      announcementsRepository.fetchCurrentUserRole(userId),
      announcementsRepository.fetchIsBlocked(userId),
    ]).then(([r, b]) => {
      setRole(r);
      setIsBlocked(b);
    });
  }, [userId]);

  useEffect(() => {
    usersRepository.fetchBlockedPosters().then((blocked) => {
      setBlockedUserIds(new Set(blocked.map((b) => b.user_id)));
    });

    const unsubscribeRealtime = subscribePostgresChanges('announcements_live', [
      {
        filter: { event: 'INSERT', table: 'announcements' },
        handler: async (payload) => {
          await saveAnnouncement(payload.new as Announcement);
        },
      },
      {
        filter: { event: 'UPDATE', table: 'announcements' },
        handler: async (payload) => {
          await saveAnnouncement(payload.new as Announcement);
        },
      },
      {
        filter: { event: 'DELETE', table: 'announcements' },
        handler: async (payload) => {
          await removeAnnouncementFromCache(payload.old.id as string);
        },
      },
      {
        filter: { event: 'INSERT', table: 'blocked_posters' },
        handler: async (payload) => {
          const blocked = payload.new as { user_id: string };
          setBlockedUserIds((prev) => new Set([...prev, blocked.user_id]));
        },
      },
      {
        filter: { event: 'DELETE', table: 'blocked_posters' },
        handler: async (payload) => {
          const unblocked = payload.old as { user_id: string };
          setBlockedUserIds((prev) => {
            const next = new Set(prev);
            next.delete(unblocked.user_id);
            return next;
          });
        },
      },
    ]);

    return () => {
      unsubscribeRealtime();
    };
  }, []);

  return {
    announcements,
    sortedAnnouncements,
    visibleAnnouncements,
    crewUsers,
    userRoles,
    blockedUserIds,
    pendingAnnouncementIds,
    loading,
    role,
    isBlocked,
    canModerate,
    visibleCount,
    loadingMore,
    hasMore,
    blocking,
    pinning,
    loadMore,
    post,
    deleteAnnouncement,
    blockUser,
    pin,
    refreshFromCache,
  };
}
