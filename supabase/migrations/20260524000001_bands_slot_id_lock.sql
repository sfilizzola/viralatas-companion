-- Lock slot_id as NOT NULL + UNIQUE after non-destructive backfill.
-- Prerequisite: `npm run seed:bands:backfill-slot-id -- --apply` (NOT seed:bands --force).
ALTER TABLE public.bands ALTER COLUMN slot_id SET NOT NULL;
ALTER TABLE public.bands DROP CONSTRAINT IF EXISTS bands_slot_id_unique;
ALTER TABLE public.bands ADD CONSTRAINT bands_slot_id_unique UNIQUE (slot_id);

-- The old composite UNIQUE is redundant; slot_id is the canonical identity.
ALTER TABLE public.bands DROP CONSTRAINT IF EXISTS bands_stage_start_time_name_key;
