-- Make bands.category nullable so rows without an explicit category
-- (including legacy seeds) are accepted. NULL is treated as 'band'
-- in application logic; only 'ceremony' triggers special handling.

alter table public.bands
  alter column category drop not null;

-- Widen the check constraint to allow NULL in addition to the two values.
alter table public.bands
  drop constraint if exists bands_category_check;

alter table public.bands
  add constraint bands_category_check
  check (category is null or category in ('band', 'ceremony'));
