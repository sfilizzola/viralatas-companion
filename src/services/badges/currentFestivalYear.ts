import { BADGES } from './registry';
import type { BadgeConfig } from './types';

/** Max `BadgeConfig.year` in the live registry — current festival cycle. */
export function getCurrentFestivalYear(): number {
  return BADGES.reduce((max, badge) => {
    if (badge.year != null && badge.year > max) return badge.year;
    return max;
  }, 0);
}

/** Live vest: evergreen badges + current-festival year badges only. */
export function isLiveVestBadge(badge: BadgeConfig): boolean {
  if (badge.year == null) return true;
  return badge.year === getCurrentFestivalYear();
}

export function filterLiveVestBadges(badges: BadgeConfig[]): BadgeConfig[] {
  return badges.filter(isLiveVestBadge);
}
