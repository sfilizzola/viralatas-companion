# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 19 — Closing-Ceremony Slot

**Spec:** `docs/superpowers/specs/2026-05-14-closing-ceremony-slot-design.md`

### Goal

Model the Wacken closing ceremony as a first-class pickable timetable entry — visible across `/schedule`, `/now`, and `/my-picks` with a distinctive gold border and "Closing Ceremony" label, excluded from `/popular`, excluded from all music-badge counts, and generating no conflict alerts when overlapping a band pick.

### Deliverables

- `category text not null default 'band'` column + check constraint on `bands` (migration already at `supabase/migrations/20260514000000_idea7_band_category.sql`)
- `category: 'band' | 'ceremony'` field added to `Band` in `src/types/index.ts` and to `BadgeBand` in `src/services/badges/types.ts`
- `buildBadgeContext` filters ceremony out of `pickedBands` / `seenBands` (one filter line in `src/services/badges/engine.ts`)
- `computeBandOverlaps` skips ceremony entries so no conflict chip appears (`src/hooks/useBandConflicts.ts`)
- `BandCard`: `.cardCeremony` CSS class (gold border), renders i18n `scheduleClosingCeremony` label instead of genre
- `/popular` page filters out `category === 'ceremony'` before rendering the ranked list
- `scheduleClosingCeremony` i18n key in all 4 locale files (`br`, `en`, `de`, `es`)
- One `"Wacken Farewell"` ceremony seed entry in `supabase/seed/bands.ts` (times TBD from Wacken's published schedule)
- Badge regression tests: picking a ceremony entry does not satisfy any music-badge condition

### Acceptance criteria

- [ ] Migration applies cleanly; all existing bands have `category = 'band'` post-migration
- [ ] Check constraint rejects values outside `('band', 'ceremony')`
- [ ] Ceremony card renders with gold border and "Closing Ceremony" label on `/schedule`, `/now`, and `/my-picks`
- [ ] Picking the ceremony writes to `user_picks` and shows the crew RSVP count, just like a band
- [ ] Ceremony does NOT appear in `/popular`
- [ ] No conflict chip appears when a ceremony pick overlaps a band pick
- [ ] Picking or seeing the ceremony does NOT satisfy any `bands_picked_*` or `bands_seen_*` badge condition
- [ ] Offline-first intact: ceremony syncs into IndexedDB exactly like a band
- [ ] Full `badges.test.ts` suite passes with no regressions

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update the status line above to the next phase number.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
