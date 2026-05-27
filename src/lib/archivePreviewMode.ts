/**
 * Per-device flag: local archive preview is active for a godlike UI test.
 * While set, badge-history Supabase pull is skipped so IDB seed is not wiped online.
 * Not synced — cosmetic/dev-only, same rationale as patchesBackground.
 */

const STORAGE_KEY = 'viralatas:archive-preview-user';

export function isArchivePreviewActive(userId: string): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === userId;
  } catch {
    return false;
  }
}

export function setArchivePreviewActive(userId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, userId);
  } catch {
    // best-effort
  }
}

export function clearArchivePreviewMode(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // best-effort
  }
}
