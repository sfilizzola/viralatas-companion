import { saveCrewUsers } from '../lib/db';
import { BLOCKED_POSTERS_CHANGED_EVENT } from '../lib/db';
import { subscribePostgresChanges } from '../lib/realtimeSync';
import { supabase } from '../lib/supabase';
import type { BlockedPoster, CrewUser, UserRole } from '../types';

export type UserWithDetails = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  special_badges: string[];
  is_friend: boolean | null;
};

export type BlockedPosterWithUserDetails = BlockedPoster & {
  user_email: string;
  user_display_name: string | null;
  user_avatar_url: string | null;
  user_special_badges: string[];
};

async function syncCrew(): Promise<void> {
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, avatar_url, wacken_arrival_day, is_friend, special_badges')
    .order('display_name', { ascending: true, nullsFirst: false });

  if (error || !data) return;

  const crew: CrewUser[] = (data as Array<CrewUser & { special_badges?: string[] | null }>).map(
    (u) => ({ ...u, special_badges: u.special_badges ?? [] }),
  );
  await saveCrewUsers(crew);
}

async function fetchUserRolesMap(): Promise<Record<string, UserRole>> {
  const { data } = await supabase.from('users').select('id, role');
  if (!data) return {};
  return Object.fromEntries(data.map((u) => [u.id, u.role as UserRole]));
}

async function fetchAllUsers(): Promise<UserWithDetails[]> {
  const { data } = await supabase
    .from('users')
    .select('id, email, display_name, avatar_url, role, special_badges, is_friend')
    .order('display_name') as { data: Array<Omit<UserWithDetails, 'special_badges'> & { special_badges: string[] | null }> | null };
  return (data ?? []).map((u) => ({ ...u, special_badges: u.special_badges ?? [] }));
}

async function setUserRole(
  targetUserId: string,
  role: 'normal' | 'manager',
): Promise<void> {
  await supabase.rpc('set_user_role', { target_user_id: targetUserId, new_role: role });
}

async function fetchBlockedPosters(): Promise<BlockedPoster[]> {
  const { data } = await supabase.from('blocked_posters').select('*');
  return (data as BlockedPoster[]) ?? [];
}

async function fetchBlockedPostersWithUserDetails(): Promise<BlockedPosterWithUserDetails[]> {
  const blocked = await fetchBlockedPosters();
  if (blocked.length === 0) return [];

  const { data: users } = await supabase
    .from('users')
    .select('id, email, display_name, avatar_url, special_badges')
    .in('id', blocked.map((b) => b.user_id)) as {
    data: Array<{
      id: string;
      email: string;
      display_name: string | null;
      avatar_url: string | null;
      special_badges: string[];
    }> | null;
  };

  const userMap = new Map((users || []).map((u) => [u.id, u]));

  return blocked.map((b) => ({
    ...b,
    user_email: userMap.get(b.user_id)?.email || 'unknown',
    user_display_name: userMap.get(b.user_id)?.display_name || null,
    user_avatar_url: userMap.get(b.user_id)?.avatar_url || null,
    user_special_badges: userMap.get(b.user_id)?.special_badges ?? [],
  }));
}

async function blockUser(userId: string, blockedBy: string): Promise<void> {
  await supabase.from('blocked_posters').upsert({ user_id: userId, blocked_by: blockedBy });
}

async function unblockUser(userId: string): Promise<void> {
  await supabase.from('blocked_posters').delete().eq('user_id', userId);
}

function subscribeToRealtime(): () => void {
  return subscribePostgresChanges('blocked_posters_live', [
    {
      filter: { event: 'INSERT', table: 'blocked_posters' },
      handler: () => {
        window.dispatchEvent(new Event(BLOCKED_POSTERS_CHANGED_EVENT));
      },
    },
    {
      filter: { event: 'DELETE', table: 'blocked_posters' },
      handler: () => {
        window.dispatchEvent(new Event(BLOCKED_POSTERS_CHANGED_EVENT));
      },
    },
  ]);
}

export const usersRepository = {
  syncCrew,
  fetchUserRolesMap,
  fetchAllUsers,
  setUserRole,
  fetchBlockedPosters,
  fetchBlockedPostersWithUserDetails,
  blockUser,
  unblockUser,
  subscribeToRealtime,
};
