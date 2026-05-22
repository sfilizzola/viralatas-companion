-- Phase 22: Add playlist_testing feature flag to app_settings singleton.
-- Default true = testing mode (only godlike + manager see the button).
-- Inherits existing RLS: anyone reads, only godlike writes.

alter table public.app_settings
  add column if not exists playlist_testing boolean default true not null;
