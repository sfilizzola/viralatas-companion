-- Development-only marker for disposable seed users.
alter table public.users
  add column if not exists is_test_user boolean not null default false;

create index if not exists users_is_test_user_idx
  on public.users (is_test_user)
  where is_test_user = true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (
    id,
    email,
    display_name,
    avatar_url,
    preferred_language,
    is_test_user
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', null),
    coalesce(new.raw_user_meta_data->>'avatar_url', null),
    coalesce(new.raw_user_meta_data->>'preferred_language', 'br'),
    new.raw_user_meta_data->>'is_test_user' = 'true'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
