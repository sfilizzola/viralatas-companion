# Architecture Overview

## Purpose

Document the 4-layer React architecture, offline-first patterns, realtime mechanisms, and how data flows through the system.

---

## Relevant Source Files

- `src/App.tsx` — App shell, route setup, providers
- `src/components/sync/` — Sync orchestration (`CacheVersionCheck`, `BandSync`, `ReconnectSync`, `PushSetup`, `DuckNotificationsListener`)
- `src/lib/syncCoordinator.ts` — `runReconnectSync()` reconnect contract (Phase 27.C)
- `src/lib/db/` — IndexedDB domain modules + barrel (`index.ts`); public entry `src/lib/db.ts` re-exports unchanged surface
- `src/lib/realtimeSync.ts` — Unified Supabase Realtime `postgres_changes` subscription helper
- `src/lib/supabase.ts` — Supabase client + custom auth storage
- `src/repositories/bands.ts` — Band sync (`sync()`), cache version check, godlike cache invalidation (Phase 27.H)
- `src/repositories/` — Data access layer (picks, announcements, users, presence, missed, bands)
- `src/hooks/` — Custom hooks for state management
- `src/pages/` — Route-level page components
- `src/components/` — Shared UI components, modals, sections
- `src/components/PlaylistLaunchButton.tsx` — Setlist deep-link strip (Phase 22)
- `src/components/profile/MoshSplitSection.tsx` — MoshSplit balance section (Phase 23 Part 2 — real API via Vercel proxy)
- `src/components/BadgesDisplay.tsx` — Vest-stack patches UI (presentation)
- `src/hooks/useBadgeContext.ts` — IDB-first badge context + persist recording + `computeCrewLocationCounts`
- `vite.config.ts` — PWA configuration, caching strategy, and local dev proxy for MoshSplit API
- `vercel.json` — Vercel rewrites including MoshSplit CORS proxy (`/api/moshsplit/:path*`)

---

## High-Level Explanation

### 4-Layer Design

```
1. PRESENTATION (React Components)
   └─ src/pages/*.tsx, src/components/*, src/ui/*

2. STATE MANAGEMENT (Custom Hooks)
   └─ src/hooks/use*.ts, window event listeners

3. DATA ACCESS (Repositories & Services)
   └─ src/repositories/*, src/services/*

4. STORAGE (IndexedDB + Supabase)
   └─ src/lib/db.ts → src/lib/db/, src/lib/supabase.ts
```

### Layer 1: Presentation (React Components)

Components are organized by concern:

| Folder | Purpose |
|--------|---------|
| `src/pages/` | Route-level containers (6 pages) |
| `src/components/` | Shared UI building blocks |
| `src/ui/` | Design system (Button, Modal, Input, etc.) |

**Key Pages:**
- `/now` (RightNowPage) — Live band display, crew attendance, conflict detection
- `/schedule` (SchedulePage) — Full lineup with filters (stage, genre, day, time)
- `/my-picks` (MyPicksPage) — User's picks organized by day, conflict warnings
- `/popular` (PopularPage) — Bands sorted by total pick count, avatar clusters
- `/announcements` (AnnouncementsPage) — Mural-style announcements board
- `/profile` (ProfilePage) — User info, role controls, godlike admin

**Pattern**: All pages read from custom hooks, never call repositories directly.

### Viralatas App Pack (Phase 22–23)

The festival tooling for this vira-lata group spans **three separate PWAs**. Companion is the coordination hub; the other two are linked via deep-links, not shared backend or IndexedDB.

| App | URL | Role in the pack | Companion integration |
|-----|-----|------------------|----------------------|
| **Companion** (this repo) | Companion PWA | Find each other — picks, live attendance, alerts, badges | Primary offline-first store |
| **Setlist Vira-Latas** | `setlist.viralatas.org` | Listen — Spotify playlist from picked bands | `PlaylistLaunchButton` on `/my-picks` → `GET /launch?bands=…&user_name=…&lang=…` |
| **MoshSplit** | `split.viralatas.org` | Pay each other — festival expense splits | `MoshSplitSection` on `/profile` → real balance API (via Vercel proxy) + CTA |

**Architectural rules for satellite integrations:**

1. **No shared database** — Setlist and MoshSplit have their own backends. Companion never writes to them.
2. **No IndexedDB cache** for satellite flags or balance — reads are mount-time Supabase (`playlist_testing`) or network fetch (MoshSplit).
3. **Deep-link only** — both integrations open external tabs (`target="_blank"`). Failure modes are silent hide or error UI, never blocking core picks/sync.
4. **Feature flags** — `app_settings.playlist_testing` gates Setlist strip visibility (godlike toggles in admin panel).
5. **MoshSplit uses a Vercel proxy** — `POST /api/moshsplit/pitboss/v1/balances/external-summary` in the browser is rewritten by Vercel to `https://split.viralatas.org/pitboss/v1/balances/external-summary`. The bearer token (`VITE_MOSHSPLIT_TOKEN`) travels inside the same-origin request; no CORS headers are required on the external service. `vite.config.ts` mirrors this rewrite locally via `server.proxy`.

The godlike-assigned **`code-wizards`** badge honors the builders of all three apps. See [Badge System — Merit / Assigned](badges.md#merit--assigned-14).

**Flow docs:** [Playlist Launch](flows/playlist-launch.md) · [MoshSplit Balance](flows/moshsplit.md)

### Observability (Phase 22)

`src/App.tsx` mounts `<SpeedInsights />` from `@vercel/speed-insights/react` inside `<BrowserRouter>` and `<DuckEnabledProvider>`, before the sync components. This fires a single beacon POST to `vitals.vercel-insights.com` per navigation, reporting Core Web Vitals (LCP, CLS, INP, FCP, TTFB) per route.

- **No Service Worker impact** — beacon POSTs are network-only; Workbox does not intercept or cache them.
- **No offline impact** — if the beacon fails (e.g. no signal at Wacken), it is silently dropped. Speed Insights never retries and never queues.
- **Production only** — metrics are visible in the Vercel dashboard; no client-side UI is added.

```typescript
// ❌ Wrong
const picks = await picksRepository.load();

// ✅ Right
const picks = useMyPicks();  // Hook handles IDB reads + realtime
```

---

### Layer 2: State Management (Custom Hooks)

Hooks encapsulate state logic and subscriptions. They:
1. Read from IndexedDB on mount
2. Subscribe to window events
3. Subscribe to Realtime changes
4. Return state + setter functions
5. Clean up subscriptions on unmount

**Hook Categories:**

| Hook | Pattern | Data Source |
|------|---------|------------|
| `useAuth()` | Session state | IDB + Supabase Auth |
| `useBands()` | Band catalog | IDB + `BANDS_CHANGED_EVENT` |
| `useMyPicks()` | User's picks | IDB + window events |
| `usePickActions()` | Pick toggle actions | Composes `useMyPicks` + `picksRepository.toggle` |
| `useMissedBands()` | Missed-band state + actions | IDB + `MISSED_CHANGED_EVENT` |
| `useAnnouncements()` | Announcements mural state + actions | IDB + `ANNOUNCEMENTS_CHANGED_EVENT` + `BLOCKED_POSTERS_CHANGED_EVENT` |
| `usePickCounts()` | Attendance per band | `useAllPicks()` shared cache → `countPicks()` |
| `useBandAttendees(bandId)` | Users going to a band | `useAllPicks()` + `CREW_USERS_CHANGED_EVENT` |
| `useNowData()` | Current/next band for user | IDB + `useNow()` (time) |
| `useBandConflicts(bandIds)` | Overlapping bands | Computed, no DB |
| `useNow()` | Current time (with override) | localStorage + hook state |
| `useBandDetailModal()` | Band detail modal state | Composes pick/missed/attendee inputs |
| `useOfflinePendingBandIds()` | Offline-queued picks | IDB queue stores + events |

**IDB subscription caches (Phase 27.F)**

Multiple hooks read the same IDB store on the same window event. `useIdbSubscription` + `useSyncExternalStore` deduplicate: one listener and one IDB read per cache key, shared across all subscribers.

| Cache hook | Key | Events | Consumers |
|------------|-----|--------|-----------|
| `useAllPicks()` | `all-user-picks` | `PICKS_CHANGED_EVENT` | `usePickCounts`, `useBandAttendees`, `useNowCache`, `useBadgeContext` |

**Example: usePickCounts()**
```typescript
// src/hooks/usePickCounts.ts — derives from shared useAllPicks cache
export function usePickCounts(): Record<string, number> {
  const allPicks = useAllPicks();
  return useMemo(() => countPicks(allPicks ?? []), [allPicks]);
}
```

---

### Layer 3: Data Access (Repositories & Services)

**Repositories** handle CRUD + sync logic:
- `picksRepository` — Toggle picks, sync with Supabase, flush offline queue
- `announcementsRepository` — Post, sync, delete, pin/unpin; current-user role/block checks for mural permissions
- `presenceRepository` — Update camping/Metal Place status
- `usersRepository` — Sync crew to IndexedDB; admin user ops (roles, block list, role map)
- `missedRepository` — Mark bands as "didn't watch"
- `bandsRepository` — Fetch bands, check cache version

**Services** are utility/business logic:
- `time.ts` — Festival day calculation, date utilities
- `bandTime.ts` — Band conflict logic, current/next band
- `badges.ts` — Badge condition evaluation (all client-side)
- `announcementsDisplay.ts` — Pin sort + relative time formatting for mural feed
- `stageColors.ts` — Map stage name to color
- `alerts.ts` — Queue alerts (calls Edge Function via HTTP)

**Repository Pattern:**

All repositories follow this shape:
```typescript
export const picksRepository = {
  toggle(userId, bandId, currentlyPicked): Promise<void>,
  syncForUser(userId): Promise<void>,
  syncCrewFromRemote(): Promise<void>,
  flushOfflineQueue(): Promise<number>,
};
```

**Key Insight**: Repositories never return data directly. They mutate IndexedDB, then components read via hooks.

```typescript
// Inside picksRepository.toggle()
await saveUserPick(pick);        // Write to IDB
emitPicksChanged();               // Components re-render
// Don't return the pick; caller reads from hook
```

---

### Layer 4: Storage

#### IndexedDB (`src/lib/db/`)

Public import path remains `src/lib/db.ts` (thin re-export shim). Domain modules live under `src/lib/db/` (`connection`, `session`, `catalog`, `picks`, `presence`, `announcements`, `missed`, `config`, `duck`, `meta`, `events`, `types`).

**Version**: 8 (incremented on schema changes)

**Object Stores** (collections):

| Store | Key | Purpose |
|-------|-----|---------|
| `session` | string `'current'` | Supabase auth session (custom persistence) |
| `bands` | band.id | Band schedule cache (fetched once on login) |
| `crew_users` | user.id | Crew member profiles (for attendance display) |
| `user_picks` | [user_id, band_id] | User's picks (index by user_id) |
| `offline_picks` | uuid | Picks made while offline, awaiting sync |
| `user_presence` | user_id | Camping + Metal Place status per crew member |
| `offline_presence` | uuid | Presence changes made offline |
| `announcements` | announcement.id | Cached announcements (soft-deleted hidden) |
| `pending_announcements` | announcement.id | Announcements posted offline |
| `user_missed_bands` | [user_id, band_id] | Bands user marked as "didn't watch" |
| `offline_missed_bands` | uuid | Missed marks made offline |
| `metal_place_config` | string `'current'` | Festival day/time for Metal Place |
| `live_band_test_config` | string `'current'` | Test override for live band (godlike) |
| `meta` | string `'cache_version'` | Cache version for invalidation |

**Operations**: All defined in `db.ts` and exported as async functions:
- `saveUserPick(pick)` — Insert or update a pick
- `removeUserPick(userId, bandId)` — Delete a pick
- `loadUserPicks(userId)` — Get all picks for a user
- `replaceUserPicks(picks, userId?)` — Atomic replace (used on sync)
- `enqueueOfflinePick(op)` — Queue a pick action (add/remove)
- `flushOfflineQueue()` — Process all queued picks

**Event Emission**: Each mutation emits a window event:
```typescript
export const PICKS_CHANGED_EVENT = 'viralatas:picks-changed';

function emitPicksChanged() {
  window.dispatchEvent(new Event(PICKS_CHANGED_EVENT));
}

// Called after every mutation
export async function saveUserPick(pick: UserPick) {
  const db = await getDB();
  await db.put('user_picks', pick);
  emitPicksChanged();  // ← Components listening to this event re-render
}
```

---

#### Supabase (src/lib/supabase.ts)

**URL & Key**: From environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

**Custom Auth Persistence**:
Instead of default localStorage, auth session is persisted to IndexedDB via a custom storage adapter:

```typescript
export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    storage: {
      getItem: async (key) => {
        const session = await loadSession();  // IndexedDB read
        return session?.[key] ?? null;
      },
      setItem: async (key, value) => {
        const existing = await loadSession();
        await saveSession({ ...existing, [key]: value });  // IndexedDB write
      },
      removeItem: async (key) => {
        const existing = await loadSession();
        delete existing[key];
        await saveSession(existing);
      },
    },
  },
});
```

**Why?** IndexedDB survives app restart; localStorage can be cleared by browser settings.

---

## Data Flow Diagrams

### Flow 1: User Picks a Band (Online)

```
User clicks "Pick Band" button
         │
         ▼
┌─────────────────────────┐
│ MyPicksPage component   │
│ onClick={toggleBand}    │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ picksRepository.toggle(userId, bandId)  │
└──────────┬──────────────────────────────┘
           │
           ├─→ await saveUserPick(pick)    [IndexedDB write]
           │                               [emit PICKS_CHANGED_EVENT]
           │
           ├─→ if (navigator.onLine) {
           │     const {error} = await supabase.from('user_picks').upsert(pick)
           │     if (error) await queuePick(pick)
           │   }
           │
           ▼
┌─────────────────────────┐
│ Other clients' hooks    │
│ detect PICKS_CHANGED    │
│ via event listener      │
│ Re-render with new      │
│ count                   │
└─────────────────────────┘
           │
           ▼
┌─────────────────────────┐
│ Realtime subscription   │
│ in usePickCounts detects│
│ INSERT in user_picks    │
│ table on server         │
│ (from supabase.upsert)  │
│                         │
│ Calls saveUserPick(new) │
│ (idempotent)            │
└─────────────────────────┘
```

### Flow 2: User Picks a Band (Offline)

```
User clicks "Pick Band" button (offline)
         │
         ▼
┌─────────────────────────┐
│ picksRepository.toggle()│
│ navigator.onLine = false│
└──────────┬──────────────┘
           │
           ├─→ await saveUserPick(pick)        [IndexedDB]
           │   emitPicksChanged()
           │
           └─→ await queuePick(pick, 'add')    [offline_picks store]
               [Exit early, no Supabase call]
```

Later, when online:
```
Window 'online' event fires
         │
         ▼
┌────────────────────────────────────┐
│ App.tsx SyncOrchestration detects 'online'  │
│ Calls picksRepository.flushQueue() │
└────────┬─────────────────────────┘
         │
         ├─→ Load all offline_picks
         │
         ├─→ Group by (user_id, band_id)
         │   Keep last action per group
         │
         ├─→ For each group:
         │   const {error} = supabase[action](...)
         │   if (!error) removeFromOfflineQueue(all ids)
         │
         ▼
[Queue is now empty]
```

---

### Flow 3: Realtime Update (Another Crew Member Picks)

```
Other user clicks pick
         │
         ▼
Supabase server
INSERT into user_picks
         │
         ▼
┌──────────────────────────────────┐
│ All subscribed clients receive   │
│ postgres_changes event via       │
│ Realtime channel                 │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ usePickCounts hook handles:      │
│ .on('postgres_changes',          │
│     event: 'INSERT',             │
│     (payload) => {               │
│       saveUserPick(payload.new)  │
│       [IndexedDB]                │
│       emitPicksChanged()          │
│     })                           │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ usePickCounts state updates │
│ Components re-render with   │
│ new attendance count        │
└─────────────────────────────┘
```

---

## Important Hooks / Services / Repositories

### Hooks (src/hooks/)

| Hook | Returns | Subscribes To | Used By |
|------|---------|---------------|---------|
| `useAuth()` | `{ session, user }` | Supabase auth state | All pages |
| `useBands()` | `{ bands, loading, refresh }` | `BANDS_CHANGED_EVENT` | SchedulePage, MyPicksPage, PopularPage, useNowData |
| `useMyPicks()` | `{ pickedIds, refresh }` | `PICKS_CHANGED_EVENT` | Internal to `usePickActions` |
| `usePickActions()` | `{ pickedIds, refresh, togglePick, pickBand, unpickBand }` | `PICKS_CHANGED_EVENT` | SchedulePage, MyPicksPage, PopularPage, ConflictSection, useNowData |
| `useMissedBands()` | `{ allMissed, missedBandIds, missedCountsByBand, mark, unmark, toggleMissed, refresh }` | `MISSED_CHANGED_EVENT` | MyPicksPage, PopularPage, `useBadgeContext` |
| `useBadgeContext(user)` | `{ ctx, loading }` | `PICKS_CHANGED_EVENT`, `PRESENCE_CHANGED_EVENT`, `CREW_USERS_CHANGED_EVENT`, auth `USER_UPDATED` | BadgesDisplay, ProfilePage |
| `useBandDetailModal()` | `{ activeBand, openBand, closeBand, modalProps }` | None (local state + composed inputs) | MyPicksPage, PopularPage |
| `useAnnouncements()` | `{ announcements, visibleAnnouncements, crewUsers, userRoles, blockedUserIds, pendingAnnouncementIds, loading, isBlocked, canModerate, loadMore, post, deleteAnnouncement, blockUser, pin, … }` | `ANNOUNCEMENTS_CHANGED_EVENT`, `BLOCKED_POSTERS_CHANGED_EVENT` | AnnouncementsPage |
| `usePickCounts()` | `Record<bandId, count>` | `PICKS_CHANGED_EVENT` | RightNowPage, PopularPage — `countPicks` is an exported pure fn |
| `useBandAttendees(bandId)` | `User[]` | `PICKS_CHANGED_EVENT`, `CREW_USERS_CHANGED_EVENT` | BandDetailModal |
| `useMetalPlaceConfig()` | `MetalPlaceConfig \| null` | `METAL_PLACE_CONFIG_CHANGED_EVENT` | useNowData |
| `useLiveBandTestConfig()` | `LiveBandTestConfig \| null` | `LIVE_BAND_TEST_CONFIG_CHANGED_EVENT` | useNowData |
| `useNowCache(undoTimerId)` | `{ picks, crewUsers, presence, latestAnnouncement, cacheLoading }` | `PICKS_CHANGED_EVENT`, `CREW_USERS_CHANGED_EVENT`, `PRESENCE_CHANGED_EVENT`, `ANNOUNCEMENTS_CHANGED_EVENT` | useNowData |
| `useNowPlans({…})` | `{ myPlan, crewPlans, crewGroups, presenceValue, duckBandId, … }` | None (computed from cache + config + time) | useNowData |
| `useNowData()` | `{ myPlan, crewGroups, handleSkip, handleUndo, duckQuack, … }` | composes hooks above + `useNow()`; weak-skip commit timer → `recordCommittedSkip()` | RightNowPage |
| `useBandConflicts(bandIds)` | `Conflict[]` | None (computed) | MyPicksPage |
| `useNow()` | `{ now, override }` | localStorage, window events | Time-based views |
| `useOfflinePendingBandIds()` | `Set<bandId>` | `PICKS_CHANGED_EVENT` | BandCard (show pending chip) |

### Repositories (src/repositories/)

| Repository | Key Methods | Side Effects |
|------------|-------------|--------------|
| `picksRepository` | `toggle()`, `syncCrewFromRemote()`, `flushOfflineQueue()`, `subscribeToRealtime()` | Writes IndexedDB, enqueues offline, calls Supabase |
| `announcementsRepository` | `post()`, `sync()`, `delete()`, `flushPending()`, `pinAnnouncement()`, `unpinAnnouncement()`, `subscribeToRealtime()` | Writes IndexedDB, enqueues pending |
| `presenceRepository` | `update()`, `syncCrewFromRemote()`, `flushOfflineQueue()`, `subscribeToRealtime()`, `subscribeToMetalPlaceConfigRealtime()` | Writes IndexedDB, enqueues offline |
| `usersRepository` | `syncCrew()`, `fetchUserRolesMap()`, `fetchAllUsers()`, `setUserRole()`, `fetchBlockedPosters*()`, `blockUser()`, `unblockUser()`, `subscribeToRealtime()` | Writes crew_users IDB (syncCrew); admin ops network-only |
| `missedRepository` | `toggle()`, `flushOfflineQueue()`, `subscribeToRealtime()` | Writes IndexedDB, enqueues offline |
| `bandsRepository` | `checkAndApplyCacheVersion()`, `loadBands()` | Wipes IDB if cache version changes |

### Services (src/services/)

| Service | Purpose | Client-Side? |
|---------|---------|------------|
| `bandTime.ts` | Band conflict, current/next band logic | ✅ Yes (no IDB reads) |
| `time.ts` | Festival day calc, date helpers | ✅ Yes |
| `badges.ts` | Badge condition evaluation | ✅ Yes |
| `stageColors.ts` | Map stage → CSS color | ✅ Yes |
| `alerts.ts` | Queue alerts for Edge Function | Calls Supabase Edge Function |
| `livePreview.ts` | Live plan grouping, `computeCrewLocationCounts` (badge counts aligned with `/now`) | Reads/writes test config in IDB |
| `bandFilter.ts` | `filterBands(bands, filters, now)` — pure filter predicate extracted from `SchedulePage`; testable without mounting any component | ✅ Yes |
| `scheduleFilterStorage.ts` | `loadStoredFilters()` / `saveStoredFilters()` — localStorage persistence for schedule filter state; extracted from `SchedulePage` | ✅ Yes |
| `attendees.ts` | `computeAttendees(picks, crewUsers)` — maps raw picks to hydrated `BandAttendee[]` per band; exports `BandAttendee` and `AttendeeMap` types | ✅ Yes |
| `weakSkips.ts` | `getWeakSkipCount()`, `recordCommittedSkip()` — committed “I am weak” skips in `user_metadata.weak_skips_2026` via best-effort `auth.updateUser` (same pattern as `location_visits` in `presenceRepository`) | Auth metadata only |

---

## Offline Behavior

**Writes:**
- Pick/unpick: Queued to `offline_picks`, synced on reconnect
- Announcement post: Queued to `pending_announcements`
- Presence update: Queued to `offline_presence`
- Missed band mark: Queued to `offline_missed_bands`
- Weak skip counter / location visit counts: Best-effort `auth.updateUser` on commit (no IDB queue; session cache is read source for badges)

**Reads:**
- Always from IndexedDB (stale if offline)
- Crew attendance counts are from last sync
- Band details (name, time, stage) are from first load (not stale, loaded once)

**Alerts:**
- Conflict alerts run offline (cached logic)
- LLM alerts queued, fired when online

---

## Synchronization Behavior

### On App Startup

1. `App.tsx` mounts `<SyncOrchestration />` (includes `BandSync`, `CacheVersionCheck`, etc.)
2. Fetches bands from Supabase (if online), overwrites IndexedDB
3. `CacheVersionCheck` — compares local cache version with server
   - If mismatch: `wipeAllLocalData()` (forces fresh sync)
4. `ReconnectSync` — `runReconnectSync()`: flush all offline queues, pull remote crew data, emit `viralatas:sync-complete` if items flushed

### On `'online'` Event

```typescript
// src/lib/syncCoordinator.ts — invoked by ReconnectSync on mount + online
await runReconnectSync(userId);
// 1. Flush: picks, presence, announcements, duck, missed queues
// 2. Pull: crew picks, users, presence, announcements, user missed bands
// 3. emitSyncComplete() if any queue items flushed
```

### Queue Deduplication Logic

When flushing offline picks:

```typescript
// Group by (user_id, band_id)
const groups = new Map<string, { all: Op[]; last: Op }>();
for (const op of queue) {
  const key = `${op.user_id}:${op.band_id}`;
  const g = groups.get(key);
  if (g) {
    g.all.push(op);        // Keep all ops for deletion
    g.last = op;           // Remember final action
  } else {
    groups.set(key, { all: [op], last: op });
  }
}

// Sync only last action per group
for (const { all, last } of groups.values()) {
  if (last.action === 'add') {
    await supabase.from('user_picks').upsert({...});
  } else {
    await supabase.from('user_picks').delete().where(...);
  }
  // Only delete from offline queue if successful
  await Promise.all(all.map(op => removeFromOfflineQueue(op.id)));
}
```

**Example**:
- User toggles band 5 times offline: pick, unpick, pick, unpick, pick
- Queue stores 5 operations
- On sync: deduplicated to 1 operation (final: pick)
- Only 1 Supabase call made
- All 5 queue entries removed

---

## Risks / Caveats

1. **No conflict resolution**: If user is offline, another user deletes the band from DB, user's pick becomes orphaned. On reconnect, the upsert succeeds (band recreated). This is acceptable for a small festival app but not for production.

2. **Realtime requires bearer token**: Realtime subscriptions in the browser use the anon key. Row-Level Security (RLS) prevents unauthorized access, but careful review of RLS policies is critical.

3. **Auth session in IndexedDB**: If browser IndexedDB is cleared, user is logged out. Mitigation: Supabase auth still validates on reconnect (auth state is verified server-side).

4. **No encryption**: IndexedDB is not encrypted. Don't store sensitive data (passwords, API keys). Session tokens are OK; Supabase validates them server-side.

5. **Queue size unbounded**: If user makes 1000+ pick changes offline, the queue grows indefinitely. No pruning. Accepted for small groups; needs review for larger audiences.

6. **Crew user cache stale**: Offline, crew member profiles (display_name, avatar_url) are stale. This is expected and documented.

---

## Open Questions

- Should queue operations be compressed (e.g., deduplicate at queue-time, not sync-time)?
- Should offline queue have size limits or TTL?
- Should we implement optimistic conflict resolution (e.g., last-write-wins vs. user-selected)?
- Are there RLS policies preventing godlike users from updating test configs?

---

**Last updated:** 2026-05-24 — Lost location badge fix: `useBadgeContext` + `computeCrewLocationCounts`; BadgesDisplay presentation-only.
