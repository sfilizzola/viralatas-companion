-- Add stable identity column for non-destructive lineup sync.
-- See docs/superpowers/specs/2026-05-20-non-destructive-lineup-sync-design.md
--
-- After this migration: run `npm run seed:bands:backfill-slot-id -- --apply`
-- (preserves user picks), then apply 20260524000001_bands_slot_id_lock.sql.
-- Do NOT use `seed:bands --force` unless you intend a full festival reset.
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS slot_id text;
CREATE INDEX IF NOT EXISTS idx_bands_slot_id ON public.bands(slot_id);
