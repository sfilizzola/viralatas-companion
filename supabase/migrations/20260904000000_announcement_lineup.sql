-- Phase 49: announcement lineup — slots optional until official running order.
-- Godlike may flip festivals.features.running_order (and bump cache_version) from the PWA.
-- Also unblocks existing bandsRepository.invalidateCacheForAllUsers() which already UPDATEs cache_version.

alter table public.bands
  alter column slot_id drop not null,
  alter column stage drop not null,
  alter column start_time drop not null,
  alter column end_time drop not null;

drop index if exists public.bands_festival_slot_id_uidx;

create unique index if not exists bands_festival_slot_id_uidx
  on public.bands (festival_id, slot_id)
  where slot_id is not null;

revoke update on public.festivals from authenticated;
grant update (features, cache_version) on public.festivals to authenticated;

drop policy if exists festivals_update_godlike_features on public.festivals;
create policy festivals_update_godlike_features
  on public.festivals for update to authenticated
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'godlike')
  )
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'godlike')
  );

-- Existing timed festivals stay on schedule Lineup. Missing key = announcement.
update public.festivals
set features = coalesce(features, '{}'::jsonb) || '{"running_order": true}'::jsonb
where slug in ('wacken-2026', 'summer-breeze-2026');
