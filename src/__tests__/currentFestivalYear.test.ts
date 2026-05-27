import { describe, it, expect } from 'vitest';
import { BADGES } from '../services/badges/registry';
import {
  getCurrentFestivalYear,
  isLiveVestBadge,
  filterLiveVestBadges,
} from '../services/badges/currentFestivalYear';

describe('getCurrentFestivalYear', () => {
  it('returns max year from registry', () => {
    const maxFromRegistry = BADGES.reduce((max, badge) => {
      if (badge.year != null && badge.year > max) return badge.year;
      return max;
    }, 0);

    expect(getCurrentFestivalYear()).toBe(maxFromRegistry);
    expect(getCurrentFestivalYear()).toBe(2026);
  });
});

describe('isLiveVestBadge', () => {
  it('includes evergreen badges without year', () => {
    const evergreen = BADGES.find((b) => b.year == null);
    expect(evergreen).toBeDefined();
    expect(isLiveVestBadge(evergreen!)).toBe(true);
  });

  it('includes current festival year badges only', () => {
    const currentYearBadge = BADGES.find((b) => b.year === getCurrentFestivalYear());
    expect(currentYearBadge).toBeDefined();
    expect(isLiveVestBadge(currentYearBadge!)).toBe(true);
  });

  it('excludes past festival year badges when registry rolls forward', () => {
    const staleYearBadge = {
      slug: 'old-year',
      imagePath: '/badges/badge_old.png',
      labelKey: 'badgeOld',
      descriptionKey: 'badgeOldDescription',
      condition: { type: 'assigned' as const },
      year: getCurrentFestivalYear() - 1,
    };
    expect(isLiveVestBadge(staleYearBadge)).toBe(false);
  });

  it('filterLiveVestBadges keeps evergreen + current year', () => {
    const filtered = filterLiveVestBadges(BADGES);
    expect(filtered.every((b) => b.year == null || b.year === getCurrentFestivalYear())).toBe(true);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.some((b) => b.year == null)).toBe(true);
    expect(filtered.some((b) => b.year === getCurrentFestivalYear())).toBe(true);
  });
});
