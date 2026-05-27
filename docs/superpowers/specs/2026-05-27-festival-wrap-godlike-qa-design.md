# Festival Wrap — Godlike time-travel QA

**Date:** 2026-05-27  
**Status:** Approved (brainstorming)  
**Parent:** Phase 30 / `FUTURE_IDEAS.md` Idea 7  
**Implementation plan:** `docs/superpowers/plans/2026-05-27-festival-wrap-plan.md`  
**Teaser UI (locked):** `docs/superpowers/specs/2026-05-27-festival-wrap-banner-design.md` — **Variant B** (not B+D / not D gold wash)

---

## Purpose

Document how godlike users preview the **post-festival wrap teaser** before real festival end, using the existing Time Travel control. No new time-travel mechanics; copy + teaser reactivity only.

---

## Locked decisions

| Topic | Decision |
|--------|----------|
| What D+1 enables for wrap | **Teaser banner** on `/now` and `/profile` only |
| `/wrap` route | Always reachable when logged in — **no** `isFestivalEnded()` guard on the route |
| Wrap stats on `/wrap` | Normal `now()` semantics (no separate QA stats mode) |
| Disclaimer visibility | **Always** visible in Time Travel (godlike-only section) |
| Disclaimer scope | **Wrap / recap teaser only** — do not mention badge consolidate |
| Mechanism | `now()` override + `isFestivalEnded(now(), bands)` (Phase 29) |

---

## Existing behavior (no change to D+1 chip)

- **Component:** `src/components/profile/TimeTravelSection.tsx` inside `GodlikeAdminPanel`.
- **D+1 quick jump:** `2026-08-02T20:00:00Z` (22:00 Wacken CEST on 2 Aug).
- **Storage:** `viralatas-time-override` in `localStorage`; `now()` in `src/services/time.ts` returns override when set.
- **Event:** `viralatas:time-override-changed` on set/clear.
- **Festival ended:** `isFestivalEnded(at, bands)` is true when `at` is past the latest non-ceremony band `end_time`. D+1 satisfies this for the seeded lineup.

**Reference:** `ConsolidateBadgesSection` already re-checks `isFestivalEnded(now(), bands)` on `viralatas:time-override-changed` — wrap teaser must follow the same pattern.

---

## Wrap discovery vs route

| Surface | Gated by `isFestivalEnded(now(), bands)`? | Notes |
|---------|------------------------------------------|--------|
| Teaser on `/now`, `/profile` | **Yes** | Plus `!isWrapDismissed()` |
| Route `/wrap` | **No** | Direct URL / link for layout and stats QA anytime |

**Production:** Crew sees the teaser only after the real festival ends.  
**Godlike QA:** Jump to **D+1** (or any simulated instant after the last band) → teaser appears on Agora and Profile on this device.

---

## Time Travel disclaimer (new)

### Placement

- File: `TimeTravelSection.tsx`
- Position: second paragraph, immediately under `timeTravelDescription`
- Style: reuse muted description class (`liveBandTestDescription` or equivalent) — informational, not an error/warning block

### i18n

- Namespace: `ProfilePage` (existing)
- Key: `timeTravelWrapDisclaimer`
- Locales: `ProfilePage_br.json`, `ProfilePage_en.json`, `ProfilePage_es.json`, `ProfilePage_de.json`

### Canonical copy (EN)

> After the festival ends, the recap teaser on **Agora** and **Profile** appears for everyone. Jump to **D+1** (or any simulated time after the last band) to preview that teaser on this device. The **/wrap** page is always available for direct testing.

Localized strings must preserve:

- Teaser = Agora (`/now`) + Profile — not “every page”
- D+1 as the documented quick jump; any post–last-band override also works
- `/wrap` reachable without waiting for the teaser gate
- No mention of consolidate or other godlike tools

---

## Wrap teaser implementation requirements

### Gate

```typescript
const show =
  isFestivalEnded(now(), bands) &&
  !isWrapDismissed() &&
  !loadingBands;
```

Use `now()` from `time.ts` — **not** raw `new Date()`.

### Reactivity

Hosts (`RightNowPage`, `ProfilePage`) or `WrapTeaserBanner` must:

1. Load bands from IndexedDB (or receive from parent).
2. Compute `show` from `isFestivalEnded(now(), bands)` and dismiss flag.
3. Subscribe to `viralatas:time-override-changed` and recompute (mirror `ConsolidateBadgesSection`).

Without (3), godlike applies D+1 but the teaser does not appear until navigation or reload.

### Out of scope

- Changing D+1 ISO or chip list
- Gating `/wrap` on festival end
- Disclaimer when consolidate runs
- Extra banner on Schedule / Popular / My Picks

---

## Acceptance criteria (godlike QA slice)

- [ ] Godlike Time Travel shows `timeTravelWrapDisclaimer` in all four Profile locales, always visible under the main description.
- [ ] After applying D+1 (or any post–last-band override), wrap teaser appears on `/now` and `/profile` without full page reload.
- [ ] Clearing time override hides the teaser when `isFestivalEnded(real now, bands)` is false.
- [ ] `/wrap` remains reachable when festival has not ended and override is cleared.
- [ ] Dismiss key `viralatas:wrap-dismissed-2026` still suppresses teaser when gate is true.

---

## Files (implementation)

| File | Action |
|------|--------|
| `src/components/profile/TimeTravelSection.tsx` | Render disclaimer paragraph |
| `src/i18n/ProfilePage_*.json` | Add `timeTravelWrapDisclaimer` × 4 |
| `src/components/wrap/WrapTeaserBanner.tsx` | Gate + optional internal override listener |
| `src/pages/RightNowPage.tsx` | Mount teaser; listen for time override |
| `src/pages/ProfilePage.tsx` | Mount teaser; listen for time override |
| `public/Design System.html` | Optional one line under godlike Time Travel (Task 13) |

---

## Spec self-review

- **Placeholders:** None.
- **Consistency:** Teaser gated; route open; disclaimer wrap-only; aligns with Idea 7 and Phase 30 plan.
- **Scope:** Single additive slice; no schema, no Edge Functions.
- **Ambiguity:** “Agora” = `/now` route label in EN; BR may use “Agora” or existing nav name — match `BottomNav` / `RightNowPage` title in each locale.
