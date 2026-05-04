-- Phase 4B: lightweight live presence for camping / lost state.
create table if not exists public.user_presence (
  user_id    uuid primary key references public.users (id) on delete cascade,
  is_camping boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_presence enable row level security;

create policy "user_presence: authenticated read"
  on public.user_presence for select
  to authenticated
  using (true);

create policy "user_presence: insert own"
  on public.user_presence for insert
  with check (auth.uid() = user_id);

create policy "user_presence: update own"
  on public.user_presence for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.user_presence;
