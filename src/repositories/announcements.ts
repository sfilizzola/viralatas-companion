import type { Announcement, BlockedPoster, UserRole } from '../types';
import {
  enqueueOfflineAnnouncement,
  loadOfflineAnnouncementsQueue,
  removeAnnouncementFromCache,
  removeFromOfflineAnnouncementsQueue,
  saveAnnouncement,
  saveAnnouncements,
} from '../lib/db';
import { supabase } from '../lib/supabase';

const INITIAL_SYNC_LIMIT = 10;

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

async function flushPending(): Promise<number> {
  const queue = await loadOfflineAnnouncementsQueue();
  if (queue.length === 0) return 0;

  let flushed = 0;
  for (const item of queue) {
    const { data, error } = await supabase
      .from('announcements')
      .insert({ author_id: item.author_id, content: item.content })
      .select()
      .single();

    if (!error) {
      await removeFromOfflineAnnouncementsQueue(item.id);
      await removeAnnouncementFromCache(item.id);
      if (data) await saveAnnouncement(data as Announcement);
      flushed++;
    }
  }
  return flushed;
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

async function fetchBlockedPosters(): Promise<BlockedPoster[]> {
  const { data } = await supabase.from('blocked_posters').select('*');
  return (data as BlockedPoster[]) ?? [];
}

async function fetchBlockedPostersWithUserDetails(): Promise<Array<BlockedPoster & { user_email: string; user_display_name: string | null; user_avatar_url: string | null; user_special_badges: string[] }>> {
  const blocked = await fetchBlockedPosters();
  if (blocked.length === 0) return [];

  const { data: users } = await supabase
    .from('users')
    .select('id, email, display_name, avatar_url, special_badges')
    .in('id', blocked.map(b => b.user_id)) as { data: Array<{ id: string; email: string; display_name: string | null; avatar_url: string | null; special_badges: string[] }> | null };

  const userMap = new Map((users || []).map(u => [u.id, u]));

  return blocked.map(b => ({
    ...b,
    user_email: userMap.get(b.user_id)?.email || 'unknown',
    user_display_name: userMap.get(b.user_id)?.display_name || null,
    user_avatar_url: userMap.get(b.user_id)?.avatar_url || null,
    user_special_badges: userMap.get(b.user_id)?.special_badges ?? [],
  }));
}

async function blockUser(userId: string, blockedBy: string): Promise<void> {
  await supabase
    .from('blocked_posters')
    .upsert({ user_id: userId, blocked_by: blockedBy });
}

async function unblockUser(userId: string): Promise<void> {
  await supabase.from('blocked_posters').delete().eq('user_id', userId);
}

async function pinAnnouncement(id: string): Promise<void> {
  // Unpin all, then pin the target
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

async function setUserRole(
  targetUserId: string,
  role: 'normal' | 'manager',
): Promise<void> {
  await supabase.rpc('set_user_role', { target_user_id: targetUserId, new_role: role });
}

async function fetchAllUsers(): Promise<
  { id: string; email: string; display_name: string | null; avatar_url: string | null; role: string; special_badges: string[]; is_friend: boolean | null }[]
> {
  const { data } = await supabase
    .from('users')
    .select('id, email, display_name, avatar_url, role, special_badges, is_friend')
    .order('display_name') as { data: Array<{ id: string; email: string; display_name: string | null; avatar_url: string | null; role: string; special_badges: string[]; is_friend: boolean | null }> | null };
  return (data ?? []).map((u) => ({ ...u, special_badges: u.special_badges ?? [] }));
}

export const announcementsRepository = {
  sync,
  fetchMore,
  post,
  delete: deleteAnnouncement,
  flushPending,
  fetchCurrentUserRole,
  fetchIsBlocked,
  fetchBlockedPosters,
  fetchBlockedPostersWithUserDetails,
  blockUser,
  unblockUser,
  setUserRole,
  fetchAllUsers,
  pinAnnouncement,
  unpinAnnouncement,
};
