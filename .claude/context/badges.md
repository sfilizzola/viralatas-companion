<!-- Purpose: Badge system contract, complete condition list, evaluation context, and add-a-badge procedure. Load on demand when adding or modifying badges. Long-form inventory and history live in docs/ai-wiki/badges.md. -->

## Badge system

Badges are fully client-side. Source files:

| File | Purpose |
|---|---|
| `src/services/badges/types.ts` | `BadgeConfig`, `BadgeCondition`, `BadgeContext`, `BadgeBand` |
| `src/services/badges/engine.ts` | `buildBadgeContext`, `evaluateBadge`, `getEarnedBadges` (pure) |
| `src/services/badges/persistMetadata.ts` | `mergedPersistedBadgeSlugs`, `persistMetadataPatch` |
| `src/services/livePreview.ts` | `computeCrewLocationCounts` — badge counts match `/now` location cards |
| `src/hooks/useBadgeContext.ts` | IDB-first context build + persist recording |
| `src/services/badges/registry.ts` | `BADGES[]` array — 65 entries today |
| `src/services/badges/index.ts` | Barrel re-export |
| `src/__tests__/badges.test.ts` | Condition engine + registry tests |
| `public/badges/` | PNG assets, 96×96 px, transparent background |
| `src/i18n/Badges_{br,en,es,de}.json` | Labels + descriptions in all 4 locales |

Long-form inventory, edge cases, and history → `docs/ai-wiki/badges.md`.

---

## `BadgeConfig` (full contract)

```ts
type BadgeConfig = {
  slug: string;                   // unique kebab-case
  imagePath: string;              // /badges/badge_{slug}.png
  labelKey: string;               // i18n key, format `badge{PascalCase}`
  descriptionKey: string;         // i18n key, format `badge{PascalCase}Description`
  condition: BadgeCondition;
  year?: number;                  // optional Wacken edition (e.g. 2026) — shows year chip
  persist?: boolean;              // if true, slug recorded permanently once earned
};
```

`persist: true` semantics: when the badge is first earned, its slug is stored in `user.user_metadata.achieved_badge_slugs[]`. **`crew_at_location_min` badges also write to `crew_earned_badge_slugs[]` on earn**; **`useBadgeContext` merges both keys on read** so either key restores the badge. On subsequent loads, the badge stays earned even if the underlying condition becomes false. Use for historic/milestone badges (visited Metal Place, dreamer, crew-at-location). Omit/`false` for state-reflecting badges (country, current picks).

`condition.type === 'assigned'` semantics: godlike-only manual assignment via the assign-badge Edge Function; the slug is stored in the row `users.special_badges[]` and matched against `badge.slug` at evaluation time.

---

## All 28 `BadgeCondition` types

Conditions evaluate against a `BadgeContext` built once per profile load. **A predicate not in this list is unsupported — adding a new one requires changing `types.ts`, `engine.ts`, the wiki, and this file.**

### Wacken history (4)
| Type | Inputs | Meaning |
|---|---|---|
| `wacken_years_exactly` | `years: number[]` | User attended **only** these years (exact set) |
| `wacken_years_includes` | `years: number[]` | User attended **at least all** these years (others allowed) |
| `wacken_years_count_min` | `count: number` | User attended ≥ N Wackens total |
| `wacken_attended_in_year` | `year: number` | User attended this specific edition |

### Profile attributes (3)
| Type | Inputs | Meaning |
|---|---|---|
| `country_is` | `country: string` | ISO code match (`'br'`, `'de'`, `'us'`, `'be'`, `'co'`, `'es'`, …) |
| `wacken_arrived_before` | `day: string` | User's arrival day sorts **strictly before** `day` in the ordered enum below |
| `wacken_arrived_on` | `day: string` | User's arrival day matches `day` **exactly**. One badge per camping-open day. |

Arrival-day enum (order matters): `'sun-jul26' < 'mon-jul27' < 'tue-jul28' < 'wed-jul29' < 'thu-plus'`. Field stored in `user_metadata.wacken_arrival_day`. No other strings are valid.

### Picks-based (9)
| Type | Inputs | Meaning |
|---|---|---|
| `bands_picked_min` | `count` | ≥ N total picks |
| `band_attendance_min` | `count` | ≥ 1 picked band has ≥ N crew also attending |
| `bands_picked_genre_min` | `genre, count` | ≥ N picks with `genre === g` (exact, case-sensitive) |
| `bands_picked_stage_min` | `stage, count` | ≥ N picks with `stage === s` (exact) |
| `bands_picked_genres_min` | `genres: string[], count` | ≥ N picks whose `genre` is in the array (OR; `null` genres skipped) |
| `bands_picked_stages_min` | `stages: string[], count` | ≥ N picks whose `stage` is in the array (OR) |
| `bands_picked_before_hour_min` | `hour, count` | ≥ N picks with **CEST start hour** `< hour` |
| `bands_picked_after_hour_min` | `hour, count` | ≥ N picks with **CEST start hour** `>= hour` |
| `band_picked_named` | `name: string` | ≥ 1 pick with `name === n` (exact, case-sensitive) |

### Seen-based (9) — picks past `end_time`, minus `user_missed_bands` opt-outs
| Type | Inputs | Meaning |
|---|---|---|
| `bands_seen_min` | `count` | ≥ N seen |
| `bands_seen_genre_min` | `genre, count` | ≥ N seen with `genre === g` |
| `bands_seen_stage_min` | `stage, count` | ≥ N seen with `stage === s` |
| `bands_seen_genres_min` | `genres: string[], count` | ≥ N seen whose `genre` is in the array (OR; `null` skipped) |
| `bands_seen_stages_min` | `stages: string[], count` | ≥ N seen whose `stage` is in the array (OR) |
| `bands_seen_before_hour_min` | `hour, count` | ≥ N seen with CEST start hour `< hour` |
| `bands_seen_after_hour_min` | `hour, count` | ≥ N seen with CEST start hour `>= hour` |
| `band_seen_named` | `name: string` | ≥ 1 seen with `name === n` |
| `stage_diversity_min` | `count: number` | ≥ N distinct stages represented in `seenBands` |

A band is **seen** when `now > band.end_time` AND its id is **not** in `missedBandIds`. `pickedBands` always excludes bands with `category === 'ceremony'`, so ceremonies never count toward any pick or seen badge.

### Location (2)
| Type | Inputs | Meaning |
|---|---|---|
| `location_visit_count_min` | `location: 'camping' \| 'metal_place' \| 'lost', count` | `user_metadata.location_visits[location] >= count` |
| `crew_at_location_min` | `location: 'camping' \| 'lost', count` | User is currently at `location` AND ≥ N crew are too (count via `computeCrewLocationCounts`, same rules as `/now`). **`'metal_place'` is NOT a valid location for this predicate.** Pair with `persist: true` so the badge survives the crew dispersing. |

### Manual (1)
| Type | Inputs | Meaning |
|---|---|---|
| `assigned` | (none) | Slug must appear in `users.special_badges[]`. Godlike-only assignment. |

---

## Hour rule (CEST = UTC+2)

`*_before_hour_min` and `*_after_hour_min` use **festival-local hour**, computed by `engine.ts:festivalLocalHour()` as `new Date(start_time).getTime() + 2h → getUTCHours()`. Always pass the CEST hour (12, 22, 23 …), never the UTC hour. Wacken runs late July / early August so Berlin is always on CEST; no DST handling needed.

---

## `BadgeContext` (what you can evaluate against)

```ts
type BadgeContext = {
  wacken_years: number[];
  country: string | null;
  wacken_arrival_day: string | null;
  assignedBadges: string[];                    // users.special_badges
  bandsPicked: number;
  maxAttendanceInPicks: number;
  pickedBands: BadgeBand[];                    // ceremony bands filtered out
  seenBands: BadgeBand[];                      // pickedBands ∧ end_time < now ∧ ¬missed
  missedBandIds: Set<string>;                  // user_missed_bands rows
  locationVisits: Record<string, number>;      // user_metadata.location_visits
  currentLocation: string | null;
  crewLocationCounts: Record<string, number>;  // computeCrewLocationCounts — aligned with /now
  achievedBadgeSlugs: Set<string>;             // persist:true slugs already recorded
};
```

`evaluateBadge(badge, ctx)` returns `true` if the badge is earned. For `persist: true` badges, it short-circuits to `true` if `ctx.achievedBadgeSlugs.has(badge.slug)` regardless of the current condition.

---

## How to add a badge

1. **Asset** — drop a 96×96 transparent PNG at `public/badges/badge_{slug}.png`. The `imagePath` in the registry must match this path exactly (mismatched paths produce broken images, never errors).
2. **Registry entry** — append one object to `BADGES` in `src/services/badges/registry.ts` with the full `BadgeConfig` shape. Pick the `condition` predicate from the table above. Include `year` for festival-edition badges and `persist: true` for historic/milestone badges (location visits, crew bonding moments, milestone picks like `dreamer`).
3. **Locales** — add **both** `labelKey` and `descriptionKey` entries in **all four** files: `src/i18n/Badges_br.json`, `Badges_en.json`, `Badges_es.json`, `Badges_de.json`. Key format: `badge{PascalCase(slug)}` and `badge{PascalCase(slug)}Description`. Brazilian Portuguese is the canonical wording; the others should be coherent translations, not stubs.
4. **Test** — `rtk npm test -- badges.test.ts`. Add a focused test if the predicate semantics aren't already exercised elsewhere.

For the full inventory, asset management guidelines, patches-grid background system, and modal/zoom UI behavior → `docs/ai-wiki/badges.md`.
