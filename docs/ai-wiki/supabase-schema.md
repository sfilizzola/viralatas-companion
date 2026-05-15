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
  
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);
```

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

**Purpose**: Festival lineup.

```sql
CREATE TABLE public.bands (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  stage text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  image_url text,
  genre text,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(stage, start_time, name)  -- No overlapping bands on same stage
);

CREATE INDEX idx_bands_stage ON public.bands(stage);
CREATE INDEX idx_bands_start_time ON public.bands(start_time);
```

**Realtime**: Enabled (rarely changes, but subscribed for test mode).

**RLS Policy** (select):
```sql
CREATE POLICY "Bands are readable by all"
ON public.bands
FOR SELECT
USING (true);
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

**Seed Script** (`supabase/seed/bands.ts`):
- Fetches official Wacken 2026 lineup (or mocked data for testing)
- Inserts all bands with correct times/stages
- Run: `npm run seed:bands`

---

### `public.user_picks`

**Purpose**: User's interest in watching bands.

```sql
CREATE TABLE public.user_picks (
  user_id uuid NOT NULL,
  band_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  PRIMARY KEY (user_id, band_id),
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  FOREIGN KEY (band_id) REFERENCES public.bands(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_picks_user_id ON public.user_picks(user_id);
CREATE INDEX idx_user_picks_band_id ON public.user_picks(band_id);
```

**Realtime**: Enabled (heavily used, updates via Realtime).

**RLS Policy** (select):
```sql
CREATE POLICY "Users can see all picks"
ON public.user_picks
FOR SELECT
USING (true);  -- All picks are public (no privacy)
```

**RLS Policy** (insert/update):
```sql
CREATE POLICY "Users can only insert their own picks"
ON public.user_picks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own picks"
ON public.user_picks
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

**RLS Policy** (delete):
```sql
CREATE POLICY "Users can only delete their own picks"
ON public.user_picks
FOR DELETE
USING (auth.uid() = user_id);
```

---

### `public.announcements`

**Purpose**: Mural-style posts.

```sql
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL,  -- Soft delete
  
  FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_announcements_author_id ON public.announcements(author_id);
CREATE INDEX idx_announcements_created_at ON public.announcements(created_at DESC);
```

**Soft Delete**: `deleted_at IS NOT NULL` means hidden from clients.

**Realtime**: Enabled.

**RLS Policy** (select):
```sql
CREATE POLICY "Users can see non-deleted announcements"
ON public.announcements
FOR SELECT
USING (deleted_at IS NULL);
```

**RLS Policy** (insert):
```sql
CREATE POLICY "Users can post announcements"
ON public.announcements
FOR INSERT
WITH CHECK (auth.uid() = author_id);
```

**RLS Policy** (delete/soft-delete):
```sql
CREATE POLICY "Author or manager+ can delete announcements"
ON public.announcements
FOR UPDATE
USING (
  auth.uid() = author_id
  OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('manager', 'godlike')
)
WITH CHECK (
  auth.uid() = author_id
  OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('manager', 'godlike')
);
```

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

### `public.metal_place_config`

**Purpose**: Godlike settings for Metal Place check-in window.

```sql
CREATE TABLE public.metal_place_config (
  id serial PRIMARY KEY,
  festival_day integer CHECK (festival_day IN (1, 2, 3, 4, NULL)),
  start_time time DEFAULT '18:00',
  end_time time DEFAULT '06:00',
  label text DEFAULT 'Metal Place',
  test_override_day integer CHECK (test_override_day IN (1, 2, 3, 4, NULL)),
  updated_by uuid,
  updated_at timestamptz DEFAULT now(),
  
  FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

-- Only one row (enforced by app)
INSERT INTO public.metal_place_config (id) VALUES (1);
```

**Realtime**: Enabled.

**RLS Policy**:
```sql
CREATE POLICY "Only godlike can read/update metal_place_config"
ON public.metal_place_config
FOR ALL
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'godlike'
);
```

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

### `public.meta`

**Purpose**: Cache version and system metadata.

```sql
CREATE TABLE public.meta (
  key text PRIMARY KEY,
  cache_version text,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.meta (key, cache_version) VALUES ('cache', '1');
```

**Not realtime**. Checked manually on app init.

---

## Realtime Configuration

**Enabled Tables**:
- public.user_picks
- public.user_presence
- public.announcements
- public.user_missed_bands
- public.metal_place_config
- public.live_band_test_config

**Disabled Tables**:
- public.bands (rarely changes)
- public.users (rarely changes, privacy concern)
- public.blocked_posters (not used yet)
- public.meta (checked manually)

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

**Run**:
```bash
npm run seed:bands
npm run seed:test-users
npm run seed:live-now
```

---

## RLS Policies Summary

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| `users` | All | (via trigger) | Own user (via trigger) | (via trigger) |
| `bands` | All | Godlike | Godlike | Godlike |
| `user_picks` | All | Own user | Own user | Own user |
| `announcements` | Non-deleted | Own author | Author / Manager+ | Author / Manager+ |
| `user_presence` | All | Own user | Own user | Own user |
| `user_missed_bands` | All | Own user | Own user | Own user |
| `metal_place_config` | Godlike | Godlike | Godlike | Godlike |
| `live_band_test_config` | Godlike | Godlike | Godlike | Godlike |

---

## Security Considerations

1. **API Key Never on Client**: Claude API key stored in Supabase secrets, only Edge Functions can access.
2. **RLS Enforced**: Each query checked against RLS policies server-side.
3. **Session Validation**: Supabase Auth validates every API call.
4. **No Admin Backdoor**: Even godlike users respect RLS (they just have different policies).
5. **Soft Deletes**: Deleted announcements filtered at query time, not shown to clients.

---

## Open Questions

- Should blocked_posters enforcement be implemented?
- Should there be a `users_logs` table for audit trail?
- Should announcements have edit history (edit timestamps)?
- Should there be rate limiting on post frequency?

---

**Last updated:** 2026-05-11
