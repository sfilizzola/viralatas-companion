-- Phase 3: crew members need names/avatars for "who is going" lists.
create policy "users: authenticated crew profile read"
  on public.users for select
  to authenticated
  using (true);
