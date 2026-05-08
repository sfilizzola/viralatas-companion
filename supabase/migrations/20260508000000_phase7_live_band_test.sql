-- Phase 7.2: Godlike Live Band Test — pin a band as "live now" for the whole crew.

-- Single-row config table, godlike-only writable.
create table if not exists public.live_band_test_config (
  id          integer primary key default 1 check (id = 1),
  band_id     uuid references public.bands(id) on delete set null,
  enabled     boolean not null default false,
  updated_by  uuid references public.users(id),
  updated_at  timestamptz not null default now()
);

-- Seed the single config row so callers can always upsert by id=1.
insert into public.live_band_test_config (id) values (1) on conflict (id) do nothing;

alter table public.live_band_test_config enable row level security;

create policy "live_band_test_config: authenticated read"
  on public.live_band_test_config for select to authenticated using (true);

create policy "live_band_test_config: godlike insert"
  on public.live_band_test_config for insert to authenticated
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'godlike')
  );

create policy "live_band_test_config: godlike update"
  on public.live_band_test_config for update to authenticated
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'godlike')
  )
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'godlike')
  );

-- Realtime so config changes propagate to all clients.
alter publication supabase_realtime add table public.live_band_test_config;
