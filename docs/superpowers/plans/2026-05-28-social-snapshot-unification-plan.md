# Social Snapshot Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify `/now` and live vest crew derivation behind one deep module (`buildSocialSnapshot`), dedupe IDB loads via shared hooks, and eliminate display-path Supabase reads so assigned badges and friend status work offline after crew sync.

**Architecture:** Three seams — (1) **crew profile cache** extends `CrewUser` with `special_badges`, synced by `usersRepository.syncCrew()` on reconnect; (2) **`buildSocialSnapshot()`** pure service runs `mapCrewLivePlans` → `groupCrewLivePlans` once; (3) **`useSocialSnapshot`** hook loads shared IDB cells and feeds both `useNowPlans` and `buildBadgeContextFromSnapshot`. `useBadgePersist` keeps persist-metadata writes (best-effort online) but removes the network enrich phase for display.

**Tech stack:** React 18, TypeScript, Vitest, IndexedDB (`src/lib/db/`), existing `livePreview.ts`, `useIdbSubscription`, Supabase sync via `runReconnectSync`.

**Spec source:** Architecture review candidate #2 (2026-05-28); locked decisions: Option A (crew IDB field), Option A hook pattern (`useSocialSnapshot` everywhere), full offline display after sync.

**Phase:** 31 — Social Snapshot Unification (sub-phases 31.A–31.E)

---

## Locked design decisions (approved — do not re-open)

| Decision | Locked choice |
|----------|---------------|
| Assigned badges storage | `special_badges: string[]` on `CrewUser` → `crew_users` IDB store |
| Sync path | Include in existing `usersRepository.syncCrew()` (reconnect + cache-version invalidation) |
| Vest display reads | Crew IDB for `special_badges` + `is_friend`; **no** `supabase.from('users').select` in hooks |
| Derivation unification | Pure `buildSocialSnapshot()` consumed by `/now` and badge engine |
| Hook pattern | Shared `useSocialSnapshot()` — not prop-drilling from `/now` only |
| IDB version bump | **Not required** — `crew_users` is schemaless; missing field → `[]` |
| Persist badge writes | Keep `auth.updateUser` best-effort when online; **out of scope** for offline queue (display works via live evaluation) |
| Auth metadata hydration | After `syncCrew()`, mirror current user's `special_badges` into session metadata once (reconnect seam only) |

---

## Prerequisites (read before Task 1)

1. `docs/ai-wiki/index.md` — offline-first principles
2. `docs/ai-wiki/decisions/indexeddb-primary-store.md` — UI must not depend on live Supabase reads
3. `docs/ai-wiki/decisions/custom-hooks-events-no-redux.md` — Phase 27.F `useIdbSubscription`
4. `docs/ai-wiki/flows/live-now.md` — crew grouping semantics
5. `docs/ai-wiki/badges.md` — `BadgeContext`, `crew_at_location_min`, assigned badges
6. `CONTEXT.md` — live vest, evergreen vs year badge terminology
7. `src/services/livePreview.ts` — `mapCrewLivePlans`, `groupCrewLivePlans`, `deriveUserBadgeLocation`
8. `src/services/badges/badgeContextBuilder.ts` — current duplicate pipeline
9. `src/hooks/useNowPlans.ts` — current `/now` derivation
10. `src/hooks/useBadgePersist.ts` — network enrich to remove
11. `src/repositories/users.ts` — `syncCrew()` seam
12. `src/lib/syncCoordinator.ts` — reconnect contract

**Verification gates (every sub-phase):** `rtk npm run build` · `rtk npm test`

---

## File map (create / modify)

| File | Responsibility |
|------|----------------|
| `src/types/index.ts` | Extend `CrewUser` with `special_badges?: string[]` |
| `src/repositories/users.ts` | Select + save `special_badges` in `syncCrew()`; optional `hydrateCurrentUserBadgeMetadata()` |
| `src/services/socialSnapshot.ts` | **Create** — `SocialSnapshot`, `buildSocialSnapshot()` |
| `src/hooks/useSocialSnapshot.ts` | **Create** — shared IDB load + snapshot derivation |
| `src/hooks/useSocialSnapshotSpecs.ts` | **Create** — cache keys + loaders (mirror `useAllPicks` pattern) |
| `src/hooks/useNowPlans.ts` | Accept pre-built snapshot slice; focus-user extras only |
| `src/hooks/useNowCache.ts` | Slim down or delegate to `useSocialSnapshot` |
| `src/hooks/useBadgeCache.ts` | Slim down or delete; vest reads via `useSocialSnapshot` |
| `src/hooks/useBadgePersist.ts` | Remove network enrich; IDB-only display + persist writes |
| `src/hooks/useBadgeContext.ts` | Rewire to new cache path |
| `src/hooks/useNowData.ts` | Consume `useSocialSnapshot` instead of separate cache hooks |
| `src/services/badges/badgeContextBuilder.ts` | Accept `SocialSnapshot` instead of re-running pipeline |
| `src/components/profile/UserManagementSection.tsx` | After assign/revoke → `usersRepository.syncCrew()` |
| `src/__tests__/usersRepository.test.ts` | Crew sync includes `special_badges` |
| `src/__tests__/socialSnapshot.test.ts` | **Create** — pure derivation tests |
| `src/__tests__/useBadgeContext.test.ts` | Update — no Supabase display fetch; offline assigned badge |
| `src/__tests__/useBadgeCache.test.ts` | Update or merge into social snapshot tests |
| `src/__tests__/badgePresence.test.ts` | Confirm snapshot path still aligns with `/now` counts |
| `CONTEXT.md` | Add **Social snapshot** + **Crew profile cache** terms |
| `docs/ai-wiki/architecture.md` | Document new module + data flow |
| `docs/ai-wiki/changelog.md` | Dated entry on completion |
| `docs/ai-wiki/phases-history.md` | Phase 31 entry on completion |
| `PHASES.md` | Point active work at Phase 31 while executing |

---

## Sub-phase 31.A — Crew profile cache (`special_badges` in IDB)

### Task 1: Extend `CrewUser` type

**Files:**
- Modify: `src/types/index.ts`
- Test: `src/__tests__/usersRepository.test.ts`

- [ ] **Step 1: Write failing test for crew sync with special_badges**

Add to `src/__tests__/usersRepository.test.ts` inside `describe('usersRepository.syncCrew')`:

```typescript
it('persists special_badges on crew_users IDB rows', async () => {
  mockSupabaseFrom({
    users: {
      data: [
        {
          id: 'u1',
          display_name: 'Alice',
          avatar_url: null,
          wacken_arrival_day: 1,
          is_friend: false,
          special_badges: ['code-wizards'],
        },
      ],
      error: null,
    },
  });

  await usersRepository.syncCrew();

  const crew = await loadCrewUsers();
  expect(crew).toEqual([
    expect.objectContaining({
      id: 'u1',
      special_badges: ['code-wizards'],
    }),
  ]);
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `rtk npm test -- src/__tests__/usersRepository.test.ts`
Expected: FAIL — `special_badges` undefined on saved row or select missing field

- [ ] **Step 3: Extend type + sync select**

In `src/types/index.ts`:

```typescript
export type CrewUser = Pick<
  User,
  'id' | 'display_name' | 'avatar_url' | 'wacken_arrival_day' | 'is_friend'
> & {
  special_badges?: string[];
};
```

In `src/repositories/users.ts` `syncCrew()`:

```typescript
const { data, error } = await supabase
  .from('users')
  .select('id, display_name, avatar_url, wacken_arrival_day, is_friend, special_badges')
  .order('display_name', { ascending: true, nullsFirst: false });

if (error || !data) return;

const crew: CrewUser[] = (data as Array<CrewUser & { special_badges?: string[] | null }>).map(
  (u) => ({
    ...u,
    special_badges: u.special_badges ?? [],
  }),
);

await saveCrewUsers(crew);
```

- [ ] **Step 4: Run test — expect PASS**

Run: `rtk npm test -- src/__tests__/usersRepository.test.ts`

- [ ] **Step 5: Commit**

```bash
rtk git add src/types/index.ts src/repositories/users.ts src/__tests__/usersRepository.test.ts
rtk git commit -m "Phase 31.A: sync special_badges into crew_users IDB cache"
```

---

### Task 2: Hydrate auth metadata after crew sync (reconnect seam)

**Files:**
- Modify: `src/repositories/users.ts`
- Test: `src/__tests__/usersRepository.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
it('hydrates current user special_badges into auth metadata after syncCrew', async () => {
  const updateUser = vi.fn().mockResolvedValue({ data: {}, error: null });
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user: { id: 'u1', user_metadata: { special_badges: [] } } },
    error: null,
  });
  vi.mocked(supabase.auth.updateUser).mockImplementation(updateUser);
  // mock supabase from users with special_badges: ['mosh-pit']
  await usersRepository.syncCrew();
  expect(updateUser).toHaveBeenCalledWith({
    data: { special_badges: ['mosh-pit'] },
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: Implement `hydrateCurrentUserBadgeMetadataFromCrew(crew: CrewUser[])`**

Call at end of `syncCrew()` when online:

```typescript
async function hydrateCurrentUserBadgeMetadataFromCrew(crew: CrewUser[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const row = crew.find((u) => u.id === user.id);
  if (!row) return;

  const dbBadges = row.special_badges ?? [];
  const metaBadges = (user.user_metadata?.special_badges as string[] | undefined) ?? [];
  if (badgesEqual(dbBadges, metaBadges)) return;

  await supabase.auth.updateUser({ data: { special_badges: dbBadges } });
}
```

Extract `badgesEqual` to a shared util (e.g. `src/services/badges/badgeArrayEqual.ts`) or import from a small shared helper — do not import from hooks.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
rtk git add src/repositories/users.ts src/__tests__/usersRepository.test.ts
rtk git commit -m "Phase 31.A: hydrate auth metadata from crew cache on sync"
```

---

### Task 3: Godlike assign/revoke triggers crew resync

**Files:**
- Modify: `src/components/profile/UserManagementSection.tsx`
- Test: extend `src/__tests__/usersRepository.test.ts` or component test if exists

- [ ] **Step 1: After successful assign/revoke in `handleAssignBadge`, call `usersRepository.syncCrew()`**

```typescript
await usersRepository.syncCrew();
```

Place after Edge Function success and local `setAllUsers` state update so IDB matches DB before user goes offline.

- [ ] **Step 2: Manual verify** — assign badge in dev, DevTools → IndexedDB → `crew_users` → target row has slug

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/profile/UserManagementSection.tsx
rtk git commit -m "Phase 31.A: resync crew cache after badge assign/revoke"
```

---

## Sub-phase 31.B — Pure `buildSocialSnapshot` module (TDD)

### Task 4: Types + empty/minimal snapshot

**Files:**
- Create: `src/services/socialSnapshot.ts`
- Test: `src/__tests__/socialSnapshot.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, it } from 'vitest';
import { buildSocialSnapshot } from '../services/socialSnapshot';
import { festivalNow } from './fixtures/liveNowScenarios';

describe('buildSocialSnapshot', () => {
  it('returns inactive metal place window when config is null', () => {
    const snap = buildSocialSnapshot({
      bands: [],
      picks: [],
      crewUsers: [],
      presence: [],
      metalPlaceConfig: null,
      liveBandTestConfig: null,
      now: festivalNow,
    });
    expect(snap.metalPlaceWindowActive).toBe(false);
    expect(snap.crewGroups).toHaveLength(2); // camping + lost only
  });

  it('matches computeCrewLocationCounts for a populated roster', () => {
    // Reuse fixtures from badgePresence.test.ts / liveNowScenarios.ts
    const input = buildMinimalSocialInput(/* camping user + picks */);
    const snap = buildSocialSnapshot(input);
    expect(snap.crewLocationCounts.lost).toBe(/* expected */);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `rtk npm test -- src/__tests__/socialSnapshot.test.ts`

- [ ] **Step 3: Implement `buildSocialSnapshot`**

```typescript
import type { Band, CrewUser, LiveBandTestConfig, MetalPlaceConfig, UserPick, UserPresence } from '../types';
import {
  crewLocationCountsFromGroups,
  groupCrewLivePlans,
  mapCrewLivePlans,
  resolveLiveTestBandId,
  type CrewLiveGroup,
  type CrewLivePlan,
} from './livePreview';
import { presenceRepository } from '../repositories';

export type SocialSnapshotInput = {
  bands: Band[];
  picks: UserPick[];
  crewUsers: CrewUser[];
  presence: UserPresence[];
  metalPlaceConfig: MetalPlaceConfig | null;
  liveBandTestConfig: LiveBandTestConfig | null;
  now: Date;
};

export type SocialSnapshot = {
  metalPlaceWindowActive: boolean;
  liveTestBandId: string | null;
  crewPlans: CrewLivePlan[];
  crewGroups: CrewLiveGroup[];
  crewLocationCounts: Record<'camping' | 'metal_place' | 'lost', number>;
};

export function buildSocialSnapshot(input: SocialSnapshotInput): SocialSnapshot {
  const metalPlaceWindowActive = presenceRepository.isTimeWithinMetalPlaceWindow(
    input.metalPlaceConfig,
    input.now,
  );
  const liveTestBandId = resolveLiveTestBandId(input.liveBandTestConfig);
  const crewPlans = mapCrewLivePlans(
    input.bands,
    input.picks,
    input.crewUsers,
    input.presence,
    input.now,
    liveTestBandId,
  );
  const crewGroups = groupCrewLivePlans(crewPlans, { metalPlaceWindowActive });
  return {
    metalPlaceWindowActive,
    liveTestBandId,
    crewPlans,
    crewGroups,
    crewLocationCounts: crewLocationCountsFromGroups(crewGroups),
  };
}
```

**Note:** Importing `presenceRepository` for window math is acceptable short-term; optional follow-up extracts `metalPlaceWindow` pure functions (architecture review candidate #1).

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
rtk git add src/services/socialSnapshot.ts src/__tests__/socialSnapshot.test.ts
rtk git commit -m "Phase 31.B: add pure buildSocialSnapshot module"
```

---

### Task 5: Wire `badgeContextBuilder` to consume snapshot

**Files:**
- Modify: `src/services/badges/badgeContextBuilder.ts`
- Modify: `src/__tests__/badgeContextBuilder.test.ts`

- [ ] **Step 1: Add overload or new function `buildBadgeContextFromSocialSnapshot`**

```typescript
export function buildBadgeContextFromSocialSnapshot(
  snap: BadgeIdbSnapshot,
  social: SocialSnapshot,
  userId: string,
  authUser: AuthUser,
): BadgeContext {
  const isCurrentUserFriend = snap.isCurrentUserFriend;
  const currentLocation = deriveUserBadgeLocation(userId, social.crewGroups, isCurrentUserFriend);
  const crewLocationCounts = social.crewLocationCounts;
  // ... rest unchanged — remove mapCrewLivePlans/groupCrewLivePlans from this file
}
```

- [ ] **Step 2: Update existing tests to pass pre-built `SocialSnapshot`**

- [ ] **Step 3: Deprecate inline pipeline in `buildBadgeContextFromSnapshot`** — make it call `buildSocialSnapshot` internally for backward compat until Task 8 removes duplicate path

- [ ] **Step 4: Run tests — expect PASS**

Run: `rtk npm test -- src/__tests__/badgeContextBuilder.test.ts src/__tests__/badgePresence.test.ts`

- [ ] **Step 5: Commit**

```bash
rtk git commit -m "Phase 31.B: badge context consumes SocialSnapshot"
```

---

## Sub-phase 31.C — Remove display-path network from live vest

### Task 6: `useBadgePersist` IDB-only display

**Files:**
- Modify: `src/hooks/useBadgePersist.ts`
- Modify: `src/hooks/useBadgeCache.ts`
- Modify: `src/__tests__/useBadgeContext.test.ts`

- [ ] **Step 1: Write failing offline test**

```typescript
it('shows godlike-assigned badge from crew IDB without Supabase fetch', async () => {
  await saveCrewUsers([{ ...brCrewUser, special_badges: ['code-wizards'] }]);
  const fromUsers = vi.fn();
  vi.mocked(supabase.from).mockImplementation(fromUsers);

  const { result } = renderHook(() => useBadgeContext(authUser()));
  await waitFor(() => expect(result.current.ctx.assignedBadges).toContain('code-wizards'));

  expect(fromUsers).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test — expect FAIL** (current code calls `supabase.from('users')`)

- [ ] **Step 3: Remove `enrich()` network block from `useBadgePersist`**

Display path:

```typescript
const assignedBadges =
  snapshot.crewUsers.find((u) => u.id === userId)?.special_badges ?? [];
const isCurrentUserFriend =
  snapshot.crewUsers.find((u) => u.id === userId)?.is_friend === true;

const idbCtx = buildBadgeContextFromSocialSnapshot(
  { ...snapshot, assignedBadges, isCurrentUserFriend },
  socialSnapshot,
  userId,
  sessionUser,
);
setCtx(idbCtx);
```

Keep **only** the persist-metadata block (evaluate newly earned → `auth.updateUser`) in a separate effect; it must not gate first render.

- [ ] **Step 4: Update `useBadgeCache` snapshot shape** — drop `assignedBadgesFromMeta` / `isCurrentUserFriendFromIdb` split; pass `crewUsers` through

- [ ] **Step 5: Delete test `syncs special_badges drift from Supabase into auth metadata once`** or rewrite to assert reconnect hydration happens in `usersRepository.syncCrew` instead

- [ ] **Step 6: Run tests — expect PASS**

Run: `rtk npm test -- src/__tests__/useBadgeContext.test.ts`

- [ ] **Step 7: Commit**

```bash
rtk git commit -m "Phase 31.C: live vest display reads crew IDB only"
```

---

## Sub-phase 31.D — `useSocialSnapshot` hook + consumer wiring

### Task 7: Cache specs + hook

**Files:**
- Create: `src/hooks/useSocialSnapshotSpecs.ts`
- Create: `src/hooks/useSocialSnapshot.ts`
- Test: `src/__tests__/useSocialSnapshot.test.ts`

- [ ] **Step 1: Define shared cache loaders**

```typescript
// useSocialSnapshotSpecs.ts
export const CREW_CACHE_KEY = 'crew-users';
export const PRESENCE_CACHE_KEY = 'all-user-presence';

export function useCrewUsersCache() {
  return useIdbSubscription({
    key: CREW_CACHE_KEY,
    events: [CREW_USERS_CHANGED_EVENT],
    loader: loadCrewUsers,
  });
}

export function usePresenceCache() {
  return useIdbSubscription({
    key: PRESENCE_CACHE_KEY,
    events: [PRESENCE_CHANGED_EVENT],
    loader: loadAllUserPresence,
  });
}
```

Reuse existing `useAllPicks()` and `useBands()` — do not duplicate.

- [ ] **Step 2: Implement `useSocialSnapshot(now: Date)`**

```typescript
export function useSocialSnapshot(now: Date) {
  const picks = useAllPicks();
  const bands = useBands(); // or raw bands from useBands + sort in consumer
  const crewUsers = useCrewUsersCache();
  const presence = usePresenceCache();
  const metalPlaceConfig = useMetalPlaceConfig(); // stays as-is until config repo unification
  const liveBandTestConfig = useLiveBandTestConfig();

  const loading =
    picks === undefined ||
    bands.loading ||
    crewUsers === undefined ||
    presence === undefined;

  const snapshot = useMemo(() => {
    if (loading) return null;
    return buildSocialSnapshot({
      bands: bands.bands,
      picks,
      crewUsers,
      presence,
      metalPlaceConfig,
      liveBandTestConfig,
      now,
    });
  }, [loading, bands.bands, picks, crewUsers, presence, metalPlaceConfig, liveBandTestConfig, now]);

  return { snapshot, crewUsers: crewUsers ?? [], presence: presence ?? [], picks: picks ?? [], loading };
}
```

- [ ] **Step 3: Write hook test** — verify single load, re-derive on `PRESENCE_CHANGED_EVENT`

- [ ] **Step 4: Commit**

```bash
rtk git commit -m "Phase 31.D: add useSocialSnapshot hook with IDB cache cells"
```

---

### Task 8: Rewire `useNowData` + `useNowPlans`

**Files:**
- Modify: `src/hooks/useNowData.ts`
- Modify: `src/hooks/useNowPlans.ts`
- Modify: `src/hooks/useNowCache.ts`
- Test: `src/__tests__/useNowData.test.ts`

- [ ] **Step 1: Change `useNowPlans` signature**

Add optional precomputed snapshot:

```typescript
type UseNowPlansParams = {
  social: SocialSnapshot;
  bands: Band[];
  picks: UserPick[];
  crewUsers: CrewUser[];
  presence: UserPresence[];
  userId: string | null;
  userDisplayName: string | null;
  now: Date;
};
```

Remove internal `mapCrewLivePlans` / `groupCrewLivePlans` calls — read from `social.crewPlans`, `social.crewGroups`, `social.metalPlaceWindowActive`, `social.liveTestBandId`.

- [ ] **Step 2: `useNowData` calls `useSocialSnapshot(now)` instead of `useNowCache` for crew/presence/picks**

Keep `useNowCache` only for `latestAnnouncement` OR extend social hook with optional announcement loader (YAGNI: keep announcement in slim `useNowCache`).

- [ ] **Step 3: Run tests — expect PASS**

Run: `rtk npm test -- src/__tests__/useNowData.test.ts src/__tests__/livePreview.test.ts`

- [ ] **Step 4: Commit**

```bash
rtk git commit -m "Phase 31.D: /now consumes shared SocialSnapshot"
```

---

### Task 9: Rewire live vest + delete duplicate cache

**Files:**
- Modify: `src/hooks/useBadgeContext.ts`
- Modify: `src/hooks/useBadgeCache.ts` (delete if fully replaced)
- Modify: `src/services/festivalWrap.ts` / `useFestivalWrapStats.ts` if they duplicate load shape

- [ ] **Step 1: `useBadgeContext` composes `useSocialSnapshot` + missed bands + user picks**

```typescript
export function useBadgeContext(user: AuthUser) {
  const nowDate = useNow(30_000);
  const { snapshot: social, crewUsers, picks, loading: socialLoading } = useSocialSnapshot(nowDate);
  const { allMissed } = useMissedBands(user.id);
  const ctx = useBadgePersist(user.id, { social, crewUsers, picks, allMissed, user, loading: socialLoading });
  return { ctx, loading: socialLoading };
}
```

- [ ] **Step 2: Delete redundant loaders from old `useBadgeCache`** or remove file entirely

- [ ] **Step 3: Update `useFestivalWrapStats` / `buildFestivalWrapStats`** to accept `SocialSnapshot` if it duplicates crew pipeline (grep `mapCrewLivePlans` — consolidate call sites)

- [ ] **Step 4: Run full test suite**

Run: `rtk npm test`

- [ ] **Step 5: Commit**

```bash
rtk git commit -m "Phase 31.D: live vest uses useSocialSnapshot; remove duplicate cache"
```

---

## Sub-phase 31.E — Docs + phase close

### Task 10: CONTEXT.md + wiki

**Files:**
- Modify: `CONTEXT.md`
- Modify: `docs/ai-wiki/architecture.md`
- Modify: `docs/ai-wiki/changelog.md`
- Modify: `docs/ai-wiki/phases-history.md`
- Modify: `PHASES.md`

- [ ] **Step 1: Add to `CONTEXT.md` Language section**

```markdown
**Social snapshot**:
The derived festival-social state shared by `/now` and the live vest — crew plans, crew groups (camping / Metal Place / lost / at band), Metal Place window flag, live test band id, and crew location counts. Built by `buildSocialSnapshot()` from IDB inputs.
_Avoid_: Live preview state, crew cache DTO

**Crew profile cache**:
The `crew_users` IndexedDB store — roster fields including `is_friend` and `special_badges`. Synced from Supabase on reconnect; UI reads this store for display, not live `users` queries.
_Avoid_: Crew IDB, users cache
```

- [ ] **Step 2: Update architecture.md** — add `socialSnapshot.ts`, `useSocialSnapshot.ts` to file map; update system diagram (one derivation path)

- [ ] **Step 3: Append changelog + phases-history Phase 31 entry**

- [ ] **Step 4: Set PHASES.md active section to Phase 31 while in progress; revert to "no active" when closed**

- [ ] **Step 5: Commit**

```bash
rtk git commit -m "Phase 31.E: wiki + CONTEXT for social snapshot unification"
```

---

### Task 11: Final verification

- [ ] **Build:** `rtk npm run build` — PASS
- [ ] **Tests:** `rtk npm test` — PASS
- [ ] **Offline manual test checklist:**
  1. Login online → wait for reconnect sync
  2. DevTools → Network → Offline
  3. `/profile` live vest shows assigned badge from IDB
  4. `/now` crew cards and vest patches agree on lost/camping counts
  5. Godlike assign badge online → `syncCrew` → go offline → target user sees patch

- [ ] **Delegate wiki-curator** if Design System unchanged (no UI change expected)

---

## Self-review (spec coverage)

| Requirement | Task |
|-------------|------|
| `special_badges` on CrewUser + crew sync | Task 1 |
| Offline assigned badges after sync | Tasks 1, 3, 6 |
| No display Supabase reads in vest | Task 6 |
| Unified `buildSocialSnapshot` | Tasks 4–5 |
| Shared `useSocialSnapshot` hook | Tasks 7–9 |
| `/now` + vest same derivation | Tasks 5, 8, 9 |
| Auth metadata hydration on reconnect | Task 2 |
| Godlike assign updates IDB | Task 3 |
| Docs / CONTEXT | Task 10 |

**Known out of scope:** Offline queue for persist-metadata `auth.updateUser` writes; Realtime subscription on `users.special_badges` (reconnect + post-assign syncCrew sufficient for v1).

---

## Subagent execution strategy

| Sub-phase | Suggested subagent | Review focus |
|-----------|-------------------|--------------|
| 31.A | generalPurpose | offline-sync-auditor on repository changes |
| 31.B | generalPurpose | unit tests + livePreview alignment |
| 31.C | generalPurpose | offline-sync-auditor — no Supabase in display path |
| 31.D | generalPurpose | offline-sync-auditor + regression on useNowData |
| 31.E | wiki-curator | changelog + architecture.md accuracy |

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-28-social-snapshot-unification-plan.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per sub-phase, review between phases
2. **Inline Execution** — implement in this session with checkpoints after 31.A, 31.C, 31.D

**Which approach?**
