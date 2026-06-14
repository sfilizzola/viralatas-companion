import type { Announcement, UserRole } from '../types';
import {
  enqueueOfflineAnnouncement,
  loadOfflineAnnouncementsQueue,
  removeAnnouncementFromCache,
  removeAnnouncementReactionsForPost,
  removeFromOfflineAnnouncementsQueue,
  saveAnnouncement,
  saveAnnouncements,
} from '../lib/db';
import { createOptimisticQueue } from '../lib/optimisticQueue';
import { subscribePostgresChanges } from '../lib/realtimeSync';
import { supabase } from '../lib/supabase';

const INITIAL_SYNC_LIMIT = 10;

const announcementOfflineQueue = createOptimisticQueue<Announcement>(
  {
    load: loadOfflineAnnouncementsQueue,
    remove: removeFromOfflineAnnouncementsQueue,
  },
  {
    getId: (item) => item.id,
    dedup: { strategy: 'fifo' },
    syncOne: async (item) => {
      const { data, error } = await supabase
        .from('announcements')
        .insert({ author_id: item.author_id, content: item.content })
        .select()
        .single();
      if (error) return { error };
      if (data) await saveAnnouncement(data as Announcement);
      return { error: null };
    },
    onBatchSynced: async (item) => {
      await removeAnnouncementFromCache(item.id);
    },
  },
);

async function sync(): Promise<void> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(INITIAL_SYNC_LIMIT);

  if (error || !data) return;
  await saveAnnouncements(data as Announcement[]);
}

async function fetchMore(before: string, limit = 5): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .lt('created_at', before)
    .limit(limit);

  if (error || !data) return [];
  await saveAnnouncements(data as Announcement[]);
  return data as Announcement[];
}

async function post(userId: string, content: string): Promise<void> {
  const draft: Announcement = {
    id: crypto.randomUUID(),
    author_id: userId,
    content,
    created_at: new Date().toISOString(),
    deleted_at: null,
    is_pinned: false,
  };

  await saveAnnouncement(draft);

  if (!navigator.onLine) {
    await enqueueOfflineAnnouncement(draft);
    return;
  }

  const { data, error } = await supabase
    .from('announcements')
    .insert({ author_id: userId, content })
    .select()
    .single();

  if (error) {
    await enqueueOfflineAnnouncement(draft);
    return;
  }

  if (data) {
    await removeAnnouncementFromCache(draft.id);
    await saveAnnouncement(data as Announcement);
  }
}

async function deleteAnnouncement(id: string): Promise<void> {
  await removeAnnouncementFromCache(id);
  await removeAnnouncementReactionsForPost(id);

  if (!navigator.onLine) return;

  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete failed:', error);
    throw new Error(`Delete failed: ${error.message}`);
  }
}

async function flushOfflineQueue(): Promise<number> {
  return announcementOfflineQueue.flush();
}

/** @deprecated Use flushOfflineQueue — kept for callers not yet migrated. */
async function flushPending(): Promise<number> {
  return flushOfflineQueue();
}

async function fetchCurrentUserRole(userId: string): Promise<UserRole> {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  return (data?.role as UserRole | undefined) ?? 'normal';
}

async function fetchIsBlocked(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('blocked_posters')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data !== null;
}

async function pinAnnouncement(id: string): Promise<void> {
  await supabase
    .from('announcements')
    .update({ is_pinned: false })
    .eq('is_pinned', true);

  await supabase
    .from('announcements')
    .update({ is_pinned: true })
    .eq('id', id);
}

async function unpinAnnouncement(id: string): Promise<void> {
  await supabase
    .from('announcements')
    .update({ is_pinned: false })
    .eq('id', id);
}

function subscribeToRealtime(): () => void {
  return subscribePostgresChanges('announcements_live', [
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
        const id = payload.old.id as string;
        await removeAnnouncementFromCache(id);
        await removeAnnouncementReactionsForPost(id);
      },
    },
  ]);
}

export const announcementsRepository = {
  sync,
  fetchMore,
  post,
  delete: deleteAnnouncement,
  flushOfflineQueue,
  flushPending,
  fetchCurrentUserRole,
  fetchIsBlocked,
  pinAnnouncement,
  unpinAnnouncement,
  subscribeToRealtime,
};
