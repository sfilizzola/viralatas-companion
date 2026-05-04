-- Fix: handle_new_user trigger had a bug with is_test_user boolean coercion.
-- When is_test_user wasn't in metadata, (null = 'true') returned null, violating NOT NULL constraint.
-- Solution: Use coalesce to default to false when metadata field is missing.

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
    is_test_user,
    role
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', null),
    coalesce(new.raw_user_meta_data->>'avatar_url', null),
    coalesce(new.raw_user_meta_data->>'preferred_language', 'br'),
    coalesce(new.raw_user_meta_data->>'is_test_user' = 'true', false),
    case when new.email = 'sfilizzola@gmail.com' then 'godlike' else 'normal' end
  )
  on conflict (id) do update set
    role = case
      when excluded.email = 'sfilizzola@gmail.com' then 'godlike'
      else public.users.role
    end;
  return new;
end;
$$;
