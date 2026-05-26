import { supabase } from '../lib/supabase';

export const WEAK_SKIPS_2026_KEY = 'weak_skips_2026';
export const WEAK_SKIP_UNDO_MS = 5000;

/** Read committed weak-skip count from auth metadata. Safe default: 0. */
export function getWeakSkipCount(metadata: Record<string, unknown> | undefined): number {
  const value = metadata?.[WEAK_SKIPS_2026_KEY];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

/** Increment weak_skips_2026 after a committed skip. Best-effort updateUser. */
export async function recordCommittedSkip(userId: string, bandId: string): Promise<void> {
  void bandId;

  const { data } = await supabase.auth.getUser();
  if (!data.user || data.user.id !== userId) return;

  const newCount = getWeakSkipCount(data.user.user_metadata) + 1;

  supabase.auth
    .updateUser({
      data: {
        [WEAK_SKIPS_2026_KEY]: newCount,
      },
    })
    .catch(() => {});
}
