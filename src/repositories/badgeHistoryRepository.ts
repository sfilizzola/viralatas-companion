import {
  clearArchivePreviewMode,
  isArchivePreviewActive,
  setArchivePreviewActive,
} from '../lib/archivePreviewMode';
import { loadUserBadgeHistory, replaceUserBadgeHistory } from '../lib/db';
import { supabase } from '../lib/supabase';
import type { UserBadgeHistory } from '../types';

export type ConsolidateBadgesResult = {
  processedUsers: number;
  savedBadges: number;
  skipped: number;
  errors: string[];
};

async function loadLocal(userId: string): Promise<UserBadgeHistory[]> {
  return loadUserBadgeHistory(userId);
}

async function syncFromRemote(userId: string): Promise<void> {
  if (isArchivePreviewActive(userId)) return;

  const { data, error } = await supabase
    .from('user_badge_history')
    .select('*')
    .eq('user_id', userId)
    .order('festival_year', { ascending: false });

  if (error || !data) return;

  await replaceUserBadgeHistory(data as UserBadgeHistory[], userId);
}

async function sync(userId: string): Promise<void> {
  if (!navigator.onLine) return;
  await syncFromRemote(userId);
}

async function seedLocalPreview(userId: string, rows: UserBadgeHistory[]): Promise<void> {
  await replaceUserBadgeHistory(rows, userId);
  setArchivePreviewActive(userId);
}

async function clearLocalPreview(userId: string): Promise<void> {
  clearArchivePreviewMode();
  await replaceUserBadgeHistory([], userId);
  if (navigator.onLine) {
    await syncFromRemote(userId);
  }
}

async function consolidateYear(year: number, force = false): Promise<ConsolidateBadgesResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await supabase.functions.invoke('consolidate-year-badges', {
    body: { year, force },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });

  if (res.error) {
    throw new Error(res.error.message);
  }

  const data = res.data as ConsolidateBadgesResult & { error?: string };
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

export const badgeHistoryRepository = {
  loadLocal,
  syncFromRemote,
  sync,
  seedLocalPreview,
  clearLocalPreview,
  consolidateYear,
};
