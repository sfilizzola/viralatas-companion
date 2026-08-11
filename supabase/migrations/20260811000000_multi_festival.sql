-- Multi-festival foundation: festivals, memberships, festival_id scoping, RLS.
-- Does NOT modify handle_new_user() — new signups Join from the catalog.
-- Godlike does NOT bypass membership for bands / user_picks / announcements.

-- ---------------------------------------------------------------------------
-- 1. Festivals catalog
-- ---------------------------------------------------------------------------
create table if not exists public.festivals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  timezone text not null default 'Europe/Berlin',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  features jsonb not null default '{}'::jsonb,
  cache_version text not null default '1',
  created_at timestamptz not null default now()
);

insert into public.festivals (slug, name, timezone, starts_at, ends_at, features, cache_version)
values (
  'wacken-2026',
  'Wacken Open Air 2026',
  'Europe/Berlin',
  '2026-07-27T00:00:00+02:00',
  '2026-08-02T03:00:00+02:00',
  '{"metal_place":true,"map":true,"duck":true,"camp":true,"wrap":true,"remote_lineup":true}'::jsonb,
  coalesce(
    (select value from public.app_config where key = 'cache_version' limit 1),
    '1'
  )
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Memberships
-- ---------------------------------------------------------------------------
create table if not exists public.festival_memberships (
  user_id uuid not null references public.users (id) on delete cascade,
  festival_id uuid not null references public.festivals (id) on delete cascade,
  opted_in_at timestamptz not null default now(),
  primary key (user_id, festival_id)
);

-- ---------------------------------------------------------------------------
-- 3. Scope bands + per-festival slot uniqueness
-- ---------------------------------------------------------------------------
alter table public.bands
  add column if not exists festival_id uuid references public.festivals (id);

update public.bands
set festival_id = (select id from public.festivals where slug = 'wacken-2026')
where festival_id is null;

alter table public.bands
  alter column festival_id set not null;

-- Drop global slot_id uniqueness (constraint and/or index-backed names)
alter table public.bands drop constraint if exists bands_slot_id_key;
alter table public.bands drop constraint if exists bands_slot_id_unique;
drop index if exists public.bands_slot_id_key;
drop index if exists public.bands_slot_id_unique;

create unique index if not exists bands_festival_slot_id_uidx
  on public.bands (festival_id, slot_id);

create index if not exists idx_bands_festival_id on public.bands (festival_id);

-- ---------------------------------------------------------------------------
-- 4. Scope user_picks (from bands)
-- ---------------------------------------------------------------------------
alter table public.user_picks
  add column if not exists festival_id uuid references public.festivals (id);

update public.user_picks up
set festival_id = b.festival_id
from public.bands b
where up.band_id = b.id and up.festival_id is null;

alter table public.user_picks
  alter column festival_id set not null;

create index if not exists idx_user_picks_festival_id on public.user_picks (festival_id);

-- ---------------------------------------------------------------------------
-- 5. Scope announcements
-- ---------------------------------------------------------------------------
alter table public.announcements
  add column if not exists festival_id uuid references public.festivals (id);

update public.announcements
set festival_id = (select id from public.festivals where slug = 'wacken-2026')
where festival_id is null;

alter table public.announcements
  alter column festival_id set not null;

create index if not exists idx_announcements_festival_id on public.announcements (festival_id);

-- ---------------------------------------------------------------------------
-- 6. Active festival on users
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists active_festival_id uuid references public.festivals (id);

-- ---------------------------------------------------------------------------
-- 7. Cutover backfill: enroll everyone in wacken-2026
-- ---------------------------------------------------------------------------
insert into public.festival_memberships (user_id, festival_id)
select u.id, f.id
from public.users u
cross join public.festivals f
where f.slug = 'wacken-2026'
on conflict (user_id, festival_id) do nothing;

update public.users
set active_festival_id = (select id from public.festivals where slug = 'wacken-2026')
where active_festival_id is null;

-- ---------------------------------------------------------------------------
-- 8. Membership helper (security definer — no RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_festival_member(p_festival_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.festival_memberships m
    where m.festival_id = p_festival_id
      and m.user_id = auth.uid()
  );
$$;

revoke all on function public.is_festival_member(uuid) from public;
grant execute on function public.is_festival_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. RLS — festivals + memberships
-- ---------------------------------------------------------------------------
alter table public.festivals enable row level security;
alter table public.festival_memberships enable row level security;

drop policy if exists festivals_select_authenticated on public.festivals;
create policy festivals_select_authenticated
  on public.festivals for select to authenticated
  using (true);

-- No client insert/update/delete on festivals (ops / service role only)

drop policy if exists festival_memberships_select_own on public.festival_memberships;
create policy festival_memberships_select_own
  on public.festival_memberships for select to authenticated
  using (user_id = auth.uid());

drop policy if exists festival_memberships_select_peers on public.festival_memberships;
create policy festival_memberships_select_peers
  on public.festival_memberships for select to authenticated
  using (public.is_festival_member(festival_id));

drop policy if exists festival_memberships_insert_own on public.festival_memberships;
create policy festival_memberships_insert_own
  on public.festival_memberships for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists festival_memberships_delete_own on public.festival_memberships;
create policy festival_memberships_delete_own
  on public.festival_memberships for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 10. RLS — bands / user_picks (members only; no godlike bypass)
-- ---------------------------------------------------------------------------
drop policy if exists "bands: authenticated read" on public.bands;
drop policy if exists bands_select_members on public.bands;
create policy bands_select_members
  on public.bands for select to authenticated
  using (public.is_festival_member(festival_id));

drop policy if exists "user_picks: authenticated read" on public.user_picks;
drop policy if exists user_picks_select_members on public.user_picks;
create policy user_picks_select_members
  on public.user_picks for select to authenticated
  using (public.is_festival_member(festival_id));

drop policy if exists "user_picks: insert own" on public.user_picks;
drop policy if exists user_picks_insert_own_member on public.user_picks;
create policy user_picks_insert_own_member
  on public.user_picks for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_festival_member(festival_id)
  );

drop policy if exists "user_picks: delete own" on public.user_picks;
drop policy if exists user_picks_delete_own_member on public.user_picks;
create policy user_picks_delete_own_member
  on public.user_picks for delete to authenticated
  using (
    auth.uid() = user_id
    and public.is_festival_member(festival_id)
  );

-- ---------------------------------------------------------------------------
-- 11. RLS — announcements
-- Live policy names (from 20260507000006_simplify_delete_hard_delete.sql):
--   "read_announcements", "insert_announcements", "delete_announcements"
-- ---------------------------------------------------------------------------
drop policy if exists "read_announcements" on public.announcements;
drop policy if exists "announcements: authenticated read" on public.announcements;
drop policy if exists announcements_select on public.announcements;
drop policy if exists announcements_select_members on public.announcements;
create policy announcements_select_members
  on public.announcements for select to authenticated
  using (public.is_festival_member(festival_id));

drop policy if exists "insert_announcements" on public.announcements;
create policy "insert_announcements"
  on public.announcements for insert to authenticated
  with check (
    auth.uid() = author_id
    and public.is_festival_member(festival_id)
    and not exists (
      select 1 from public.blocked_posters where user_id = auth.uid()
    )
  );

-- Keep "delete_announcements" as manager/godlike (unchanged).

-- users.active_festival_id: covered by existing "users: update own profile".
-- Godlike does NOT get a membership bypass for bands / picks / announcements.

-- ---------------------------------------------------------------------------
-- 12. Membership-gated attendance (only count picks from current members)
-- ---------------------------------------------------------------------------
create or replace view public.band_attendance as
  select
    up.band_id,
    count(*)::bigint as going_count
  from public.user_picks up
  inner join public.festival_memberships m
    on m.user_id = up.user_id
   and m.festival_id = up.festival_id
  group by up.band_id;
