-- Add badges_enabled flag to app_settings singleton.
-- Default false: badge system stays hidden until explicitly enabled by godlike admin.
-- Inherits existing RLS: app_settings_select (anyone reads),
-- app_settings_update (godlike sfilizzola@gmail.com only).

alter table public.app_settings
  add column if not exists badges_enabled boolean not null default false;

-- Defensive backfill for any historical row added before this migration.
update public.app_settings
  set badges_enabled = false
  where badges_enabled is null;
