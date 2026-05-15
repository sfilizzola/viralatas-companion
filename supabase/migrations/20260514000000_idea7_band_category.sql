-- Phase 19: Band category column
-- Adds a `category` column to `bands` with a check constraint.
-- Existing rows default to 'band'; ceremony entries use 'ceremony'.

alter table public.bands
  add column if not exists category text not null default 'band';

alter table public.bands
  add constraint bands_category_check
  check (category in ('band', 'ceremony'));
