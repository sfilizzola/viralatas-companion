import type { Announcement, BlockedPoster, UserRole } from '../types';
import {
  enqueueOfflineAnnouncement,
  loadOfflineAnnouncementsQueue,
  removeAnnouncementFromCache,
  removeFromOfflineAnnouncementsQueue,
  saveAnnouncement,
  saveAnnouncements,
} from './db';
import { supabase } from './supabase';

export async function syncAnnouncements(): Promise<void> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error || !data) return;
  await saveAnnouncements(data as Announcement[]);
}

export async function postAnnouncement(userId: string, content: string): Promise<void> {
  const draft: Announcement = {
    id: crypto.randomUUID(),
    author_id: userId,
    content,
    created_at: new Date().toISOString(),
    deleted_at: null,
  };

  // Optimistic local write so the UI responds immediately
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
    // Replace the local draft with the server record (correct UUID)
    await removeAnnouncementFromCache(draft.id);
    await saveAnnouncement(data as Announcement);
  }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  // Optimistic: remove from local cache immediately
  await removeAnnouncementFromCache(id);

  if (!navigator.onLine) return;

  await supabase
    .from('announcements')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
}

export async function flushPendingAnnouncements(): Promise<void> {
  const queue = await loadOfflineAnnouncementsQueue();
  if (queue.length === 0) return;

  for (const item of queue) {
    const { data, error } = await supabase
      .from('announcements')
      .insert({ author_id: item.author_id, content: item.content })
      .select()
      .single();

    if (!error) {
      await removeFromOfflineAnnouncementsQueue(item.id);
      // Swap the local-UUID draft for the server record
      await removeAnnouncementFromCache(item.id);
      if (data) await saveAnnouncement(data as Announcement);
    }
  }
}

export async function fetchCurrentUserRole(userId: string): Promise<UserRole> {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  return (data?.role as UserRole | undefined) ?? 'normal';
}

export async function fetchIsBlocked(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('blocked_posters')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data !== null;
}

export async function fetchBlockedPosters(): Promise<BlockedPoster[]> {
  const { data } = await supabase.from('blocked_posters').select('*');
  return (data as BlockedPoster[]) ?? [];
}

export async function blockUser(userId: string, blockedBy: string): Promise<void> {
  await supabase
    .from('blocked_posters')
    .upsert({ user_id: userId, blocked_by: blockedBy });
}

export async function unblockUser(userId: string): Promise<void> {
  await supabase.from('blocked_posters').delete().eq('user_id', userId);
}

export async function setUserRole(
  targetUserId: string,
  role: 'normal' | 'manager',
): Promise<void> {
  await supabase.rpc('set_user_role', { target_user_id: targetUserId, new_role: role });
}

export async function fetchAllUsers(): Promise<
  { id: string; email: string; display_name: string | null; avatar_url: string | null; role: string }[]
> {
  const { data } = await supabase
    .from('users')
    .select('id, email, display_name, avatar_url, role')
    .order('display_name');
  return data ?? [];
}
