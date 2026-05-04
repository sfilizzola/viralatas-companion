-- Phase 5: Announcements & user roles

-- 1. Role column on users
alter table public.users
  add column if not exists role text not null default 'normal'
  check (role in ('normal', 'manager', 'godlike'));

-- 2. Seed existing godlike user
update public.users set role = 'godlike' where email = 'sfilizzola@gmail.com';

-- 3. Announcements mural
create table if not exists public.announcements (
  id         uuid        primary key default gen_random_uuid(),
  author_id  uuid        not null references public.users(id) on delete cascade,
  content    text        not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists announcements_created_at_idx
  on public.announcements (created_at desc)
  where deleted_at is null;

-- 4. Per-user posting block
create table if not exists public.blocked_posters (
  user_id    uuid        primary key references public.users(id) on delete cascade,
  blocked_by uuid        not null references public.users(id) on delete cascade,
  blocked_at timestamptz not null default now()
);

-- 5. RLS: announcements
alter table public.announcements enable row level security;

create policy "crew can read live announcements"
  on public.announcements for select to authenticated
  using (deleted_at is null);

create policy "non-blocked users can post"
  on public.announcements for insert to authenticated
  with check (
    auth.uid() = author_id
    and not exists (
      select 1 from public.blocked_posters where user_id = auth.uid()
    )
  );

create policy "managers can soft-delete"
  on public.announcements for update to authenticated
  using (
    exists (
      select 1 from public.users where id = auth.uid() and role in ('manager', 'godlike')
    )
  )
  with check (true);

-- 6. RLS: blocked_posters
alter table public.blocked_posters enable row level security;

create policy "anyone can check blocked list"
  on public.blocked_posters for select to authenticated
  using (true);

create policy "managers can manage blocks"
  on public.blocked_posters for all to authenticated
  using (
    exists (
      select 1 from public.users where id = auth.uid() and role in ('manager', 'godlike')
    )
  )
  with check (
    exists (
      select 1 from public.users where id = auth.uid() and role in ('manager', 'godlike')
    )
  );

-- 7. RPC: role changes (godlike only; cannot grant or revoke godlike)
create or replace function public.set_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if new_role not in ('normal', 'manager') then
    raise exception 'Invalid role: %', new_role;
  end if;

  if not exists (
    select 1 from public.users where id = auth.uid() and role = 'godlike'
  ) then
    raise exception 'Unauthorized';
  end if;

  if exists (
    select 1 from public.users where id = target_user_id and role = 'godlike'
  ) then
    raise exception 'Cannot change the role of a godlike user';
  end if;

  update public.users set role = new_role where id = target_user_id;
end;
$$;

-- 8. Update handle_new_user to assign godlike on signup for the known email
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
    new.raw_user_meta_data->>'is_test_user' = 'true',
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
