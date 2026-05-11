-- Phase 12: Add wacken_arrival_day to public.users
-- This mirrors the field from Supabase Auth metadata to the database
-- for visibility across all crew members (currently in auth.users.raw_user_meta_data only)

ALTER TABLE public.users ADD COLUMN wacken_arrival_day text;

-- Valid values: 'sun-jul26', 'mon-jul27', 'tue-jul28', 'wed-jul29', 'thu-plus', or NULL
-- No constraint; the app controls the values set.
