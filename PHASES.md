# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 17 — My Picks: Saw / Didn't See Sections

### Goal

After a band's `end_time` passes, its card leaves the day sections in `/my-picks` and drops into one of two new collapsible sections at the bottom of the page:

- **"Saw" section** (green accent) — default destination for every ended band the user has not explicitly marked as missed
- **"Didn't See" section** (amber accent) — bands moved here when the user opens the detail and taps "Não vi essa banda"

Moving between sections is driven entirely by the existing `user_missed_bands` record (no schema changes needed). Both sections use the same collapsible header UI and behaviour as the day sections. The pick star is hidden on cards in both ended sections, and the pick/unpick button is hidden in the detail modal when a band has ended. The loophole (unpicking from `/schedule` while a band is over) is intentional.

### Deliverables

- `hidePick?: boolean` prop added to `BandCard` — suppresses the star button
- `hidePick?: boolean` prop added to `BandDetailModal` — suppresses the pick/unpick action button (saw/missed toggle remains)
- `MyPicksPage` grouping refactored: `myBands` split into `upcomingBands` and `endedBands`; `endedBands` further split into `sawBands` / `didntSeeBands` from `allMissed`
- Two new section renders at the bottom of the list, each collapsible; sections hidden when empty
- `.dayHeaderSaw` and `.dayHeaderDidntSee` CSS modifier classes in `SchedulePage.module.css`
- i18n keys `sectionSaw` and `sectionDidntSee` (with pick count) in all 4 locale files

### Acceptance criteria

- [ ] Ended bands no longer appear in day sections
- [ ] Ended bands with no `user_missed_bands` record appear in the green "Saw" section
- [ ] Ended bands with a `user_missed_bands` record appear in the amber "Didn't See" section
- [ ] Both sections are collapsible with the same chevron behaviour as day sections
- [ ] Sections are hidden when they have no cards
- [ ] Star pick button is absent on all cards in both ended sections
- [ ] Pick/unpick button is absent in the detail modal when `isBandEnded`
- [ ] Saw/missed toggle in the detail modal still works and moves the card between sections in real time
- [ ] Fully offline — state comes from IndexedDB, no extra network calls

---

## Phase 18 — Badge Preview Tool in Godlike Menu

**Spec:** `docs/superpowers/specs/2026-05-14-badge-preview-godlike-design.md`

### Goal

Add a "Test Badges" section to the GODLIKE POWERS panel that renders a scrollable mini-grid of every badge in the registry. Clicking any badge opens the same detail modal a regular user sees (large image, year chip, translated title and description). Nothing is persisted — no DB writes, no IndexedDB writes, no `user_metadata` changes. Pure local ephemeral state, visible only to the godlike user.

### Deliverables

- New `src/components/profile/TestBadgeSection.tsx` — collapsible section with badge grid + local `selectedBadge` state + detail modal
- `GodlikeAdminPanel.tsx` — mount `<TestBadgeSection t={t} />` after the Live Band Test section, before the registered users list
- CSS grid styles in `GodlikeAdminPanel.module.css` (`.testBadgeGrid`, `.testBadgeCell`, `.testBadgeCaption`)
- Reuses: `BADGES` registry, `BadgeConfig` type, existing `Modal` from `src/ui`
- No new i18n keys, no new tests, no schema changes

### Acceptance criteria

- [ ] "Test Badges" section appears in the GODLIKE POWERS panel (godlike users only)
- [ ] All badges from the registry are visible as image thumbnails in a scrollable grid
- [ ] Clicking a thumbnail opens the detail modal with the badge's image, year chip (if present), translated title, and translated description
- [ ] Closing the modal returns to the grid with no badge selected
- [ ] No badge is added to the godlike user's profile or `user_metadata`
- [ ] No network calls are made when opening or closing the preview

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
