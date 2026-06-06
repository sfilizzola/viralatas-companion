# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 38.B — Avatar Peek Sheet

**Status:** Planned (not yet started)

**Goal:** Tappable avatars everywhere (Popular attendee cluster, `/now` crew rows) → user peek bottom sheet → "Ver no lineup" CTA pre-filters the schedule to that crew member's picks.

---

## Phase 39 — Stage Schedule Bottom Sheet

**Status:** Planned (not yet started)

**Goal:** A bottom sheet component showing all 8 Wacken stages at a glance — current or next band per stage — so a vira-lata can decide in seconds where to go next.

**Design:** Locked in `docs/superpowers/prototypes/stage-schedule-bottom-sheet/stage-grid-final.html`.
- **Layout:** 2×4 Stage Grid (one tile per stage)
- **Live indicator:** Corner ribbon (Variant D) — diagonal "LIVE" flag in stage color, top-right corner
- **LIVE tiles:** ribbon + pulsing stage-colored dot + full-opacity top bar + slightly elevated border
- **NEXT tiles:** no ribbon, "Next ·" label + time, `opacity: 0.72`, dimmed top bar
- **Tap:** opens `BandDetailModal` for that band

**Data:** `buildStageScheduleSnapshot(bands, now)` from `src/services/stageSchedule.ts` — already exists, no new service logic needed. Map `status === 'current'` → LIVE treatment, `status === 'next'` → NEXT treatment.

**Trigger placement:** TBD — candidate: floating button or entry point on `/now`.

**Deliverables:**
- [ ] `src/components/StageScheduleSheet.tsx` — bottom sheet + stage grid + ribbon tile
- [ ] Trigger wired from at least one entry point in the app
- [ ] Accessible (keyboard/screen reader: sheet role, tile aria-labels)
- [ ] Design System updated (`public/vira-lata-ds.html`)
- [ ] Wiki updated

---

## Phase 40 — StageScheduleSheet Entry Points

**Status:** Complete (2026-06-06)

**Goal:** Wire the existing `StageScheduleSheet` component into `/now` and `/map` via compact header buttons (Option A on both). Tapping a stage tile navigates to `/schedule`.

**Deliverables:**
- [x] `src/i18n/RightNowPage_{en,br,de,es}.json` — `stagesButton` key added
- [x] `src/i18n/MapPage_{en,br,de,es}.json` — `stagesButton` key added
- [x] `src/pages/RightNowPage.tsx` — state + header button + sheet render
- [x] `src/pages/RightNowPage.module.css` — `.stagesBtn`
- [x] `src/pages/MapPage.tsx` — state + `useBands()` + header button + sheet render with `effectiveTime`
- [x] `src/pages/MapPage.module.css` — `.stagesBtn`, `.stageDots`, `.stageDot`
- [x] Build passes, tests green (742)
- [x] Wiki + changelog updated

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update this file so the active section points at the next phase (or “no active phased work” when the backlog is empty).
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
