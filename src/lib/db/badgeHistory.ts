import type { UserBadgeHistory } from '../../types';
import { getDB } from './connection';
import { BADGE_HISTORY_CHANGED_EVENT } from './events';

function emitBadgeHistoryChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(BADGE_HISTORY_CHANGED_EVENT));
  }
}

export async function loadUserBadgeHistory(userId: string): Promise<UserBadgeHistory[]> {
  const db = await getDB();
  return db.getAllFromIndex('user_badge_history', 'by_user', userId);
}

export async function replaceUserBadgeHistory(
  records: UserBadgeHistory[],
  userId: string,
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('user_badge_history', 'readwrite');
  const existing = await tx.store.index('by_user').getAll(userId);
  await Promise.all(
    existing.map((r) => tx.store.delete([r.user_id, r.festival_year, r.slug])),
  );
  await Promise.all(records.map((r) => tx.store.put(r)));
  await tx.done;
  emitBadgeHistoryChanged();
}
