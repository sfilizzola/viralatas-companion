# Glossary

## Purpose

Vocabulary and terminology used throughout the codebase and documentation.

---

## Core Concepts

### Vira-lata
Portuguese: Stray dog, mutt. In this context, a member of the Viralatas Metaleiros group attending Wacken. Used in user-facing copy instead of "crew" or "member".

### Wacken Open Air 2026
Annual metal music festival in northern Germany, July 29 - Aug 1, 2026. ~170k attendees across 8 stages.

### Band
A musical act performing on one stage at one time slot. 78+ bands total.

### Pick
User's decision to watch a band. Not a commitment, just an interest marker.

### Presence
User's current location/state: camping (in the campground) or at_metal_place (at the festival).

### Conflict (Band Conflict)
Two or more of a user's picks overlap in time. Can be "soft" (10-30 min overlap, doable) or "hard" (major overlap, impossible).

---

## Architecture & Pattern Terms

### Offline-First
App works fully without network. IndexedDB (local) is primary store, Supabase is sync target.

### Optimistic Write
Data written to IndexedDB immediately (user sees change now), Supabase sync happens async.

### Queue (Offline Queue)
Stores operations (pick/unpick/announce/presence) made offline, synced when online. Deduped on flush.

### Deduplication
When flushing queue, group operations by (user_id, band_id), keep only the final action. Avoids redundant sync calls.

### Realtime Subscription
Live connection to Supabase PostgreSQL. Receives `postgres_changes` events (INSERT/UPDATE/DELETE) for tables. Auto-updates IndexedDB.

### Realtime Channel
Named subscription (e.g., `supabase.channel('pick_counts')`). Can subscribe to multiple tables.

### Event Emitter
Window event dispatched when IndexedDB changes. Components listen via `window.addEventListener('viralatas:picks-changed', ...)`.

### Sync
Process of pushing offline queue to Supabase and fetching crew data. Happens on startup and 'online' event.

### Cache Version
String stored in IndexedDB meta. If server version differs, all local data wiped (forced refresh). Used when band lineup changes.

---

## Database & Storage Terms

### IndexedDB (IDB)
Browser database API. Stores JSON objects, survives app restart, persists offline. Used as primary store.

### Supabase
Backend-as-a-service. Provides PostgreSQL database, Auth, Realtime, Edge Functions.

### PostgreSQL
Relational database used by Supabase.

### Row-Level Security (RLS)
PostgreSQL feature. Enforces access control at query time. Only authenticated users + RLS policies control access.

### Migration
SQL file defining schema changes (new tables, columns, indexes). Source of truth for DB structure.

### Soft Delete
Record marked as deleted (deleted_at timestamp) but not removed from DB. Example: announcements.

### Foreign Key
Column referencing another table's ID. Enforces referential integrity.

### Composite Key
Primary key made of multiple columns. Example: user_picks(user_id, band_id).

### Index
Database structure for fast lookups. Example: user_picks has index on user_id for fast "get all picks for user".

---

## React & Frontend Terms

### Hook
React function that adds state/effects to components. Examples: useState, useEffect, useAuth, useMyPicks.

### Component
Reusable React UI element. Example: BandCard, Modal, Button.

### Page
Top-level component for a route. Example: RightNowPage, SchedulePage.

### State
Data that changes over time. Managed by React (useState) or hooks.

### Effect
Side effect (fetch data, subscribe to events) run during component lifecycle. Example: useEffect.

### Event Listener
Function called when window event fires. Example: `window.addEventListener('viralatas:picks-changed', handler)`.

### Prop (Property)
Input to a component. Example: `<BandCard band={band} onPick={handler} />`.

### Controlled Component
Component whose state is managed by parent (props). Example: Input with value={state} onChange={handler}.

### Modal
UI overlay component. Example: BandDetailModal.

---

## Auth & User Terms

### Session
Auth state after successful login. Persisted to IndexedDB, validated server-side.

### User Role
Permission level: normal (base), manager (moderation), godlike (admin).

### Test User
User with is_test_user=true. Created for development/testing. Togglable by godlike.

### Display Name
User-chosen name, shown to crew. Different from email.

### Avatar
User's profile picture URL. Fetched from Gravatar or uploaded.

### Preferred Language
User's chosen UI language: 'br' (Portuguese), 'en' (English), 'es' (Spanish), 'de' (German).

### Country
User's home country. Used for country-based badges.

### Wacken Years
Array of festival years attended. Example: [2018, 2019, 2022]. Used for "veteran" badges.

### Arrival Day
Date user arrives at festival. Used for "early bird" / "late arrival" badges.

---

## Data Terms

### Entity
Real-world object modeled in database. Examples: User, Band, UserPick.

### Relationship
Connection between entities. Example: User has many UserPicks.

### Invariant
Business rule that must always be true. Example: "Only one presence row per user".

### State (Data State)
Current value of data. Example: User has picked band X (state: true) or not (state: false).

### Eventual Consistency
Data is consistent eventually, not immediately. Example: Offline pick is inconsistent until synced.

### Stale Data
Data that's out-of-date. Example: Crew attendance cached 1 hour ago.

---

## Sync & Queue Terms

### Offline Queue
Stores operations made while offline. Examples: offline_picks, offline_announcements.

### Queue Flush
Process of syncing all queued operations to Supabase. Happens on 'online' event.

### Flushed Count
Number of operations successfully synced during a flush.

### Queue Dedup
Grouping queue operations by (user_id, band_id), keeping only the last action.

### Online Event
Browser event fired when navigator.onLine becomes true. Triggers sync.

### Navigator.onLine
Browser API. True if network available, false if offline. Not 100% reliable.

---

## UI & UX Terms

### OfflineBanner
Component showing "🚫 Offline" message. Helps user understand why things won't sync.

### PendingChip
Visual indicator (small "⏳" badge) showing item is queued, not yet synced.

### SyncToast
Notification appearing after sync completes. Example: "✓ Synced 3 items".

### Bottom Nav
6-tab navigation bar (Now, Schedule, My Picks, Popular, Mural, Profile).

### BandCard
Reusable component showing band info: name, stage, time, attendance, pick status.

### BandDetailModal
Full-screen or overlay modal with detailed band info, conflict warnings, attendance breakdown.

### Avatar Cluster
Group of user avatars shown together. Example: "5 users picking this band".

### Conflict Chip
Visual indicator on band card showing it overlaps with another pick.

### Conflict Banner
Large warning banner on /my-picks if user has 3+ conflicts.

### Stage Color
CSS color mapped to stage. Example: Faster (blue), Harder (orange). Visual identifier.

---

## Time Terms

### Festival Day
1-4, corresponding to July 29 - Aug 1, 2026.

### Current Band
Band that's playing now (start_time <= now <= end_time).

### Next Band
User's next pick after current.

### Time Window
Band's performance duration (start_time to end_time).

### Overlap
Two bands' time windows intersect. Example: Band A 18:30-19:30, Band B 19:00-20:00 overlap by 30 min.

### Time Travel
Godlike ability to override current time in test mode. Stored in localStorage, used by useNow().

### Test Mode
Enabled when time travel or live band test override is active. Used for development.

---

## Badge Terms

### Badge
Achievement indicator shown on user's profile. Example: "3+ Wacken years".

### Badge Condition
Rule determining if badge is unlocked. Example: `{ type: 'wacken_years_min', value: 3 }`.

### Unlocked Badge
Condition met, badge shown in color.

### Locked Badge
Condition not met, badge shown grayscale.

### Badge Slug
Unique ID for a badge. Example: 'wacken_veteran'.

### Characteristic Badge
Badge based on user characteristics (country, years, arrival). Examples: "Belgian", "Early Bird".

### Seen Badge
Badge based on bands watched (from user_missed_bands table).

### Special Badge
Godlike-assigned joke badges. Example: "Metal Warrior".

---

## Role Terms

### Normal (Role)
Base user role. Can pick bands, post announcements, see crew.

### Manager (Role)
Can do everything normal users can, plus soft-delete other users' posts.

### Godlike (Role)
Admin role. Full access: edit config, time travel, assign badges, clear cache.

### Permission
Ability granted by role. Example: manager has "block_poster" permission.

---

## Testing Terms

### Unit Test
Test of single function or component in isolation.

### Integration Test
Test of multiple components working together. Example: full auth flow.

### Offline Scenario Test
Manual testing with network disabled.

### Deduplication Test
Verify queue dedup logic (5 toggles → 1 sync call).

### Realtime Test
Verify Realtime subscription updates IndexedDB correctly.

---

## Other Terms

### Godlike
Playful term for admin. Reference to metal mythology (godlike powers). Also the name of the role.

### Vira-latas
Plural of vira-lata. The group name.

### Metal Place
Special check-in status during festival. User is "at the festival" (not camping). Controlled by godlike config.

### Mural
Announcements board. "Mural-style" suggests public, visible to all.

### Crew
Group of vira-latas attending together. Internally called "crew", externally "vira-latas".

---

**Last updated:** 2026-05-11
