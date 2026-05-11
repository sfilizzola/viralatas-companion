-- Remove 'camping-mob' badge from users' achieved badges
-- This badge is no longer part of the app after removal

-- Update auth.users metadata to remove 'camping-mob' from crew_earned_badge_slugs
UPDATE auth.users
SET raw_user_meta_data =
  CASE
    WHEN raw_user_meta_data->>'crew_earned_badge_slugs' IS NOT NULL THEN
      jsonb_set(
        raw_user_meta_data,
        '{crew_earned_badge_slugs}',
        to_jsonb(
          array_remove(
            (raw_user_meta_data->>'crew_earned_badge_slugs')::text[]::text[],
            'camping-mob'
          )
        )
      )
    ELSE raw_user_meta_data
  END
WHERE raw_user_meta_data->>'crew_earned_badge_slugs' LIKE '%camping-mob%';
