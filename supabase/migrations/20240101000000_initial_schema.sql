-- Phase 1: initial schema for Viralatas Metaleiros

-- users mirrors auth.users with extra profile fields
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  display_name text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- band schedule
create table if not exists public.bands (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  stage      text not null,
  start_time timestamptz not null,
  end_time   timestamptz not null,
  image_url  text,
  genre      text
);

-- which crew members are going to which bands
create table if not exists public.user_picks (
  user_id    uuid not null references public.users (id) on delete cascade,
  band_id    uuid not null references public.bands (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, band_id)
);

-- band attendance view (computed, never a stored count)
create or replace view public.band_attendance as
  select
    band_id,
    count(*) as going_count
  from public.user_picks
  group by band_id;

-- RLS: users can only read/write their own data
alter table public.users       enable row level security;
alter table public.bands       enable row level security;
alter table public.user_picks  enable row level security;

-- users table policies
create policy "users: read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "users: update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "users: insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- bands: everyone authenticated can read the schedule
create policy "bands: authenticated read"
  on public.bands for select
  to authenticated
  using (true);

-- user_picks: authenticated read (needed for crew counts), own write
create policy "user_picks: authenticated read"
  on public.user_picks for select
  to authenticated
  using (true);

create policy "user_picks: insert own"
  on public.user_picks for insert
  with check (auth.uid() = user_id);

create policy "user_picks: delete own"
  on public.user_picks for delete
  using (auth.uid() = user_id);

-- enable realtime on user_picks
alter publication supabase_realtime add table public.user_picks;

-- auto-create a users row on first sign-up via auth trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
