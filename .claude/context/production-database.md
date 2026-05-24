<!-- Purpose: Operator and agent rules for Supabase production. Load before any seed script, migration push, or festival-reset against a live project. -->

# Production database safety

## No point-in-time restore

This project's Supabase plan **does not include point-in-time recovery (PITR)** or easy backup restore. Destructive operations on production are **irreversible** — especially `user_picks` and `user_missed_bands` lost when `public.bands` rows are deleted.

Treat production as **append-only / sync-only** for lineup changes unless the user explicitly requests a festival reset.

## Agent rules (mandatory)

1. **Never run destructive commands against production without explicit user confirmation in the same conversation.** Destructive includes:
   - `npm run seed:bands` (with or without `--force`)
   - `npm run festival:reset` (with or without `--with-bands`)
   - Any SQL `DELETE FROM public.bands` or truncate
2. **Never infer consent** from migration errors, phase docs, or "fix it" messages — explain options and ask.
3. **Default to dry-run** for `seed:bands:sync`, `seed:bands:move`, and `seed:bands:backfill-slot-id`.
4. **Prefer non-destructive paths:**
   - Lineup edits → `seed:bands:sync` (dry-run first)
   - `slot_id` bootstrap → `seed:bands:backfill-slot-id -- --apply`
   - Full wipe → only when user says festival reset
5. **Before any `--apply` on prod**, tell the user what tables will change and whether picks can be affected.

## Safe verification (no writes)

See `docs/ai-wiki/lineup-sync.md` → **Verifying Phase 24 / lineup changes**.

Quick checks:

```bash
rtk npm run build
rtk npm test
rtk npm run seed:bands:sync          # dry-run — must exit 0; empty plan = DB matches seed
```

Supabase SQL editor (read-only):

```sql
SELECT count(*) AS total,
       count(*) FILTER (WHERE slot_id IS NULL) AS null_slot_id,
       count(DISTINCT slot_id) AS distinct_slot_ids
FROM public.bands;
-- Expect: total = 187, null_slot_id = 0, distinct_slot_ids = 187

SELECT count(*) FROM public.user_picks;
```

App smoke (after any `--apply`): pick one band → hard refresh → pick still there; `/schedule` shows 187 bands.

## Staging recommendation

For risky changes, use a **separate Supabase project** (staging) with its own `.env.local` before touching production.
