-- Simplify: Hard delete announcements instead of soft delete
-- Drop policies first (before function)
drop policy if exists "read_live_announcements" on public.announcements;
drop policy if exists "insert_announcements" on public.announcements;
drop policy if exists "update_announcements" on public.announcements;
drop policy if exists "read_announcements" on public.announcements;

-- Drop the complex SECURITY DEFINER function
drop function if exists can_delete_announcement(uuid);

-- Remove deleted_at column (no longer needed)
alter table public.announcements drop column if exists deleted_at;

-- Simple policies:
-- READ: Anyone can see announcements
create policy "read_announcements"
  on public.announcements for select
  to authenticated
  using (true);

-- INSERT: Non-blocked users can post
create policy "insert_announcements"
  on public.announcements for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and not exists (
      select 1 from public.blocked_posters where user_id = auth.uid()
    )
  );

-- DELETE: Only godlike/manager users can delete
create policy "delete_announcements"
  on public.announcements for delete
  to authenticated
  using (
    exists (
      select 1 from public.users where id = auth.uid() and role in ('manager', 'godlike')
    )
  );
