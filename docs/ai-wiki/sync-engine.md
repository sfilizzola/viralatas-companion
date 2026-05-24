# Sync Engine

## Purpose

Document how data is synchronized between IndexedDB (primary), offline queues, and Supabase (secondary). This includes startup sync, realtime updates, queue management, and error handling.

---

## Relevant Source Files

- `src/components/sync/` — Sync orchestration (`SyncOrchestration`, `CacheVersionCheck`, `BandSync`, `PickSync`, `AnnouncementSync`, `DuckSync`, `PushSetup`, `DuckNotificationsListener`) — extracted from `App.tsx` (Phase 26.G)
- `src/App.tsx` — Mounts `<SyncOrchestration />` only (84 lines)
- `src/lib/realtimeSync.ts` — `subscribePostgresChanges()` unified Realtime helper (Phase 26.H)
- `src/repositories/picks.ts` — Pick sync, queue deduplication
- `src/repositories/announcements.ts` — Announcement sync and pending queue
- `src/repositories/presence.ts` — Presence sync
- `src/repositories/users.ts` — Crew member sync
- `src/repositories/missed.ts` — Missed band sync
- `src/repositories/bands.ts` — Band sync and cache version checking
- `src/lib/db/` — IndexedDB domain modules (barrel `index.ts`; public shim `src/lib/db.ts`)
- `src/lib/sync.ts` — Band sync helper

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

### 1. CacheVersionCheck

```typescript
function CacheVersionCheck() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      bandsRepository.checkAndApplyCacheVersion().catch(() => {});
    }
  }, [userId]);

  return null;
}
```

**Trigger**: On login (userId changes)

**Purpose**: 
1. Get cache version from Supabase
2. Compare with local cache version (from IndexedDB meta store)
3. If different: `wipeAllLocalData()` → forces full re-sync

**Why?**: If band lineup changes (e.g., band dropped), old picks reference deleted bands. A version bump clears everything and forces fresh fetch.

---

### 2. BandSync

```typescript
function BandSync() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      syncBands().catch(() => {});  // Swallow offline errors
    }
  }, [userId]);

  return null;
}
```

**Trigger**: On login

**Operation**:
```typescript
// src/lib/sync.ts
export async function syncBands(): Promise<void> {
  const { data, error } = await supabase
    .from('bands')
    .select('*')
    .order('start_time');

  if (error) throw error;
  if (data && data.length > 0) await saveBands(data);
}
```

**Behavior**:
- If online: Fetches all bands from Supabase, overwrites IndexedDB
- If offline: Swallows error, user sees cached bands from previous login
- Run once on login; not re-run on reconnect (band list is immutable)

---

### 3. PickSync

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

**Triggers**:
1. On login (userId changes)
2. On 'online' event (window event)

**Operations**:
1. **Flush offline picks** → Process all queued pick changes
2. **Flush offline presence** → Process all queued presence changes
3. **Emit SyncToast** → Tell user "N items synced" (if any flushed)
4. **Sync crew picks** → Fetch all crew picks from Supabase, overwrite IndexedDB
5. **Sync crew users** → Fetch all crew profiles, overwrite IndexedDB
6. **Sync crew presence** → Fetch all crew presence, overwrite IndexedDB

**Realtime subscriptions** (inside hooks like usePickCounts):
- Auto-subscribe to postgres_changes
- On INSERT/DELETE/UPDATE, update IndexedDB immediately
- Components re-render via window events

---

### 4. AnnouncementSync

```typescript
function AnnouncementSync() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    async function syncNow() {
      // 1. Flush pending announcements
      const flushed = await announcementsRepository.flushPending();
      if (flushed > 0) emitSyncComplete();

      // 2. Fetch all announcements
      await announcementsRepository.sync();
    }

    syncNow().catch(() => {});

    function handleOnline() {
      syncNow().catch(() => {});
    }

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [userId]);

  return null;
}
```

**Triggers**: On login and 'online' event

**Operations**:
1. Flush pending announcements → Push offline posts to Supabase
2. Sync all announcements → Fetch from Supabase, overwrite IndexedDB
3. Subscribe to Realtime → New announcements appear in ~3s

---

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
     │  └─ syncBands()
     │     ├─ Fetch bands from Supabase
     │     └─ Save to IndexedDB
     │
     ├─ PickSync
     │  ├─ flushOfflineQueue()
     │  │  └─ (empty if first login)
     │  ├─ syncCrewFromRemote()
     │  │  ├─ Fetch all user_picks from Supabase
     │  │  └─ Overwrite IndexedDB
     │  ├─ usersRepository.syncCrew()
     │  └─ presenceRepository.syncCrewFromRemote()
     │
     ├─ AnnouncementSync
     │  ├─ flushPending()
     │  │  └─ (empty if first login)
     │  ├─ announcementsRepository.sync()
     │
     ├─ DuckSync
     │  └─ (listens to 'online'; flushes offline_duck_quacks via duckRepository.flushOfflineDucks())
     │  │  ├─ Fetch all announcements from Supabase
     │  │  └─ Overwrite IndexedDB
     │  └─ [Subscribe to Realtime]
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

### bandsRepository.checkAndApplyCacheVersion()

```typescript
// In bandsRepository
export const bandsRepository = {
  async checkAndApplyCacheVersion() {
    const { data } = await supabase
      .from('app_config')
      .select('*')
      .eq('key', 'cache_version')
      .single();

    const serverVersion = data?.value;
    const localVersion = await loadCacheVersion();

    if (serverVersion && serverVersion !== localVersion) {
      // Mismatch: lineup changed (or operator bumped), clear all
      await wipeAllLocalData();
      await saveCacheVersion(serverVersion);
      // Force re-fetch on next sync
    }
  }
};
```

**Purpose**: Invalidate cache when the band lineup changes or an operator bumps the version (godlike "Reset all data" button, or `npm run festival:reset` — see `docs/ai-wiki/festival-reset.md`).

**Server table**: `public.app_config` row with `key = 'cache_version'`, `value = <ISO timestamp string>` (defined in `supabase/migrations/20260504000006_cache_version.sql`).

**Trigger**: On every login.

**Side effect**: Clears all picks, announcements, crew data if version mismatch.

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

Each subscription is managed by a hook or repository and cleaned up on unmount via `subscribePostgresChanges` (`src/lib/realtimeSync.ts`).

| Consumer | Channel | Events | Action |
|------|---------|--------|--------|
| usePickCounts | pick_counts | INSERT, DELETE on user_picks | Saves to user_picks IDB |
| useMetalPlaceConfig | metal_place_config_live | * on metal_place_config | Saves to metal_place_config IDB |
| useLiveBandTestConfig | live_band_test_config_live | * on live_band_test_config | Saves to live_band_test_config IDB |
| usePresenceRealtime | user_presence_live | * on user_presence | Saves to user_presence IDB |
| AnnouncementsPage | announcements_live | INSERT/UPDATE/DELETE announcements; INSERT/DELETE blocked_posters | IDB + local block-set state |
| useDuckNotifications | duck_quacks_realtime | INSERT on duck_quacks | Dispatches `viralatas:duck-quack` event |
| missedRepository | missed_bands | INSERT, DELETE on user_missed_bands | Saves to user_missed_bands IDB |

**Subscription lifecycle**:
```typescript
import { subscribePostgresChanges } from '../lib/realtimeSync';

useEffect(() => {
  return subscribePostgresChanges('pick_counts', [
    {
      filter: { event: 'INSERT', table: 'user_picks' },
      handler: async (payload) => saveUserPick(payload.new as UserPick),
    },
  ]);
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
// Triggers PickSync and AnnouncementSync
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

**Last updated:** 2026-05-24 — Phase 26.G sync extract to `src/components/sync/`; 26.H `subscribePostgresChanges`; IDB module path.
