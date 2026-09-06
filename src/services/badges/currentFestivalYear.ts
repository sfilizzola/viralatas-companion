import { BADGES } from './registry';
import type { BadgeConfig } from './types';

/** Max `BadgeConfig.year` in the registry — archive/admin default only. */
export function getCurrentFestivalYear(): number {
  return BADGES.reduce((max, badge) => {
    if (badge.year != null && badge.year > max) return badge.year;
    return max;
  }, 0);
}

/** Live vest: evergreen badges only (year-tagged badges are archive/history). */
export function isLiveVestBadge(badge: BadgeConfig): boolean {
  return badge.year == null;
}

export function filterLiveVestBadges(badges: BadgeConfig[]): BadgeConfig[] {
  return badges.filter(isLiveVestBadge);
}

/** Archive preview candidates for one festival year, independent of live-vest rules. */
export function filterFestivalYearBadges(
  badges: BadgeConfig[],
  festivalYear: number,
): BadgeConfig[] {
  return badges.filter((badge) => badge.year === festivalYear);
}
