# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 38.A — Crew Picks Browser

**Status:** Ready to implement

**Goal:** Let any vira-lata browse another crew member's picked bands from the schedule page, with a comparison layer showing shared picks.

**Spec:** `docs/superpowers/specs/2026-06-05-crew-picks-browser-design.md`  
**Plan:** `docs/superpowers/plans/2026-06-05-crew-picks-browser.md`

### Subphases

---

#### 38.A.1 — Data layer: `BandFilterValue.userId` + `filterBands` extension

**Files:** `src/components/bandFilterValue.ts`, `src/services/scheduleFilterStorage.ts`, `src/services/bandFilter.ts`, `src/__tests__/bandFilter.test.ts`

- [ ] Add `userId: string | null` to `BandFilterValue` type and `EMPTY_FILTERS`
- [ ] `scheduleFilterStorage`: strip `userId` before `localStorage.setItem`; inject `userId: null` on load
- [ ] `filterBands()`: add optional 4th param `userPickIds?: Set<string>`; if present, keep only bands in that set
- [ ] TDD: 3 new test cases (filter by user, user + day combo, no picks → empty result)

**Acceptance:** `npm test` green; `userId` never written to localStorage.

---

#### 38.A.2 — "Vira-lata" drawer section in `BandFilters`

**Files:** `src/components/BandFilters.tsx`, `src/components/BandFilters.module.css`

- [ ] Add `crewWithPicks: CrewUser[]` prop
- [ ] `activeDrawerCount` and `clearAll` / `clearDrawer` account for `userId`
- [ ] New drawer section: horizontal-scroll avatar pill row, single-select, name trimmed to 15ch with ellipsis
- [ ] CSS: `.userPillRow`, `.userPill`, `.userPillName`, `.userPillActive`

**Acceptance:** Drawer shows vira-latas with picks; selecting one sets `value.userId`; deselecting clears it; global LIMPAR clears it.

---

#### 38.A.3 — Viewing banner in sticky filter bar

**Files:** `src/components/BandFilters.tsx`, `src/components/BandFilters.module.css`

- [ ] Banner renders between controls row and day-tab row when `value.userId != null`
- [ ] Text: "Vendo picks de NAME · N bandas" (no inline clear button)
- [ ] CSS: `.viewingBanner`, `.viewingBannerName`, `.viewingBannerCount`

**Acceptance:** Banner appears/disappears correctly; clears when global LIMPAR is tapped.

---

#### 38.A.4 — Shared-pick marker on `BandCard`

**Files:** `src/components/BandCard.tsx`, `src/components/BandCard.module.css`

- [ ] Add `sharedPick?: boolean` prop
- [ ] When true: teal border (`--color-success` tint) + teal "Você ✓" badge below the star
- [ ] CSS: `.cardSharedPick`, `.sharedPickBadge`

**Acceptance:** Badge and border appear only when both the current user and the viewed user picked the band.

---

#### 38.A.5 — `LineupPage` wiring

**Files:** `src/pages/LineupPage.tsx`

- [ ] Import `useBandAttendees`, `useCrewUsersCache`, current `useAuth` user id
- [ ] `useMemo`: derive `picksByUserId: Map<string, Set<string>>` from attendee map
- [ ] `useMemo`: derive `crewWithPicks: CrewUser[]` (exclude current user, exclude 0-pick members)
- [ ] Pass `crewWithPicks` to `<BandFilters>`
- [ ] Pass `picksByUserId.get(filters.userId)` as `userPickIds` to `filterBands`
- [ ] Derive `sharedPick` per band and pass to `DuckableBandCard`

**Acceptance:** Full feature works end-to-end; other filters still compose correctly on top of user filter.

---

#### 38.A.6 — i18n + Design System

**Files:** `src/i18n/{br,en,es,de}.json`, `public/vira-lata-ds.html`

- [ ] Add 4 keys to `SchedulePage` namespace in all 4 locales: `viraLata`, `viewingPicksOf`, `youAlsoPicked`, `noPicksForUser`
- [ ] DS: document User Pill, Viewing Banner, Shared Pick Badge with tokens and usage notes

**Acceptance:** No hardcoded strings; DS reflects locked design.

---

### Overall Acceptance Criteria

- [ ] Selecting a user in the drawer shows only their picked bands
- [ ] Viewing banner appears while filter is active; global LIMPAR clears it
- [ ] Other filters (day, stage, genre, upcoming) still narrow the result on top of the user filter
- [ ] `userId` is not persisted to localStorage — clears on page reload
- [ ] Shared bands show teal "Você ✓" badge + teal card border tint
- [ ] Crew members with 0 picks do not appear in the picker
- [ ] Current user does not appear in the picker
- [ ] Works fully offline (all data from IndexedDB)
- [ ] Build clean + all tests green

### Stretch — Phase 38.B (separate phase, not yet planned)

Tappable avatars everywhere (Popular attendee cluster, /now crew rows) → user peek bottom sheet → "Ver no lineup" CTA pre-filters the schedule.

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update this file so the active section points at the next phase (or “no active phased work” when the backlog is empty).
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
