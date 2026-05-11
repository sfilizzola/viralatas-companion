-- Expand supported profile languages to Brazilian Portuguese, English, Spanish, and German.

alter table public.users
  drop constraint if exists users_preferred_language_check;

alter table public.users
  add constraint users_preferred_language_check
  check (preferred_language in ('br', 'en', 'es', 'de'));
