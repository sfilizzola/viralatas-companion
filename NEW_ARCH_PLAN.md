# NEW_ARCH_PLAN.md — Architectural Refactoring Plan

_Status: PLAN (not started)_  
_Context: Written May 2026 for the Viralatas Metaleiros companion app_  
_Deadline constraint: Wacken starts July 29, 2026 (~11 weeks away at writing time)_

---

## Why this matters now

The app works. But three forces are converging:

1. **ProfilePage is 1,700 lines.** Adding Phase 11.E (joke badges, admin modal) will push it past 2,000. At that size, every feature change risks regressions.
2. **`src/lib/` is a grab bag.** Infrastructure (`supabase.ts`, `db.ts`), domain logic (`badges.ts`, `livePreview.ts`), and data access (`picks.ts`, `presence.ts`) all live in the same folder. Finding the right file to edit takes context you have to rebuild each session.
3. **Components are duplicating patterns.** Buttons, chips, collapsibles, and modals are each built from scratch per page. The `src/ui/` extraction (Stage 4) stops that.

The refactoring is **staged and safe**: each stage produces a working, testable app. No stage breaks existing functionality. All 177+ tests must pass after each stage before proceeding.

---

## Target architecture

```
src/
  ui/              ← Stage 4: pure UI primitives (no domain knowledge)
  components/      ← domain components (Band*, Badges*, etc.)
    profile/       ← Stage 3: ProfilePage sub-components
    now/           ← Stage 3: RightNowPage sub-components (if needed)
    icons/         ← existing
  repositories/    ← Stage 2: unified data access (IDB-first + Supabase sync)
  services/        ← Stage 1: business/domain logic (pure functions)
  hooks/           ← React bindings to repositories + services
  pages/           ← thin route-level components (layout + data orchestration only)
  lib/             ← Stage 1: infrastructure only (clients, IDB schema, sync queue)
  i18n/            ← existing
  types/           ← existing
  workers/         ← existing
```

### Layer responsibilities (strict)

| Layer | Knows about | Does NOT know about |
|---|---|---|
| `ui/` | HTML, CSS, React props | Supabase, IDB, domain types |
| `components/` | domain types, `ui/`, hooks | Supabase, IDB directly |
| `repositories/` | `lib/` (IDB + Supabase), domain types | React, hooks |
| `services/` | domain types | Supabase, IDB, React |
| `hooks/` | repositories, services, React | Supabase, IDB directly |
| `pages/` | hooks, components | repositories, services, `lib/` |
| `lib/` | Supabase SDK, idb library | domain types (mostly) |

**The rule in one sentence:** Pages call hooks. Hooks call repositories and services. Repositories call `lib/` (IDB + Supabase). Services are pure functions. `ui/` is dumb HTML+CSS.

---

## Current state diagnosis

### `src/lib/` — the problem

The `lib/` folder currently contains three different kinds of things:

**Infrastructure** (should stay in `lib/`):
- `supabase.ts` — client singleton
- `supabase.types.ts` — generated types
- `db.ts` (505 lines) — IDB schema + all IDB helpers
- `sync.ts` — sync queue
- `i18n.ts`, `I18nProvider.tsx`, `appSettings.ts`

**Data access** (should move to `repositories/` in Stage 2 — these ARE repositories already, just unnamed):
- `picks.ts` (126 lines)
- `presence.ts` (264 lines)
- `missed.ts` (116 lines)
- `announcements.ts` (166 lines)
- `users.ts` (14 lines)
- `cache.ts` (45 lines) — this is really the bands/schedule cache

**Domain services** (should move to `services/` in Stage 1):
- `badges.ts` (543 lines) — pure badge evaluation
- `livePreview.ts` (225 lines) — live band computation
- `liveBandTest.ts` (25 lines)
- `bandTime.ts` (17 lines)
- `stageColors.ts` (39 lines)
- `time.ts` (34 lines)
- `alerts.ts` (26 lines)
- `usefulLinks.ts` (43 lines)

### Fat pages

| Page | Lines | Problem |
|---|---|---|
| `ProfilePage.tsx` | 1,700 | Admin UI, badge logic, edit form, user management all inlined |
| `RightNowPage.tsx` | 599 | Live band computation, presence grid, LOST logic mixed into render |
| `AnnouncementsPage.tsx` | 338 | Manageable, low priority |

---

## Stage 1 — `lib/` cleanup + `services/` extraction

**Risk:** Very low. Pure file moves + import path updates. Zero behavior changes.  
**Duration estimate:** 2–3 days  
**Branch:** `refactor/stage-1-services`

### What moves

Create `src/services/` and move these files from `src/lib/`:

| From | To | Notes |
|---|---|---|
| `lib/badges.ts` | `services/badges.ts` | Pure functions, no side effects |
| `lib/livePreview.ts` | `services/livePreview.ts` | Pure computation |
| `lib/liveBandTest.ts` | `services/liveBandTest.ts` | Config utility |
| `lib/bandTime.ts` | `services/bandTime.ts` | Pure time helpers |
| `lib/stageColors.ts` | `services/stageColors.ts` | Constants |
| `lib/time.ts` | `services/time.ts` | Pure time utilities |
| `lib/alerts.ts` | `services/alerts.ts` | Alert logic |
| `lib/usefulLinks.ts` | `services/usefulLinks.ts` | Static config |

`src/lib/` after Stage 1 contains only:
```
lib/
  supabase.ts          ← Supabase client + auth helpers
  supabase.types.ts    ← generated types
  db.ts                ← IDB schema + all low-level IDB helpers
  sync.ts              ← offline sync queue
  i18n.ts              ← translation loader
  I18nProvider.tsx     ← React context
  appSettings.ts       ← localStorage settings
  picks.ts             ← (future Stage 2: will move to repositories/)
  presence.ts          ← (future Stage 2: will move to repositories/)
  missed.ts            ← (future Stage 2: will move to repositories/)
  announcements.ts     ← (future Stage 2: will move to repositories/)
  users.ts             ← (future Stage 2: will move to repositories/)
  cache.ts             ← (future Stage 2: will move to repositories/)
```

### Migration approach

1. Create `src/services/` directory
2. Copy each file (do not move yet — reduces conflict risk)
3. Update all import paths across the codebase (`grep -r "from '../lib/badges"` etc.)
4. Delete originals from `src/lib/`
5. Run `npm test` — must be green
6. Run `rtk tsc` — must have no new errors

### Acceptance criteria

- [ ] `src/services/` exists with 8 files
- [ ] `src/lib/` contains only infrastructure
- [ ] All 177+ tests pass
- [ ] TypeScript compiles clean
- [ ] `grep -r "from.*lib/badges\|from.*lib/livePreview\|from.*lib/time\b" src/` returns nothing

---

## Stage 2 — Repository layer

**Risk:** Medium. The IDB-first + offline queue pattern moves from scattered functions to structured repositories. Hooks are updated to call repositories.  
**Duration estimate:** 5–7 days  
**Branch:** `refactor/stage-2-repositories`

### What a repository looks like

Each repository is a plain TypeScript object (or class) that owns one domain's data access. It hides whether data comes from IDB or Supabase. Callers never import from `lib/db` or `lib/supabase` directly.

```typescript
// src/repositories/picks.ts — example shape
export interface IPicksRepository {
  toggle(userId: string, bandId: string, currentlyPicked: boolean): Promise<void>
  getForUser(userId: string): Promise<UserPick[]>
  getAllCrew(): Promise<UserPick[]>
  syncFromRemote(userId: string): Promise<void>
  syncCrewFromRemote(): Promise<void>
  flushOfflineQueue(): Promise<number>
}

export const picksRepository: IPicksRepository = { ... }
```

The implementation is nearly identical to the current `lib/picks.ts` functions — it's a thin wrapper that groups them under one object and adds the TypeScript interface. **This is not a rewrite, it's a reorganization.**

### Repositories to create

| Repository | Source file(s) | Domain |
|---|---|---|
| `repositories/picks.ts` | `lib/picks.ts` | User band picks + offline queue |
| `repositories/presence.ts` | `lib/presence.ts` | Camping / Metal Place check-in |
| `repositories/missed.ts` | `lib/missed.ts` | Missed band tracking |
| `repositories/announcements.ts` | `lib/announcements.ts` | Mural posts + soft-delete |
| `repositories/users.ts` | `lib/users.ts` | User profile reads/writes |
| `repositories/bands.ts` | `lib/cache.ts` | Band schedule + IDB cache |

### Repository interface definitions

All interfaces live in `src/repositories/types.ts` and are re-exported from `src/repositories/index.ts`. This file is the single import point for pages/hooks.

```typescript
// src/repositories/index.ts
export { picksRepository } from './picks'
export { presenceRepository } from './presence'
export { missedRepository } from './missed'
export { announcementsRepository } from './announcements'
export { usersRepository } from './users'
export { bandsRepository } from './bands'
```

### Migration order (low-risk first)

1. **`bands.ts` first** — read-only from Supabase/IDB, no writes, no offline queue. Safest migration.
2. **`picks.ts` second** — core domain, complex offline queue, but well-tested.
3. **`presence.ts` third** — smaller, similar pattern to picks.
4. **`missed.ts` fourth** — same pattern as picks.
5. **`announcements.ts` fifth** — has soft-delete and blocked-poster logic.
6. **`users.ts` last** — auth-adjacent, smallest file, save for last.

### For each repository, the steps are

1. Create `src/repositories/<domain>.ts`
2. Define the TypeScript interface for it
3. Implement by calling the existing `lib/<domain>.ts` functions internally
4. Update all hooks that import from `lib/<domain>.ts` to import from `repositories/<domain>.ts`
5. Run tests + TypeScript check after each repository
6. Only after all hooks are migrated: delete the source `lib/<domain>.ts`

### What hooks look like after Stage 2

```typescript
// src/hooks/useMyPicks.ts — before
import { togglePick, syncUserPicks } from '../lib/picks'

// src/hooks/useMyPicks.ts — after
import { picksRepository } from '../repositories'
// calls picksRepository.toggle(...), picksRepository.syncFromRemote(...)
```

### Acceptance criteria

- [ ] `src/repositories/` has 6 files + `index.ts` + `types.ts`
- [ ] No hook or page imports from `lib/picks`, `lib/presence`, `lib/missed`, `lib/announcements`, `lib/users`, `lib/cache`
- [ ] All 177+ tests pass (repositories are testable in isolation — consider adding unit tests for each)
- [ ] TypeScript compiles clean
- [ ] Offline-first behavior is unchanged (manual test: go offline, toggle pick, go online, verify sync)

### Note on TanStack Query (not recommended now)

TanStack Query would complement this layer well in a future cycle: repositories become the `queryFn`, and TQ handles caching, background sync, and optimistic updates. This would significantly simplify hooks. The migration cost is high (~2 weeks), so it is not included in this plan. Revisit post-Wacken if the team continues developing the app.

---

## Stage 3 — Fat page decomposition

**Risk:** Medium-low. Each page is decomposed into sub-components + hooks. No data access changes (Stage 2 already did that). Visual output must remain identical.  
**Duration estimate:** 5–7 days  
**Branch:** `refactor/stage-3-pages`

### Priority order

**ProfilePage first** (1,700 lines, most complex, most likely to grow)  
Then RightNowPage (599 lines)  
AnnouncementsPage (338 lines) — optional, only if time allows

---

### ProfilePage decomposition

**Current problem:** ProfilePage directly manages: user data fetching, edit form state, avatar upload, badge modal state, time travel controls, admin user list fetching, role change logic, badge assignment, sign-out. All inlined in one component.

**Target structure:**

```
pages/ProfilePage.tsx           ← ~120 lines (layout + data orchestration)
hooks/useProfileUser.ts         ← fetches + updates current user
hooks/useAdminUsers.ts          ← fetches all users, role changes, badge assignment
components/profile/
  ProfileHeader.tsx             ← 56px avatar, display name, role chip, country flag, years pill
  EditProfileForm.tsx           ← collapsible edit section (language, arrival day, country, etc.)
  BadgesSection.tsx             ← patches grid + badge modal
  AdminPanel.tsx                ← godlike/manager collapsible with user list
  UserRow.tsx                   ← single user row with role chip + actions
```

**New hooks:**

```typescript
// hooks/useProfileUser.ts
function useProfileUser() {
  // Fetches the current authenticated user
  // Returns: user, isLoading, updateProfile, uploadAvatar
}

// hooks/useAdminUsers.ts — only mounted when role is manager or godlike
function useAdminUsers() {
  // Fetches all users for admin panel
  // Returns: users, isLoading, changeRole, assignBadge, revokeBadge, blockUser
}
```

**ProfilePage after decomposition:**

```tsx
export function ProfilePage() {
  const { user, isLoading, updateProfile } = useProfileUser()
  const { users, changeRole } = useAdminUsers()  // only if manager/godlike

  if (isLoading) return <LoadingState />

  return (
    <div>
      <ProfileHeader user={user} />
      <BadgesSection user={user} />
      <EditProfileForm user={user} onSave={updateProfile} />
      {user.role !== 'normal' && <AdminPanel users={users} onChangeRole={changeRole} />}
    </div>
  )
}
```

---

### RightNowPage decomposition

**Current problem:** 599 lines mixes live band computation, vira-latas grid rendering, presence state, LOST detection, and the page header.

**Target structure:**

```
pages/RightNowPage.tsx              ← ~80 lines
hooks/useNowBands.ts                ← what's live now (extends useNow)
components/now/
  NowSection.tsx                    ← "Your current band" section
  ViralatasSection.tsx              ← vira-latas location grid
  LostChip.tsx                      ← LOST detection indicator
```

---

### Migration approach per page

For each page:

1. Identify the data fetching + state management code (move to hooks)
2. Identify logical sections of the rendered JSX (move to sub-components)
3. Start with the most isolated section (e.g., ProfileHeader has no dependencies on the rest)
4. Work inward toward the most complex section (AdminPanel) last
5. Verify visual output is unchanged after each extraction

**Screenshot test:** Before starting each page, take a screenshot of every major state (loading, normal user, manager, godlike). After decomposition, verify the screenshots match.

### Acceptance criteria

- [ ] `ProfilePage.tsx` is ≤ 150 lines
- [ ] `RightNowPage.tsx` is ≤ 120 lines
- [ ] All page sub-components live in `components/profile/` and `components/now/`
- [ ] All 177+ tests pass
- [ ] TypeScript compiles clean
- [ ] Visual regression: pages look identical to pre-refactor (manual spot-check on all pages)
- [ ] Phase 11.E (joke badge assignment modal) can be implemented cleanly as a new component in `components/profile/` — this is the real test that the decomposition works

---

## Stage 4 — UI primitives

> See **COMPONENT_LIBRARY_PLAN.md** for the detailed spec.

**Risk:** Low. All changes are additive. Existing components are updated to use primitives, but only after the primitives are verified correct.  
**Duration estimate:** 3–5 days  
**Branch:** `refactor/stage-4-ui`

### Summary

Create `src/ui/` with a set of pure presentational primitives that carry no domain knowledge. Components like `BandCard`, `BadgesDisplay`, and `ProfileHeader` are updated to use these primitives.

Primitives target list (details in COMPONENT_LIBRARY_PLAN.md):
- `Button` (primary / outline / ghost / destructive)
- `Modal`
- `Chip` / `Tag`
- `Collapsible`
- `Avatar`
- `SectionTitle`
- Form primitives: `Input`, `Select`, `SegmentedControl`

### Acceptance criteria

- [ ] `src/ui/` has ≥ 6 primitive components with TypeScript interfaces
- [ ] At least 2 existing domain components (`BandCard`, `BadgesDisplay`) use UI primitives
- [ ] `ProfilePage` sub-components (Stage 3) use UI primitives
- [ ] All 177+ tests pass
- [ ] No visual regressions

---

## Execution checklist (all stages)

For every stage, before merging to `dev`:

1. `rtk npm run test` — all tests green
2. `rtk tsc` — no new TypeScript errors  
3. `grep` audit to verify no banned imports remain (listed in each stage's acceptance criteria)
4. Manual smoke test on 3 pages: `/now`, `/schedule`, `/profile`
5. Manual offline test: go offline → toggle a pick → go online → verify sync

---

## What this plan does NOT include

- **Edge Function refactoring** — the `supabase/functions/` layer is small, well-isolated, and not a pain point yet.
- **Test suite expansion** — the plan preserves existing tests and adds repository unit tests in Stage 2. A full React Testing Library integration for component tests is deferred to post-Wacken.
- **TanStack Query migration** — described in Stage 2 notes. Deferred.
- **CSS design token system** — `src/index.css` already has CSS variables. A full token audit is deferred. See COMPONENT_LIBRARY_PLAN.md for notes.
- **i18n system overhaul** — the per-page JSON file pattern works; no refactoring needed.

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Import path churn breaks a test | Medium | Low | Run tests after every file move, not just at end |
| Stage 2 repository wrapping breaks offline queue | Low | High | Manual offline test after each repository migration |
| ProfilePage decomposition causes visual regression | Medium | Medium | Screenshot before/after per section |
| Refactoring delays Phase 11.E (joke badges) | Low | Medium | Phase 11.E uses the decomposed AdminPanel — Stage 3 is a prerequisite, not a competitor |
| Wacken deadline pressure forces shortcuts | Low | High | Stages 1–2 are lowest risk and highest structural benefit; prioritize these if time runs short |

---

## Recommended execution order relative to feature work

```
Current (dev branch):
  └─ Phase 11.E (joke badge assignment)    ← finish this first, don't start refactor mid-feature

Then:
  Stage 1 (services/ split)                ← 2-3 days, very safe
  Stage 2 (repositories/)                  ← 5-7 days, medium risk
  [Feature work: any remaining phases]     ← now on cleaner base
  Stage 3 (page decomposition)             ← 5-7 days
  Stage 4 (ui/ primitives)                 ← 3-5 days
  
  Total: ~3.5 weeks of refactoring spread across feature work
  Buffer for Wacken: ~7 weeks remaining after Stage 4
```
