# Flow: Festival Wrap (`/wrap`)

## Purpose

After Wacken ends, each vira-lata gets a private scrollable recap at `/wrap` — personal stats first, 1–2 vira-latas highlights at the end. All numbers are computed client-side from IndexedDB; no LLM prose; no schema change.

---

## Trigger

- **Discovery:** Post-festival teaser banner on `/now` and `/profile` when `isFestivalEnded(now(), bands)` and not dismissed.
- **Direct access:** `/wrap` is always reachable when logged in (no festival-ended route gate — godlike QA and bookmarking).

---

## Happy Path (Online, Connected)

1. User logs in; IndexedDB already holds bands, picks, missed marks, crew users, presence.
2. User taps teaser banner (or navigates to `/wrap` directly).
3. `useFestivalWrapStats` composes `useSocialSnapshot` + `useAllRatingsCache` (same IDB cells as `/now` and live vest; no Supabase stats reads).
4. `buildFestivalWrapStats()` delegates to `buildBadgeContextFromSocialSnapshot` + `buildRatingStatsSnapshot` + `getEarnedBadges` + crew helpers.
5. `WrapPage` renders a welcome gate, stat sections (optional **Ratings** after Chaos), and a closing thanks gate. Progress dots match **actually mounted** sections — not the flag alone. Core six (welcome, hero, personality, chaos, crew, finale) always; **Ratings** is independent of badges; **Assigned** mounts only when the flag is on **and** ≥1 evergreen assigned patch; **Patches** mounts only when the flag is on **and** ≥1 evergreen earned badge (same no-empty-chrome as `BadgesDisplay`). Typical range **6–9**.
6. Every Wrap live badge surface applies `filterLiveVestBadges()` to the slugs from `buildFestivalWrapStats`, so the pile, the assigned grid, the Chaos meter, and the `patchesCount` header show **evergreen badges only** — the same rule as `BadgesDisplay`. Year-tagged wins (including 2026 assigned patches) never render here; their home is **Previously Achieved**. The **Open vest** CTA lives inside the Patches section, so it is absent when that section is omitted. When the CTA is present it links to `/profile?vest=open#vest`.
7. With badges disabled/defaulted hidden, Chaos omits the badge meter, Assigned/Patches and the vest CTA are omitted, and progress indices close around them.
8. **Finale** thanks section signs off with Wacken 2027 (Rain or Shine) and CTA **Back to the App** → `/now`.

---

## Offline Behavior (Disconnected)

- Stats read entirely from IndexedDB after first load — page works fully offline.
- Teaser dismiss uses `localStorage` key `viralatas:wrap-dismissed-2026` (per device, no sync).
- No wrap stats queue or Supabase dependency.

---

## Sync Behavior (Reconnect)

- Wrap stats refresh when underlying IDB data changes (picks, missed, presence, crew events) via `useSocialSnapshot` cache cells — same as badges and `/now`.
- No dedicated wrap sync layer.

---

## Relevant Source Files

| File | Role |
|------|------|
| `src/services/festivalWrap.ts` | Pure `buildFestivalWrapStats()` + types |
| `src/services/ratingStats.ts` | Pure `buildRatingStatsSnapshot()` — wrap + badge context |
| `src/hooks/useAllRatingsCache.ts` | Read-only crew-wide ratings IDB cell |
| `src/hooks/useFestivalWrapStats.ts` | Composes `useSocialSnapshot` + `useAllRatingsCache` + `useMissedBands` |
| `src/hooks/useSocialSnapshot.ts` | Shared IDB load + `buildSocialSnapshot()` (Phase 31) |
| `src/hooks/useWrapTeaserVisible.ts` | Teaser gate: `isFestivalEnded(now(), bands)` + dismiss |
| `src/lib/wrapDismiss.ts` | `viralatas:wrap-dismissed-2026` helpers |
| `src/pages/WrapPage.tsx` | Welcome + stat sections + optional evergreen Assigned/Patches (flag + rows) + finale thanks; scroll-snap; IntersectionObserver progress |
| `src/services/badges/currentFestivalYear.ts` | `filterLiveVestBadges()` — evergreen-only rule shared by Wrap live surfaces and `BadgesDisplay` |
| `src/components/wrap/WrapProgress.tsx` | Progress dots = mounted section count (core ± Ratings ± Assigned ± Patches) |
| `src/components/wrap/WrapTeaserBanner.tsx` | Variant B discovery bar |
| `src/pages/RightNowPage.tsx` / `ProfilePage.tsx` | Teaser mount + time-override reactivity |
| `src/components/profile/TimeTravelSection.tsx` | Godlike wrap QA disclaimer |
| `src/services/time.ts` | `isFestivalEnded()`, `now()`, time override event |
| `src/__tests__/festivalWrap.test.ts` | Stats edge cases |
| `src/__tests__/wrapDismiss.test.ts` | Dismiss key round-trip |

---

## Data Flow Diagram

```
User → /wrap
  → useFestivalWrapStats(userId)
    → useSocialSnapshot (IndexedDB: picks, bands, crew, presence, configs)
    → useAllRatingsCache (IndexedDB: user_band_ratings)
    → buildFestivalWrapStats(idbSnap, userId, authUser, social, allRatings)
      → buildBadgeContextFromSocialSnapshot (seen/picked/skipped semantics)
      → buildRatingStatsSnapshot (personal + crew rating highlights)
      → getEarnedBadges / computeBandOverlaps / crew Jaccard
  → WrapPage (presentation only)
```

Teaser path:

```
/now or /profile
  → useWrapTeaserVisible()
    → loadBands() from IDB
    → isFestivalEnded(now(), bands) && !isWrapDismissed()
  → WrapTeaserBanner → Link /wrap
```

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Zero picks | Friendly empty state — not a broken multi-section layout |
| Friend user (`is_friend`) | `locationVisitsTotal === null` — location stats never rendered |
| Sparse missed data | Skip count may be 0; page still shows picks/seen |
| Godlike D+1 time travel | Teaser appears without reload; `/wrap` always open |
| Dismiss teaser | `viralatas:wrap-dismissed-2026` suppresses banner only |
| Ceremony picks | Excluded from picked/seen stats (badge engine parity) |
| `badges_enabled` false/offline/read error/null | Chaos omits the badge meter; Assigned, Patches, and `/profile?vest=open#vest` CTA are absent; other wrap stats still render. Progress dots = core 6, or 7 with Ratings. |
| Flag on, earned wins are all year-tagged | Patches section, `patchesCount`, and vest CTA omitted (`earnedBadges.length === 0`); Chaos meter may still show `0`; archive keeps those wins |
| Flag on, assigned wins are all year-tagged | Assigned section omitted; Patches still mounts if any evergreen earned badge exists |
| `badgesEarnedCount` vs visible patches | Stats keep the full earned total; Wrap live surfaces display the evergreen subset, so the Chaos value can be lower than `badgesEarnedCount` |

---

## Important Hooks / Services / Repositories

- **`buildFestivalWrapStats`** — single stats builder; must not duplicate badge seen-band logic.
- **`useSocialSnapshot`** — shared IDB + social snapshot loader; wrap hook does not call persist side effects.
- **`isFestivalEnded`** — shared with Phase 29 consolidation gate; uses `now()` for godlike override.

---

## Gating Table

| Surface | `isFestivalEnded(now(), bands)`? | Notes |
|---------|----------------------------------|-------|
| Teaser on `/now`, `/profile` | **Yes** | Plus `!isWrapDismissed()` |
| Route `/wrap` | **No** | Direct URL always when logged in |
| Live badge surfaces inside `/wrap` | N/A | Flag gates Chaos badge meter. Assigned mounts only with ≥1 evergreen assigned patch; Patches pile/count/CTA only with ≥1 evergreen earned badge (`filterLiveVestBadges()`). Archive elsewhere is unaffected |

---

## Open Questions

- Percentile rank copy (v2) — optional when crew size is small.
- Public share URL / server snapshot — out of scope v1.
- Duck quack stats — not in IndexedDB.

---

## Acceptance Criteria (Phase 30)

- [x] A2 scroll-snap recap: welcome gate + stat sections (epigraphs) + optional Assigned/Patches (flag + evergreen rows) + finale thanks; progress dots = mounted sections (typically 6–9)
- [x] Teaser Variant B on `/now` and `/profile`
- [x] Stats match badge engine semantics
- [x] Offline after first IDB load
- [x] Teaser gated; `/wrap` route open anytime
- [x] Godlike D+1 + Time Travel disclaimer (4 locales)
- [x] **vira-latas** copy in all locales (user-approved section phrases)
- [x] Friend users hide location stats
- [x] Empty picks friendly state
- [x] When `badges_enabled` is on, live patch surfaces list evergreen badges only; Patches (and Open vest) omit when no evergreen earned badges. When off, Chaos badge meter, Assigned/Patches, and CTA are absent. Finale CTA → `/now`
- [x] Design System documents wrap anatomy

---

**Last updated:** 2026-09-05 — Unphased: `/wrap` Patches is optional (flag + ≥1 evergreen earned badge); progress dots follow mounted sections.
