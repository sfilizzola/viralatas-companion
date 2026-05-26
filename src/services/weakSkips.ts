import { supabase } from '../lib/supabase';
import { getWeakSkipCount, WEAK_SKIPS_2026_KEY } from './weakSkipMetadata';

export { WEAK_SKIPS_2026_KEY, getWeakSkipCount } from './weakSkipMetadata';

export const WEAK_SKIP_UNDO_MS = 5000;

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
