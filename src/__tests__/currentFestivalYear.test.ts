import { describe, it, expect } from 'vitest';
import { BADGES } from '../services/badges/registry';
import {
  getCurrentFestivalYear,
  isLiveVestBadge,
  filterLiveVestBadges,
  filterFestivalYearBadges,
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

  it('excludes every year-tagged badge including current festival year', () => {
    const currentYearBadge = BADGES.find((b) => b.year === getCurrentFestivalYear());
    expect(currentYearBadge).toBeDefined();
    expect(isLiveVestBadge(currentYearBadge!)).toBe(false);

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

  it('filterLiveVestBadges keeps only evergreen badges', () => {
    const filtered = filterLiveVestBadges(BADGES);
    expect(filtered.every((b) => b.year == null)).toBe(true);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.some((b) => b.year == null)).toBe(true);
    expect(filtered.some((b) => b.year === getCurrentFestivalYear())).toBe(false);
  });

  it('keeps archive-year candidates independent from the evergreen live list', () => {
    const festivalYear = getCurrentFestivalYear();
    const live = filterLiveVestBadges(BADGES);
    const archiveCandidates = filterFestivalYearBadges(BADGES, festivalYear);

    expect(live.every((badge) => badge.year == null)).toBe(true);
    expect(archiveCandidates.length).toBeGreaterThan(0);
    expect(archiveCandidates.every((badge) => badge.year === festivalYear)).toBe(true);
    expect(archiveCandidates.some((badge) => live.includes(badge))).toBe(false);
  });
});
