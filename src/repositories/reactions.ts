import { supabase } from '../lib/supabase';
import { subscribePostgresChanges } from '../lib/realtimeSync';
import { createOptimisticQueue } from '../lib/optimisticQueue';
import {
  saveAnnouncementReaction,
  removeAnnouncementReaction,
  loadAllAnnouncementReactions,
  replaceAllAnnouncementReactions,
  enqueueOfflineAnnouncementReaction,
  loadOfflineAnnouncementReactionsQueue,
  removeFromOfflineAnnouncementReactionsQueue,
} from '../lib/db';
import type { AnnouncementReactionRow, OfflineAnnouncementReactionOp } from '../lib/db';

function reactionQueueId(announcementId: string, userId: string, emoji: string) {
  return `${announcementId}|${userId}|${emoji}`;
}

const reactionsOfflineQueue = createOptimisticQueue<OfflineAnnouncementReactionOp>(
  {
    load: loadOfflineAnnouncementReactionsQueue,
    remove: removeFromOfflineAnnouncementReactionsQueue,
  },
  {
    getId: (op) => op.id,
    dedup: { strategy: 'byId' },
    syncOne: async (op) => {
      if (op.op === 'add') {
        return supabase.from('announcement_reactions').insert({
          announcement_id: op.announcement_id,
          user_id: op.user_id,
          emoji: op.emoji,
        });
      }
      return supabase
        .from('announcement_reactions')
        .delete()
        .eq('announcement_id', op.announcement_id)
        .eq('user_id', op.user_id)
        .eq('emoji', op.emoji);
    },
  },
);

async function toggle(announcementId: string, userId: string, emoji: string): Promise<void> {
  const existing = (await loadAllAnnouncementReactions()).find(
    (r) => r.announcement_id === announcementId && r.user_id === userId && r.emoji === emoji,
  );
  const queueId = reactionQueueId(announcementId, userId, emoji);

  if (existing) {
    await removeAnnouncementReaction(announcementId, userId, emoji);
    if (!navigator.onLine) {
      await enqueueOfflineAnnouncementReaction({
        id: queueId,
        announcement_id: announcementId,
        user_id: userId,
        emoji,
        op: 'remove',
      });
      return;
    }
    const { error } = await supabase
      .from('announcement_reactions')
      .delete()
      .eq('announcement_id', announcementId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
    if (error) {
      await enqueueOfflineAnnouncementReaction({
        id: queueId,
        announcement_id: announcementId,
        user_id: userId,
        emoji,
        op: 'remove',
      });
    }
  } else {
    const row: AnnouncementReactionRow = {
      announcement_id: announcementId,
      user_id: userId,
      emoji,
      created_at: new Date().toISOString(),
    };
    await saveAnnouncementReaction(row);
    if (!navigator.onLine) {
      await enqueueOfflineAnnouncementReaction({
        id: queueId,
        announcement_id: announcementId,
        user_id: userId,
        emoji,
        op: 'add',
      });
      return;
    }
    const { error } = await supabase.from('announcement_reactions').insert({
      announcement_id: announcementId,
      user_id: userId,
      emoji,
    });
    if (error) {
      await enqueueOfflineAnnouncementReaction({
        id: queueId,
        announcement_id: announcementId,
        user_id: userId,
        emoji,
        op: 'add',
      });
    }
  }
}

async function flushOfflineQueue(): Promise<number> {
  return reactionsOfflineQueue.flush();
}

async function syncFromRemote(): Promise<void> {
  const { data, error } = await supabase.from('announcement_reactions').select('*');
  if (error || !data) return;
  await replaceAllAnnouncementReactions(data as AnnouncementReactionRow[]);
}

function subscribeToRealtime(): () => void {
  return subscribePostgresChanges('announcement_reactions_live', [
    {
      filter: { event: 'INSERT', table: 'announcement_reactions' },
      handler: async (payload) => {
        await saveAnnouncementReaction(payload.new as AnnouncementReactionRow);
      },
    },
    {
      filter: { event: 'DELETE', table: 'announcement_reactions' },
      handler: async (payload) => {
        const old = payload.old as Partial<AnnouncementReactionRow>;
        if (old.announcement_id && old.user_id && old.emoji) {
          await removeAnnouncementReaction(old.announcement_id, old.user_id, old.emoji);
        }
      },
    },
  ]);
}

export const reactionsRepository = {
  toggle,
  flushOfflineQueue,
  syncFromRemote,
  subscribeToRealtime,
};
