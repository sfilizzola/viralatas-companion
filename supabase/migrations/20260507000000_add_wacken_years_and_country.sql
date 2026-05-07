-- Add wacken_years (integer array) and country (text with check) to public.users

alter table public.users
  add column if not exists wacken_years integer[] not null default '{}';

alter table public.users
  add column if not exists country text
  check (country in ('de', 'es', 'br', 'us', 'co', 'other'));

-- Extend trigger to include new columns with safe defaults
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (
    id, email, display_name, avatar_url,
    preferred_language, is_test_user, role,
    wacken_years, country
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', null),
    coalesce(new.raw_user_meta_data->>'avatar_url', null),
    coalesce(new.raw_user_meta_data->>'preferred_language', 'br'),
    coalesce(new.raw_user_meta_data->>'is_test_user' = 'true', false),
    case when new.email = 'sfilizzola@gmail.com' then 'godlike' else 'normal' end,
    '{}',
    null
  )
  on conflict (id) do update set
    role = case
      when excluded.email = 'sfilizzola@gmail.com' then 'godlike'
      else public.users.role
    end;
  return new;
end;
$$;
