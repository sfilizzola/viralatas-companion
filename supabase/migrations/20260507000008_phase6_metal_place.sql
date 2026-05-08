-- Phase 6: Metal Place — festival-day check-in feature.

-- 1. Add column to user_presence for Metal Place attendance.
alter table public.user_presence
  add column if not exists is_at_metal_place boolean not null default false;

-- 2. Single-row config table, godlike-only writable.
create table if not exists public.metal_place_config (
  id                integer primary key default 1 check (id = 1),
  festival_day      integer check (festival_day in (1, 2, 3, 4)),
  start_time        time,
  end_time          time,
  label             text default 'Metal Place',
  test_override_day integer check (test_override_day in (1, 2, 3, 4)),
  updated_by        uuid references public.users(id),
  updated_at        timestamptz not null default now()
);

-- Seed the single config row so callers can always upsert by id=1.
insert into public.metal_place_config (id) values (1) on conflict (id) do nothing;

alter table public.metal_place_config enable row level security;

create policy "metal_place_config: authenticated read"
  on public.metal_place_config for select to authenticated using (true);

create policy "metal_place_config: godlike insert"
  on public.metal_place_config for insert to authenticated
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'godlike')
  );

create policy "metal_place_config: godlike update"
  on public.metal_place_config for update to authenticated
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'godlike')
  )
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'godlike')
  );

-- 3. Realtime so config + presence updates propagate to all clients.
alter publication supabase_realtime add table public.metal_place_config;
