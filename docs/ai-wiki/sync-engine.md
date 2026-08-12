# Sync Engine

## Purpose

Document how data is synchronized between IndexedDB (primary), offline queues, and Supabase (secondary). This includes startup sync, realtime updates, queue management, and error handling.

---

## Relevant Source Files

- `src/components/sync/` — Sync orchestration (`SyncOrchestration`, `CacheVersionCheck`, `BandSync`, `ReconnectSync`, `PushSetup`, `DuckNotificationsListener`) — extracted from `App.tsx` (Phase 26.G)
- `src/lib/syncCoordinator.ts` — `runReconnectSync()` single reconnect contract (Phase 27.C; Active Festival scoped Phase 47)
- `src/lib/festivalCacheVersion.ts` — `shouldInvalidatePack()` per-Festival invalidation (Phase 47)
- `src/lib/db/festivals.ts` — Active Festival meta + `clearActiveFestivalPack()` (Phase 47)
- `src/repositories/festivals.ts` — Catalog/memberships + `loadActivePack` / `setActiveFestival` (Phase 47)
- `src/lib/optimisticQueue.ts` — shared `OptimisticQueue` with configurable dedup strategies (Phase 27.E)
- `src/App.tsx` — Mounts `<SyncOrchestration />` inside `ActiveFestivalProvider`
- `src/lib/realtimeSync.ts` — `subscribePostgresChanges()` unified Realtime helper (Phase 26.H)
- `src/repositories/picks.ts` — Pick sync, queue deduplication (Festival-scoped)
- `src/repositories/announcements.ts` — Announcement sync and pending queue (Festival-scoped)
- `src/repositories/presence.ts` — Presence sync
- `src/repositories/users.ts` — Festival crew sync
- `src/repositories/missed.ts` — Missed band sync
- `src/repositories/bands.ts` — Band sync (`sync(festivalId)`), Festival cache version check, godlike pack invalidation (Phase 47)
- `src/repositories/campLocation.ts` — Camp HQ GPS sync from `app_settings` → IDB `camp_location` (Phase 45; no offline queue)
- `src/lib/db/` — IndexedDB domain modules (barrel `index.ts`; public shim `src/lib/db.ts`)

---

## High-Level Explanation

The sync engine ensures:
1. **Optimistic writes** — User sees changes immediately
2. **Eventual consistency** — Server catches up asynchronously
3. **Offline queue management** — Operations don't get lost
4. **Deduplication** — No redundant sync calls
5. **Realtime updates** — Other users' changes appear in ~3s
6. **Cache invalidation** — Stale data is cleared on version bump

---

## Sync Orchestration (`src/components/sync/`, Phase 26.G)

`App.tsx` mounts `<SyncOrchestration />`, which composes focused sync components:

### 1. CacheVersionCheck (Phase 47 — per-Festival)

```typescript
function CacheVersionCheck() {
  const { session } = useAuth();
  const { activeFestivalId } = useActiveFestival();
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId && activeFestivalId) {
      bandsRepository.checkAndApplyCacheVersion(userId).catch(() => {});
    }
  }, [userId, activeFestivalId]);

  return null;
}
```

**Trigger**: On login / Active Festival change (when both `userId` and `activeFestivalId` present)

**Purpose**:
1. Read Active Festival `festivals.cache_version` from Supabase
2. Compare with local pack marker (`meta.active_festival_cache_version`) via `shouldInvalidatePack`
3. If different: `clearActiveFestivalPack()` → `loadActivePack()` for that Festival only

**Why?**: Lineup / social pack changes for one Festival must not wipe another Festival’s data or forever stores (badge history). Other Festivals’ version bumps are ignored while they are not Active.

**Switch path**: `festivalsRepository.setActiveFestival` also clears the pack, sets id + cache version, then `loadActivePack` (requires network).

---

### 2. BandSync

```typescript
function BandSync() {
  const { session } = useAuth();
  const { activeFestivalId } = useActiveFestival();
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId && activeFestivalId) {
      bandsRepository.sync(activeFestivalId).catch(() => {});
    }
  }, [userId, activeFestivalId]);

  return null;
}
```

**Trigger**: On login / Active Festival change

**Operation** (`bandsRepository.sync(festivalId?)`):
```typescript
async sync(festivalId?: string): Promise<void> {
  let query = supabase.from('bands').select('*');
  if (festivalId) query = query.eq('festival_id', festivalId);
  const { data, error } = await query.order('start_time');
  if (error) throw error;
  if (data && data.length > 0) await saveBands(data);
}
```

**Behavior**:
- If online: Fetches Active Festival bands from Supabase, overwrites IndexedDB bands store
- If offline: Swallows error, user sees cached Active Festival pack
- Re-run when Active Festival changes (after pack clear + reload)

---

### 3. ReconnectSync (Phase 27.C — replaces PickSync, AnnouncementSync, DuckSync)

```typescript
function ReconnectSync() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    async function reconnect() {
      const flushed = await runReconnectSync(userId);
      if (flushed > 0) emitSyncComplete();
    }

    reconnect().catch(() => {});
    window.addEventListener('online', () => reconnect().catch(() => {}));
    return () => window.removeEventListener('online', reconnect);
  }, [userId]);

  return null;
}
```

**Triggers**:
1. On login (userId changes)
2. On `'online'` event (window event)

**Operations** (`runReconnectSync` in `src/lib/syncCoordinator.ts`):

Resolves Active Festival id (IDB meta, else `users.active_festival_id`) and passes it into Festival-scoped flush/pull methods.

1. **Flush offline queues** (parallel batch) — repos expose `flushOfflineQueue(festivalId?)` backed by `OptimisticQueue`:
   - **picks** — `keepLast` by `(user_id, band_id)`, sorted by `created_at`
   - **presence** — `keepLast` by `user_id`, sorted by `updated_at`
   - **missed** — `byId` (`${user_id}|${band_id}`)
   - **announcements** — `fifo` (no dedup)
   - **duck** — `fifo` (no dedup)
   - **ratings** — `byId` (`${user_id}|${band_id}`)
2. **Flush reactions** (sequential, after step 1) — `reactionsRepository.flushOfflineQueue()` (`byId` on `${announcement_id}|${user_id}|${emoji}`); runs after announcements flush so FK targets exist on server
3. **Pull announcements + reactions** (sequential, Active Festival scoped):
   - `announcementsRepository.sync(festivalId)`
   - `reactionsRepository.syncFromRemote(festivalId)` — full pull after announcements (FK ordering)
4. **Pull remote Festival crew data** (parallel, Active Festival scoped):
   - `bandsRepository.sync(festivalId)`
   - `picksRepository.syncCrewFromRemote(festivalId)`
   - `usersRepository.syncCrew(festivalId)`
   - `presenceRepository.syncCrewFromRemote()`
   - `missedRepository.syncFromRemote(userId)`
   - `ratingsRepository.syncCrewFromRemote()`
5. **Return flushed count** — sum of all queue flushes (incl. reactions); `ReconnectSync` emits `viralatas:sync-complete` once if total > 0

**Why one coordinator?** Previously PickSync, AnnouncementSync, and DuckSync each registered separate `online` handlers; DuckSync skipped mount flush; missed-band flush only ran when `useMissedBands` mounted. Hooks (`usePickCounts`, `usePresenceRealtime`, etc.) duplicated remote pulls on mount.

---

### Camp location sync (Phase 45 — outside ReconnectSync)

Camp HQ coordinates are **not** flushed or pulled by `runReconnectSync()`. They use a separate, lighter path:

| Step | When | What |
|------|------|------|
| IDB read | `useCampLocation()` mount | `loadCampLocation()` — immediate UI |
| Remote pull | Same hook mount (online) | `campLocationRepository.syncCampLocation()` → SELECT `app_settings` → write/clear IDB |
| Godlike write | Save/Clear in admin | `saveCampLocationRemote()` / `clearCampLocationRemote()` → Supabase UPDATE + IDB + event |

**Not in scope v1:**
- No `offline_camp_location` queue — admin save requires network
- No Realtime on `app_settings` — consumer devices need page navigation to pick up godlike edits mid-session
- Not part of `runReconnectSync()` pull batch

See `docs/ai-wiki/flows/camp-location.md`.

---

### 4. PickSync (removed in 27.C)

<details>
<summary>Historical — replaced by ReconnectSync</summary>

```typescript
function PickSync() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    async function syncNow() {
      // 1. Flush offline picks
      const [picksFlushed, presenceFlushed] = await Promise.all([
        picksRepository.flushOfflineQueue(),
        presenceRepository.flushOfflineQueue(),
      ]);
      if (picksFlushed + presenceFlushed > 0) emitSyncComplete();

      // 2. Fetch crew data
      await Promise.all([
        picksRepository.syncCrewFromRemote(),
        usersRepository.syncCrew(),
        presenceRepository.syncCrewFromRemote(),
      ]);
    }

    syncNow().catch(() => {});  // Initial sync

    // Re-sync on reconnect
    function handleOnline() {
      syncNow().catch(() => {});
    }

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [userId]);

  return null;
}
```

</details>

## Sync Flows in Detail

### Flow: Offline Queue Flush

```
Trigger: 'online' event or app init

╔════════════════════════════════════════════════════════╗
║  picksRepository.flushOfflineQueue()                   ║
╚════════════════════════════════════════════════════════╝
         │
         ├─ 1. Load all offline_picks from IndexedDB
         │     queue = [{user_id, band_id, action}, ...]
         │
         ├─ 2. Sort by created_at (oldest first)
         │
         ├─ 3. Group by (user_id, band_id)
         │     groups.get('user:band') = {
         │       all: [op1, op2, op3],  ← all operations
         │       last: op3               ← final state
         │     }
         │
         ├─ 4. For each group, sync ONLY last action:
         │     ├─ if (last.action === 'add')
         │     │    await supabase.from('user_picks').upsert({...})
         │     │
         │     └─ else
         │        await supabase.from('user_picks')
         │          .delete()
         │          .eq('user_id', last.user_id)
         │          .eq('band_id', last.band_id)
         │
         ├─ 5. If no error:
         │     await Promise.all(all.map(op => removeFromOfflineQueue(op.id)))
         │     flushed += all.length
         │
         ├─ 6. If error:
         │     Leave all in queue for next retry
         │     Don't increment flushed
         │
         └─ 7. Return flushed count
```

**Example**:
```
Queue before flush:
[
  {id: 'uuid1', user_id: 'alice', band_id: 'band1', action: 'add',    created_at: '10:00'},
  {id: 'uuid2', user_id: 'alice', band_id: 'band1', action: 'remove', created_at: '10:05'},
  {id: 'uuid3', user_id: 'alice', band_id: 'band1', action: 'add',    created_at: '10:10'},
  {id: 'uuid4', user_id: 'bob',   band_id: 'band2', action: 'add',    created_at: '10:00'},
]

Grouped:
{
  'alice:band1': { all: [1,2,3], last: 3 (action='add') },
  'bob:band2':   { all: [4], last: 4 (action='add') }
}

Sync calls:
- upsert({user_id: 'alice', band_id: 'band1', created_at: '10:10'})
  → SUCCESS
  → Remove uuid1, uuid2, uuid3 from queue
  → flushed += 3
  
- upsert({user_id: 'bob', band_id: 'band2', created_at: '10:00'})
  → SUCCESS
  → Remove uuid4 from queue
  → flushed += 1

Result: flushed = 4, queue is empty
```

---

### Flow: Realtime Update

```
Trigger: postgres_changes event from Supabase Realtime

╔════════════════════════════════════════════════════════╗
║  usePickCounts hook's Realtime subscription            ║
╚════════════════════════════════════════════════════════╝
         │
         ├─ Supabase.channel('pick_counts')
         │   .on('postgres_changes', 
         │       { event: 'INSERT', table: 'user_picks' },
         │       async (payload) => {
         │         const pick = payload.new as UserPick;
         │         await saveUserPick(pick);  ← Update IndexedDB
         │         [PICKS_CHANGED_EVENT emitted]
         │       })
         │   .subscribe()
         │
         ├─ Components listening to PICKS_CHANGED_EVENT:
         │   window.addEventListener(PICKS_CHANGED_EVENT, () => {
         │     refreshFromCache();  ← Re-render with new data
         │   });
         │
         └─ User sees new attendance count in ~3 seconds
```

**Invariant**: IndexedDB is updated **before** component re-render, ensuring consistency.

---

### Flow: Sync on App Init

```
User logs in
     │
     ▼
useAuth() detects session
     │
     ├─ CacheVersionCheck
     │  ├─ bandsRepository.checkAndApplyCacheVersion()
     │  │  ├─ Get version from Supabase
     │  │  ├─ Compare with local
     │  │  └─ If mismatch: wipeAllLocalData()
     │  │
     │  └─ bandsRepository.sync()
     │     ├─ Fetch bands from Supabase
     │     └─ Save to IndexedDB
     │
     ├─ ReconnectSync (runReconnectSync)
     │  ├─ flushOfflineQueue() × picks, presence, announcements, duck, missed
     │  ├─ syncCrewFromRemote() + syncCrew() + announcements.sync() + missed.syncFromRemote()
     │  └─ emit viralatas:sync-complete (if flushed > 0)
     │
     └─ User sees populated app with band schedule + crew attendance
```

**Time**: All happens in background; user sees content immediately from IndexedDB cache.

---

## Key Sync Functions

### picksRepository.toggle(userId, bandId, currentlyPicked)

```typescript
async function toggle(userId: string, bandId: string, currentlyPicked: boolean) {
  const now = new Date().toISOString();

  if (currentlyPicked) {
    // Unpick
    await removeUserPick(userId, bandId);  // IndexedDB
    if (!navigator.onLine) {
      await queuePick(userId, bandId, 'remove', now);  // Queue
      return;
    }
    const { error } = await supabase
      .from('user_picks')
      .delete()
      .eq('user_id', userId)
      .eq('band_id', bandId);
    if (error) await queuePick(userId, bandId, 'remove', now);
  } else {
    // Pick
    const pick = { user_id: userId, band_id: bandId, created_at: now };
    await saveUserPick(pick);  // IndexedDB
    if (!navigator.onLine) {
      await queuePick(userId, bandId, 'add', now);  // Queue
      return;
    }
    const { error } = await supabase.from('user_picks').upsert(pick);
    if (error) await queuePick(userId, bandId, 'add', now);
  }
}
```

**Pattern**:
1. Write to IndexedDB immediately
2. If offline, queue and return
3. If online, try Supabase
4. If Supabase fails, queue
5. Never fail the operation to user (graceful degradation)

---

### picksRepository.syncCrewFromRemote()

```typescript
async function syncCrewFromRemote(): Promise<void> {
  const { data, error } = await supabase.from('user_picks').select('*');
  if (error || !data) return;

  // Atomic replace all crew picks
  await replaceUserPicks(data as UserPick[]);
}
```

**Behavior**:
- Fetch all user_picks from Supabase (no filtering)
- Overwrite all picks in IndexedDB (atomic transaction)
- Emit PICKS_CHANGED_EVENT
- Components re-render with new counts

**Called**:
- On app init
- On 'online' event
- Manually (if user wants fresh data)

---

### bandsRepository.checkAndApplyCacheVersion(userId?)

```typescript
async checkAndApplyCacheVersion(userId?: string): Promise<void> {
  const festivalId = await getActiveFestivalId();
  if (!festivalId) return;

  const { data: festival } = await supabase
    .from('festivals')
    .select('id, cache_version')
    .eq('id', festivalId)
    .maybeSingle();

  const localVersion = await getActiveFestivalCacheVersion();
  if (!shouldInvalidatePack(festivalId, { [festivalId]: localVersion }, [festival])) {
    if (localVersion == null) await setActiveFestivalCacheVersion(festival.cache_version);
    return;
  }

  await clearActiveFestivalPack();
  await setActiveFestivalCacheVersion(festival.cache_version);
  if (userId) await festivalsRepository.loadActivePack(userId, festivalId);
}
```

**Purpose**: Invalidate the **Active Festival pack** when that Festival’s lineup/social pack changes (godlike invalidate, remote lineup apply bumping `festivals.cache_version`, or ops).

**Server column**: `public.festivals.cache_version` for the Active Festival. Legacy global `app_config.cache_version` is no longer the pack wipe trigger.

**Trigger**: On login / Active Festival change (`CacheVersionCheck`).

**Side effect**: Clears `FESTIVAL_PACK_OBJECT_STORES` only (not session / badge history); reloads Active pack when `userId` provided.

---

## Error Handling

| Error | Behavior | Recovery |
|-------|----------|----------|
| Offline during pick | Queue operation | Auto-retry on 'online' |
| Supabase validation error | Queue operation | Retry (may fail again) |
| Supabase 5XX error | Queue operation | Auto-retry on 'online' |
| IndexedDB quota exceeded | Log error, stop writes | User clears storage |
| Auth token expired | Redirect to login | User logs in again |
| Realtime connection fails | Fall back to polling (manual sync) | Auto-reconnect |

**Philosophy**: Never fail silently. If operation is queued, we have a record. If queue fails to flush, we'll retry.

---

## Realtime Subscriptions

All Realtime → IndexedDB writes are mounted once in **`RealtimeSync`** (`src/components/sync/SyncOrchestration.tsx`) via repository `subscribeToRealtime()` methods. Hooks react to window events only — they do not own Supabase channels.

| Consumer | Channel | Events | Action |
|------|---------|--------|--------|
| picksRepository | pick_counts | INSERT, DELETE on user_picks | Saves to user_picks IDB |
| presenceRepository | metal_place_config_live | * on metal_place_config **and** metal_place_windows | Full re-fetch via `syncMetalPlaceConfig()` → merged `{ label, windows[] }` in IDB (Phase 44) |
| liveBandTest service | live_band_test_config_live | * on live_band_test_config | Saves to live_band_test_config IDB |
| presenceRepository | user_presence_live | * on user_presence | Saves to user_presence IDB |
| announcementsRepository | announcements_live | INSERT/UPDATE/DELETE announcements | Saves to announcements IDB |
| usersRepository | blocked_posters_live | INSERT/DELETE blocked_posters | Emits `BLOCKED_POSTERS_CHANGED_EVENT` |
| useDuckNotifications | duck_quacks_realtime | INSERT on duck_quacks | Dispatches `viralatas:duck-quack` event |
| missedRepository | missed_bands | INSERT, DELETE on user_missed_bands | Saves to user_missed_bands IDB |

**Not Realtime (v1):** `app_settings` (incl. `camping_latitude` / `camping_longitude`) — camp coords sync on `useCampLocation()` mount only.

**Subscription lifecycle** (sync layer):
```typescript
// src/components/sync/RealtimeSync.tsx
useEffect(() => {
  const unsubscribers = [
    picksRepository.subscribeToRealtime(),
    announcementsRepository.subscribeToRealtime(),
    presenceRepository.subscribeToRealtime(),
    // ...
  ];
  return () => unsubscribers.forEach((u) => u());
}, []);
```

---

## Monitoring & Debugging

### Check Queue Status

```typescript
// In browser console
const queue = await db.getAll('offline_picks');
console.log(`${queue.length} picks pending sync`);
```

### Emit Sync Event Manually

```typescript
// In browser console
window.dispatchEvent(new Event('online'));
// Triggers ReconnectSync → runReconnectSync()
```

### View Cache Version

```typescript
// In browser console
const version = await loadCacheVersion();
console.log(`Local cache version: ${version}`);
```

---

## Open Questions

1. Should sync be debounced (e.g., wait 5s after first write)?
2. Should we implement exponential backoff for failed queue flushes?
3. Should crew data have a TTL (refresh every N hours)?
4. Should offline queue have size limits or warning?

---

## OptimisticQueue (Phase 27.E)

Shared primitive in `src/lib/optimisticQueue.ts`:

```typescript
createOptimisticQueue(storage, {
  getId,
  dedup: { strategy: 'keepLast' | 'byId' | 'fifo', ... },
  syncOne: async (item) => supabase...,
  onBatchSynced?: async (item) => { ... },
});
```

| Domain | Dedup strategy | Group / sort key |
|--------|----------------|------------------|
| Picks | `keepLast` | `(user_id, band_id)` / `created_at` |
| Presence | `keepLast` | `user_id` / `updated_at` |
| Missed bands | `byId` | `${user_id}\|${band_id}` |
| Announcements | `fifo` | — |
| Duck quacks | `fifo` | — |

On flush: load IDB queue → `buildFlushBatches()` → `syncOne()` per batch → remove all IDs in batch on success. Failed batches stay queued for next reconnect.

**Last updated:** 2026-08-11 — Phase 47: Active Festival–scoped reconnect + pack load; per-Festival `festivals.cache_version` invalidation.
