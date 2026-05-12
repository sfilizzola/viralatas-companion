# Unit Test Coverage Plan — Viralatas Companion

## Current State

**Test infrastructure:** Vitest + jsdom, v8 coverage, no threshold gates enforced.

**Existing coverage — strong:**
- `services/badges/*` — comprehensive (`badges.test.ts`, `missed.test.ts`)
- `services/time.ts` — solid (`time.test.ts`)
- `services/livePreview.ts` — partial (`livePreview.test.ts`)
- `hooks/useBandConflicts.ts` — pure exports tested
- `components/BandCard.tsx` — RTL component test

**Misleading "tests" (do not import app code):**
- `registration.test.ts`, `login.test.ts`, `auth-integration.test.ts` — inline spec-style docs; they do not exercise any UI component or Supabase integration; zero regression protection for real auth code.

**Zero coverage (high-value targets):**
- `lib/db.ts` (506 lines) — entire offline IndexedDB layer
- `repositories/picks.ts`, `presence.ts`, `announcements.ts`, `bands.ts`, `missed.ts` — all sync/queue/dedup logic
- `hooks/useNowData.ts` (320 lines) — orchestrates realtime, live plans, skip/undo, presence
- `services/bandTime.ts` — `bandDay()` and `formatTime()` are duplicated inside `schedule.test.ts` instead of imported from the real module
- `services/stageColors.ts`, `services/usefulLinks.ts`, `lib/i18n.ts`

---

## Separation of Concerns Issues

The following coupling problems make testing unnecessarily hard and should be resolved **before** writing tests for those modules.

### 1. Filter logic inline in `SchedulePage.tsx`
Lines 66–76 define `filtered` via a multi-field `useMemo` directly inside the page component. This belongs in a pure `filterBands(bands, filters, now)` function in `services/bandFilter.ts`. Currently `schedule.test.ts` duplicates a simplified version of this logic instead of testing the real code.

### 2. `loadStoredFilters` / `saveStoredFilters` buried in `SchedulePage.tsx`
These two module-level functions (lines 133–158) contain real parsing/validation logic but cannot be imported by a test file because they live inside a page module. Extracting them to `services/scheduleFilterStorage.ts` makes them trivially testable in isolation.

### 3. Dedup logic buried in `flushOfflineQueue` (`repositories/picks.ts`)
The `keepLast` dedup algorithm (lines 93–103) is embedded inside the async flush function alongside Supabase calls, making the dedup logic impossible to test in isolation. Extracting `deduplicatePickQueue(ops)` as an exported pure function (same file is fine) enables direct unit testing.

### 4. `mapAttendees` embedded in `useBandAttendees.ts`
The attendee-mapping computation lives inline inside the hook. Extracting it as `computeAttendees(picks, crewUsers)` in `services/attendees.ts` turns it into a zero-dependency pure function test.

### 5. `countPicks` inline in `usePickCounts.ts`
Pick counting is embedded in the hook. Exporting it as a standalone helper allows testing without mounting the hook.

---

## Stages

Stages are ordered by **change risk**: low-risk refactors come first, then tests are added for the newly clean code. Refactoring always precedes the tests that depend on it.

---

### Stage 1 — Refactoring: Low-risk pure function extraction ✅ COMPLETED 2026-05-12

#### 1.1 Extract `filterBands` → `src/services/bandFilter.ts`
- Move the `filtered` useMemo predicate from `SchedulePage.tsx:66–76` into a named exported pure function `filterBands(bands: Band[], filters: BandFilterValue, now: Date): Band[]`.
- Update `SchedulePage.tsx` to call it.
- Rewrite `schedule.test.ts` to import `filterBands` and `bandDay` from their real source files; delete the internal duplicated helpers.

#### 1.2 Extract filter storage → `src/services/scheduleFilterStorage.ts`
- Move `loadStoredFilters()` and `saveStoredFilters()` from the bottom of `SchedulePage.tsx`.
- Import them back in the page. No change in behavior.

#### 1.3 Export `deduplicatePickQueue` from `src/repositories/picks.ts`
- Extract the grouping/keepLast logic into a named exported pure function.
- `flushOfflineQueue` calls it internally. No external API change.

#### 1.4 Extract `computeAttendees` → `src/services/attendees.ts`
- Move the map-building logic from `useBandAttendees.ts` into a pure exported function.
- Hook imports and calls it.

#### 1.5 Export `countPicks` from `src/hooks/usePickCounts.ts`
- Expose the inline counting logic as a named exported helper.

---

### Stage 2 — Tests: Pure services (no Supabase or IDB dependency) 🔄 CURRENT

> Vitest only. No mocks needed except `localStorage` (already available in jsdom).

#### `src/__tests__/bandTime.test.ts`
Tests `bandDay()` and `formatTime()` from `services/bandTime.ts`:
- CEST timezone boundary: bands at 00:00–03:59 UTC belong to the previous festival day
- Midnight edge case: 02:00 UTC → previous calendar day in CEST
- `formatTime` pads hours and minutes correctly

#### `src/__tests__/bandFilter.test.ts`
Tests `filterBands()` from `services/bandFilter.ts`:
- Filter by day
- Filter by stage (multi-select: any match passes)
- Filter by genre
- Filter by query string (case-insensitive name match)
- Filter by `upcoming` flag: bands whose `end_time ≤ now` are excluded
- Combined filter interactions
- Empty filter object → returns all bands unchanged

#### `src/__tests__/scheduleFilterStorage.test.ts`
Tests `loadStoredFilters` / `saveStoredFilters` from `services/scheduleFilterStorage.ts`:
- Missing key → returns `EMPTY_FILTERS`
- Corrupted JSON → safe fallback to `EMPTY_FILTERS`
- Round-trip: save then load returns same values (except `query` which is cleared on load)

#### `src/__tests__/deduplicatePickQueue.test.ts`
Tests `deduplicatePickQueue()` from `repositories/picks.ts`:
- Multiple ops for same `(user_id, band_id)` → only last chronological action kept
- Ordering: earlier-created ops are superseded by later ones
- Single op passes through unchanged
- Ops for different bands are all retained

#### `src/__tests__/attendees.test.ts`
Tests `computeAttendees()` from `services/attendees.ts`:
- Groups picks by `band_id`, hydrates each entry with matching `CrewUser` data
- Users with picks but missing crew info still appear (unknown label fallback)

#### `src/__tests__/stageColors.test.ts`
Tests `services/stageColors.ts`:
- All 8 known Wacken stage names return their designated hex colors
- Unknown stage name returns `undefined` or the accent fallback

#### `src/__tests__/i18n.test.ts`
Tests `lib/i18n.ts` translation lookup:
- `t('key')` returns the correct string for both `'br'` and `'en'`
- Missing key returns the key string as a fallback (no crash)
- Interpolation `t('key', { count: 5 })` substitutes placeholders correctly

---

### Stage 3 — Tests: Repository layer (mock Supabase + IDB)

> Mock pattern: `vi.mock('../lib/supabase', ...)` and `vi.mock('../lib/db', ...)`. Follows the pattern established in the existing `setup.ts`.

#### `src/__tests__/picksRepository.test.ts`
- `toggle()` online, adding: IDB `saveUserPick` called → Supabase `upsert` called
- `toggle()` online, removing: IDB `removeUserPick` called → Supabase `delete` called
- `toggle()` offline (`navigator.onLine = false`): IDB write + queue, no Supabase call
- `toggle()` Supabase error: fallback to offline queue
- `flushOfflineQueue()` empty queue: returns 0, no Supabase calls
- `flushOfflineQueue()` mixed ops: dedup applied, correct upsert/delete per group, queue entries cleared on success
- `syncCrewFromRemote()`: Supabase data → `replaceUserPicks` called with fetched rows

#### `src/__tests__/presenceRepository.test.ts`
- `setCampingStatus()` online: IDB write → Supabase upsert
- `setCampingStatus()` offline: IDB write → queue, no Supabase
- `isTimeWithinMetalPlaceWindow()`: pure time-range check; active window returns true, outside returns false
- `validateAndAutoCheckout()`: when current time is outside metal-place window, sets `is_at_metal_place = false`

#### `src/__tests__/announcementsRepository.test.ts`
- Post online: IDB save → Supabase insert
- Post offline: added to `pending_announcements` queue
- `flushPendingAnnouncements()`: pending items posted to Supabase, cleared from queue on success

#### `src/__tests__/bandsRepository.test.ts`
- `checkAndApplyCacheVersion()`: matching version → no-op
- `checkAndApplyCacheVersion()`: version mismatch → clears IDB band store and triggers re-seed

#### `src/__tests__/missedRepository.test.ts`
- Mark band as missed: IDB write → Supabase upsert (online) or queue (offline)
- Unmark: IDB remove → Supabase delete (online) or queue (offline)

---

### Stage 4 — Tests: IDB layer (`lib/db.ts`)

> Install [`fake-indexeddb`](https://github.com/dumbmatter/fakeIndexedDB) as a dev dependency. Replace the current minimal `window.indexedDB` stub in `setup.ts` for db-layer tests (keep the stub for all other tests by scoping per test file).

#### `src/__tests__/db.test.ts`
- `saveBand` / `loadBands` round-trip
- `saveUserPick` / `removeUserPick` / `replaceUserPicks` (per-user replace leaves other users' picks intact)
- `enqueueOfflinePick` / `loadOfflineQueue` / `removeFromOfflineQueue`
- `saveUserPresence` / `loadUserPresence` / `replaceUserPresence`
- `loadLatestAnnouncement` returns the entry with the most recent `created_at`
- Window event dispatch: verify `PICKS_CHANGED_EVENT` fires after save/remove pick, `PRESENCE_CHANGED_EVENT` after presence write, etc.

---

### Stage 5 — Tests: Hook logic (pure memoized computations)

> Test hooks with `renderHook` from RTL. Mock Supabase channels and IDB. Focus on the deterministic derivation logic, not the side effects.

#### `src/__tests__/useNowData.logic.test.ts`
- `presenceValue` derivation: camping + plan not current → `'camping'`
- `presenceValue` derivation: metal_place + active window → `'metal_place'`
- `presenceValue` default → `'auto'`
- `isMetalPlaceWindowActive` gates metal_place presence value
- `crewPlans` always includes the current user even when absent from `crewUsers`

#### `src/__tests__/usePickCounts.test.ts`
- `countPicks()` pure helper: returns correct `{ [band_id]: number }` map from a `UserPick[]` array

#### `src/__tests__/useBandAttendees.test.ts`
- `computeAttendees()`: groups picks by `band_id`, hydrates with `CrewUser` display names

---

### Stage 6 — Tests: Component and page integration (highest risk)

> Mount with `I18nProvider`. Mock hooks and repositories. Assert rendered output via RTL. These replace the misleading stub tests.

#### `src/__tests__/SchedulePage.test.tsx`
- Renders band list loaded from mocked IDB
- Day filter hides bands from other days
- Stage filter (multi-select) shows only matching bands
- Toggle calls `picksRepository.toggle` with correct arguments

#### `src/__tests__/LoginPage.test.tsx` _(replaces `login.test.ts`)_
- Empty email shows validation error
- Empty password shows validation error
- Valid submit calls `supabase.auth.signInWithPassword` with correct credentials
- Supabase error response renders error message to user

#### `src/__tests__/RegisterPage.test.tsx` _(replaces `registration.test.ts`)_
- Short password shows validation error
- Missing display name shows validation error
- Valid submit calls `supabase.auth.signUp` with correct metadata shape (including `display_name`, `preferred_language`, `is_test_user: false`)

---

## Coverage Targets by Module

| Module | Current estimate | Target | Stage |
|---|---|---|---|
| `services/badges/*` | ~95% | maintain | — |
| `services/time.ts` | ~90% | maintain | — |
| `services/livePreview.ts` | ~60% | 90% | 2 |
| `services/bandTime.ts` | 0% | 100% | 2 |
| `services/bandFilter.ts` | 0% | 100% | 1+2 |
| `services/stageColors.ts` | 0% | 95% | 2 |
| `services/attendees.ts` | 0% | 100% | 1+2 |
| `services/scheduleFilterStorage.ts` | 0% | 100% | 1+2 |
| `lib/i18n.ts` | 0% | 80% | 2 |
| `repositories/*` | 0% | 85% | 3 |
| `lib/db.ts` | 0% | 80% | 4 |
| `hooks/*` | ~10% | 70% | 5 |
| `pages/*` | 0% | 60% | 6 |
| `components/*` | ~10% | 70% | 6 |

**Estimated blended coverage after all stages: ~90%**

---

## Vitest Config Updates

Add coverage thresholds to `vitest.config.ts` to enforce the target on CI:

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html'],
  thresholds: {
    lines: 90,
    functions: 90,
    branches: 85,
    statements: 90,
  },
  exclude: [
    'src/supabase.types.ts',
    'src/vite-env.d.ts',
    'src/version.ts',
    'src/i18n/**',
    '**/*.module.css',
  ],
},
```

---

## New Dev Dependency Required

- [`fake-indexeddb`](https://www.npmjs.com/package/fake-indexeddb) — full in-memory IDB implementation for Stage 4. Replaces the current minimal `window.indexedDB` stub in `setup.ts` for `db.test.ts` specifically.

```bash
npm install --save-dev fake-indexeddb
```
