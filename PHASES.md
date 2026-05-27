# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 30 — Festival Wrap (`/wrap` recap page)

**Status:** ✅ Complete

**Goal:** After Wacken ends, give each vira-lata a single scrollable recap at `/wrap` — Spotify Wrapped energy with **personal** stats first and **1–2 crew highlights** at the end. All numbers computed client-side from IndexedDB; no LLM prose; no schema change.

**Acceptance criteria:**

- [x] `/wrap` renders five scroll sections per **A2** page spec (stage bar, meters, patch pile, progress dots)
- [x] Teaser banner matches **Variant B** on `/now` and `/profile` (4px accent bar, patch pile, dismiss)
- [x] All displayed stats match badge engine semantics for seen/picked/skipped/conflicts
- [x] Page works fully offline after first load (stats from IndexedDB only)
- [x] Teaser banner appears only after `isFestivalEnded(now(), bands)` and respects dismiss localStorage key (banner visibility only — not `/wrap` route)
- [x] Godlike: D+1 time travel shows wrap teaser on `/now` and `/profile` without reload; Time Travel always shows wrap-only QA disclaimer (4 locales)
- [x] `/wrap` route has no festival-ended gate (teaser is the discovery surface)
- [x] Copy uses **vira-latas** (not "crew") in all four locales
- [x] Friend users never see location-toggle stats on the wrap page
- [x] Empty-picks users see a friendly empty state, not broken layout
- [x] "Open vest" navigates to `/profile` where `BadgesDisplay` shows full patch collection
- [x] Design System documents Wrap page tokens and section anatomy

**Implementation plan:** `docs/superpowers/plans/2026-05-27-festival-wrap-plan.md`
**Flow wiki:** `docs/ai-wiki/flows/festival-wrap.md`

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update the status line above to the next phase number.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
