-- Add Belgium as a country option

alter table public.users
  drop constraint users_country_check;

alter table public.users
  add constraint users_country_check check (country in ('de', 'es', 'br', 'us', 'co', 'be', 'other'));
