create table public.user_missed_bands (
  user_id uuid not null references public.users(id) on delete cascade,
  band_id uuid not null references public.bands(id) on delete cascade,
  marked_at timestamptz not null default now(),
  primary key (user_id, band_id)
);

alter table public.user_missed_bands enable row level security;

create policy "users can view all missed records"
  on public.user_missed_bands for select using (true);
create policy "users can insert their own missed"
  on public.user_missed_bands for insert with check (auth.uid() = user_id);
create policy "users can delete their own missed"
  on public.user_missed_bands for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table public.user_missed_bands;
