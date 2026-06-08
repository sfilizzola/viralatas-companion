# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 41 — Map Preview Awareness (B3 + S4)

**Goal:** Make the Stages button and StageScheduleSheet visibly react to the timeline scrubber's preview time, closing the feedback loop so users know the sheet is showing a future lineup.

**Design variant:** B3 (stacked time readout button) + S4 (left-border accent header). Prototype at `docs/superpowers/prototypes/map-stages-preview-awareness/variants.html`.

**Implementation plan:** `docs/superpowers/plans/2026-06-08-map-stages-preview-awareness.md`

### Deliverables

- [ ] `src/i18n/MapPage_{en,br,de,es}.json` — `stagesButtonPreview` aria-label key
- [ ] `src/i18n/StageScheduleSheet_{en,br,de,es}.json` — `sheetSubtitlePreview` key
- [ ] `src/components/StageScheduleSheet.tsx` — `previewTime?: Date | null` prop; conditional `.headerPreview` + `.subtitlePreview` classes
- [ ] `src/components/StageScheduleSheet.module.css` — `.headerPreview` (amber left border + tint), `.subtitlePreview` (amber mono uppercase)
- [ ] `src/pages/MapPage.tsx` — B3 stacked button in preview mode; pass `previewTime` to sheet
- [ ] `src/pages/MapPage.module.css` — `.stagesBtnPreview`, `.stagesBtnPreviewTime`, `.stagesBtnPreviewLabel`

### Acceptance criteria

- **Live mode:** button shows grid icon + "Stages" unchanged; sheet header has no border, subtitle reads "Now & up next"
- **Preview mode:** button shows `HH:MM` (amber, larger) stacked over "STAGES" (amber, faded); sheet header gains 3px amber left border + faint tint, subtitle shows "⏱ Preview · HH:MM" in amber mono
- **Back to Now:** both revert instantly (live React re-render via prop)
- All 4 locales correct
- Build and tests green

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update this file so the active section points at the next phase (or "no active phased work" when the backlog is empty).
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
