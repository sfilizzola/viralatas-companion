# Viralatas Companion — Architectural Wiki

**Last Updated**: 2026-05-11

## Purpose

This wiki documents the architectural decisions, data flows, and technical patterns in the Viralatas Metaleiros festival companion PWA. It is the single source of truth for system behavior, offline-first guarantees, synchronization semantics, and domain modeling.

## What This App Is

A festival companion PWA for ~20 metal vira-latas attending Wacken Open Air 2026. Core loop:
1. User logs in (via Supabase Auth)
2. Picks bands they want to watch
3. Sees live attendance counts and who's going where (via Realtime)
4. Receives proactive AI alerts powered by Claude
5. Works fully offline after first load (IndexedDB + Service Worker caching)

**Key constraint**: Wacken has terrible signal → entire app must work offline.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite | Component UI, hot reload |
| Offline Store | IndexedDB v8 (`idb` lib) | Primary source of truth for reads |
| Sync Target | Supabase PostgreSQL + Realtime | Source of truth for auth, persistence, live updates |
| Auth | Supabase Auth | Email/password login; persisted to IndexedDB |
| PWA | Vite PWA Plugin + Workbox | Service Worker, manifest, auto-update, caching |
| State Mgmt | Custom hooks + Event emitters | No Redux/Zustand; window events for IDB changes |
| Type Gen | Supabase CLI | Auto-generated TypeScript from PostgreSQL |

---

## Quick Navigation

### Architecture & Design
- **[Architecture Overview](architecture.md)** — Frontend, offline-first, sync, realtime, PWA
- **[Domain Model](domain-model.md)** — Users, bands, picks, announcements, presence
- **[Offline-First Pattern](offline-first.md)** — IndexedDB primary, sync secondary, queue mechanics
- **[Sync Engine](sync-engine.md)** — Optimistic updates, queue deduplication, offline recovery
- **[Routing & Navigation](routes.md)** — All app routes, page structure, guards

### Data & Backend
- **[Supabase Schema](supabase-schema.md)** — Database tables, RLS policies, migrations, realtime setup
- **[Data Repositories](architecture.md#repositories)** — Data access patterns, sync methods

### Flows & Behaviors
- **[Flow: Picking a Band](flows/pick-band.md)** — Optimistic write, realtime update, offline fallback
- **[Flow: Offline Sync](flows/offline-pick-sync.md)** — Queue mechanics, deduplication, reconnect behavior
- **[Flow: Live Now](flows/live-now.md)** — Time-based band display, crew attendance, conflict detection
- **[Flow: Announcements](flows/announcements.md)** — Posting, realtime sync, moderation
- **[Flow: Authentication](flows/authentication.md)** — Login, signup, session persistence, test users

### Quality & Testing
- **[Testing Strategy](testing.md)** — Unit tests, integration tests, offline scenarios
- **[Changelog](changelog.md)** — All wiki modifications, discoveries, corrections

---

## Core Architectural Principles

### 1. IndexedDB Is Primary
All UI reads come from IndexedDB first. Never read directly from Supabase in components.

```mermaid
┌──────────┐
│Component │
└────┬─────┘
     │ reads (immediate)
     ▼
┌──────────────┐
│IndexedDB     │
│ (primary)    │
└──────────────┘
     ▲
     │ syncs (eventual)
     │
┌──────────────┐
│Supabase      │
│ (secondary)  │
└──────────────┘
```

### 2. Writes Are Optimistic
Writes to IndexedDB happen immediately. Supabase sync is fire-and-forget; errors queue the operation.

```javascript
// User picks a band
await saveUserPick(pick);  // IndexedDB — immediate
emitPicksChanged();        // Local components see it now

// Meanwhile, async:
if (online) {
  const { error } = await supabase.from('user_picks').upsert(pick);
  if (error) await queuePick(pick);  // Fall back to queue
}
```

### 3. Offline Queue Deduplication
If a user toggles a pick 10 times offline, only the final action is synced.

```javascript
// Queue groups by (user_id, band_id), keeps last action
const groups = new Map<string, { all: Op[]; last: Op }>();
// Sync only last.action
```

### 4. Realtime Subscriptions Auto-Update
When other crew members' picks arrive via Realtime, IndexedDB is updated automatically.

```javascript
supabase
  .channel('pick_counts')
  .on('postgres_changes', { event: 'INSERT', table: 'user_picks' }, 
    (payload) => saveUserPick(payload.new))
  .subscribe();
```

### 5. Event-Driven Updates
Components listen to window events, not polling. No `setInterval`.

```javascript
window.addEventListener('viralatas:picks-changed', () => {
  // Fetch from IDB and re-render
});
```

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         React Components                      │
│   (RightNowPage, SchedulePage, MyPicksPage, etc.)           │
└──────┬──────────────────────────────────────────────────────┘
       │ reads, dispatches toggles
       ▼
┌─────────────────────────────────────────────────────────────┐
│                     Custom Hooks Layer                        │
│  useAuth, useMyPicks, usePickCounts, useNowData,             │
│  useBandConflicts, useNow (time travel)                      │
└──────┬──────────────────────────────────────────────────────┘
       │ calls, listens to events
       ▼
┌─────────────────────────────────────────────────────────────┐
│              Repository / Service Layer                       │
│  picksRepository, announcementsRepository,                   │
│  presenceRepository, etc. (data access layer)                │
└──────┬──────────────────────────────────────────────────────┘
       │
       ├──────────────────────────────────────────┐
       │ immediate writes + event emit            │
       ▼                                          │
┌──────────────────────┐                  ┌──────▼──────────┐
│  IndexedDB (v8)      │                  │ Window Events   │
│                      │                  │                 │
│  stores:             │                  │ 'picks-changed' │
│  - user_picks        │◄─────────────────│ 'crew-users-...'│
│  - offline_picks     │                  │ 'presence-...'  │
│  - announcements     │                  │ 'announce-...'  │
│  - offline_ann.      │                  │                 │
│  - bands (cache)     │                  └─────────────────┘
│  - crew_users (cache)│
│  - user_presence     │
│  - offline_presence  │
│  - user_missed_bands │
│  - offline_missed    │
└──────────┬───────────┘
           │ async sync (reconnect, 'online' event)
           ▼
┌──────────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL + Realtime)                        │
│                                                            │
│  Tables: users, bands, user_picks, announcements,        │
│          user_presence, user_missed_bands, etc.          │
│                                                            │
│  Realtime: postgres_changes on insert/update/delete      │
└──────────────────────────────────────────────────────────┘
```

---

## Key Files by Concern

| Concern | Files |
|---------|-------|
| **Offline Store** | `src/lib/db.ts`, `src/__tests__/` |
| **Sync Engine** | `src/repositories/picks.ts`, `src/repositories/announcements.ts`, `src/lib/sync.ts` |
| **Realtime** | `src/hooks/usePickCounts.ts`, `src/hooks/useBandAttendees.ts` |
| **Auth** | `src/lib/supabase.ts`, `src/hooks/useAuth.ts`, `src/pages/LoginPage.tsx` |
| **Time System** | `src/hooks/useNow.ts`, `src/services/time.ts`, `src/services/bandTime.ts` |
| **App Shell** | `src/App.tsx` (route setup), `src/components/BottomNav.tsx`, `src/components/PrivateRoute.tsx` |
| **PWA** | `vite.config.ts` (Workbox setup), `public/manifest.json`, Service Worker auto-generated |

---

## Domain Overview

### Entities
- **User**: Email, display name, role (normal/manager/godlike), Wacken years, country, arrival day
- **Band**: Name, stage, time window, genre, image URL
- **UserPick**: User → Band relationship (many-to-many)
- **Announcement**: Text posts with author, creation time, soft-delete support
- **UserPresence**: Camping status, Metal Place check-in status
- **UserMissedBand**: Bands user marked as "didn't watch" (for badges)

### Relationships
```
User (1) ──┬─→ (∞) UserPick ←─ (∞) Band
           ├─→ (∞) Announcement
           ├─→ (1) UserPresence
           └─→ (∞) UserMissedBand
```

---

## Offline Guarantees

| Operation | Online | Offline |
|-----------|--------|---------|
| **Pick band** | IndexedDB + Supabase | IndexedDB + offline queue |
| **View picks** | IndexedDB | IndexedDB |
| **See crew** | Realtime + IndexedDB | IndexedDB only (stale) |
| **Post announcement** | IndexedDB + Supabase | IndexedDB + pending queue |
| **View announcements** | Realtime + IndexedDB | IndexedDB only (stale) |
| **Conflict alerts** | Run offline (cached logic) | Run offline (cached logic) |

**Sync happens**: On app init, `navigator.onLine === true`, on `'online'` event, or manual trigger.

---

## Important Patterns

### Pattern: Optimistic Write
```typescript
// In picksRepository.toggle()
await saveUserPick(pick);      // IndexedDB immediately
if (!navigator.onLine) {
  await queuePick(pick, 'add'); // Queue for later sync
  return;
}
const { error } = await supabase.from('user_picks').upsert(pick);
if (error) await queuePick(pick, 'add'); // Fallback to queue
```

### Pattern: Realtime Auto-Sync
```typescript
// In usePickCounts.ts
supabase.channel('pick_counts')
  .on('postgres_changes', { event: 'INSERT', table: 'user_picks' },
    async (payload) => {
      await saveUserPick(payload.new);  // IndexedDB
      // components listening to PICKS_CHANGED_EVENT re-render
    })
  .subscribe();
```

### Pattern: Queue Deduplication
```typescript
// In picksRepository.flushOfflineQueue()
const groups = new Map<string, { all: Op[]; last: Op }>();
// Group by user_id:band_id, keep only last action
for (const { all, last } of groups.values()) {
  const { error } = await supabase.from('user_picks')
    [last.action === 'add' ? 'upsert' : 'delete'](...);
  if (!error) {
    await Promise.all(all.map(op => removeFromOfflineQueue(op.id)));
  }
}
```

---

## Recommended Reading Order

**New to the codebase?**
1. [Architecture Overview](architecture.md) — Understand the 4-layer design
2. [Domain Model](domain-model.md) — Learn entities and relationships
3. [Offline-First Pattern](offline-first.md) — Core guarantee of the system
4. [Flow: Picking a Band](flows/pick-band.md) — See offline-first in action
5. [Sync Engine](sync-engine.md) — How consistency is maintained
6. [Supabase Schema](supabase-schema.md) — Source of truth tables and policies

**Making a feature?**
1. [Routes & Navigation](routes.md) — Where does your feature go?
2. Relevant flow document (e.g., [Announcements](flows/announcements.md))
3. [Testing](testing.md) — How to verify offline behavior

**Debugging sync issues?**
1. [Sync Engine](sync-engine.md) — Understand the queue semantics
2. [Flow: Offline Sync](flows/offline-pick-sync.md) — Step through reconnect
3. Check `src/lib/db.ts` for event emission patterns

---

## Open Questions

- **Rate limiting**: Are offline queues ever sized? What if a user picks 100+ bands offline?
- **Conflict resolution**: What happens if user is offline, another user deletes a band from the DB?
- **Cache invalidation**: How are stale announcements purged from IndexedDB?
- **Realtime fallback**: If Realtime is down, does the app still work? (Answer: Yes, it reads IndexedDB)

---

## Contributing to This Wiki

When you discover new information or fix an error:

1. Update the relevant `.md` file in `docs/ai-wiki/`
2. Add an entry to [changelog.md](changelog.md) with date and summary
3. If adding a new flow, create `flows/name.md` following the template below
4. If documenting a decision, create `decisions/name.md`

### Template: Flow Documents

```markdown
# Flow: [Name]

## Purpose
Brief description of what the user is doing.

## Trigger
When does this flow happen?

## Happy Path
Step-by-step what happens online.

## Offline Behavior
What changes when offline?

## Sync Behavior (Reconnect)
What happens when reconnecting?

## Relevant Source Files
- File paths with key lines

## Data Flow Diagram
ASCII or mermaid diagram

## Edge Cases
- Lists of things that could go wrong
```

---

## Quick Reference: All Event Types

Window events emitted from `src/lib/db.ts`:
- `'viralatas:picks-changed'` — user_picks or offline_picks updated
- `'viralatas:crew-users-changed'` — crew_users cache updated
- `'viralatas:presence-changed'` — user_presence or offline_presence updated
- `'viralatas:announcements-changed'` — announcements or pending_announcements updated
- `'viralatas:metal-place-config-changed'` — metal_place_config updated
- `'viralatas:live-band-test-config-changed'` — live_band_test_config updated
- `'viralatas:missed-changed'` — user_missed_bands or offline_missed_bands updated

---

**Last edited**: 2026-05-11 by Claude Code
