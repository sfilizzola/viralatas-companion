# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`
**Upcoming ideas** → `FUTURE_IDEAS.md`
**Implementation plan (Phase 30)** → `docs/superpowers/plans/2026-05-27-festival-wrap-plan.md` (execution: **subagent-driven**, § Subagent execution strategy)  
**Locked UI:** [`/wrap` page A2](docs/superpowers/specs/2026-05-27-festival-wrap-page-design.md) · [teaser banner B](docs/superpowers/specs/2026-05-27-festival-wrap-banner-design.md)  
**Godlike QA spec** → `docs/superpowers/specs/2026-05-27-festival-wrap-godlike-qa-design.md`
**Domain glossary (badge consolidation)** → `CONTEXT.md`

---

## Phase 30 — Festival Wrap (`/wrap` recap page)

**Status:** 📋 Planned (spec + implementation plan — no code yet)

**Source:** `FUTURE_IDEAS.md` Idea 7

**Goal:** After Wacken ends, give each vira-lata a single scrollable recap at `/wrap` — Spotify Wrapped energy with **personal** stats first and **1–2 crew highlights** at the end. All numbers computed client-side from IndexedDB; no LLM prose; no schema change.

**Visual direction (locked):**
- **`/wrap` page:** **A2 · Vest Chronicle** — `docs/superpowers/specs/2026-05-27-festival-wrap-page-design.md` (prototype: `_temp/wrap-proposals/variant-a2-vest-chronicle.html`)
- **Teaser banner** (`/now`, `/profile`): **B · Vest Chronicle bar** — `docs/superpowers/specs/2026-05-27-festival-wrap-banner-design.md` (prototype: `_temp/wrap-banner-proposals/index.html` § B)

**Sub-phases:**

| Sub-phase | Scope |
|-----------|--------|
| **30.A** | `festivalWrap.ts` pure stats + Vitest (badge parity, crew Jaccard, edge cases) |
| **30.B** | `useFestivalWrapStats` + `wrapDismiss.ts` localStorage helper |
| **30.C** | `/wrap` route + page shell (loading / empty / five section scaffold) |
| **30.D** | A2 UI — scroll-snap, progress dots, all five sections + i18n |
| **30.E** | Teaser banners on `/now` + `/profile`, Time Travel wrap disclaimer (godlike), Design System, wiki flow page |

**Deliverables:**

- `src/services/festivalWrap.ts` — stats builder reusing `buildBadgeContextFromSnapshot` + `getEarnedBadges` + `computeBandOverlaps`
- `src/hooks/useFestivalWrapStats.ts` — IDB-first hook (same snapshot loads as badges, no Supabase stats reads)
- `src/pages/WrapPage.tsx` + CSS module — five full-viewport sections, `IntersectionObserver` progress bar
- `src/components/wrap/WrapProgress.tsx`, `WrapTeaserBanner.tsx` + CSS (**banner Variant B**)
- Private route `/wrap` in `App.tsx`
- Post-festival teaser on `RightNowPage` + `ProfilePage` (gated by `isFestivalEnded(now(), bands)` ✅ Phase 29, dismiss `viralatas:wrap-dismissed-2026`; reacts to `viralatas:time-override-changed`)
- Godlike Time Travel disclaimer (`timeTravelWrapDisclaimer`) — D+1 previews teaser only; `/wrap` route stays open anytime (see `docs/superpowers/specs/2026-05-27-festival-wrap-godlike-qa-design.md`)
- i18n `WrapPage_*` (br, en, es, de) — **vira-latas** in user-facing copy
- Tests: `festivalWrap.test.ts`, `wrapDismiss.test.ts`
- Docs: `docs/ai-wiki/flows/festival-wrap.md`, Design System section, changelog on completion

**Acceptance criteria:**

- [ ] `/wrap` renders five scroll sections per **A2** page spec (stage bar, meters, patch pile, progress dots)
- [ ] Teaser banner matches **Variant B** on `/now` and `/profile` (4px accent bar, patch pile, dismiss)
- [ ] All displayed stats match badge engine semantics for seen/picked/skipped/conflicts
- [ ] Page works fully offline after first load (stats from IndexedDB only)
- [ ] Teaser banner appears only after `isFestivalEnded(now(), bands)` and respects dismiss localStorage key (banner visibility only — not `/wrap` route)
- [ ] Godlike: D+1 time travel shows wrap teaser on `/now` and `/profile` without reload; Time Travel always shows wrap-only QA disclaimer (4 locales)
- [ ] `/wrap` route has no festival-ended gate (teaser is the discovery surface)
- [ ] Copy uses **vira-latas** (not "crew") in all four locales
- [ ] Friend users never see location-toggle stats on the wrap page
- [ ] Empty-picks users see a friendly empty state, not broken layout
- [ ] "Open vest" navigates to `/profile` where `BadgesDisplay` shows full patch collection
- [ ] Design System documents Wrap page tokens and section anatomy

**Dependencies already shipped:**

- `isFestivalEnded()` — Phase 29 (`src/services/time.ts`)
- Badge context / seen bands semantics — `badgeContextBuilder.ts`, `engine.ts`
- Vest stack layout for finale — `stackLayout.ts`, `BadgesDisplay` patterns

**Not in v1:** duck quacks, LLM recap, public share URL, percentile rank copy, bottom-nav tab for wrap.

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update the status line above to the next phase number.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
