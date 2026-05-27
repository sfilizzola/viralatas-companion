-- Phase 29: Year-badge archive survives festival:reset and registry rollover.

create table public.user_badge_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  festival_year integer not null,
  slug text not null,
  image_path text not null,
  label_key text not null,
  consolidated_at timestamptz not null default now(),
  constraint user_badge_history_unique unique (user_id, festival_year, slug)
);

create index user_badge_history_user_id_idx
  on public.user_badge_history (user_id);

create index user_badge_history_festival_year_idx
  on public.user_badge_history (festival_year desc);

alter table public.user_badge_history enable row level security;

create policy "Users can read own badge history"
  on public.user_badge_history for select
  using (auth.uid() = user_id);

create policy "Godlike can manage badge history"
  on public.user_badge_history for all
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'godlike'
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'godlike'
    )
  );
