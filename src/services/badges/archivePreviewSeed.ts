import type { UserBadgeHistory } from '../../types';
import type { BadgeConfig } from './types';
import { BADGES } from './registry';

/** Small fixed set for empty-vest preview — real registry slugs + frozen paths. */
export const ARCHIVE_PREVIEW_SAMPLE_SLUGS = ['puppy', 'medic', 'early-bird'] as const;

export function badgeConfigsToHistoryRows(
  userId: string,
  badges: BadgeConfig[],
  festivalYear: number,
): UserBadgeHistory[] {
  return badges.map((badge) => ({
    user_id: userId,
    festival_year: festivalYear,
    slug: badge.slug,
    image_path: badge.imagePath,
    label_key: badge.labelKey,
  }));
}

export function buildEarnedYearPreviewRows(
  userId: string,
  earned: BadgeConfig[],
  festivalYear: number,
): UserBadgeHistory[] {
  const yearBadges = earned.filter((badge) => badge.year === festivalYear);
  return badgeConfigsToHistoryRows(userId, yearBadges, festivalYear);
}

export function buildSamplePreviewRows(
  userId: string,
  festivalYear: number,
): UserBadgeHistory[] {
  const slugSet = new Set<string>(ARCHIVE_PREVIEW_SAMPLE_SLUGS);
  const samples = BADGES.filter(
    (badge) => slugSet.has(badge.slug) && badge.year === festivalYear,
  );
  if (samples.length === 0) {
    return BADGES.filter((badge) => slugSet.has(badge.slug)).map((badge) => ({
      user_id: userId,
      festival_year: festivalYear,
      slug: badge.slug,
      image_path: badge.imagePath,
      label_key: badge.labelKey,
    }));
  }
  return badgeConfigsToHistoryRows(userId, samples, festivalYear);
}
