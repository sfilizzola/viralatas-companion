# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Active development

### Phase 37: Upcoming Band Card

**What:** A dismissible card appears on `/now` 15 minutes before the next picked band starts, showing who's going and a quack strip.

**Design approved:** Horizontal Banner variant (V2)
- Full-width banner with gold accent left stripe + gradient bg
- Crew avatars as focal point (overlapped, front-center)
- "Upcoming" badge + band name + stage + time visible in collapsed state
- Card body clickable to expand → reveals full crew list below
- X button (top-right) dismisses in both states
- QuackStrip always attached below (34px, never in expanded content)

**Acceptance criteria:**

1. ✅ Card appears when: user NOT at a band + next picked band starts ≤15m away + card not dismissed for that band
2. ✅ Card replaces latest announcement banner position (mutually exclusive)
3. ✅ Collapsed view shows: "Upcoming" badge, band name, stage, time, crew avatars (overlapped), X button
4. ✅ Expanded view shows: collapsed header + full crew list below (names + avatars)
5. ✅ Tap card body (excluding X button) to toggle collapsed ↔ expanded
6. ✅ X button (both states) dismisses card for that band for the session
7. ✅ Card auto-disappears when band starts (myPlan updates to 'current')
8. ✅ Crew list shows everyone who picked that band (from crewPlans memo)
9. ✅ QuackStrip is always visible below card (both states), no timer on card itself
10. ✅ All interactions work offline (no new network calls)
11. ✅ Tests pass; build succeeds

**Deliverables:**

- New component: `src/components/now/UpcomingBandCard.tsx`
- Update `useNowData.ts`: calculate `nextBand` and `timeDelta`
- Update `RightNowPage.tsx`: render card + handle dismissal state + expanded toggle
- Styling: match V2 horizontal banner design (gold left stripe, crew avatar overlaps, gradient bg)
- i18n strings: "Upcoming" badge label, card aria-labels, crew member display
- Unit tests for: card visibility logic, expand/collapse toggle, dismiss button, offline state

**Implementation notes:**

- Dismissal tracking: component state (`Set<band_id>`), session-only (resets on refresh)
- Data source: existing `crewPlans` memo — no new DB queries
- Expanded state: local React state (no persistence needed)
- Quack strip integration: reuse existing `QuackStrip` component, always visible below
- Edge case: band exactly at 15m threshold → card shows (inclusive)
- Responsive: full-width on desktop/mobile, crew avatars remain prominent

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update this file so the active section points at the next phase (or “no active phased work” when the backlog is empty).
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
