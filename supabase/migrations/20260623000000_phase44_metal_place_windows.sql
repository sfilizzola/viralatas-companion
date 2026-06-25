-- Phase 44.A: Metal Place multi-window configuration.
--
-- Replaces single festival_day + time window on metal_place_config with
-- multiple rows in metal_place_windows. Legacy config row id=1 migrates to
-- one window only when festival_day and both times are set; otherwise zero
-- windows (Metal Place off). No invented defaults.
--
-- festival:reset (supabase/seed/festival-reset.ts) preserves metal_place_windows
-- the same way it preserves metal_place_config today — godlike ops state is
-- never wiped by the reset script; do not add a wipe step for this table.

-- 1. Window slots table.
create table public.metal_place_windows (
  id           uuid primary key default gen_random_uuid(),
  festival_day integer not null check (festival_day in (1, 2, 3, 4)),
  start_time   time not null,
  end_time     time not null,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (start_time < end_time),
  check (end_time <= time '23:59')
);

alter table public.metal_place_windows enable row level security;

create policy "metal_place_windows: authenticated read"
  on public.metal_place_windows for select to authenticated using (true);

create policy "metal_place_windows: godlike insert"
  on public.metal_place_windows for insert to authenticated
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'godlike')
  );

create policy "metal_place_windows: godlike update"
  on public.metal_place_windows for update to authenticated
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'godlike')
  )
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'godlike')
  );

create policy "metal_place_windows: godlike delete"
  on public.metal_place_windows for delete to authenticated
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'godlike')
  );

-- 2. Strict data migration from legacy single-window columns (before drop).
insert into public.metal_place_windows (festival_day, start_time, end_time, sort_order)
select festival_day, start_time, end_time, 0
from public.metal_place_config
where id = 1
  and festival_day is not null
  and start_time is not null
  and end_time is not null;

-- 3. Slim metal_place_config to metadata-only row (id=1).
alter table public.metal_place_config
  drop column if exists festival_day,
  drop column if exists start_time,
  drop column if exists end_time,
  drop column if exists test_override_day;

-- 4. Realtime so window + metadata changes propagate to all clients.
alter publication supabase_realtime add table public.metal_place_windows;
