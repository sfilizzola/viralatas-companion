import type { BadgeConfig } from './types';

export function mergedPersistedBadgeSlugs(
  metadata: Record<string, unknown> | undefined,
): Set<string> {
  const achieved = Array.isArray(metadata?.achieved_badge_slugs)
    ? (metadata.achieved_badge_slugs as string[])
    : [];
  const crewEarned = Array.isArray(metadata?.crew_earned_badge_slugs)
    ? (metadata.crew_earned_badge_slugs as string[])
    : [];
  return new Set([...achieved, ...crewEarned]);
}

/** Returns auth metadata patch for newly earned persist badges, or null if nothing to write. */
export function persistMetadataPatch(
  metadata: Record<string, unknown> | undefined,
  newlyEarned: BadgeConfig[],
): Record<string, unknown> | null {
  if (newlyEarned.length === 0) return null;

  const existing = mergedPersistedBadgeSlugs(metadata);
  const toPersist = newlyEarned.filter((badge) => !existing.has(badge.slug));
  if (toPersist.length === 0) return null;

  const slugs = toPersist.map((badge) => badge.slug);
  const crewSlugs = toPersist
    .filter((badge) => badge.condition.type === 'crew_at_location_min')
    .map((badge) => badge.slug);

  const patch: Record<string, unknown> = {
    achieved_badge_slugs: [
      ...(Array.isArray(metadata?.achieved_badge_slugs)
        ? (metadata.achieved_badge_slugs as string[])
        : []),
      ...slugs,
    ],
  };

  if (crewSlugs.length > 0) {
    patch.crew_earned_badge_slugs = [
      ...(Array.isArray(metadata?.crew_earned_badge_slugs)
        ? (metadata.crew_earned_badge_slugs as string[])
        : []),
      ...crewSlugs,
    ];
  }

  return patch;
}
