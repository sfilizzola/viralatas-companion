export const WEAK_SKIPS_2026_KEY = 'weak_skips_2026';

/** Read committed weak-skip count from auth metadata. Safe default: 0. */
export function getWeakSkipCount(metadata: Record<string, unknown> | undefined): number {
  const value = metadata?.[WEAK_SKIPS_2026_KEY];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}
