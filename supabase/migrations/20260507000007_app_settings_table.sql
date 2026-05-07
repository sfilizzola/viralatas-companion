-- Create app_settings table for global app configuration
create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  registration_enabled boolean default true not null,
  updated_at timestamp with time zone default now() not null
);

-- Insert default record
insert into public.app_settings (registration_enabled) values (true);

-- Enable RLS
alter table public.app_settings enable row level security;

-- Anyone can read app_settings
create policy "app_settings_select" on public.app_settings
  for select
  using (true);

-- Only godlike user can update
create policy "app_settings_update" on public.app_settings
  for update
  using (
    auth.jwt() ->> 'email' = 'sfilizzola@gmail.com'
  );
