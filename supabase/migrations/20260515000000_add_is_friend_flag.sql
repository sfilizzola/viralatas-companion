-- Add is_friend flag to users table.
-- NULL = unset (treated as non-friend), true = friend (not camping with crew).
-- Friends are excluded from camping/lost crew groups and location-based badges.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_friend boolean DEFAULT NULL;
