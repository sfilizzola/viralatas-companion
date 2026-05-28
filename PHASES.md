# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Active development

### Phase 34 — Rating recap & badge predicates

**Status:** Planned (grill-locked 2026-05-28)  
**Spec:** `docs/superpowers/specs/2026-05-28-rating-wrap-badge-predicates-design.md` (§ Grill amendments · § Layout C)  
**Plan:** `docs/superpowers/plans/2026-05-28-rating-wrap-badge-predicates-plan.md`  
**UI prototype:** `_temp/wrap-ratings-proposals/index.html` — **Variant C · Popular Echo** (locked)
**Parent ideas:** `FUTURE_IDEAS.md` #9 (wrap stats) · #10 (badge engine — no registry entries)  
**Depends on:** Phase 32 (`user_band_ratings` IDB + `computeRatingAggregates`)

**Goal:** Surface rich rating stats on `/wrap` after Chaos; extend the badge engine with six rating predicates so future patches can ship without another engine refactor. No new badges, schema, or sync changes.

**Approach:** Shared pure service `ratingStats.ts` — consumed by `festivalWrap.ts` and `badgeContextBuilder.ts` (single source of truth).

---

#### Sub-phases

| Sub-phase | Deliverables |
|-----------|--------------|
| **34.A** | `src/services/ratingStats.ts` + `src/hooks/useAllRatingsCache.ts` + `src/__tests__/ratingStats.test.ts` |
| **34.B** | Wrap Ratings section — **C · Popular Echo** layout; dynamic progress dots; i18n ×4; Design System |
| **34.C** | `BadgeContext` + six new `BadgeCondition` types in `engine.ts`; wiki + `.claude/context/badges.md`; badge tests |

---

#### Locked decisions

| Topic | Decision |
|-------|----------|
| Wrap stats | Rich — personal (given, avg, % seen rated) + crew top/lowest + **Your top score** row |
| Wrap placement | After Chaos, before Crew |
| Wrap visibility | Hide section + dot when zero crew-wide ratings **or** `!hasPicks` |
| Personal zero ratings | One-line copy; crew block full |
| Top score row | Kicker **Your top score**; 5★ or best-score fallback |
| Crew top rated | Ended at `now()`; ≥1 rating |
| Crew lowest pick | Ended at `now()`; ≥1 rating + ≥2 crew picks; hide when <2 distinct bands qualify |
| Crew row display | **Variant C cards** — paw + avg hero + `{count} ratings` footer |
| **Wrap layout** | **C · Popular Echo** — `_temp/wrap-ratings-proposals/index.html` |
| IDB load | `useAllRatingsCache` (read-only); not `useSocialSnapshot` |
| Badge scope | Engine only — **no** `registry.ts` entries, PNG assets, or badge i18n |
| Condition types | Six predicates — see spec § Badge engine |
| Eligibility | `canRateBand` at eval time for all rating counts |
| `minRaters` default | **1** when omitted on `crew_avg_on_picked_band_min` |
| `minRatings` on avg badges | **Required** on `user_rating_avg_min` / `_max` |
| Pct predicate | Strict ratio; `seenCount === 0` → false |
| `crew_avg_on_picked_band_min` scope | Band in **`seenBands`** at eval |
| Score / filters | `band_rated_score_min`: score **≥** threshold; filters **AND** |

---

#### Deliverables

- [ ] `src/services/ratingStats.ts` — `buildRatingStatsSnapshot()` reusing `computeRatingAggregates`
- [ ] `src/hooks/useAllRatingsCache.ts` — read-only crew-wide ratings cell
- [ ] Extend `festivalWrap.ts` + `useFestivalWrapStats` with rating stats
- [ ] `WrapPage` Ratings section + `WrapPage.module.css` + dynamic section indices
- [ ] `WrapPage_*.json` (br, en, es, de) — Ratings copy; **vira-latas** terminology
- [ ] Six new badge condition types in `types.ts` + evaluators in `engine.ts`
- [ ] `badgeContextBuilder.ts` feeds rating fields into `BadgeContext`
- [ ] Tests: `ratingStats.test.ts`, `festivalWrap.test.ts` (ratings), `badges.test.ts` (predicates)
- [ ] `public/vira-lata-ds.html` — Wrap Ratings section
- [ ] Wiki: `flows/festival-wrap.md`, `badges.md`, `domain-model.md`, `changelog.md`
- [ ] `.claude/context/badges.md` — six new types documented

**Explicitly out of scope:** Idea 8 (My Wacken rating display), badge registry/art, migrations, sync changes.

---

#### Acceptance criteria

**Wrap (Idea 9)**
- [ ] Ratings section after Chaos when ≥1 crew rating and `hasPicks`; hidden otherwise
- [ ] Progress dots correct with optional Ratings + Assigned sections
- [ ] Grill-locked stats + **Variant C** nested crew cards; lowest guard; top score fallback
- [ ] Fully offline after first load (IDB-only)
- [ ] Four locales updated

**Badge engine (Idea 10 — capabilities)**
- [ ] Six predicates per spec (eligible-at-eval, required minRatings, minRaters default 1, strict pct, seenBands scope)
- [ ] `registry.ts` unchanged (zero new slugs)
- [ ] Wiki + context badges doc updated

**Quality**
- [ ] `rtk npm run build` and `rtk npm test` green

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update this file so the active section points at the next phase (or “no active phased work” when the backlog is empty).
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
