# Supabase Schema & Backend

## Purpose

Document the PostgreSQL schema, RLS policies, realtime setup, and backend configuration.

---

## Relevant Source Files

- `supabase/migrations/` — All SQL migrations (schema source of truth)
- `supabase/seed/` — Seed scripts for test data
- `supabase/functions/` — Edge Functions (Deno)
- `.env.local` — Supabase credentials (local only, in .gitignore)

---

## High-Level Explanation

Supabase provides:
1. **PostgreSQL Database** — Relational schema for users, bands, picks, etc.
2. **Auth System** — Email/password signup and login
3. **Realtime** — WebSocket subscriptions to table changes
4. **Edge Functions** — Serverless Deno runtime for Claude API calls
5. **RLS Policies** — Row-level security to enforce access control

---

## Core Tables

### `public.festivals` (Phase 47)

**Purpose**: Festival catalog — event instances with dates, optional feature flags, and per-Festival cache version.

**Migration**: `supabase/migrations/20260811000000_multi_festival.sql`

```sql
CREATE TABLE public.festivals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Europe/Berlin',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  cache_version text NOT NULL DEFAULT '1',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Seed cutover**: Inserts `wacken-2026` with all Festival features enabled; `cache_version` seeded from legacy `app_config.cache_version` when present.

**RLS**:
- `festivals_select_authenticated` — SELECT for authenticated (`using (true)`)
- No client INSERT/UPDATE/DELETE (ops / service role only)

**Festival cache version**: Clients compare `festivals.cache_version` for the **Active Festival** against the local pack marker (`meta.active_festival_cache_version`). Mismatch → `clearActiveFestivalPack()` + reload that Festival only. Supersedes global `app_config.cache_version` as the pack invalidation token for multi-festival.

---

### `public.festival_memberships` (Phase 47)

**Purpose**: Opt-in “I’m going” rows. Required for lineup social reads/writes.

```sql
CREATE TABLE public.festival_memberships (
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  festival_id uuid NOT NULL REFERENCES public.festivals (id) ON DELETE CASCADE,
  opted_in_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, festival_id)
);
```

**Cutover**: Existing accounts backfilled into `wacken-2026`. New signups after cutover are **not** auto-enrolled (`handle_new_user()` unchanged).

**RLS**:
- SELECT own (`user_id = auth.uid()`)
- SELECT peers on shared Festivals (`is_festival_member(festival_id)`)
- INSERT/DELETE own only

---

### `public.is_festival_member(p_festival_id uuid)` (Phase 47)

**Purpose**: `SECURITY DEFINER` helper used by RLS — returns whether `auth.uid()` holds a membership. Avoids RLS recursion on `festival_memberships`.

```sql
CREATE FUNCTION public.is_festival_member(p_festival_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.festival_memberships m
    WHERE m.festival_id = p_festival_id AND m.user_id = auth.uid()
  );
$$;
```

Granted `EXECUTE` to `authenticated`. Godlike does **not** bypass this helper for bands / picks / announcements.

---

### `auth.users` (Managed by Supabase Auth)

Created by Supabase, not directly managed by app.

```sql
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb,
  -- ... other auth fields
);
```

**Raw User Meta Data** (set during signup):
```json
{
  "is_test_user": "true" or "false",
  "preferred_language": "br" or "en"
}
```

**Not directly queried** — Supabase Auth manages this table.

---

### `public.users`

**Purpose**: User profile, roles, preferences.

```sql
CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  preferred_language text DEFAULT 'br' CHECK (preferred_language IN ('br', 'en', 'es', 'de')),
  is_test_user boolean DEFAULT false,
  is_friend boolean DEFAULT NULL,  -- NULL/false = normal crew; true = friend (not camping, excluded from camping/lost groups and location badges)
  role text DEFAULT 'normal' CHECK (role IN ('normal', 'manager', 'godlike')),
  created_at timestamptz DEFAULT now(),
  wacken_years int[] DEFAULT ARRAY[]::int[],
  country text CHECK (country IN ('de', 'es', 'br', 'us', 'co', 'be', 'other', NULL)),
  wacken_arrival_day date,
  active_festival_id uuid REFERENCES public.festivals (id),  -- Phase 47 Active Festival preference
  
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);
```

**Active Festival integrity (Phase 47):** Trigger `trg_users_active_festival_membership` / `enforce_active_festival_membership()` — when `active_festival_id` changes to non-null, the user must hold a matching `festival_memberships` row.

**Trigger**: `handle_new_user()` creates row when user signs up.

```sql
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger body:
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    is_test_user,
    preferred_language,
    role
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'is_test_user' = 'true', false),
    COALESCE(new.raw_user_meta_data->>'preferred_language', 'br'),
    CASE WHEN new.email = 'sfilizzola@gmail.com' THEN 'godlike' ELSE 'normal' END
  );
  RETURN new;
END;
$$;
```

**Note**: `COALESCE` pattern prevents NULL errors. Previous bug: `null = 'true'` → null → NOT NULL violation.

**RLS Policy** (select):
```sql
CREATE POLICY "Users can read all user profiles"
ON public.users
FOR SELECT
USING (true);  -- All authenticated users can read all profiles
```

---

### `public.bands`

**Purpose**: Per-Festival lineup.

```sql
CREATE TABLE public.bands (
  id uuid PRIMARY KEY,
  festival_id uuid NOT NULL REFERENCES public.festivals (id),  -- Phase 47
  slot_id text NOT NULL,
  name text NOT NULL,
  stage text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  image_url text,
  genre text,
  category text,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX bands_festival_slot_id_uidx ON public.bands (festival_id, slot_id);
CREATE INDEX idx_bands_festival_id ON public.bands(festival_id);
CREATE INDEX idx_bands_stage ON public.bands(stage);
CREATE INDEX idx_bands_start_time ON public.bands(start_time);
```

**Realtime**: Enabled (rarely changes, but subscribed for test mode).

**RLS Policy** (select — Phase 47 members only; no godlike bypass):
```sql
CREATE POLICY bands_select_members
ON public.bands FOR SELECT TO authenticated
USING (public.is_festival_member(festival_id));
```

**RLS Policy** (insert/update/delete):
```sql
CREATE POLICY "Only godlike can edit bands"
ON public.bands
FOR INSERT, UPDATE, DELETE
USING (
  auth.uid() IS NOT NULL
  AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'godlike'
);
```

**Seed Scripts**:
- **Non-destructive (default):** `npm run seed:bands:sync` — diff by `slot_id`; dry-run by default; `--apply` to write. See [lineup-sync.md](lineup-sync.md).
- **Destructive:** `supabase/seed/bands.ts` — full table replace; wipes picks. Run: `npm run seed:bands`. Banner warns to use sync for small edits.

---

### `public.user_picks`

**Purpose**: User's interest in watching bands (Festival-scoped).

```sql
CREATE TABLE public.user_picks (
  user_id uuid NOT NULL,
  band_id uuid NOT NULL,
  festival_id uuid NOT NULL REFERENCES public.festivals (id),  -- Phase 47
  created_at timestamptz DEFAULT now(),
  
  PRIMARY KEY (user_id, band_id),
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  FOREIGN KEY (band_id) REFERENCES public.bands(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_picks_user_id ON public.user_picks(user_id);
CREATE INDEX idx_user_picks_band_id ON public.user_picks(band_id);
CREATE INDEX idx_user_picks_festival_id ON public.user_picks(festival_id);
```

**Realtime**: Enabled (heavily used, updates via Realtime).

**RLS Policy** (select — Phase 47 Festival members):
```sql
CREATE POLICY user_picks_select_members
ON public.user_picks FOR SELECT TO authenticated
USING (public.is_festival_member(festival_id));
```

**RLS Policy** (insert — own + member + band belongs to festival):
```sql
CREATE POLICY user_picks_insert_own_member
ON public.user_picks FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.is_festival_member(festival_id)
  AND EXISTS (
    SELECT 1 FROM public.bands b
    WHERE b.id = band_id AND b.festival_id = festival_id
  )
);
```

**RLS Policy** (delete — own + member):
```sql
CREATE POLICY user_picks_delete_own_member
ON public.user_picks FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  AND public.is_festival_member(festival_id)
);
```

### `public.band_attendance` (view — Phase 47 membership-gated)

```sql
CREATE VIEW public.band_attendance
WITH (security_invoker = true)
AS
  SELECT up.band_id, count(*)::bigint AS going_count
  FROM public.user_picks up
  INNER JOIN public.festival_memberships m
    ON m.user_id = up.user_id AND m.festival_id = up.festival_id
  GROUP BY up.band_id;
```

`security_invoker = true` so underlying RLS on `user_picks` / memberships still applies. Left-behind picks after Leave do not inflate counts.

---

### `public.user_band_ratings`

**Purpose**: Crew-visible 1–5 concert scores after a set ends. One row per `(user_id, band_id)`.

**Migration**: `20260528100000_phase32_user_band_ratings.sql`

```sql
CREATE TABLE public.user_band_ratings (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  band_id uuid NOT NULL REFERENCES public.bands(id) ON DELETE CASCADE,
  score smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  rated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, band_id)
);
```

**IndexedDB mirror** (IDB v11): store `user_band_ratings` (key `[user_id, band_id]`, index `by_user`); offline queue `offline_band_ratings` (key `id` = `${user_id}|${band_id}`).

**Realtime**: Enabled (`alter publication supabase_realtime add table public.user_band_ratings`). Subscribed in `RealtimeSync` via `ratingsRepository.subscribeToRealtime()` — INSERT/UPDATE upsert to IDB; DELETE removes by composite key.

**RLS Policy** (select):
```sql
CREATE POLICY "authenticated users can view all ratings"
ON public.user_band_ratings FOR SELECT
USING (auth.role() = 'authenticated');
```

**RLS Policy** (insert):
```sql
CREATE POLICY "users can insert their own ratings"
ON public.user_band_ratings FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

**RLS Policy** (update):
```sql
CREATE POLICY "users can update their own ratings"
ON public.user_band_ratings FOR UPDATE
USING (auth.uid() = user_id);
```

**RLS Policy** (delete):
```sql
CREATE POLICY "users can delete their own ratings"
ON public.user_band_ratings FOR DELETE
USING (auth.uid() = user_id);
```

**Client sync**: `ratingsRepository` — optimistic IDB write → Supabase upsert/delete; offline queue flushed in `runReconnectSync()`; full crew pull via `syncCrewFromRemote()` on reconnect.

---

### `public.announcement_reactions`

**Purpose**: Per-user emoji reactions on mural posts (toggle semantics).

**Migration**: `20260614000000_phase43_announcement_reactions.sql`

```sql
CREATE TABLE public.announcement_reactions (
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji           text NOT NULL CHECK (emoji IN ('🤘', '🍺', '🐶', '💀', '🔥', '😂', '👎', '👍')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id, emoji)
);
```

**IndexedDB mirror** (IDB v12): store `announcement_reactions` (key `[announcement_id, user_id, emoji]`, index `by_announcement`); offline queue `offline_announcement_reactions` (key `id` = `${announcement_id}|${user_id}|${emoji}`, `op: 'add' | 'remove'`).

**Realtime**: Enabled. Subscribed in `RealtimeSync` via `reactionsRepository.subscribeToRealtime()` — INSERT saves row; DELETE removes by composite key.

**RLS**: SELECT authenticated; INSERT/DELETE own `user_id` only.

**Client sync**: `reactionsRepository.toggle()` — IDB optimistic INSERT/DELETE → Supabase or offline queue; `flushOfflineQueue()` after announcements flush in `runReconnectSync()`; `syncFromRemote()` full pull after `announcementsRepository.sync()`.

---

### `public.announcements`

**Purpose**: Mural-style posts scoped to a Festival.

```sql
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id uuid NOT NULL REFERENCES public.festivals (id),  -- Phase 47
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL,  -- Soft delete (legacy column; hard-delete path also used)
  
  FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_announcements_festival_id ON public.announcements(festival_id);
CREATE INDEX idx_announcements_author_id ON public.announcements(author_id);
CREATE INDEX idx_announcements_created_at ON public.announcements(created_at DESC);
```

**Realtime**: Enabled.

**RLS Policy** (select — Phase 47 Festival members):
```sql
CREATE POLICY announcements_select_members
ON public.announcements FOR SELECT TO authenticated
USING (public.is_festival_member(festival_id));
```

**RLS Policy** (insert — own + member + not blocked):
```sql
CREATE POLICY "insert_announcements"
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND public.is_festival_member(festival_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.blocked_posters WHERE user_id = auth.uid()
  )
);
```

**RLS Policy** (delete — manager/godlike; unchanged name `delete_announcements`):
Manager/godlike hard-delete policy retained from prior migrations.

---

### `public.blocked_posters`

**Purpose**: Manager moderation (soft-blocking users from posting).

```sql
CREATE TABLE public.blocked_posters (
  user_id uuid NOT NULL,
  blocked_by uuid NOT NULL,
  blocked_at timestamptz DEFAULT now(),
  
  PRIMARY KEY (user_id, blocked_by),
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_by) REFERENCES public.users(id) ON DELETE CASCADE
);
```

**Not currently enforced** in app (future feature). Manager can set blocking, but app doesn't hide posts yet.

---

### `public.user_presence`

**Purpose**: Where is the user (camping vs. Metal Place)?

```sql
CREATE TABLE public.user_presence (
  user_id uuid PRIMARY KEY,
  is_camping boolean DEFAULT true,
  is_at_metal_place boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
```

**Realtime**: Enabled.

**RLS Policy** (select):
```sql
CREATE POLICY "Users can see all presence"
ON public.user_presence
FOR SELECT
USING (true);
```

**RLS Policy** (insert/update):
```sql
CREATE POLICY "Users can update their own presence"
ON public.user_presence
FOR INSERT, UPDATE
WITH CHECK (auth.uid() = user_id);
```

---

### `public.user_missed_bands`

**Purpose**: Track which bands user actually watched (for badges).

```sql
CREATE TABLE public.user_missed_bands (
  user_id uuid NOT NULL,
  band_id uuid NOT NULL,
  marked_at timestamptz DEFAULT now(),
  
  PRIMARY KEY (user_id, band_id),
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  FOREIGN KEY (band_id) REFERENCES public.bands(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_missed_bands_user_id ON public.user_missed_bands(user_id);
```

**Semantics**: "Marked as seen" (despite confusing name).

**Realtime**: Enabled.

**RLS Policies**: Similar to user_picks (users see all, can only modify own).

---

### `public.user_badge_history`

**Purpose**: Frozen year-badge archive after godlike consolidation (Phase 29). Survives `festival:reset`.

```sql
CREATE TABLE public.user_badge_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  festival_year integer NOT NULL,
  slug text NOT NULL,
  image_path text NOT NULL,
  label_key text NOT NULL,
  consolidated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, festival_year, slug)
);
```

**Semantics**: One row per earned year-badge at consolidate time. `image_path` and `label_key` are frozen from `BadgeConfig` (P1 — PNGs never overwritten).

**Realtime**: Disabled (pull on profile load).

**RLS Policies**:
- Users: SELECT own rows
- Godlike: ALL (via Edge Function service role for bulk upsert)

---

### `public.metal_place_config`

**Purpose**: Metadata row for Metal Place configuration (label + audit fields). Window slots live in `metal_place_windows`; the companion app merges both into a single `MetalPlaceConfig` object in IndexedDB.

```sql
CREATE TABLE public.metal_place_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  label text DEFAULT 'Metal Place',
  updated_by uuid REFERENCES public.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Single row (enforced by CHECK + app upsert id=1)
INSERT INTO public.metal_place_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
```

**Realtime**: Enabled (metadata changes trigger client re-fetch of full config).

**RLS Policies**:
- Authenticated: `SELECT`
- Godlike: `INSERT`, `UPDATE`

---

### `public.metal_place_windows`

**Purpose**: Godlike-configurable Metal Place check-in slots (up to 8). Each row is one same-day window on a festival day. Zero rows = Metal Place disabled.

```sql
CREATE TABLE public.metal_place_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_day integer NOT NULL CHECK (festival_day IN (1, 2, 3, 4)),
  start_time time NOT NULL,
  end_time time NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_time < end_time),
  CHECK (end_time <= time '23:59')
);
```

**Constraints**:
- Same-day only — `end_time` must be `≤ 23:59` (overnight windows spanning midnight are **not** supported).
- Overlap validation is enforced client-side on save (`validateMetalPlaceWindows`); DB does not enforce non-overlap.

**Realtime**: Enabled (window INSERT/UPDATE/DELETE triggers client re-fetch of metadata + windows → IndexedDB).

**RLS Policies**:
- Authenticated: `SELECT`
- Godlike: `INSERT`, `UPDATE`, `DELETE`

**Client save strategy** (`presenceRepository.saveMetalPlaceConfigRemote`): upsert metadata row `id=1`; upsert windows by stable UUID; delete server rows not in payload; assign `sort_order` from auto-sort (`festival_day`, `start_time`).

---

### `public.live_band_test_config`

**Purpose**: Godlike override for testing live band logic.

```sql
CREATE TABLE public.live_band_test_config (
  id serial PRIMARY KEY,
  band_id uuid,
  enabled boolean DEFAULT false,
  updated_by uuid,
  updated_at timestamptz DEFAULT now(),
  
  FOREIGN KEY (band_id) REFERENCES public.bands(id),
  FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

-- Only one row
INSERT INTO public.live_band_test_config (id) VALUES (1);
```

**Realtime**: Enabled.

**RLS Policy**: Godlike only.

---

### `public.app_config`

**Purpose**: Generic key/value config table. Historically held a global `cache_version` used to wipe every client's IndexedDB.

```sql
CREATE TABLE public.app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

INSERT INTO public.app_config (key, value) VALUES ('cache_version', '1')
ON CONFLICT (key) DO NOTHING;
```

**Migration**: `supabase/migrations/20260504000006_cache_version.sql`.

**Phase 47 note**: Pack invalidation for the Active Festival uses **`festivals.cache_version`** (`bandsRepository.checkAndApplyCacheVersion` → `shouldInvalidatePack` → `clearActiveFestivalPack`). The multi-festival migration seeds `wacken-2026.cache_version` from this legacy row. Prefer bumping the Active Festival’s `festivals.cache_version` (e.g. `invalidateCacheForAllUsers()`) rather than relying on a global wipe.

**RLS**:
- All authenticated users can `SELECT`.
- Only the godlike user can `UPDATE` (enforced via `public.users.role = 'godlike'` check).

**Not realtime**.

---

### `public.app_settings`

**Purpose**: Single-row table holding global app-wide feature flags. Read by everyone, written only by the godlike user.

```sql
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_enabled boolean DEFAULT true NOT NULL,
  duck_enabled boolean DEFAULT true NOT NULL,
  playlist_testing boolean DEFAULT true NOT NULL,
  camping_latitude double precision NULL,
  camping_longitude double precision NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Exactly one row is expected; created by the original migration.
INSERT INTO public.app_settings DEFAULT VALUES;
```

**Columns:**

- `registration_enabled` — when `false`, the registration screen is closed; only existing vira-latas can log in. Read by `/register` to render the closed state.
- `duck_enabled` (Phase 21) — when `false`, the duck/quack button is not rendered anywhere in the app. Fetched once at app boot via `getDuckEnabled()` and exposed via `DuckEnabledProvider`. See `docs/ai-wiki/flows/duck.md` for full behavior.
- `playlist_testing` (Phase 22 Part 1) — feature-flag for the Playlist Launch button on `/my-picks`. When `true` (default), the button is shown only to `godlike`/`manager` roles (testing mode). When `false`, the button is visible to all vira-latas. The button is always hidden when the user has 0 picks. Read by `PlaylistLaunchButton` on mount via `getPlaylistTesting()` / `setPlaylistTesting()` from `src/lib/appSettings.ts`.
- `camping_latitude` / `camping_longitude` (Phase 45) — nullable decimal GPS for the vira-latas' shared campground. Both null = camp UI hidden. Godlike sets via `CampingLocationAdminSection`; all vira-latas read via `campLocationRepository.syncCampLocation()`. Cached in IndexedDB `camp_location` store. See `docs/ai-wiki/flows/camp-location.md`.

**IndexedDB mirror** (IDB v14): store `camp_location` (key `'current'` → `{ lat, lng }`); no offline queue.

**RLS:**

- `app_settings_select` — `using (true)` — anyone can read.
- `app_settings_update` — `using (auth.jwt() ->> 'email' = 'sfilizzola@gmail.com')` — only the godlike user can update. Applies to all columns.

**Not realtime**. State is fetched once per page mount (not at app boot); the `PlaylistLaunchButton` reads the flag directly on mount. Mid-session admin changes require a page navigation or reload to propagate.

---

## Realtime Configuration

**Enabled Tables**:
- public.user_picks
- public.user_band_ratings
- public.announcement_reactions
- public.user_presence
- public.announcements
- public.user_missed_bands
- public.metal_place_config
- public.metal_place_windows
- public.live_band_test_config

**Disabled Tables**:
- public.bands (rarely changes)
- public.users (rarely changes, privacy concern)
- public.blocked_posters (not used yet)
- public.app_config (read once on app init; cache_version bump propagates on next reload)
- public.app_settings (read once on app init; godlike feature flags propagate on next reload)

**Subscription Pattern** (in hooks):
```typescript
supabase
  .channel('pick_counts')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'user_picks' },
    async (payload) => {
      // Handle INSERT, UPDATE, DELETE
      if (payload.eventType === 'INSERT') {
        await saveUserPick(payload.new);
      } else if (payload.eventType === 'DELETE') {
        await removeUserPick(payload.old.user_id, payload.old.band_id);
      }
    }
  )
  .subscribe();
```

---

## Edge Functions

Located in `supabase/functions/`:

### `process-alerts` (Deno)

**Trigger**: Called manually from client via HTTP

**Purpose**: Generate Claude-powered alerts for crew

**API**: `POST /functions/v1/process-alerts`

**Request Body**:
```json
{
  "userId": "uuid",
  "crewPicks": {...AlertContext.crewPicks...}
}
```

**Response**:
```json
{
  "alert": "🤘 Slipknot em 2 minutos no Faster!",
  "success": true
}
```

**Important**: Calls Claude API (sk-...) with ANTHROPIC_API_KEY from Supabase secrets. Never exposed to client.

---

## Migrations

All migrations are SQL files in `supabase/migrations/`. Source of truth for schema.

**Naming**: `YYYYMMDDHHMMSS_description.sql`

**Example**:
```sql
-- 20260501120000_create_users_table.sql
CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  ...
);
```

**Applying**:
```bash
supabase db push  # Push local migrations to Supabase
supabase db pull  # Pull schema from Supabase (for review)
```

---

## Seed Scripts

Scripts to populate test data (in `supabase/seed/`):

| Script | Purpose |
|--------|---------|
| `bands.ts` | Import Wacken 2026 lineup |
| `test-users.ts` | Create fake vira-latas for testing |
| `live-now.ts` | Time-shift bands for live preview testing |
| `festival-reset.ts` | One-shot pre-festival wipe (announcements, blocked_posters, user_presence, assigned + persistent badges) + `cache_version` bump; chains bands re-seed via `--with-bands`. See `docs/ai-wiki/festival-reset.md`. |

**Run**:
```bash
npm run seed:bands
npm run seed:test-users
npm run seed:live-now
npm run festival:reset             # state-only wipe (destructive; 5s countdown)
npm run festival:reset -- --dry-run
npm run festival:reset -- --with-bands --force
```

---

## RLS Policies Summary

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| `festivals` | Authenticated | — (ops) | — (ops) | — (ops) |
| `festival_memberships` | Own + peer members | Own | — | Own |
| `users` | All | (via trigger) | Own (+ active_festival membership check) | (via trigger) |
| `bands` | Festival members | Godlike | Godlike | Godlike |
| `user_picks` | Festival members | Own + member | — | Own + member |
| `user_band_ratings` | Authenticated | Own user | Own user | Own user |
| `announcement_reactions` | Authenticated | Own user | — | Own user |
| `announcements` | Festival members | Own + member (not blocked) | — | Manager+ (`delete_announcements`) |
| `user_presence` | All | Own user | Own user | Own user |
| `user_missed_bands` | All | Own user | Own user | Own user |
| `metal_place_config` | Authenticated | Godlike | Godlike | — |
| `metal_place_windows` | Authenticated | Godlike | Godlike | Godlike |
| `live_band_test_config` | Godlike | Godlike | Godlike | Godlike |

---

## Security Considerations

1. **API Key Never on Client**: Claude API key stored in Supabase secrets, only Edge Functions can access.
2. **RLS Enforced**: Each query checked against RLS policies server-side.
3. **Session Validation**: Supabase Auth validates every API call.
4. **No Admin Backdoor**: Godlike does **not** bypass `is_festival_member` for bands / picks / announcements — must Join like anyone else for normal PWA access. Cross-Festival ops stay on service role / laptop.
5. **Soft Deletes**: Deleted announcements filtered at query time, not shown to clients.

---

## Open Questions

- Should blocked_posters enforcement be implemented?
- Should there be a `users_logs` table for audit trail?
- Should announcements have edit history (edit timestamps)?
- Should there be rate limiting on post frequency?

---

**Last updated:** 2026-08-11 — Phase 47 multi-festival: `festivals`, `festival_memberships`, `festival_id` columns, `is_festival_member`, membership RLS, `band_attendance` security_invoker, `users.active_festival_id`.
