# My Wacken Inline Attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase 33 — rename Lineup / My Wacken nav; keep ended picks on their festival day with Attended/Missed chips; one-time coach banner; no sync/schema changes.

**Architecture:** Presentation-only refactor on `MyWackenPage` (renamed from `MyPicksPage`). Pure grouping helper splits each day's picks into upcoming vs ended (A2 sort). `BandCard` gains optional `attendanceChip`. Page files renamed; routes and i18n namespaces unchanged.

**Tech stack:** React 18, TypeScript, Vitest, existing hooks/repos, CSS modules.

**Spec source:** `docs/superpowers/specs/2026-05-28-my-wacken-inline-attendance-design.md` (includes **Grill amendments 2026-05-28**)

**Wireframe:** `docs/wireframes/my-programacao-direction-a.html`

**Phase:** 33 — sub-phases 33.0–33.3

---

## Locked decisions (do not re-open)

Includes original spec locks + grill session (2026-05-28). Full rationale → spec **Grill amendments** table.

| Decision | Locked choice |
|----------|---------------|
| Nav: Schedule tab | **Lineup** (BR: **Line-up**) |
| Nav + page: Picks tab | **My Wacken** |
| File rename | `LineupPage.tsx`, `MyWackenPage.tsx` only |
| Routes | `/schedule`, `/my-picks` unchanged |
| i18n namespaces | `SchedulePage`, `MyPicksPage` filenames unchanged |
| CSS module | `SchedulePage.module.css` shared name unchanged |
| Day sort | A2 — upcoming → divider → ended |
| Divider | **already played today** when ≥1 ended **and** ≥1 upcoming in same day |
| Chips | **Attended** / Missed on ended only; no timing chips |
| Ended row conflicts | **None** — no stripe/highlight on ended rows |
| Header `{days}` | All festival days with ≥1 pick |
| Header conflicts/overlaps | **Upcoming picks only** |
| Day header count | Total picks that day (upcoming + ended) |
| `{n} left today` | Show when `isFestivalActive && n >= 1`; hide at 0 |
| Day collapse (festival) | Past ended-only days collapsed; today expanded; no `localStorage` |
| Day collapse (post-festival) | All days expanded |
| Empty state | User-facing **Line-up** copy |
| Alert | Coach banner only, dismiss once per device |
| Attendance | Opt-out unchanged |

---

## Prerequisites (read before Task 1)

1. `docs/superpowers/specs/2026-05-28-my-wacken-inline-attendance-design.md`
2. `docs/wireframes/my-programacao-direction-a.html`
3. `src/pages/MyPicksPage.tsx` — current footer-bucket logic to remove
4. `docs/ai-wiki/phases-history.md` — Phase 11.F (what we reverse in UI)
5. `CLAUDE.md` — offline-first rules (no IDB inversions)

**Verification gates (every sub-phase):** `rtk npm run build` · `rtk npm test`

---

## File map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/pages/SchedulePage.tsx` | Rename → `LineupPage.tsx` | Full lineup; default export name `LineupPage` |
| `src/pages/MyPicksPage.tsx` | Rename → `MyWackenPage.tsx` | User picks timeline; grouping + coach banner |
| `src/App.tsx` | Modify | Import renamed pages; routes unchanged |
| `src/services/myWackenGrouping.ts` | **Create** | Pure day/upcoming/ended grouping |
| `src/components/BandCard.tsx` | Modify | `attendanceChip` prop on timeline variant |
| `src/components/BandCard.module.css` | Modify | Chip styles (teal/amber mono pills) |
| `src/components/MyWackenCoachBanner.tsx` | **Create** (optional) | Dismiss-once banner; or inline in page |
| `src/i18n/BottomNav_*.json` | Modify ×4 | `lineup`, `myWacken` keys (or repurpose schedule/picks keys) |
| `src/i18n/MyPicksPage_*.json` | Modify ×4 | title, chips, divider, coach, headerLeftToday; remove sectionSaw/sectionDidntSee |
| `src/i18n/SchedulePage_*.json` | Modify ×4 | `title` → Lineup if page header uses this namespace |
| `src/pages/SchedulePage.module.css` | Modify | Optional: `.dayDivider` label; deprecate `.dayHeaderSaw` / `.dayHeaderDidntSee` docs |
| `src/__tests__/myWackenGrouping.test.ts` | **Create** | Grouping + chip derivation |
| `public/vira-lata-ds.html` | Modify | My Wacken / attendance chips / remove Saw footer |
| `docs/ai-wiki/routes.md` | Modify | Component filenames vs paths |
| `docs/ai-wiki/architecture.md` | Modify | `/my-picks` description |
| `docs/ai-wiki/changelog.md` | Modify | Dated entry on 33.3 complete |
| `PHASES.md` | Modify | Active → complete handoff when done |

**Do not rename:** `SchedulePage.module.css`, i18n namespace strings in `useI18n()`, URL paths, IDB stores.

---

## Sub-phase 33.0 — Tab & page rename

### Task 1: Rename page files

- [ ] Git mv `src/pages/SchedulePage.tsx` → `src/pages/LineupPage.tsx`
- [ ] Git mv `src/pages/MyPicksPage.tsx` → `src/pages/MyWackenPage.tsx`
- [ ] Update default export function names to `LineupPage` / `MyWackenPage`
- [ ] Update `src/App.tsx` imports and JSX component tags
- [ ] Grep repo for `SchedulePage.tsx` / `MyPicksPage.tsx` import paths; fix any test or doc references that break build

**Acceptance:** `rtk npm run build` passes; `/schedule` and `/my-picks` still render.

---

### Task 2: Bottom nav + page title i18n

- [ ] Update `BottomNav_*.json` (4 files): schedule key → **Lineup** labels; picks key → **My Wacken** labels (localized)
- [ ] Update `BottomNav.tsx` only if key names change (prefer reusing `schedule`/`picks` keys with new string values to avoid TS churn)
- [ ] Update `SchedulePage_*.json` `title` → Lineup (4 locales; BR **Line-up**)
- [ ] Update `MyPicksPage_*.json` `title` → My Wacken (4 locales)
- [ ] Update `MyPicksPage` empty state — user-facing **Line-up** copy (namespace unchanged)

**Acceptance:** Nav shows Lineup + My Wacken in EN; BR uses *Line-up* / *Meu Wacken*.

---

### Task 3: Wiki stub update (33.0)

- [ ] `docs/ai-wiki/routes.md` — note component files `LineupPage.tsx`, `MyWackenPage.tsx`; URLs unchanged

**Gate:** `rtk npm run build` · `rtk npm test`

---

## Sub-phase 33.1 — Inline day grouping

### Task 4: Pure grouping service

- [ ] Create `src/services/myWackenGrouping.ts` with types:
  - `MyWackenDayGroup { dayKey, upcoming: Band[], ended: Band[], showDivider: boolean }`
- [ ] Implement `groupMyWackenByDay(bands, pickedIds, now)`:
  - Filter to picked bands only
  - Group by `bandDay(band)`
  - Per day: split upcoming/ended by `end_time` vs `now`
  - Sort each list by `start_time` ASC
  - `showDivider = ended.length > 0 && upcoming.length > 0`
  - Sort days by day key ASC
- [ ] Create `src/__tests__/myWackenGrouping.test.ts`:
  - Mixed day → upcoming before ended
  - Ended-only day → no divider
  - Upcoming-only day → no divider
  - Empty picks → empty array

**Acceptance:** Tests green.

---

### Task 5: Wire MyWackenPage to grouping

- [ ] Replace `upcomingBands` / `sawBands` / `didntSeeBands` / old `grouped` memos with `groupMyWackenByDay`
- [ ] Remove bottom sections that render `sectionSaw` / `sectionDidntSee`
- [ ] Per day render: upcoming `BandCard`s → divider (if `showDivider`) → ended `BandCard`s (no `conflict` prop on ended rows)
- [ ] Add i18n key `dividerAlreadyPlayedToday` (4 locales)
- [ ] Fix `headerBandsDays` `{days}` to count all festival days with picks (not upcoming-only)
- [ ] Restrict `totalConflicts` / `totalOverlaps` memos to **upcoming** picks only
- [ ] Add header stat `headerLeftToday` — upcoming picks on today's festival day; render only when `isFestivalActive && n >= 1`
- [ ] Day header `dayPickCount` = upcoming + ended for that day
- [ ] Initial `collapsedDays`: mid-festival → collapse past ended-only days, keep today expanded; post-festival → all expanded; re-derive on mount (no `localStorage`)
- [ ] Keep conflict banner, playlist button, collapsible day headers as today

**Acceptance:** Manual — ended pick remains under its day; no Saw footer; past days collapsed mid-festival; all expanded post-festival.

**Gate:** `rtk npm run build` · `rtk npm test`

---

## Sub-phase 33.2 — Ended card layout (chips)

### Task 6: BandCard attendance chip

- [ ] Add optional prop `attendanceChip?: 'attended' | 'missed'` to `BandCard`
- [ ] Timeline variant only: render chip in card body column (wireframe: right side before pick column)
- [ ] Styles in `BandCard.module.css`:
  - Attended — teal border/bg (`--signal-ok`)
  - Missed — amber (`--signal-warn`)
  - Mono 8–9px uppercase
- [ ] Ended rows: pass chip from `missedBandIds`; apply existing ended dimming (`isBandEnded` + optional class); **do not pass `conflict` prop**
- [ ] Do **not** add In X min / Now chips
- [ ] i18n chip labels in `MyPicksPage_*.json`: `chipAttended`, `chipMissed`

**Acceptance:** Upcoming rows have no chip; ended show Attended or Missed.

---

### Task 7: Design System

- [ ] `public/vira-lata-ds.html` — document attendance chips on timeline variant; update My Wacken page description; mark Saw/Didn't See footer sections as removed

**Gate:** `rtk npm run build` · `rtk npm test`

---

## Sub-phase 33.3 — First-ended coach banner

### Task 8: Coach banner component

- [x] Add `MyWackenCoachBanner` (or inline block in `MyWackenPage`)
- [x] i18n keys: `coachBannerTitle`, `coachBannerBody` (4 locales) — match spec copy
- [x] Visibility: at least one ended pick in `myBands` AND not dismissed in `localStorage`
- [x] Dismiss × sets flag; banner never returns on that device
- [x] Visual: teal tint per wireframe Scenario 02 (not red conflict styling)
- [x] Placement: after header/conflict banner, before day sections

**Acceptance:** First ended pick shows banner; dismiss hides permanently; refresh respects flag.

---

### Task 9: Phase documentation

- [x] `docs/ai-wiki/changelog.md` — dated Phase 33 entry
- [x] `docs/ai-wiki/architecture.md` — `/my-picks` bullet updated
- [x] `PHASES.md` — mark complete / hand off to "no active phased work"
- [x] `docs/ai-wiki/phases-history.md` — full Phase 33 entry (on phase close, not mid-work)

**Final gate:** `rtk npm run build` · `rtk npm test`

---

## Manual test checklist

- [ ] Bottom nav: **Lineup** + **My Wacken** labels (EN); BR **Line-up** / **Meu Wacken**
- [ ] Pick bands on Lineup; open My Wacken — all under correct days
- [ ] Time-travel or pick past band — band stays on day with **Attended** chip
- [ ] Open modal → **I didn't see this band** → chip **Missed**, same row
- [ ] No **Saw (N)** / **Didn't See (N)** sections at page bottom
- [ ] Divider **already played today** appears when day has both upcoming and ended
- [ ] Coach banner on first ended pick; dismiss works (per device)
- [ ] Header shows **N left today** during festival when N ≥ 1; hidden when N = 0
- [ ] Header `{days}` includes past days with ended-only picks
- [ ] Day header count = total picks that day
- [ ] Mid-festival: past ended-only days collapsed; today expanded
- [ ] Post-festival: all day sections expanded on load
- [ ] No conflict stripe on ended rows; header conflict/overlap counts ignore ended picks
- [ ] Empty state references **Line-up**
- [ ] Offline: page still reads IDB; no new network dependency
- [ ] Playlist button + conflict banner still work

---

## Spec coverage self-review

| Spec requirement | Plan task |
|------------------|-----------|
| Lineup / My Wacken rename | 33.0 Tasks 1–2 |
| File rename B | Task 1 |
| Routes unchanged | Task 1 |
| A2 grouping | Tasks 4–5 |
| Divider | Task 5 |
| Attended/Missed chips | Task 6 |
| No timing chips | Task 6 (explicit) |
| Coach banner | Task 8 |
| headerLeftToday | Task 5 |
| Header days / conflicts / collapse | Task 5 (grill amendments) |
| Wireframe layout | Tasks 5–6 |
| Design System | Task 7 |
| Tests | Task 4 |
| Wiki/changelog | Tasks 3, 9 |

---

## Execution options (when ready to implement)

**1. Subagent-driven** — one task per agent, review between tasks  

**2. Inline** — execute 33.0 → 33.3 sequentially in one session with checkpoints after each sub-phase
