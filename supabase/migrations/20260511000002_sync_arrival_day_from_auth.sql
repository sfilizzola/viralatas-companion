-- Phase 12: Sync wacken_arrival_day from auth metadata to public.users
-- This migration copies existing arrival day data that users set before
-- the feature was developed, so they don't need to re-save their profiles.

UPDATE public.users
SET wacken_arrival_day = auth.users.raw_user_meta_data->>'wacken_arrival_day'
FROM auth.users
WHERE public.users.id = auth.users.id
  AND auth.users.raw_user_meta_data->>'wacken_arrival_day' IS NOT NULL;
