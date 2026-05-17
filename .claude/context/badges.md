<!-- Purpose: Badge system contract, supported conditions, and add-a-badge procedure. Load on demand when adding or modifying badges. -->

## Badge system

Badges are fully client-side and use the existing `BadgeConfig` structure in `src/services/badges/registry.ts` (re-exported via `src/services/badges/index.ts`).

**Current badge contract:**

```ts
type BadgeConfig = {
  slug: string;
  imagePath: string;       // public path, usually /badges/badge_*.png
  labelKey: string;        // src/i18n/Badges_*.json
  descriptionKey: string;  // src/i18n/Badges_*.json
  condition: BadgeCondition;
};
```

**Supported conditions:**
- `wacken_years_exactly`, `wacken_years_includes`
- `country_is`
- `bands_picked_min`, `band_attendance_min`
- `bands_picked_genre_min`, `bands_picked_stage_min`, `bands_picked_before_hour_min`, `band_picked_named` (Phase 10a)
- `bands_seen_min`, `bands_seen_genre_min`, `bands_seen_stage_min`, `bands_seen_before_hour_min`, `band_seen_named` (Phase 10b — requires `user_missed_bands`)

To add a badge without changing behavior elsewhere: add the PNG to `public/badges/`, append one `BADGES` entry in `src/services/badges/registry.ts`, and add matching label + description keys to all `src/i18n/Badges_*.json` files (br, en, es, de).

See `docs/ai-wiki/badges.md` for the full badge inventory, condition engine details, and asset management guidelines.
