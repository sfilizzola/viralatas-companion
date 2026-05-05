-- Cache invalidation for all users (godlike-only operation)

-- 1. Single-row config table for app-wide settings
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);

-- 2. Initialize cache_version to '1'
insert into public.app_config (key, value) values ('cache_version', '1')
on conflict (key) do nothing;

-- 3. RLS: any authenticated user can SELECT; only godlike can UPDATE
alter table public.app_config enable row level security;

create policy "crew can read app config"
  on public.app_config for select to authenticated
  using (true);

create policy "godlike can update app config"
  on public.app_config for update to authenticated
  using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'godlike'
    )
  )
  with check (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'godlike'
    )
  );
