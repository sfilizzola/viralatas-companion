export type FestivalCacheVersionRef = {
  id: string;
  cache_version: string;
};

/**
 * True only when the Active Festival's remote cache_version differs from the
 * locally stored version for that same festival. Changes on other festivals
 * must not invalidate the Active Festival pack.
 */
export function shouldInvalidatePack(
  activeFestivalId: string | null | undefined,
  localVersions: Record<string, string | null | undefined>,
  remoteFestivals: FestivalCacheVersionRef[],
): boolean {
  if (!activeFestivalId) return false;
  const remote = remoteFestivals.find((festival) => festival.id === activeFestivalId);
  if (!remote) return false;
  const local = localVersions[activeFestivalId];
  if (local == null || local === '') return false;
  return local !== remote.cache_version;
}
