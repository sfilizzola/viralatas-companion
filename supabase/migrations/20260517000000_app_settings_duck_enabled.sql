-- Phase 21: Duck Killswitch
-- Adds a global toggle that hides the rubber-duck quack button across the app
-- when set to false. Inherits the existing RLS policies on app_settings:
--   * app_settings_select: anyone can read
--   * app_settings_update: only the godlike user (sfilizzola@gmail.com) can write

alter table public.app_settings
  add column if not exists duck_enabled boolean default true not null;

-- Backfill the single existing row (idempotent: the default already takes care
-- of any new row; this protects against historical rows where the column may
-- have been added without a default).
update public.app_settings
  set duck_enabled = true
  where duck_enabled is null;
