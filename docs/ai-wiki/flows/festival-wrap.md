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
3. `useFestivalWrapStats` loads the same IDB snapshot shape as `useBadgeCache` (no Supabase stats reads).
4. `buildFestivalWrapStats()` delegates to `buildBadgeContextFromSnapshot` + `getEarnedBadges` + crew helpers.
5. `WrapPage` renders five full-viewport scroll sections (A2 Vest Chronicle) with progress dots.
6. Section 5 CTA **Open vest** links to `/profile` where `BadgesDisplay` shows the full collection.

---

## Offline Behavior (Disconnected)

- Stats read entirely from IndexedDB after first load — page works fully offline.
- Teaser dismiss uses `localStorage` key `viralatas:wrap-dismissed-2026` (per device, no sync).
- No wrap stats queue or Supabase dependency.

---

## Sync Behavior (Reconnect)

- Wrap stats refresh when underlying IDB data changes (picks, missed, presence events) via `useBadgeCache` refresh — same as badges.
- No dedicated wrap sync layer.

---

## Relevant Source Files

| File | Role |
|------|------|
| `src/services/festivalWrap.ts` | Pure `buildFestivalWrapStats()` + types |
| `src/hooks/useFestivalWrapStats.ts` | IDB-first hook (mirrors badge cache load) |
| `src/hooks/useWrapTeaserVisible.ts` | Teaser gate: `isFestivalEnded(now(), bands)` + dismiss |
| `src/lib/wrapDismiss.ts` | `viralatas:wrap-dismissed-2026` helpers |
| `src/pages/WrapPage.tsx` | Five sections, scroll-snap, IntersectionObserver progress |
| `src/components/wrap/WrapProgress.tsx` | Fixed 5-dot bar |
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
    → useBadgeCache (IndexedDB: picks, bands, missed, presence, crew)
    → buildFestivalWrapStats(snapshot, userId, authUser)
      → buildBadgeContextFromSnapshot (seen/picked/skipped semantics)
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
| Zero picks | Friendly empty state — not five broken sections |
| Friend user (`is_friend`) | `locationVisitsTotal === null` — location stats never rendered |
| Sparse missed data | Skip count may be 0; page still shows picks/seen |
| Godlike D+1 time travel | Teaser appears without reload; `/wrap` always open |
| Dismiss teaser | `viralatas:wrap-dismissed-2026` suppresses banner only |
| Ceremony picks | Excluded from picked/seen stats (badge engine parity) |

---

## Important Hooks / Services / Repositories

- **`buildFestivalWrapStats`** — single stats builder; must not duplicate badge seen-band logic.
- **`useBadgeCache`** — shared IDB snapshot loader; wrap hook does not call persist side effects.
- **`isFestivalEnded`** — shared with Phase 29 consolidation gate; uses `now()` for godlike override.

---

## Gating Table

| Surface | `isFestivalEnded(now(), bands)`? | Notes |
|---------|----------------------------------|-------|
| Teaser on `/now`, `/profile` | **Yes** | Plus `!isWrapDismissed()` |
| Route `/wrap` | **No** | Direct URL always when logged in |

---

## Open Questions

- Percentile rank copy (v2) — optional when crew size is small.
- Public share URL / server snapshot — out of scope v1.
- Duck quack stats — not in IndexedDB.

---

## Acceptance Criteria (Phase 30)

- [x] Five scroll sections (A2): stage bar, meters, patch pile, progress dots
- [x] Teaser Variant B on `/now` and `/profile`
- [x] Stats match badge engine semantics
- [x] Offline after first IDB load
- [x] Teaser gated; `/wrap` route open anytime
- [x] Godlike D+1 + Time Travel disclaimer (4 locales)
- [x] **vira-latas** copy in all locales
- [x] Friend users hide location stats
- [x] Empty picks friendly state
- [x] Open vest → `/profile`
- [x] Design System documents wrap anatomy
