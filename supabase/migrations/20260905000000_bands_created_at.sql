-- Phase 50 follow-up: make Band announcement timestamps part of canonical DDL.
-- Existing non-null timestamps are preserved; only missing values are backfilled.

alter table public.bands
  add column if not exists created_at timestamptz;

alter table public.bands
  alter column created_at set default now();

update public.bands
set created_at = now()
where created_at is null;

alter table public.bands
  alter column created_at set not null;
