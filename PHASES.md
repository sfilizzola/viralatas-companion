# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Status: Phase 16 — Schedule Sort Order Filter

**Spec:** `docs/superpowers/specs/2026-05-14-schedule-sort-order-design.md`

### Goal

Add an icon-only sort button to the right of the day-tabs row on `/schedule`. Tapping it opens a compact 3-icon popover letting the user sort bands by:

- **Sun icon** — Earliest first (time ascending, default)
- **Moon icon** — Latest first (time descending)
- **A↓Z icon** — Alphabetical

The active option is always highlighted in the popover. A non-default selection shows an accent dot on the button. Preference persists via `localStorage`.

### Deliverables

- `sortOrder` field added to `BandFilterValue` and `EMPTY_FILTERS`
- Sort logic moved into `filterBands()` in `services/bandFilter.ts` (removes hardcoded sort-on-load from `SchedulePage.tsx`)
- 3 new icons (`sort-time-asc`, `sort-time-desc`, `sort-alpha`) in `Icon.tsx`
- Sort button + popover UI in `BandFilters.tsx` / `BandFilters.module.css`
- Persistence in `scheduleFilterStorage.ts`
- i18n keys (aria-labels only, no visible text) in all 4 language files

### Acceptance criteria

- [ ] Default sort is earliest-first; matches current page behavior on first load
- [ ] Popover always opens with one option highlighted (including default)
- [ ] Selecting an option re-sorts immediately and closes the popover
- [ ] Preference survives page reload
- [ ] "Limpar" (clear filters) does not reset sort order
- [ ] Fully offline — sort operates on the in-memory band list

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update the status line above to the next phase number.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
