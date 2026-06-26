-- Phase 45: Camp HQ geolocation on app_settings singleton.
-- Inherits existing RLS: app_settings_select (anyone reads),
-- app_settings_update (godlike only).

alter table public.app_settings
  add column if not exists camping_latitude double precision null,
  add column if not exists camping_longitude double precision null;
