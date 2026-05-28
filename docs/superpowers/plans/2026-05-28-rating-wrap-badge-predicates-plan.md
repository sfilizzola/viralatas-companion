# Phase 34 — Rating Wrap & Badge Predicates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase 34 — rich rating stats on `/wrap` (Variant **C · Popular Echo**); six badge engine predicates; no registry badges, schema, or sync changes.

**Architecture:** Pure `ratingStats.ts` fed by `useAllRatingsCache`; `festivalWrap.ts` + `WrapPage` for recap UI; `badgeContextBuilder` + `engine.ts` for predicates. Offline-first unchanged.

**Tech stack:** React 18, TypeScript, Vitest, CSS modules, existing `PawIcon` / Popular rating chrome.

**Spec source:** `docs/superpowers/specs/2026-05-28-rating-wrap-badge-predicates-design.md` (grill amendments + **Layout C**)

**UI prototype (locked):** `_temp/wrap-ratings-proposals/index.html` — **Variant C · Popular Echo** only (A/B rejected)

**Phase:** 34 — sub-phases 34.A · 34.B · 34.C

---

## Locked decisions (do not re-open)

Includes brainstorm + grill (2026-05-28) + huashu layout lock (2026-05-28). Full tables → spec.

| Decision | Locked choice |
|----------|---------------|
| Wrap layout | **C · Popular Echo** — nested crew cards, paw + avg hero, count footer |
| Wrap placement | After Chaos, before Crew |
| Wrap visibility | Hide when zero crew ratings **or** `!hasPicks` |
| Personal zero | One-line copy; crew cards stay |
| Top score kicker | **Your top score**; 5★ or best fallback |
| Crew top | Ended at `now()`; ≥1 rating |
| Crew lowest | ≥1 rating + ≥2 picks; hide when &lt;2 distinct bands |
| IDB load | `useAllRatingsCache` (not `useSocialSnapshot`) |
| Badge scope | Engine only — **no** `registry.ts` entries |
| Predicates | Six types per spec § Badge engine |
| Eligibility | `canRateBand` at eval time |
| `minRaters` default | **1** when omitted |
| `minRatings` on avg badges | **Required** |
| Pct predicate | Strict ratio; `seenCount === 0` → false |
| `crew_avg_on_picked_band_min` | Band in **`seenBands`** |

### Variant C anatomy (from prototype)

Implement against `_temp/wrap-ratings-proposals/index.html` § C:

1. **Epigraph** above outer card (localized)
2. **Outer card** — A2 shell: stage bar, kicker, glow
3. **Personal strip** — *You* label + `{n} rated · {avg} avg · {pct}% seen` (or zero-ratings copy)
4. **Crew top nested card** — `--signal-ok` border tint; paw + accent avg; `{count} ratings` footer
5. **Crew lowest nested card** — `--signal-warn` border tint; warn avg; conditional mount
6. **Your top score row** — border-top; band name + score + paw

**Reuse:** `PawIcon`, `formatRatingAvg()`, Popular `BandCard` rating cluster patterns (`ratingHero` semantics) — adapt to wrap nested cards, not full schedule rows.

**Prototype state toggles** (QA checklist): personal full/zero · lowest show/hide · top 5★/4★ fallback.

---

## Prerequisites (read before Task 1)

1. `docs/superpowers/specs/2026-05-28-rating-wrap-badge-predicates-design.md`
2. `_temp/wrap-ratings-proposals/index.html` — open Variant C; exercise toggles
3. `src/pages/WrapPage.tsx` + `WrapPage.module.css` — section index pattern (`hasAssignedSection`)
4. `src/components/BandCard.tsx` + `BandCard.module.css` — rating mode cluster
5. `src/services/bandRatings.ts` — `computeRatingAggregates`, `formatRatingAvg`, `canRateBand`
6. `CLAUDE.md` — offline-first; no Supabase UI reads

**Verification gates (every sub-phase):** `rtk npm run build` · `rtk npm test`

---

## File map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/services/ratingStats.ts` | **Create** | `buildRatingStatsSnapshot()` |
| `src/hooks/useAllRatingsCache.ts` | **Create** | Read-only IDB cell + `RATINGS_CHANGED_EVENT` |
| `src/__tests__/ratingStats.test.ts` | **Create** | Stats rules + grill edge cases |
| `src/services/festivalWrap.ts` | Modify | Merge rating snapshot into `FestivalWrapStats` |
| `src/hooks/useFestivalWrapStats.ts` | Modify | Compose `useAllRatingsCache` |
| `src/pages/WrapPage.tsx` | Modify | Ratings section (C layout) + dynamic indices |
| `src/pages/WrapPage.module.css` | Modify | Nested crew cards, personal strip, top score row |
| `src/i18n/WrapPage_*.json` | Modify ×4 | Ratings copy, epigraph, zero-ratings line |
| `src/services/badges/types.ts` | Modify | Six condition types + context fields |
| `src/services/badges/engine.ts` | Modify | Evaluators |
| `src/services/badges/badgeContextBuilder.ts` | Modify | Rating fields from snapshot |
| `src/hooks/useBadgePersist.ts` | Modify | Compose `useAllRatingsCache` |
| `src/__tests__/festivalWrap.test.ts` | Modify | Rating stats in wrap builder |
| `src/__tests__/badges.test.ts` | Modify | Predicate matrix |
| `public/vira-lata-ds.html` | Modify | Wrap Ratings § C anatomy |
| `.claude/context/badges.md` | Modify | Six new types |
| `docs/ai-wiki/badges.md` | Modify | Predicate inventory |
| `docs/ai-wiki/flows/festival-wrap.md` | Modify | Ratings section + layout C |
| `docs/ai-wiki/domain-model.md` | Modify | `ratingStats.ts` |
| `docs/ai-wiki/changelog.md` | Modify | Dated entry on ship |
| `PHASES.md` | Modify | Mark complete when done |

---

## Sub-phase 34.A — `ratingStats` + cache

- [ ] **A1** Create `useAllRatingsCache` — mirror `useBandRatings` load path without mutation API; subscribe `RATINGS_CHANGED_EVENT`
- [ ] **A2** Create `ratingStats.ts` — input types, `buildRatingStatsSnapshot()`; reuse `computeRatingAggregates`
- [ ] **A3** Implement grill rules: ended-at-`now()` crew highlights; lowest ≥2 picks; lowest null when &lt;2 distinct bands; top score 5★ vs best; eligible-at-eval filters
- [ ] **A4** Tests: `ratingStats.test.ts` — top/lowest ties, empty crew, pct display value, lowest hidden pool
- [ ] **A5** Gate: build + test green

---

## Sub-phase 34.B — Wrap UI (Variant C)

- [ ] **B1** Extend `FestivalWrapStats` + `buildFestivalWrapStats()` with rating snapshot; wire `useFestivalWrapStats` + cache
- [ ] **B2** Add `SECTION.ratings` to `WrapPage` after Chaos; dynamic indices with optional Assigned (mirror existing pattern)
- [ ] **B3** Implement **C · Popular Echo** markup per prototype:
  - Epigraph + outer card
  - Personal strip / zero copy
  - Nested crew top + lowest cards (`PawIcon`, avg hero, count footer)
  - Your top score row
- [ ] **B4** CSS in `WrapPage.module.css` — ok/warn border tints; do not break reduced-motion reveal animations
- [ ] **B5** i18n ×4 — vira-latas terminology; epigraph; kickers; zero-ratings line; count footer
- [ ] **B6** `festivalWrap.test.ts` — rating fields; lowest null; hasCrewRatings gate
- [ ] **B7** `public/vira-lata-ds.html` — document Wrap Ratings § C (reference prototype path)
- [ ] **B8** Manual QA: open prototype side-by-side; toggle all three prototype states against live `/wrap` (godlike time travel)
- [ ] **B9** Gate: build + test green

---

## Sub-phase 34.C — Badge predicates

- [ ] **C1** Add six `BadgeCondition` variants to `types.ts`; extend `BadgeContext` + `EMPTY_BADGE_CONTEXT`
- [ ] **C2** `badgeContextBuilder` — merge `buildRatingStatsSnapshot` fields
- [ ] **C3** `useBadgePersist` — pass ratings via `useAllRatingsCache`
- [ ] **C4** `engine.ts` — evaluators per spec (AND filters, required minRatings, minRaters default 1, strict pct, seenBands for crew avg)
- [ ] **C5** `badges.test.ts` — matrix for all six types + edge cases
- [ ] **C6** Update `.claude/context/badges.md` + `docs/ai-wiki/badges.md`
- [ ] **C7** Confirm `registry.ts` unchanged (grep new slugs = 0)
- [ ] **C8** Gate: build + test green

---

## Phase close (when all sub-phases done)

- [ ] Append Phase 34 to `docs/ai-wiki/phases-history.md`
- [ ] Update `FUTURE_IDEAS.md` #9 → ✅ Phase 34; #10 partial (engine shipped)
- [ ] `PHASES.md` → no active phased work
- [ ] Single commit; push branch

---

## Out of scope (explicit)

- Idea 8 — My Wacken rating display
- Badge registry / PNG / badge i18n
- Migrations, sync, Edge Functions
- Variants A/B wrap layouts
