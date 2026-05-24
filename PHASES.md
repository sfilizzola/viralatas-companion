# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 26 — Complexity Reduction & Simplification

**Status:** 🔜 In progress (26.A–26.L complete; 26.M.0 ✅)

**Goal:** Reduce cognitive load and file size across the React app without changing user-visible behavior. Extract repeated patterns into hooks and services, split god files into focused modules, and strengthen tests so each sub-stage is safely reviewable. Preserve offline-first invariants (`UI → IndexedDB ↕ Supabase`).

**Acceptance criteria (whole phase):**
- [ ] `rtk npm run build` green
- [ ] `rtk npm test` — all tests pass; no reduction in meaningful coverage
- [ ] Manual smoke: pick/unpick offline + reconnect, `/now` live view, announcements post/delete, profile admin (godlike), duck quack
- [ ] No new direct Supabase reads from presentation components (except auth pages and explicitly documented admin boundaries)
- [ ] Wiki updated (`architecture.md`, relevant flows, `changelog.md`) after each closed sub-stage

**Architectural guardrails (every sub-stage):**
- IndexedDB remains primary for UI reads; writes stay optimistic via repositories
- Do not introduce Redux/Zustand (ADR: custom hooks + window events)
- Repositories mutate IDB and emit events; hooks subscribe and expose state/actions
- Satellite integrations (Setlist, MoshSplit) unchanged
- User-facing copy uses **vira-latas**, not crew

---

### Stage 26.A — Refactor safety net (tests) ✅

**Scope:** `src/__tests__/db.test.ts` (new), `src/__tests__/login.test.tsx`, `registration.test.tsx`, `auth-integration.test.ts` (replace stubs), optionally `vitest.config.ts` coverage thresholds.

**Gets simpler:** Confidence to refactor `db.ts` and pages; stub tests stop giving false security.

**Risk:** Low | **Depth:** Shallow (test-only) | **Depends on:** —

**Verification:** `rtk npm test` — 389 tests green; auth tests import real modules; `fake-indexeddb` dev-only; `db.ts` per-file coverage thresholds in `vitest.config.ts`.

**Done (2026-05-24):** 17 db tests, 9 login, 8 registration, 9 auth-integration; `resetDbConnectionForTests()` export.

---

### Stage 26.B — Shared festival constants ✅

**Scope:** `src/services/time.ts` (or new `festivalDates.ts`); replace literals in `MyPicksPage.tsx`, `AnnouncementsPage.tsx`, `ArrivalMap.tsx`, `ConflictSection.tsx`, `repositories/presence.ts`.

**Gets simpler:** One source of truth for Wacken 2026 Day 1 start and "festival active" checks; fixes `+01:00` vs `Z` inconsistency.

**Risk:** Low | **Depth:** Shallow | **Depends on:** —

**Verification:** `rtk npm test` (`time.test.ts`, `presenceRepository.test.ts`, `bandTime.test.ts`); manual `/announcements` arrival map visibility toggle.

**Done (2026-05-24):** `FESTIVAL_DAY_1_START`, `isFestivalActive()`, `getFestivalDay()`, `wackenLocalMidnight()` in `time.ts`; five consumers migrated; 4 new time tests.

---

### Stage 26.C — `useBands()` catalog hook ✅

**Scope:** New `src/hooks/useBands.ts`; migrate `SchedulePage`, `MyPicksPage`, `PopularPage`, `useNowData` (and optionally `BadgesDisplay`, admin panels).

**Gets simpler:** Remove 4× copy-paste `useState` + `loadBands()` + loading flags; single IDB read + `bands-changed` event if needed.

**Risk:** Low | **Depth:** Shallow extract | **Depends on:** 26.A recommended

**Verification:** `rtk npm test`; browse `/schedule`, `/my-picks`, `/popular`, `/now` with cached bands offline.

**Done (2026-05-24):** `useBands()` hook with `BANDS_CHANGED_EVENT`; `saveBands` emits event; four primary consumers migrated; 2 hook tests + 1 db event test.

---

### Stage 26.E — `usePickActions()` hook ✅

**Scope:** New `src/hooks/usePickActions.ts` wrapping `picksRepository.toggle` + `useMyPicks` refresh; migrate `SchedulePage`, `MyPicksPage`, `PopularPage`, `ConflictSection`, `useNowData` skip/undo handlers.

**Gets simpler:** Pages stop importing `picksRepository`; aligns with wiki "pages use hooks" pattern.

**Risk:** Low | **Depth:** Shallow | **Depends on:** 26.A

**Verification:** `rtk npm test` (`picksRepository.test.ts` unchanged); pick toggle online/offline on schedule and my-picks.

**Done (2026-05-24):** `usePickActions()` with `togglePick`, `pickBand`, `unpickBand`; five consumers migrated; 4 hook tests.

---

### Stage 26.D — `useMissedBands()` hook ✅

**Scope:** New `src/hooks/useMissedBands.ts`; dedupe logic from `MyPicksPage.tsx`, `PopularPage.tsx`; simplify `BadgesDisplay.tsx` missed slice.

**Gets simpler:** One place for `loadAll` + `sync` + `subscribeToRealtime` + `MISSED_CHANGED_EVENT`; pages consume `{ allMissed, missedBandIds, mark, unmark }`.

**Risk:** Low–medium | **Depth:** Moderate extract | **Depends on:** 26.A

**Verification:** `rtk npm test` (`missedRepository.test.ts`, `missed.test.ts`, `useMissedBands.test.ts`); mark/unmark on ended band in My Picks and Popular modals.

**Done (2026-05-24):** `useMissedBands()` with `{ allMissed, missedBandIds, missedCountsByBand, mark, unmark, toggleMissed, refresh }`; three consumers migrated; 5 hook tests.

---

### Stage 26.F — `useBandDetailModal()` shared state ✅

**Scope:** New hook or small component `BandDetailHost.tsx`; consolidate modal state from `MyPicksPage.tsx` and `PopularPage.tsx` (`activeBand`, attendees, missed flags, ended state).

**Gets simpler:** ~80 lines removed across two pages; one modal contract for pick + missed toggles.

**Risk:** Low–medium | **Depth:** Moderate extract | **Depends on:** 26.D, 26.E

**Verification:** `rtk npm test`; open band modal on both pages; verify missed toggle and pick toggle.

**Done (2026-05-24):** `useBandDetailModal()` + `BandDetailModalHost`; MyPicksPage and PopularPage migrated; 6 hook tests.

---

### Stage 26.G — App sync orchestration extract ✅

**Scope:** Move `CacheVersionCheck`, `BandSync`, `PickSync`, `AnnouncementSync`, `DuckSync`, `PushSetup`, `DuckNotificationsListener` from `App.tsx` to `src/components/sync/` (or `src/lib/syncOrchestration.tsx`).

**Gets simpler:** `App.tsx` becomes routes + providers only (~80 lines); sync lifecycle easier to audit.

**Risk:** Low | **Depth:** Shallow | **Depends on:** —

**Verification:** `rtk npm test`; login → verify band sync; go offline → pick → online → `SyncToast` fires.

**Done (2026-05-24):** `src/components/sync/` — one file per sync component + `SyncOrchestration` composite; `App.tsx` 238 → 84 lines; behavior unchanged.

---

### Stage 26.H — Realtime → IDB subscription helper ✅

**Scope:** New `src/lib/realtimeSync.ts` (or per-table helpers in repositories): `subscribePostgresChanges(table, handler)`; refactor `usePickCounts.ts`, `useNowData.ts` (3 channels), `AnnouncementsPage.tsx`, `useDuckNotifications.ts`, `missedRepository.subscribeToRealtime`.

**Gets simpler:** One unsubscribe/cleanup pattern; fewer copy-pasted `supabase.channel()` blocks.

**Risk:** Medium | **Depth:** Moderate | **Depends on:** 26.A, 26.G

**Verification:** `rtk npm test`; two-browser pick count update ≤3s; `/now` presence update; announcement insert.

**Done (2026-05-24):** `subscribePostgresChanges(channelName, subscriptions)` in `src/lib/realtimeSync.ts`; six call sites refactored; 4 unit tests; behavior unchanged (write IDB + emit events).

---

### Stage 26.I — Split `BadgesDisplay.tsx` ✅

**Scope:**
- Extract stack layout pure functions → `src/services/badges/stackLayout.ts`
- Extract badge context loading → `src/hooks/useBadgeContext.ts` (IDB + events + optional Supabase metadata sync)
- Keep `BadgesDisplay.tsx` as presentation only (~200 lines)

**Gets simpler:** Testable layout math; component stops mixing vest geometry with data fetching.

**Risk:** Medium | **Depth:** Moderate | **Depends on:** 26.A, 26.D (partial)

**Verification:** `rtk npm test` (`badges.test.ts`, `stackLayout.test.ts`, `useBadgeContext.test.ts`); profile + `/now` badge vest renders; earned badge animation unchanged.

**Done (2026-05-24):** `stackLayout.ts` (scatter poses + CSS vars); `useBadgeContext.ts` (IDB-first context + drift sync); `BadgesDisplay.tsx` 599 → 258 lines; 7 stackLayout + 3 useBadgeContext tests.

---

### Stage 26.J — Repository boundary cleanup (announcements vs admin) ✅

**Scope:**
- Move `fetchAllUsers`, `setUserRole`, `fetchBlockedPosters*`, `blockUser`, `unblockUser` from `announcementsRepository` → `usersRepository` (or new `adminRepository.ts`)
- Move `AnnouncementsPage` direct `supabase.from('users')` role map into repository
- Update `GodlikeAdminPanel`, `ManagerAdminPanel`, `ProfilePage` imports

**Gets simpler:** `announcementsRepository` = mural CRUD + sync only; admin concerns grouped by domain.

**Risk:** Medium | **Depth:** Moderate | **Depends on:** 26.A

**Verification:** `rtk npm test` (`announcementsRepository.test.ts` + update admin call sites); godlike role change + block user still works.

**Done (2026-05-24):** Admin user ops moved to `usersRepository`; `fetchUserRolesMap()` replaces direct Supabase in `AnnouncementsPage`; `announcementsRepository` retains mural CRUD + `fetchCurrentUserRole`/`fetchIsBlocked` (26.K hook scope); 10 new `usersRepository.test.ts` cases.

---

### Stage 26.K — `useAnnouncements()` + slim `AnnouncementsPage` ✅

**Scope:** New `src/hooks/useAnnouncements.ts` (cache read, Realtime, pagination, role/block state, post/delete/pin actions); reduce `AnnouncementsPage.tsx` to layout + form (~200 lines). Extract `applyPinSort`, `relativeTime` to `src/services/announcementsDisplay.ts`.

**Gets simpler:** Page readable at a glance; announcement flow testable via hook unit tests.

**Risk:** Medium | **Depth:** Moderate | **Depends on:** 26.H, 26.J

**Verification:** `rtk npm test` (`announcementsRepository.test.ts`, `useAnnouncements.test.ts`, `announcementsDisplay.test.ts`); post offline → reconnect; pin/unpin; load more.

**Done (2026-05-24):** `useAnnouncements()` hook; `announcementsDisplay.ts`; `AnnouncementsPage.tsx` 437 → 299 lines; 4 hook + 7 display tests.

---

### Stage 26.L — Decompose `GodlikeAdminPanel.tsx` ✅

**Scope:** Extract sections into existing pattern (`TimeTravelSection`, `TestBadgeSection`):
- `FeatureFlagsSection.tsx` (registration, duck, playlist_testing)
- `UserManagementSection.tsx` (roles, block list, assign badge modal trigger)
- `MetalPlaceAdminSection.tsx`
- `LiveBandTestAdminSection.tsx`
- `CacheResetSection.tsx`
- Parent panel = composition + shared loading (~150 lines)

**Gets simpler:** Admin features isolated; smaller diffs for future godlike tools.

**Risk:** Medium | **Depth:** Moderate–deep | **Depends on:** 26.J

**Verification:** Manual godlike smoke (all toggles); `rtk npm test`; no build regressions.

**Done (2026-05-24):** Five section components extracted; `GodlikeAdminPanel.tsx` 933 → 203 lines; Metal Place / Live Band Test conflict bridged via parent refs; test quack + test push remain in parent.

---

### Stage 26.M — Slim `useNowData.ts`

**Depends on:** 26.C, 26.E, 26.H, 26.A

**Target:** `useNowData.ts` ~120–150 lines orchestration; `RightNowPage.tsx` unchanged externally.

**Risk note:** High if done in one commit. Split into sub-stages below; one commit per sub-stage.

#### Stage 26.M.0 — Hook safety net (tests only)

**Scope:** `src/__tests__/useNowData.test.ts` — `handlePresenceChange` branches, camping auto-clear effect, skip/undo + timer, `duckBandId` gating, cache refresh on window events. Optionally characterization snapshots for `NowData` shape.

**Gets simpler:** Confidence to refactor hook wiring; `liveNowScenarios` covers pure pipeline only, not orchestration.

**Risk:** Low | **Depth:** Shallow (test-only) | **Depends on:** 26.A

**Verification:** `rtk npm test`; no production code changes.

**Done (2026-05-24):** `src/__tests__/useNowData.test.ts` — 12 tests (presence toggles, camping auto-clear, MP auto-checkout, skip/undo, duckBandId gating, cache refresh, characterization snapshot); no production code changes.

#### Stage 26.M.a — Extract config hooks

**Scope:** New `useMetalPlaceConfig()`, `useLiveBandTestConfig()` — verbatim extract from `useNowData` (IDB + sync + window event + realtime via `subscribePostgresChanges`).

**Gets simpler:** MP window and live test config isolated; easier to debug godlike overrides.

**Risk:** Low | **Depth:** Shallow extract | **Depends on:** 26.M.0 recommended

**Verification:** `rtk npm test`; manual MP window toggle + live band test banner.

#### Stage 26.M.b — Extract `usePresenceRealtime()`

**Scope:** Presence realtime channel + mount `syncCrewFromRemote()` — verbatim extract.

**Gets simpler:** Crew live updates localized.

**Risk:** Medium | **Depth:** Moderate extract | **Depends on:** 26.M.0 recommended, 26.H

**Verification:** `rtk npm test`; two-browser presence update ≤3s.

#### Stage 26.M.c — Extract cache + plan derivations

**Scope:** `refreshFromCache` + window event listeners → `useNowCache()` (or similar); plan memos → optional `useNowPlans()`. Preserve `undoTimerId` effect dependency behavior exactly.

**Gets simpler:** IDB/event wiring separated from live plan math.

**Risk:** Medium | **Depth:** Moderate extract | **Depends on:** 26.M.0, 26.M.a, 26.M.b

**Verification:** `rtk npm test` (`liveNowScenarios.test.ts`, `useNowData.test.ts`); skip/undo manual smoke.

#### Stage 26.M.d — Optional side-effect consolidation

**Scope:** Move camping auto-clear + `handlePresenceChange` orchestration into `presenceRepository` helpers (e.g. `applyPresenceToggle`). Only after M.0–M.c green.

**Gets simpler:** Side effects testable at repository layer; thinner hook.

**Risk:** Medium–High | **Depth:** Moderate | **Depends on:** 26.M.0–26.M.c

**Verification:** `rtk npm test`; full `/now` manual smoke (camping, Metal Place, skip/undo, duck).

**Recommended 26.M execution order:**

```
26.M.0 → 26.M.a → 26.M.b → 26.M.c → 26.M.d (optional)
```

---

### Stage 26.N — Optional: `db.ts` domain modules (defer if risky)

**Scope:** Split `src/lib/db.ts` into `db/picks.ts`, `db/presence.ts`, `db/announcements.ts`, `db/meta.ts`, `db/index.ts` re-export; no schema/version change.

**Gets simpler:** Navigate IDB layer by domain; easier onboarding.

**Risk:** High | **Depth:** Deep | **Depends on:** 26.A (`db.test.ts` must exist first)

**Verification:** Full test suite + manual offline pick/announcement/presence flush. **Skip if 26.A not done.**

---

### Out of scope (Phase 26)

- New features: LLM alerts, badge year freeze, minimap (see `FUTURE_IDEAS.md`)
- Redux/Zustand or global store introduction
- Supabase schema/migration changes
- Edge Function changes
- Service Worker / caching strategy changes (unless required by build)
- Renaming internal `crew_*` schema/IDB identifiers (user-facing copy only)
- `services/badges/registry.ts` data shrink (declarative; not complexity debt)

---

### Recommended execution order

```
26.A → 26.B → 26.C → 26.E → 26.D → 26.F → 26.G → 26.H → 26.J → 26.I → 26.K → 26.L → 26.M.0 → 26.M.a → 26.M.b → 26.M.c → 26.M.d (optional) → (26.N if needed)
```

Close each sub-stage with wiki changelog entry; close whole phase with single commit per CLAUDE.md phase rules.

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update the status line above to the next phase number.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
