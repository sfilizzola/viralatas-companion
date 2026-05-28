create table public.user_band_ratings (
  user_id uuid not null references public.users(id) on delete cascade,
  band_id uuid not null references public.bands(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  rated_at timestamptz not null default now(),
  primary key (user_id, band_id)
);

alter table public.user_band_ratings enable row level security;

create policy "authenticated users can view all ratings"
  on public.user_band_ratings for select
  using (auth.role() = 'authenticated');

create policy "users can insert their own ratings"
  on public.user_band_ratings for insert
  with check (auth.uid() = user_id);

create policy "users can update their own ratings"
  on public.user_band_ratings for update
  using (auth.uid() = user_id);

create policy "users can delete their own ratings"
  on public.user_band_ratings for delete
  using (auth.uid() = user_id);

alter publication supabase_realtime add table public.user_band_ratings;
