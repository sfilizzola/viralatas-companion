-- Phase 11.E: Add special_badges column to users table for godlike-assigned joke badges.
alter table public.users
  add column if not exists special_badges text[] not null default '{}';

-- Only godlike users may update special_badges on any row.
-- Regular users may not update this column at all (SELECT is already covered by existing
-- "users: authenticated crew profile read" policy).
create policy "godlike can assign special badges"
  on public.users for update
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'godlike'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'godlike'
    )
  );
