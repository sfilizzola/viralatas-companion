# Rating Wrap Stats & Badge Predicates — Design

**Date:** 2026-05-28  
**Status:** Approved + grill amendments (2026-05-28)  
**Owner:** sfilizzola  
**Phase:** 34 — Rating recap & badge predicates  
**Parent ideas:** `FUTURE_IDEAS.md` #9 (wrap stats) · #10 (rating badges — engine only)  
**Depends on:** Phase 32 (`user_band_ratings` IDB + aggregates)

---

## Problem

Phase 32 shipped rating input and `/popular` sort, but festival recap and badges ignore that data. Vira-latas who scored sets have no wrap moment for it, and the badge engine has no predicates for rating behavior — blocking future rating patches without another engine refactor.

---

## Goals

1. Add a **Ratings** section to `/wrap` with rich personal + crew stats (offline-first from IndexedDB).
2. Introduce a shared **`ratingStats.ts`** pure service — single source of truth for wrap and badge context.
3. Extend **`BadgeContext`** and **`engine.ts`** with **six new `BadgeCondition` types** — documented in wiki + `.claude/context/badges.md`.
4. **Do not** add registry entries, PNG assets, or badge i18n in this phase.

## Non-goals (Phase 34)

- Idea 8 — rating display on My Wacken (`FUTURE_IDEAS.md` #8)
- New badge slugs in `registry.ts`
- Schema / migration / sync changes
- Server-side rating aggregates
- LLM wrap copy or push alerts about ratings

---

## Locked decisions

| Topic | Decision |
|-------|----------|
| Architecture | **Approach 2** — shared `src/services/ratingStats.ts`; wrap + badge engine consume it |
| Wrap placement | After **Chaos**, before **Crew** (Welcome → Hero → Personality → Chaos → **Ratings** → Crew → Assigned? → Patches → Thanks) |
| Wrap visibility | **Hide** Ratings section when **zero crew-wide ratings**; omit progress dot (same pattern as optional Assigned section) |
| Wrap stats tier | **Rich (C)** — see table below |
| Crew aggregate rules | Same as Phase 32 Popular: all vira-latas incl. self and test users; ceremony excluded |
| Eligible rating | Picked + ended + not missed + not ceremony (`canRateBand` semantics) |
| Badge scope | **Engine capabilities only** — no `BADGES[]` entries |
| Condition types | **Core trio + aggregates (B)** — six types (see Badge engine) |
| Headliner filter | No `is_headliner` column — future badges use `band_rated_score_min` + optional `name` / `stage` / `genre` |
| UI terminology | User-facing copy: **vira-latas**, never “crew” (CLAUDE.md) |
| IDB ratings load | **`useAllRatingsCache`** read-only hook (Phase 31 cell pattern); **do not** extend `useSocialSnapshot` |
| Zero picks wrap | **`!hasPicks`** keeps Phase 30 empty wrap — Ratings section never mounts |
| Personal zero ratings | One-line copy (*You didn't rate any sets*); crew block still full |
| Top score row | Unified kicker **Your top score**; 5★ if any, else highest score fallback |
| Lowest pick row | Hidden when **<2 distinct bands** qualify for lowest-pick pool |
| **Wrap Ratings layout** | **C · Popular Echo** (huashu-design locked 2026-05-28) — prototype `_temp/wrap-ratings-proposals/index.html` § C |

---

## Layout — C · Popular Echo (locked 2026-05-28)

**Reference:** `_temp/wrap-ratings-proposals/index.html` — Variant **C · Popular Echo** (huashu-design Phase 34 prototypes). Rejected: A Chronicle Card, B Verdict Hero.

**Shell:** Same A2 section frame as other wrap stats — `.sectionEpigraph` above card; card has 4px `--stage` bar, glow, mono kicker.

**Anatomy (inside card):**

| Block | Content |
|-------|---------|
| Kicker | Mono uppercase (e.g. *Vira-lata scores* — i18n) |
| **Personal strip** | Label *You* + one mono line: `{n} rated · {avg} avg · {pct}% seen` via `formatRatingAvg()` |
| Personal zero | Replace strip with one-line italic copy (*You didn't rate any sets — the vira-latas still did.*) |
| **Crew top card** | Nested card; border tint `--signal-ok`; kicker *Crew top rated*; Oswald band name; **paw + large avg** hero (accent `#c0392b`, reuse `PawIcon`); footer mono `{count} ratings` |
| **Crew lowest card** | Same chrome; border tint `--signal-warn`; avg hero uses warn color; **hidden** when &lt;2 distinct qualifying bands |
| **Your top score** | Bottom row separated by top border; kicker *Your top score*; band name + score + paw; hidden when user has zero ratings |

**Reuse:** Mirror Popular `BandCard` rating-mode cluster semantics (`ratingHero`, paw + avg, count line) — adapted for wrap nested cards, not full schedule row.

**Epigraph:** Localized editorial quote above card (prototype: *Ranked by the mosh pit jury.* — final copy in i18n).

**States to implement:** Toggle personal full / zero, lowest visible / hidden, top score 5★ vs best fallback — see prototype control bar.

---

## Grill amendments (2026-05-28)

| # | Topic | Locked choice |
|---|-------|---------------|
| 1 | Crew highlight time gate | Both top + lowest: band `end_time < now()` at render (simulated `now()`) |
| 2 | Lowest pick guards | ≥1 rating **and** ≥**2 crew picks** on band; top rated: ≥1 rating only |
| 3 | Personal zero ratings | One-line copy; crew stats unchanged |
| 4–5 | Top score row | Unified kicker **Your top score**; fallback to best score if no 5★; tie → earliest `start_time` |
| 6 | Ratings IDB load | `useAllRatingsCache` + `RATINGS_CHANGED_EVENT`; wrap + badge persist consume it |
| 7 | `minRaters` default | `crew_avg_on_picked_band_min`: default **1** when omitted |
| 8 | Badge rating counts | Eligible at eval time only (`canRateBand`) |
| 9 | Crew row display | `{name} · {avg} · {count} ratings` via `formatRatingAvg()` |
| 10 | Lowest row visibility | Hide when **<2 distinct** qualifying bands |
| 11 | `minRatings` on avg badges | **Required** on `user_rating_avg_min` / `user_rating_avg_max` — no default |
| 12 | Pct predicate | Strict `(ratedSeen × 100) / seenCount >= pct`; display may `round()` |
| 13 | Zero picks | No change to Phase 30 empty wrap |
| 14 | Score threshold | `band_rated_score_min`: user score **≥** `condition.score` |
| 15 | Multi-filter | Provided `name` / `stage` / `genre` filters combine with **AND** |
| 16 | Crew avg band scope | `crew_avg_on_picked_band_min`: band must be in **`seenBands`** at eval |
| 17 | Pct divide-by-zero | `seenBands.length === 0` → predicate **always false** |

---

## Rich wrap stats (Ratings section)

Shown when ≥1 rating exists in the crew IDB snapshot (same gate as `/popular` rating sort mode) **and** `stats.hasPicks` (Phase 30 empty wrap unchanged).

### Personal block

When user has ≥1 eligible rating:

| Stat | Rule |
|------|------|
| **Ratings given** | Count of user's ratings on eligible bands |
| **Your average** | Mean of user's scores; `formatRatingAvg()` |
| **% of seen rated** | `round(userRatedSeen / seenBands.length × 100)` for display; 0 when no seen bands |

When user has **zero** eligible ratings: replace numeric block with one-line copy (*You didn't rate any sets* — localized).

### Crew highlights

Both require: non-ceremony, `end_time < now()`, ≥1 rating. Crew avg includes all raters (self + test users).

| Stat | Rule |
|------|------|
| **Crew top rated** | Highest crew avg; tie → earlier `start_time` |
| **Crew lowest pick** | Lowest crew avg among bands with ≥1 rating **and** ≥**2 crew picks**; tie → earlier `start_time`; **row hidden** when **<2 distinct** bands qualify |

Display: crew cards use **paw + avg hero** + footer `{count} ratings` (Variant C — not a single inline line).

### Your top score row

| Stat | Rule |
|------|------|
| **Your top score** | If user gave 5★: earliest 5★ band by `start_time`; else highest score (tie → earliest `start_time`); show score in copy (e.g. *5 · Band* or *4 · Band*) |

Row hidden when user has zero eligible ratings (personal block shows copy instead).

Ceremony bands excluded everywhere. “Seen” uses badge semantics: picked, past `end_time`, not in `user_missed_bands`.

**Visual:** **C · Popular Echo** — A2 outer card + nested crew rating cards (Popular-mode chrome). See **Layout — C · Popular Echo** above and `_temp/wrap-ratings-proposals/index.html`.

---

## Architecture

### Data flow (offline-first unchanged)

```
IndexedDB user_band_ratings (+ bands, picks, missed)
  → ratingStats.ts (pure)
       ├→ festivalWrap.ts → WrapPage Ratings section
       └→ badgeContextBuilder.ts → BadgeContext → engine.ts
```

No Supabase reads for stats. **`useAllRatingsCache`** listens to `RATINGS_CHANGED_EVENT` (same as `useBandRatings` load path); wrap + badge persist consume the cache — **do not** extend `useSocialSnapshot`.

### New module: `src/services/ratingStats.ts`

Recommended exports:

```typescript
export type RatingStatsInput = {
  ratings: UserBandRating[];
  bands: Band[];
  userId: string;
  pickedBandIds: Set<string>;
  seenBandIds: Set<string>;
  missedBandIds: Set<string>;
  allPickBandIds: Set<string>; // any vira-lata picked
  now: Date;
};

export type RatingStatsSnapshot = {
  hasCrewRatings: boolean;
  userRatingsByBandId: Map<string, number>;
  aggregates: Record<string, BandRatingAggregate>;
  bandsRatedCount: number;
  userRatingAvg: number | null;
  ratedPctOfSeen: number;
  crewTopRated: { bandId: string; name: string; avg: number; count: number } | null;
  crewLowestPick: { bandId: string; name: string; avg: number; count: number } | null; // null when <2 distinct qualifiers
  userTopScore: { bandId: string; name: string; score: number } | null;
};

export function buildRatingStatsSnapshot(input: RatingStatsInput): RatingStatsSnapshot;
```

Reuses `computeRatingAggregates()` from `bandRatings.ts`. Eligibility filter wraps each rating row before counting user stats.

### Wrap integration

- Extend `FestivalWrapStats` with `ratings: RatingStatsSnapshot | null` (or flattened personal/crew rating fields).
- `useFestivalWrapStats` composes **`useAllRatingsCache`** (read-only; no mutation API).
- `WrapPage`: conditional Ratings section + dynamic section indices (mirror `hasAssignedSection` pattern).
- `WrapProgress` `total` reflects optional Ratings dot.

### Badge engine extension

**New `BadgeCondition` types** (add to `types.ts`, evaluate in `engine.ts`):

| Type | Fields | Meaning |
|------|--------|---------|
| `bands_rated_min` | `count` | User rated ≥ N bands **eligible at eval time** (`canRateBand`) |
| `band_rated_score_min` | `score`, optional `name` / `stage` / `genre` | User score **≥** `score` on a band matching **all** provided filters (AND); band must be eligible at eval |
| `crew_avg_on_picked_band_min` | `avg`, optional `minRaters` (default **1**) | Crew avg ≥ `avg` on ≥1 band in user's **`seenBands`**; optional `minRaters` on that band (default 1) |
| `user_rating_avg_min` | `avg`, **`minRatings` (required)** | User's mean eligible rating ≥ `avg` when user has ≥ `minRatings` eligible ratings |
| `user_rating_avg_max` | `avg`, **`minRatings` (required)** | User's mean eligible rating ≤ `avg` when user has ≥ `minRatings` eligible ratings |
| `bands_rated_pct_of_seen_min` | `pct` | `(ratedSeen × 100) / seenCount >= pct` (strict); **false** when `seenCount === 0` |

**`BadgeContext` additions:**

```typescript
userRatingsByBandId: Map<string, number>;
ratingAggregates: Record<string, BandRatingAggregate>;
bandsRatedCount: number;
userRatingAvg: number | null;
ratedPctOfSeen: number;
```

`buildBadgeContextFromSnapshot` / social variant calls `buildRatingStatsSnapshot` and merges fields. `EMPTY_BADGE_CONTEXT` gets zeroed defaults.

**Registry:** unchanged in Phase 34. Future badges (Phase 35+ or ad-hoc) add slugs using these predicates.

---

## Files (implementation map)

| File | Action |
|------|--------|
| `src/services/ratingStats.ts` | **Create** — pure snapshot builder |
| `src/services/festivalWrap.ts` | Modify — merge rating stats into `FestivalWrapStats` |
| `src/hooks/useAllRatingsCache.ts` | **Create** — read-only IDB cell + `RATINGS_CHANGED_EVENT` |
| `src/hooks/useFestivalWrapStats.ts` | Modify — compose `useAllRatingsCache` |
| `src/pages/WrapPage.tsx` | Modify — Ratings section + dynamic indices |
| `src/pages/WrapPage.module.css` | Modify — Ratings section styles |
| `src/i18n/WrapPage_*.json` | Modify ×4 — Ratings copy |
| `src/services/badges/types.ts` | Modify — 6 condition variants + context fields |
| `src/services/badges/engine.ts` | Modify — evaluators |
| `src/services/badges/badgeContextBuilder.ts` | Modify — feed rating snapshot |
| `src/hooks/useBadgePersist.ts` | Modify — compose `useAllRatingsCache` into badge context build |
| `src/__tests__/ratingStats.test.ts` | **Create** |
| `src/__tests__/festivalWrap.test.ts` | Modify — rating section stats |
| `src/__tests__/badges.test.ts` | Modify — predicate matrix for new types |
| `public/vira-lata-ds.html` | Modify — Wrap Ratings section |
| `.claude/context/badges.md` | Modify — document 6 new types |
| `docs/ai-wiki/badges.md` | Modify — predicate inventory |
| `docs/ai-wiki/flows/festival-wrap.md` | Modify — Ratings section flow |
| `docs/ai-wiki/domain-model.md` | Modify — rating stats service |
| `docs/ai-wiki/changelog.md` | Dated entry on ship |
| `FUTURE_IDEAS.md` | Mark #9 shipped / #10 partial when complete |

---

## Acceptance criteria

### Wrap (Idea 9)

- [ ] Ratings section after Chaos when ≥1 crew rating **and** `hasPicks`; hidden otherwise (no empty card).
- [ ] Progress dots omit Ratings when section hidden; indices stay correct with Assigned optional section.
- [ ] Personal zero ratings → one-line copy; crew cards per **Variant C** anatomy.
- [ ] Crew cards: paw + avg hero + `{count} ratings` footer; lowest hidden when <2 distinct qualifiers.
- [ ] Crew averages include all raters (self included); ties break on `start_time`; crew highlights respect `now()`.
- [ ] Page works offline after first sync (IDB-only reads).
- [ ] Copy uses **vira-latas** in all four locales.

### Badge engine (Idea 10 — capabilities)

- [ ] Six new `BadgeCondition` types compile and evaluate in `engine.ts`.
- [ ] `BadgeContext` populated from IDB ratings via `ratingStats.ts`.
- [ ] Wiki + `.claude/context/badges.md` list all six types with inputs and meaning.
- [ ] **`registry.ts` unchanged** — zero new badge slugs.
- [ ] Unit tests cover each predicate edge case (0 ratings, minRaters default 1, required minRatings, AND filters, pct math, seenCount 0 → false).

### Quality gates

- [ ] `rtk npm run build` green
- [ ] `rtk npm test` green
- [ ] Design System documents Wrap Ratings section

---

## Sub-phases (suggested implementation order)

| Sub-phase | Focus |
|-----------|--------|
| **34.A** | `ratingStats.ts` + unit tests |
| **34.B** | `festivalWrap` + `useFestivalWrapStats` + WrapPage UI + i18n + DS |
| **34.C** | BadgeContext + engine predicates + badge tests + wiki |

---

## Relationship to future work

- **FUTURE_IDEAS #8** — My Wacken rating chip; independent, can ship before or after 34.
- **Rating badge catalog** — add registry entries + PNG + i18n in a follow-up phase using Phase 34 predicates.
- **Phase 32** — eligibility and aggregate rules must stay aligned; changes to `canRateBand` or `computeRatingAggregates` require updating `ratingStats.ts` tests.
