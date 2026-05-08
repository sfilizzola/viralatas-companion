import type { User as AuthUser } from '@supabase/supabase-js';

export type BadgeCondition =
  // Exclusive: user must have ONLY these years (checking 2022+2026 loses a "2026-only" badge)
  | { type: 'wacken_years_exactly'; years: number[] }
  // Permissive: user must have AT LEAST these years (other years don't disqualify)
  | { type: 'wacken_years_includes'; years: number[] }
  | { type: 'country_is'; country: string }
  | { type: 'bands_picked_min'; count: number }
  // True when at least one of the user's picks has N+ crew attending
  | { type: 'band_attendance_min'; count: number };

export type BadgeConfig = {
  slug: string;
  imagePath: string;
  labelKey: string;
  descriptionKey: string;
  condition: BadgeCondition;
};

export type BadgeContext = {
  wacken_years: number[];
  country: string | null;
  bandsPicked: number;
  maxAttendanceInPicks: number;
};

export function buildBadgeContext(
  user: AuthUser,
  userPickBandIds: string[],
  allPickCounts: Map<string, number>,
): BadgeContext {
  const meta = user.user_metadata;
  const maxAttendance = userPickBandIds.reduce(
    (max, bandId) => Math.max(max, allPickCounts.get(bandId) ?? 0),
    0,
  );
  return {
    wacken_years: Array.isArray(meta?.['wacken_years']) ? (meta['wacken_years'] as number[]) : [],
    country: (meta?.['country'] as string | undefined) ?? null,
    bandsPicked: userPickBandIds.length,
    maxAttendanceInPicks: maxAttendance,
  };
}

export function evaluateBadge(badge: BadgeConfig, ctx: BadgeContext): boolean {
  const { condition } = badge;
  switch (condition.type) {
    case 'wacken_years_exactly':
      return (
        ctx.wacken_years.length === condition.years.length &&
        condition.years.every((y) => ctx.wacken_years.includes(y))
      );
    case 'wacken_years_includes':
      return condition.years.every((y) => ctx.wacken_years.includes(y));
    case 'country_is':
      return ctx.country === condition.country;
    case 'bands_picked_min':
      return ctx.bandsPicked >= condition.count;
    case 'band_attendance_min':
      return ctx.maxAttendanceInPicks >= condition.count;
  }
}

// Badge image file specification:
// - Format: PNG (96×96 px recommended, displays at 40px on mobile)
// - Storage: public/badges/ directory
// - Naming: badge_{slug}.png (e.g., badge_new-puppy.png matches slug: 'new-puppy')
// - Accessibility: all images must have transparent backgrounds for dark theme compatibility
export const BADGES: BadgeConfig[] = [
  {
    slug: 'puppy',
    imagePath: '/badges/badge_new-puppy.png',
    labelKey: 'badgePuppy',
    descriptionKey: 'badgePuppyDescription',
    // Exclusive — only 2026 checked. Adding any other year removes this badge.
    condition: { type: 'wacken_years_exactly', years: [2026] },
  },
  {
    slug: 'pack-member',
    imagePath: '/badges/badge_vira-latas-pack.png',
    labelKey: 'badgePackMember',
    descriptionKey: 'badgePackMemberDescription',
    // Earned when you're attending a concert with 10+ crew members
    condition: { type: 'band_attendance_min', count: 10 },
  },
  {
    slug: 'pais-tropical',
    imagePath: '/badges/badge_br.png',
    labelKey: 'badgePaisTropical',
    descriptionKey: 'badgePaisTropicalDescription',
    condition: { type: 'country_is', country: 'br' },
  },
  {
    slug: 'deutscher',
    imagePath: '/badges/badge_de.png',
    labelKey: 'badgeDeutscher',
    descriptionKey: 'badgeDeutscherDescription',
    condition: { type: 'country_is', country: 'de' },
  },
  {
    slug: 'america-fuck-yeah',
    imagePath: '/badges/badge_usa.png',
    labelKey: 'badgeAmericaFuckYeah',
    descriptionKey: 'badgeAmericaFuckYeahDescription',
    condition: { type: 'country_is', country: 'us' },
  },
  {
    slug: 'belga',
    imagePath: '/badges/badge_be.png',
    labelKey: 'badgeBelga',
    descriptionKey: 'badgeBelgaDescription',
    condition: { type: 'country_is', country: 'be' },
  },
  {
    slug: 'cafetero',
    imagePath: '/badges/badge_co.png',
    labelKey: 'badgeCafetero',
    descriptionKey: 'badgeCafeteroDescription',
    condition: { type: 'country_is', country: 'co' },
  },
  {
    slug: 'og',
    imagePath: '/badges/badge_og.png',
    labelKey: 'badgeOG',
    descriptionKey: 'badgeOGDescription',
    // Original — founded the Vira-latas. Must have attended 2022 (founding year)
    condition: { type: 'wacken_years_includes', years: [2022] },
  },
  {
    slug: 'mud-survivor',
    imagePath: '/badges/badge_mud-warrior.png',
    labelKey: 'badgeMudSurvivor',
    descriptionKey: 'badgeMudSurvivorDescription',
    // Veteran who survived both 2023 and 2025 (may have attended other years too)
    condition: { type: 'wacken_years_includes', years: [2023, 2025] },
  },
];

export function getEarnedBadges(ctx: BadgeContext): BadgeConfig[] {
  return BADGES.filter((badge) => evaluateBadge(badge, ctx));
}
