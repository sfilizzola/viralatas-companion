# Domain Model

## Purpose

Document the real-world entities, their relationships, business rules, and invariants.

---

## Relevant Source Files

- `src/types/index.ts` — All type definitions
- `supabase/migrations/` — Database schema (source of truth)
- `src/repositories/` — Business rules enforcement

---

## High-Level Explanation

Viralatas Metaleiros is a small group (~20 people) attending Wacken Open Air 2026 as vira-latas (metal-loving mutts). The domain models:

1. **User** — A vira-lata attending Wacken
2. **Band** — An act performing on one of 8 stages
3. **UserPick** — A vira-lata's interest in seeing a band
4. **UserPresence** — Where is the vira-lata right now (camping vs. at Metal Place)
5. **UserMissedBand** — A band the vira-lata actually watched (marked after the fact)
6. **DuckQuack** — A social "quack" signal sent by a vira-lata during a live band set (Phase 20)
7. **PushSubscription** — A device-level Web Push subscription for background notifications (Phase 20)
8. **Announcement** — A mural post from any vira-lata
9. **BlockedPoster** — Manager blocking moderation rules

---

## Entities

### User

**Essence**: A vira-lata attending the festival, identified by email.

```typescript
type User = {
  id: string;                           // uuid from Supabase Auth
  email: string;                        // Unique, from auth.users
  display_name: string | null;          // Self-chosen name
  avatar_url: string | null;            // Avatar image URL
  preferred_language: 'br' | 'en' | 'es' | 'de';
  is_test_user: boolean;                // Created for testing
  is_friend?: boolean | null;           // Attending but not camping; excludes from camping/lost groups and location badges
  role: UserRole;                       // 'normal' | 'manager' | 'godlike'
  created_at: string;                   // ISO 8601
  wacken_years: number[];               // [2018, 2019, 2022, 2024]
  country: Country | null;              // 'br', 'de', 'us', etc.
  wacken_arrival_day?: string | null;   // Date (e.g., '2026-07-27') for badges
};

type UserRole = 'normal' | 'manager' | 'godlike';
type Country = 'de' | 'es' | 'br' | 'us' | 'co' | 'be' | 'other';
```

**Invariants:**
- Exactly one user per email (Supabase Auth enforces)
- `sfilizzola@gmail.com` is always role='godlike' (trigger `handle_new_user()`)
- All other signups are role='normal'
- Only godlike can assign badges, edit test configs, time travel
- Only manager+ can block posters
- `is_friend = true` → user does not appear in camping/lost crew groups; `PresenceToggle` is hidden; location badges (`metal-place-2026`, `bbq-crew`, `lost-together`) cannot be earned; they are excluded from `crewLocationCounts` (via `computeCrewLocationCounts` / `groupCrewLivePlans`) used to gate crew-location badges for others
- `is_friend = true` → user is excluded from the `ArrivalMap` (`/announcements`) — rows, avatar clusters, and the collapsed-view "X arrived · Y to arrive" totals all derive from non-friend crew members only. The matching arrival-day picker in `EditProfileForm` (`/profile`) is also hidden for friend users; `wacken_arrival_day` is set to `null` on save when the picker is hidden so a stale value cannot be re-published.
- Only godlike can toggle `is_friend` (via admin panel)
- `NULL` and `false` are both treated as non-friend

**Lifecycle:**
1. User signs up (email/password via Supabase Auth)
2. `auth.on_auth_state_changed` fires
3. `handle_new_user()` trigger creates row in `public.users`
4. User profile hydrates from IndexedDB + Supabase

---

### Band

**Essence**: An act performing at a specific stage and time.

```typescript
type Band = {
  id: string;                  // uuid, from official Wacken lineup
  name: string;                // "Slipknot", "Alestorm", etc.
  stage: string;               // "Faster", "Harder", "W.E.T.", etc.
  start_time: string;          // ISO 8601, e.g., "2026-07-29T18:30:00+02:00"
  end_time: string;            // ISO 8601
  image_url: string | null;    // Thumbnail from wacken.com
  genre: string | null;        // One of 13 canonical labels (Phase 25 collapse)
};
```

**Canonical genres (13)** — after Phase 25 collapse, every band carries one of:

`Black Metal` · `Death Metal` · `Doom Metal` · `Folk Metal` · `Hard Rock` · `Heavy Metal` · `Metal` · `Metal Battle` · `Metalcore` · `Party Metal` · `Power Metal` · `Punk` · `Thrash Metal`

Full old→new mapping: **[genre-collapse-mapping.md](genre-collapse-mapping.md)** (wiki lookup table) · `src/services/genreGuide.ts` (`GENRE_COLLAPSE_MAP`). **Why collapse:** [ADR: Genre Collapse to 13 Canonical Labels](decisions/genre-collapse-canonical-labels.md).

**Party Metal** is locked to Alestorm + Airbourne only (badge condition unchanged).

**Invariants:**
- Each band appears once per stage-time (unique constraint)
- Band list is immutable (godlike only)
- Performances don't overlap by stage

**Stages** (8 total):
```
Main Infield (3):  Faster (blue), Harder (orange), Louder (purple)
Outside (2):       W.E.T. (red), Headbangers (teal)
Specialized (3):   Wasteland (dark blue), Wackinger (gray), Welcome to the Jungle (gold)
```

**Lifecycle:**
1. Godlike seeds bands via `npm run seed:bands` (from supabase/seed/bands.ts)
2. Band list cached to IndexedDB on first login
3. User references bands by id in picks

---

### UserPick

**Essence**: A vira-lata has decided to watch a band.

```typescript
type UserPick = {
  user_id: string;             // uuid, foreign key to users
  band_id: string;             // uuid, foreign key to bands
  created_at: string;          // ISO 8601, when pick was made
};
```

**Invariants:**
- Exactly one pick per (user_id, band_id) pair
- User can't pick the same band twice
- Unpicking is deletion (not soft-delete)

**Business Rules:**
- User can pick any number of bands
- Can unpick at any time (even during the performance)
- Picks are visible to all crew members (real-time attendance counts)

**Lifecycle:**
1. User toggles a band in any view (Schedule, My Picks, etc.)
2. `picksRepository.toggle()` writes to IndexedDB immediately (optimistic)
3. Async Supabase call made; if fails, queued to offline_picks
4. Other users see the pick via Realtime subscription within ~3s

---

### UserPresence

**Essence**: Where is the vira-lata right now?

```typescript
type UserPresence = {
  user_id: string;             // uuid
  is_camping: boolean;         // True if at the campground
  is_at_metal_place?: boolean; // True if at the Metal Place (festival area)
  updated_at: string;          // ISO 8601, last status change
};
```

**Invariants:**
- Only one presence row per user
- `is_at_metal_place` is set only during festival day window (godlike-configurable)

**Business Rules:**
- Camping status is user-set (PresenceToggle component)
- Metal Place status is godlike-controlled per day/time
- Presence is visible to all crew (for "where is everyone?" context)

**Lifecycle:**
1. User checks in to camping/Metal Place
2. Presence updates immediately in IndexedDB
3. Async write to Supabase; if offline, queued
4. Other crew see the change via Realtime

---

### UserMissedBand

**Essence**: A vira-lata actually watched a band (after the fact).

```typescript
type UserMissedBand = {
  user_id: string;             // uuid
  band_id: string;             // uuid
  marked_at: string;           // ISO 8601
};
```

**Purpose**: Used to determine which bands the user has actually seen (vs. which they picked but skipped). This unlocks bands-seen badges.

**Invariants:**
- A user can mark a band as "seen" (or "missed", confusing name) only once
- Marking the same band twice is an upsert (idempotent)

**Lifecycle:**
1. During the performance, user opens BandDetailModal
2. Taps "Não vi essa banda" (I didn't watch this one)
3. Record created in IndexedDB immediately
4. Async write to Supabase; if offline, queued

---

### DuckQuack

**Essence**: A social signal emitted by a vira-lata to say "I'm live at this band right now — come join me!" Delivered in-app via Supabase Realtime and as a Web Push system notification to devices in background/closed state.

```typescript
type DuckQuack = {
  id: string;         // uuid, auto-generated
  user_id: string;    // uuid FK → users — who quacked
  band_id: string;    // uuid FK → bands — which band
  quacked_at: string; // ISO 8601 — when the quack was sent
};
```

**Invariants:**
- A quack is INSERT-only; there is no update or delete
- RLS: INSERT own (user_id = auth.uid()); SELECT all authenticated users
- Realtime is enabled on the table so all connected clients receive INSERTs
- The quacker never receives their own notification (filtered in `useDuckNotifications` and `send-duck-push`)

**Business Rules:**
- Duck button is only visible when: band is currently live AND the logged-in user has picked that band AND the band is not `category = 'ceremony'`
- 90-second per-user per-band cooldown enforced client-side via `localStorage` key `duck_cooldown:{userId}:{bandId}`
- Cooldown is per-user; other users' cooldowns are independent
- Offline quacks are queued in the `offline_duck_quacks` IndexedDB store and flushed on reconnect (even if the band set has ended — stale but harmless)

**Delivery paths:**
1. **In-app (foreground):** `useDuckNotifications` → Realtime INSERT event → `viralatas:duck-quack` window event → `DuckToast` shows floating duck notification
2. **Background / closed app:** `send-duck-push` Edge Function (triggered by Database Webhook on INSERT) → Web Push via VAPID → Service Worker `push` event → OS system notification

**Lifecycle:**
1. User presses duck button on a live picked band
2. `useDuckQuack.quack()` called → cooldown set in localStorage
3. `duckRepository.quackBand(userId, bandId)` → INSERT to Supabase (or enqueue offline)
4. Supabase Database Webhook fires `send-duck-push` Edge Function
5. Edge Function queries other pickers of same band (excluding quacker), fetches their `push_subscriptions`, sends Web Push
6. Other users' devices with app open: receive Realtime event → DuckToast appears
7. Other users' devices with app backgrounded/closed: receive OS system notification

**Relevant source files:**
- `src/repositories/duck.ts` — `quackBand`, `flushOfflineDucks`
- `src/hooks/useDuckQuack.ts` — cooldown management + quack call
- `src/hooks/useDuckNotifications.ts` — Realtime listener, window event dispatcher
- `src/components/DuckButton.tsx` — UI with drain animation
- `src/components/DuckToast.tsx` — in-app floating notification
- `supabase/functions/send-duck-push/index.ts` — Web Push Edge Function
- `supabase/functions/send-test-push/index.ts` — Admin diagnostic: sends a test push to the caller's own device

---

### PushSubscription

**Essence**: A device-level registration that lets Supabase Edge Functions send Web Push notifications to a specific user's device even when the app is closed.

```typescript
type PushSubscription = {
  id: string;        // uuid, auto-generated
  user_id: string;   // uuid FK → users
  endpoint: string;  // UNIQUE — push service URL (browser-specific)
  p256dh: string;    // ECDH public key for payload encryption
  auth: string;      // Auth secret for payload encryption
  created_at: string; // ISO 8601
};
```

**Invariants:**
- `endpoint` is UNIQUE — one row per browser/device registration
- RLS: INSERT own; DELETE own; SELECT own only (other users never see your subscription)
- One user can have multiple rows (multiple devices)

**Business Rules:**
- Created when `subscribeToPush(userId)` is called in `PushSetup` (mounted in `App.tsx` after auth)
- Requires: `VITE_VAPID_PUBLIC_KEY` env var on the client; `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` Supabase secrets on the server
- On iOS, the PWA must be installed to the Home Screen (not just opened in Safari) before push permission can be granted
- `subscribeToPush` is idempotent: reuses an existing `PushManager` subscription if one exists
- If `VITE_VAPID_PUBLIC_KEY` is absent, `subscribeToPush` exits silently (no error)
- Stale subscriptions (device uninstalled/expired) cause `send-duck-push` to receive a 410 Gone; those rows should ideally be cleaned up (currently not implemented)

**Lifecycle:**
1. User logs in → `PushSetup` calls `subscribeToPush(userId)`
2. `Notification.requestPermission()` — prompts the user
3. `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` → browser registers with push service
4. `push_subscriptions` row upserted on `endpoint` conflict
5. When a `duck_quacks` INSERT fires, `send-duck-push` queries this table to find recipient subscriptions

**Relevant source files:**
- `src/lib/pushSubscription.ts` — `subscribeToPush(userId)`
- `src/workers/sw.ts` — `push` event handler (shows OS notification), `notificationclick` handler
- `supabase/functions/send-duck-push/index.ts` — reads this table to send quack pushes
- `supabase/functions/send-test-push/index.ts` — reads this table to send a diagnostic test push

---

### Announcement

**Essence**: A public message from a vira-lata to the crew.

```typescript
type Announcement = {
  id: string;                  // uuid, auto-generated
  author_id: string;           // uuid, foreign key to users
  content: string;             // The text (max ~500 chars in UI)
  created_at: string;          // ISO 8601
  deleted_at: string | null;   // Soft-delete timestamp (null = not deleted)
};
```

**Invariants:**
- author_id must exist (foreign key)
- deleted_at is never unset (soft-delete only)
- Only author or manager+ can delete

**Business Rules:**
- Any user can post
- Manager+ can hide other users' posts (soft-delete)
- Godlike can unblock posters
- Posts are visible in reverse-chronological order

**Lifecycle:**
1. User types message in AnnouncementsPage
2. Calls `announcementsRepository.post()`
3. Written to IndexedDB immediately
4. Async write to Supabase; if offline, queued to pending_announcements
5. Other crew see via Realtime within ~3s
6. On reconnect, pending announcements flushed

---

### BlockedPoster

**Essence**: A manager has blocked a user from posting.

```typescript
type BlockedPoster = {
  user_id: string;             // uuid, the blocked user
  blocked_by: string;          // uuid, the manager who blocked them
  blocked_at: string;          // ISO 8601
};
```

**Invariants:**
- A user can be blocked once
- Only manager+ can block

**Business Rules:**
- Blocked users can still post (soft moderation)
- Their posts are hidden from other crew until unblocked
- They themselves see their own posts (for context)

---

### MetalPlaceConfig

**Essence**: Godlike settings for where the crew "is" during the festival day.

```typescript
type MetalPlaceConfig = {
  id?: number;
  festival_day?: number | null;        // 1, 2, 3, or 4
  start_time?: string | null;          // HH:MM, e.g., "18:00"
  end_time?: string | null;            // HH:MM
  label?: string;                      // "Metal Place", custom name
  test_override_day?: number | null;   // For testing (bypasses current day)
  updated_by?: string;                 // uuid of godlike user
  updated_at?: string;                 // ISO 8601
};
```

**Purpose**: Defines when vira-latas are "at the festival" (vs. camping/exploring).

---

### LiveBandTestConfig

**Essence**: Godlike override for testing live band logic.

```typescript
type LiveBandTestConfig = {
  id?: number;
  band_id?: string | null;             // Which band is "live now"
  enabled?: boolean;                   // True to use override
  updated_by?: string;                 // uuid
  updated_at?: string;
};
```

**Purpose**: For testing `/now` without waiting for real time.

---

## Relationships

```
User (1) ──┬─→ (∞) UserPick ←─ (∞) Band
           │
           ├─→ (1) UserPresence
           │
           ├─→ (∞) Announcement [via author_id]
           │
           ├─→ (∞) BlockedPoster [via user_id or blocked_by]
           │
           └─→ (∞) UserMissedBand ←─ (∞) Band


Announcement
    │
    └─→ (1) User [via author_id]
    └─→ (1) User [via BlockedPoster.blocked_by]
```

---

## Computed Entities

### BandAttendance (Computed View)

Not stored; computed from user_picks table:

```sql
SELECT band_id, COUNT(*) as count
FROM user_picks
GROUP BY band_id;
```

Cached in `usePickCounts()` hook, updated via Realtime.

### BandConflict (Computed)

Bands that overlap in time and a user has picked both:

```typescript
type BandConflict = {
  bandIds: string[];    // Bands that overlap
  severity: 'soft' | 'hard';
  overlapMinutes: number;
};
```

Computed in `useBandConflicts()` using `bandTime.ts` utilities. No database representation.

### CurrentBand / NextBand (Computed)

For a given user, their current or next performance:

```typescript
type CurrentBandInfo = {
  band: Band;
  startsIn: number;    // minutes
  isNow: boolean;      // true if within performance window
  endsIn: number;      // minutes until it ends
};
```

Computed in `useNowData()` using current time + user picks.

---

## Business Rules by Role

### normal
- Pick/unpick bands
- View crew attendance
- Post announcements
- Check in to camping/Metal Place
- Mark bands as seen/missed
- View own profile
- Change display name, language, avatar

### manager
- All `normal` permissions
- Block/unblock posters
- Soft-delete announcements

### godlike
- All permissions above
- Edit band lineup (seed)
- Control Metal Place check-in window
- Time travel (test mode)
- Assign special joke badges
- Configure live band test override
- Edit test user flag
- Modify other users' profiles (future)

---

## Domain Invariants (Constraints)

| Invariant | Enforcement | Risk |
|-----------|-------------|------|
| Unique user per email | Supabase Auth + DB unique | High |
| Exactly one presence per user | DB unique (user_id) | Medium |
| Unique pick per band per user | DB unique ([user_id, band_id]) | Medium |
| Author exists for announcement | Foreign key | Low (soft moderation) |
| Band exists for pick | Foreign key (optional enforcement) | Low (orphaned picks OK) |
| Godlike role limited to 1 email | Trigger on signup | High |

---

## Data Consistency Model

**Eventual Consistency**:
- Offline, user sees cached crew attendance (stale by hours/days)
- Reconnect, attendance counts refresh within 3s via Realtime
- No strong consistency guarantees
- No transactional isolation (multiple tables)

**Acceptable for**:
- Small group, low contention
- Non-critical (entertainment use)
- Tolerance for stale data

**Not acceptable for**:
- Financial transactions
- Authorization (mitigated by RLS + Supabase auth)

---

## Open Questions

- Should `UserMissedBand` be renamed to `UserSeenBand` (clearer semantics)?
- Should band picks enforce referential integrity or allow orphans?
- Should announcements support threading/replies (future)?
- Should presence track time-series history (past band visits)?

---

**Last updated:** 2026-05-11
