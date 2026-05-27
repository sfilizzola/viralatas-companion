# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`
**Upcoming ideas** → `FUTURE_IDEAS.md`
**Domain glossary (badge consolidation)** → `CONTEXT.md`

---

## Phase 29 — Badge consolidation (year archive)

**Status:** ✅ Complete

**Source:** FUTURE_IDEAS.md · Idea 2 — Badge consolidation

**Goal:** After Wacken ends, godlike operators snapshot each vira-lata's earned **year-badges** into `user_badge_history` so 2026 wins survive `festival:reset` and registry rollover. Live vest shows evergreen + current-festival badges only; past years live in **Conquistas Anteriores** on `/profile`.

**When to run (operator):** Inside the **consolidation window** — after `isFestivalEnded()`, before the next `npm run festival:reset`. Idempotent; safe to re-run. Exclude test vira-latas (`is_test_user = true`).

---

### Design decisions (locked in grill)

| Topic | Decision |
|-------|----------|
| Post-reset display | **Archive only** — year-badges not on live vest after reset |
| Registry rollover | **In-place year bump** — same slugs; `getCurrentFestivalYear()` = max `BadgeConfig.year` in registry |
| Badge images | **P1** — never overwrite PNGs; new art → new file (e.g. `badge_medic-27.png`); frozen `image_path` at consolidate |
| Client reads | **O1** — IndexedDB-primary badge history cache; sync from Supabase on `/profile` load when online |
| Consolidation gate | **T1** — disabled until `isFestivalEnded()`; **F3/B3** godlike bypass via time override **or** confirm-modal `force: true` (server validates godlike) |
| Transition (pre-reset) | **D1** — duplicate vest + archive OK; no dedup logic |
| Previously Achieved UI | **U2 + M2** — read-only grid by year; tap → same overlay patch modal as live vest (label + year chip only; no description; no zoom) |
| Test users | **X1** — excluded from consolidation |

---

### Deliverables

#### Schema & backend

| File | Action |
|------|--------|
| `supabase/migrations/<date>_user_badge_history.sql` | `user_badge_history` table + RLS (user SELECT own; godlike ALL) + `UNIQUE (user_id, festival_year, slug)` |
| `supabase/functions/consolidate-year-badges/index.ts` | HTTP handler: auth, godlike check, optional `force`, orchestration |
| `supabase/functions/consolidate-year-badges/engine.ts` | Copy of `src/services/badges/engine.ts` (Deno) |
| `supabase/functions/consolidate-year-badges/registry.ts` | Copy of `src/services/badges/registry.ts` (Deno) |
| `supabase/functions/consolidate-year-badges/types.ts` | Copy of `src/services/badges/types.ts` (Deno) |

Edge function contract: `POST { year: number, force?: boolean }` → `{ processedUsers, savedBadges, skipped, errors }`. Filter earned badges to `badge.year === year`; upsert frozen `slug`, `image_path`, `label_key`. Skip `is_test_user = true`.

#### Client — data & sync

| File | Action |
|------|--------|
| `src/lib/db/badgeHistory.ts` | IDB store: replace-all rows for current user on sync |
| `src/repositories/badgeHistoryRepository.ts` | IDB read + Supabase pull (offline-first) |
| `src/hooks/useUserBadgeHistory.ts` | Load IDB first; sync on profile mount / reconnect |

#### Client — live vest filter

| File | Action |
|------|--------|
| `src/services/badges/currentFestivalYear.ts` | `getCurrentFestivalYear()` — max `year` in `BADGES` |
| `src/services/badges/engine.ts` or `BadgesDisplay.tsx` | Live evaluation/display: evergreen (`!year`) + `year === getCurrentFestivalYear()` only |

#### Client — UI

| File | Action |
|------|--------|
| `src/services/time.ts` | `isFestivalEnded(at?, bands?)` — past max non-ceremony `end_time` |
| `src/components/BadgeHistorySection.tsx` | Collapsible Previously Achieved; grid by `festival_year` desc |
| `src/components/badges/` (modal share) | History tap → live patch overlay modal (M2); no `descriptionKey`, no zoom |
| `src/pages/ProfilePage.tsx` | Mount `BadgeHistorySection` below live vest; godlike consolidate panel |
| `src/i18n/ProfilePage_*.json` | br, en, es, de — section title, year heading, confirm modal, force checkbox, result summary |
| `public/Design System.html` | Previously Achieved + godlike consolidate anatomy |

#### Tests & docs

| File | Action |
|------|--------|
| `src/__tests__/time.test.ts` (or new) | `isFestivalEnded()` edge cases |
| `src/__tests__/currentFestivalYear.test.ts` | Registry max-year derivation |
| `src/__tests__/badgeHistoryRepository.test.ts` | IDB round-trip + sync replace |
| `docs/ai-wiki/badges.md` | Consolidation, archive UI, asset immutability, operator window |
| `docs/ai-wiki/festival-reset.md` | Explicit: `user_badge_history` **never** wiped by `festival:reset` |
| `docs/ai-wiki/supabase-schema.md` | New table DDL summary |

**Design reference:** `_temp/badge-history-proposals/index.html` (U2 + Admin scenarios)

---

### Acceptance criteria

**Schema & consolidation**
- [ ] Migration applies cleanly on live Supabase; RLS policies verified
- [ ] Consolidation idempotent — re-run for same year adds no duplicate rows
- [ ] Non-godlike callers receive 403; `force: true` honored only for godlike
- [ ] Test vira-latas (`is_test_user = true`) never processed
- [ ] Only badges with `BadgeConfig.year === requested year` upserted; evergreen badges excluded
- [ ] Frozen rows store `image_path` and `label_key` from registry at consolidate time

**Live vest**
- [ ] Vest evaluates/displays only evergreen + `year === getCurrentFestivalYear()` badges
- [ ] After consolidation + reset, year-badges visible **only** in Previously Achieved (not vest)

**Previously Achieved (U2 + M2)**
- [ ] Section hidden when IDB history empty
- [ ] Badges grouped by `festival_year` descending; images resolve from frozen `image_path`
- [ ] Tap opens shared overlay modal — label + year chip; no description; no fullscreen zoom
- [ ] Works offline after first profile sync (O1)

**Godlike operator UI**
- [ ] Consolidate button disabled until `isFestivalEnded()` **unless** force checkbox checked
- [ ] Time override past last band end also satisfies gate (B3)
- [ ] Confirm modal + inline result summary (`processedUsers`, `savedBadges`, `errors`)
- [ ] Year selector defaults to `getCurrentFestivalYear()`

**Quality**
- [ ] `rtk npm run build` green
- [ ] `rtk npm test` green
- [ ] Wiki + Design System updated per CLAUDE.md

---

### Operator checklist (post-Wacken 2026)

1. Wait until last non-ceremony band ends (`isFestivalEnded()` true).
2. Godlike: Profile → **Consolidar badges 2026** (re-run safe if late assigns).
3. Verify Previously Achieved on a sample vira-lata profile.
4. **Then** run `npm run festival:reset` (2027 prep) — picks/persist metadata cleared; `user_badge_history` intact.
5. Registry rollover: bump `year: 2026 → 2027`; new PNGs per P1 naming; do **not** overwrite frozen paths.

---

### Architectural notes

- **Offline-first preserved:** UI reads badge history from IndexedDB; Supabase is sync target (same pattern as picks).
- **Registry copies in Edge Function** stay self-contained (Deno boundary); update both src and function copies before each consolidate.
- **`festival:reset` strip list unchanged** — archive lives in `user_badge_history`, not `achieved_badge_slugs`.
- **`isFestivalEnded()`** shared utility — `/wrap` (Idea 7) reuses later; no wrap UI in this phase.
- **Transition overlap (D1)** intentional until reset; no cross-store dedup.

## Phase 30 — TBD

**Status:** 📋 Not started

**Goal:** TBD — see `FUTURE_IDEAS.md` (Idea 7 `/wrap`, test coverage ideas, minimap, etc.).

**Deliverables:** TBD

**Acceptance criteria:** TBD

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update the status line above to the next phase number.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
